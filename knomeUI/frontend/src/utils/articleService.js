import { apiClient } from './apiClient';
import { resolveMediaUrl } from './apiService';

const DEFAULT_COVER_IMAGES = [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1200'
];

export async function getArticles(categoryId = null, tag = null, search = null, pageNumber = 1, pageSize = 20) {
    try {
        let endpoint = `/Articles?pageNumber=${pageNumber}&pageSize=${pageSize}`;
        if (categoryId) endpoint += `&categoryId=${categoryId}`;
        if (tag) endpoint += `&tag=${encodeURIComponent(tag)}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;

        const data = await apiClient.get(endpoint);

        return data.map((art, idx) => {
            // Find cover image if it exists in coverImageUrl or attachments
            const coverAttachmentRaw = art.coverImageUrl 
                || art.attachmentUrls?.find(url => url && url.match(/\.(jpeg|jpg|gif|png|webp)$/i))
                || art.attachments?.find(a => a && (a.fileType === 'Image' || (a.fileUrl && a.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i))))?.fileUrl;

            const coverImage = coverAttachmentRaw 
                ? resolveMediaUrl(coverAttachmentRaw) 
                : (art.coverImageUrl ? resolveMediaUrl(art.coverImageUrl) : null);

            const rawAttachments = (art.attachments && art.attachments.length > 0)
                ? art.attachments.map(att => {
                    const fileUrl = (att.fileUrl || '').toLowerCase();
                    const isDoc = Boolean(fileUrl.match(/\.(pdf|docx|doc|txt|xls|xlsx|ppt|pptx)$/i) || att.fileType === 'Document');
                    const isImage = Boolean(fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i) || att.fileType === 'Image');
                    const isVideo = !isDoc && !isImage && Boolean(fileUrl.match(/\.(mp4|webm|ogg|mov|m4v|mkv)$/i) || att.fileType === 'Video' || fileUrl.includes('/uploads/videos/'));

                    return {
                        url: resolveMediaUrl(att.fileUrl),
                        rawUrl: att.fileUrl,
                        name: att.fileName || att.fileUrl.split('/').pop() || 'Attached File',
                        fileType: att.fileType,
                        publishedDate: att.publishedDate || art.publishedDate,
                        isDoc,
                        isImage,
                        isVideo,
                    };
                  })
                : (art.attachmentUrls || []).map(url => {
                    const rawUrl = (url || '').toLowerCase();
                    const isDoc = Boolean(rawUrl.match(/\.(pdf|docx|doc|txt|xls|xlsx|ppt|pptx)$/i));
                    const isImage = Boolean(rawUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i));
                    const isVideo = !isDoc && !isImage && Boolean(rawUrl.match(/\.(mp4|webm|ogg|mov|m4v|mkv)$/i) || rawUrl.includes('/uploads/videos/'));

                    return {
                        url: resolveMediaUrl(url),
                        rawUrl: url,
                        name: url.split('/').pop() || 'Attached File',
                        publishedDate: art.publishedDate || art.createdDate,
                        isDoc,
                        isImage,
                        isVideo,
                    };
                  });

            // Filter out cover photo from attachments so image is shown only ONCE
            const attachmentsList = rawAttachments.filter(att => {
                if (att.isImage && coverAttachmentRaw) {
                    if (att.rawUrl === coverAttachmentRaw || (att.url && coverImage && att.url === coverImage)) {
                        return false;
                    }
                }
                return true;
            });

            const authorName = art.authorFullName || 'Enterprise Author';
            const authorAvatar = art.authorProfilePhotoUrl 
                ? resolveMediaUrl(art.authorProfilePhotoUrl) 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&size=256&bold=true`;

            return {
                id: art.articleId.toString(),
                title: art.title,
                subtitle: art.description || 'No summary provided',
                author: {
                    name: authorName,
                    role: art.authorDesignation || 'Writer',
                    avatar: authorAvatar
                },
                date: new Date(art.publishedDate || art.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                readTime: `${art.avgReadTimeSeconds > 0 ? Math.ceil(art.avgReadTimeSeconds / 60) : 5} min read`,
                category: art.categoryName || 'General',
                tags: art.tags || [],
                image: coverImage,
                attachments: attachmentsList,
                likes: art.engagementSummary?.likesCount || 0,
                reactions: art.engagementSummary?.likesCount || 0,
                views: art.viewCount || 0,
                shares: 0,
                community: 'General',
                members: '0 members',
                communityDesc: '',
                communityIcon: 'architecture',
                content: [
                    { type: 'paragraph', text: art.contentHtml || 'No content provided.' }
                ],
                rawHtml: art.contentHtml,
                comments: []
            };
        });
    } catch (error) {
        console.error('Failed to fetch articles', error);
        return [];
    }
}

export async function saveArticle(articleDto) {
    try {
        const response = await apiClient.post('/Articles', articleDto);
        return response;
    } catch (error) {
        console.error('Failed to save article', error);
        throw error;
    }
}

export async function deleteArticle(articleId) {
    try {
        const response = await apiClient.delete(`/Articles/${articleId}`);
        return response;
    } catch (error) {
        console.error('Failed to delete article', error);
        throw error;
    }
}
