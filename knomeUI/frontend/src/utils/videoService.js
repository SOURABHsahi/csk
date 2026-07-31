import { apiClient } from './apiClient';
import { resolveMediaUrl } from './apiService';

const API_BASE = 'http://localhost:5095';

export async function getVideos() {
    try {
        const [videosRes, postsRes, articlesRes] = await Promise.all([
            apiClient.get('/videos').catch(() => []),
            apiClient.get('/posts').catch(() => []),
            apiClient.get('/articles').catch(() => [])
        ]);

        const videoList = [];
        const seenUrls = new Set();

        // 1. Direct Video Uploads
        if (Array.isArray(videosRes)) {
            videosRes.forEach(v => {
                const srcUrl = v.sourceUrl ? resolveMediaUrl(v.sourceUrl) : null;
                if (srcUrl) seenUrls.add(srcUrl);

                videoList.push({
                    id: v.videoId ? v.videoId.toString() : `video_${Date.now()}_${Math.random()}`,
                    title: v.title || 'Untitled Video',
                    description: v.description || 'Enterprise Video Stream',
                    thumbnail: v.thumbnailUrl ? resolveMediaUrl(v.thumbnailUrl) : 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=90&w=1600&h=900',
                    duration: v.fileSizeMb ? `${v.fileSizeMb} MB` : 'Video Session',
                    views: v.viewCount > 1000 ? (v.viewCount / 1000).toFixed(1) + 'k' : (v.viewCount || 0).toString(),
                    likes: v.engagementSummary?.totalReactions || 0,
                    category: v.categoryName || 'General',
                    date: new Date(v.uploadedDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    author: v.uploaderFullName || 'Unknown User',
                    authorId: v.uploaderUserId,
                    tags: v.tags || ['Video'],
                    sourceUrl: srcUrl,
                    sourceType: v.sourceType || 'LocalUpload'
                });
            });
        }

        // 2. Videos uploaded inside Posts
        if (Array.isArray(postsRes)) {
            postsRes.forEach(p => {
                const attachments = p.attachments || [];
                attachments.forEach(att => {
                    const rawUrl = att.url || att.mediaUrl || att.path;
                    if (!rawUrl) return;
                    const isVideo = att.type === 'video' || !!rawUrl.match(/\.(mp4|webm|ogg|mov|m4v|mkv)(\?.*)?$/i) || rawUrl.includes('/uploads/videos');
                    if (isVideo) {
                        const fullUrl = resolveMediaUrl(rawUrl);
                        if (!seenUrls.has(fullUrl)) {
                            seenUrls.add(fullUrl);
                            videoList.push({
                                id: `post_vid_${p.postId || p.id}_${att.id || Math.random()}`,
                                title: p.title || (p.content ? p.content.slice(0, 50) + '...' : 'Post Video Attachment'),
                                description: p.content || 'Uploaded in Post Feed',
                                thumbnail: att.thumbnail ? resolveMediaUrl(att.thumbnail) : 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=90&w=1600&h=900',
                                duration: 'Post Video',
                                views: '1',
                                likes: p.likes || 0,
                                category: 'Training & Tutorials',
                                date: new Date(p.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                author: p.authorFullName || p.author?.name || 'Employee',
                                authorId: p.authorUserId || p.author?.id,
                                tags: p.tags || ['Post', 'Video'],
                                sourceUrl: fullUrl,
                                sourceType: 'LocalUpload'
                            });
                        }
                    }
                });
            });
        }

        // 3. Videos uploaded inside Articles
        if (Array.isArray(articlesRes)) {
            articlesRes.forEach(a => {
                const attachments = a.attachments || [];
                attachments.forEach(att => {
                    const rawUrl = att.url || att.mediaUrl || att.rawUrl;
                    if (!rawUrl) return;
                    const isVideo = att.isVideo || att.fileType === 'Video' || (att.name && att.name.toLowerCase().includes('media_')) || !!rawUrl.match(/\.(mp4|webm|ogg|mov|m4v|mkv)(\?.*)?$/i);
                    if (isVideo) {
                        const fullUrl = resolveMediaUrl(rawUrl);
                        if (!seenUrls.has(fullUrl)) {
                            seenUrls.add(fullUrl);
                            videoList.push({
                                id: `art_vid_${a.articleId || a.id}_${att.id || Math.random()}`,
                                title: a.title || att.name || 'Article Video Media',
                                description: a.summary || a.description || 'Published in Article Specification',
                                thumbnail: a.coverImageUrl ? resolveMediaUrl(a.coverImageUrl) : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=90&w=1600&h=900',
                                duration: 'Article Media',
                                views: '1',
                                likes: a.likes || 0,
                                category: 'Engineering Tech Talks',
                                date: new Date(a.publishedDate || a.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                author: a.authorFullName || a.author || 'Author',
                                authorId: a.authorUserId,
                                tags: a.tags || ['Article', 'Video'],
                                sourceUrl: fullUrl,
                                sourceType: 'LocalUpload'
                            });
                        }
                    }
                });
            });
        }

        return videoList;
    } catch (error) {
        console.error('Failed to fetch aggregated videos:', error);
        return [];
    }
}

export async function deleteVideo(videoId) {
    try {
        await apiClient.delete(`/videos/${videoId}`);
        return true;
    } catch (error) {
        console.error('Failed to delete video:', error);
        throw error;
    }
}
