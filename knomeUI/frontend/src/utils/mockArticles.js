import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5095';

// Helper to fetch articles from API
export async function getArticles() {
    try {
        const data = await apiClient.get('/Articles');
        // Map backend ArticleDto to frontend mock structure
        return data.map(art => ({
            id: art.articleId.toString(),
            title: art.title,
            subtitle: art.description || 'No summary provided',
            author: {
                name: art.authorFullName,
                role: art.authorDesignation || 'Writer',
                avatar: art.authorProfilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(art.authorFullName)}&background=6366f1&color=fff`
            },
            date: new Date(art.publishedDate || art.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            readTime: `${art.avgReadTimeSeconds > 0 ? Math.ceil(art.avgReadTimeSeconds / 60) : 5} min read`,
            category: art.categoryName || 'General',
            tags: art.tags || [],
            image: (() => {
                const imgAtt = art.attachments?.find(a => a.fileType?.toLowerCase() === 'image');
                if (imgAtt && imgAtt.fileUrl) {
                    return imgAtt.fileUrl.startsWith('http') ? imgAtt.fileUrl : `${API_BASE}${imgAtt.fileUrl}`;
                }
                return 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=1200&h=400';
            })(),
            likes: 0,
            reactions: 0,
            views: art.viewCount || 0,
            shares: 0,
            community: 'General',
            members: '0 members',
            communityDesc: '',
            communityIcon: 'architecture',
            content: [
                { type: 'paragraph', text: art.contentHtml?.replace(/<[^>]+>/g, '') || 'No content provided.' }
            ],
            rawHtml: art.contentHtml,
            comments: []
        }));
    } catch (error) {
        console.error('Failed to fetch articles', error);
        return [];
    }
}

// Helper to save a new article
export async function saveArticle(article) {
    try {
        const categoryMap = {
            'Engineering': 7,
            'Design': 8,
            'Product Management': 9,
            'Company Culture': 10
        };
        const categoryId = categoryMap[article.category] || 1;

        const request = {
            title: article.title,
            description: article.subtitle,
            contentHtml: article.content[0]?.text || '',
            categoryId: categoryId,
            status: "Published",
            tags: article.tags || [],
            attachmentUrls: article.attachmentsUrls && article.attachmentsUrls.length > 0 ? article.attachmentsUrls : (article.image && article.image.includes('/uploads/') ? [article.image.replace(API_BASE, '')] : []),
            attachmentTypes: article.attachmentsTypes && article.attachmentsTypes.length > 0 ? article.attachmentsTypes : (article.image && article.image.includes('/uploads/') ? ["Image"] : [])
        };
        await apiClient.post('/Articles', request);
    } catch (error) {
        console.error('Failed to save article', error);
        throw error;
    }
}
