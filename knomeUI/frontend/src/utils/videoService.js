import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5095';

export async function getVideos() {
    try {
        const data = await apiClient.get('/videos');
        
        // Data is an array of VideoDto from backend
        return data.map(v => ({
            id: v.videoId.toString(),
            title: v.title || 'Untitled Video',
            description: v.description || 'No description provided.',
            thumbnail: v.thumbnailUrl ? (v.thumbnailUrl.startsWith('http') ? v.thumbnailUrl : `${API_BASE}${v.thumbnailUrl}`) : 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=90&w=1600&h=900',
            duration: v.fileSizeMb ? `${v.fileSizeMb} MB` : 'Video', // Backend doesn't have duration, using filesize or string
            views: v.viewCount > 1000 ? (v.viewCount / 1000).toFixed(1) + 'k' : (v.viewCount || 0).toString(),
            likes: v.engagementSummary?.totalReactions || 0,
            category: v.categoryName || 'General',
            date: new Date(v.uploadedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            author: v.uploaderFullName || 'Unknown User',
            authorId: v.uploaderUserId,
            tags: v.tags || [],
            sourceUrl: v.sourceUrl ? (v.sourceUrl.startsWith('http') ? v.sourceUrl : `${API_BASE}${v.sourceUrl}`) : null,
            sourceType: v.sourceType
        }));
    } catch (error) {
        console.error('Failed to fetch videos:', error);
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
