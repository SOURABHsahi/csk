import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5095';

const resolveUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
};

export async function getArticles(categoryId = null, tag = null, search = null, pageNumber = 1, pageSize = 20) {
    try {
        let endpoint = `/Articles?pageNumber=${pageNumber}&pageSize=${pageSize}`;
        if (categoryId) endpoint += `&categoryId=${categoryId}`;
        if (tag) endpoint += `&tag=${encodeURIComponent(tag)}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;

        const data = await apiClient.get(endpoint);

        return data.map(art => {
            // Find cover image if it exists in attachments
            const coverAttachment = art.attachmentUrls?.find(url => url.match(/\.(jpeg|jpg|gif|png|webp)$/i));
            const coverImage = coverAttachment ? resolveUrl(coverAttachment) : 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=90&w=1600&h=800';

            return {
                id: art.articleId.toString(),
                title: art.title,
                subtitle: art.description || 'No summary provided',
                author: {
                    name: art.authorFullName,
                    role: art.authorDesignation || 'Writer',
                    avatar: resolveUrl(art.authorProfilePhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(art.authorFullName)}&background=6366f1&color=fff&size=256&bold=true`
                },
                date: new Date(art.publishedDate || art.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                readTime: `${art.avgReadTimeSeconds > 0 ? Math.ceil(art.avgReadTimeSeconds / 60) : 5} min read`,
                category: art.categoryName || 'General',
                tags: art.tags || [],
                image: coverImage,
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
