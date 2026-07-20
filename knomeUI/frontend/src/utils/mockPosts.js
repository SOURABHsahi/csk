import { apiClient } from './apiClient';

const API_BASE = 'http://localhost:5095';

export const getPosts = async () => {
    try {
        const data = await apiClient.get('/Posts');
        const reverseTypeMap = { 'Image': 'image', 'Document': 'doc', 'Video': 'video', 'Audio': 'audio' };
        // Map backend PostDto to frontend mock structure
        return data.map(post => ({
            id: post.postId,
            author: {
                userId: post.authorUserId,
                name: post.authorFullName,
                role: post.authorDesignation || 'Contributor',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorFullName)}&background=6366f1&color=fff`,
                isVerified: false
            },
            type: 'post',
            time: new Date(post.publishedDate || post.createdDate).toLocaleString(),
            content: post.contentText,
            tags: [],
            attachments: post.attachments?.map(a => ({
                id: a.attachmentId,
                type: reverseTypeMap[a.fileType] || 'doc',
                // Prefix relative /uploads/... paths with the backend origin
                url: a.fileUrl?.startsWith('http') ? a.fileUrl : `${API_BASE}${a.fileUrl}`,
                name: a.fileUrl?.split('/').pop() || 'attachment'
            })) || [],
            likes: post.reactionCount || 0,
            shares: 0,
            isSaved: false,
            comments: []
        }));
    } catch (error) {
        console.error('Failed to fetch posts', error);
        return [];
    }
};

export const savePost = async (postData) => {
    try {
        const attachmentUrls = postData.attachments ? postData.attachments.map(a => a.url) : [];
        const typeMap = { 'image': 'Image', 'doc': 'Document', 'video': 'Video', 'audio': 'Audio' };
        const attachmentTypes = postData.attachments ? postData.attachments.map(a => typeMap[a.type] || 'Document') : [];

        const request = {
            contentText: postData.content,
            audienceType: 'Everyone',
            status: 'Published',
            attachmentUrls: attachmentUrls,
            attachmentTypes: attachmentTypes
        };
        await apiClient.post('/Posts', request);
    } catch (error) {
        console.error('Failed to save post', error);
        throw error;
    }
};

export const deletePost = async (postId) => {
    try {
        await apiClient.delete(`/Posts/${postId}`);
    } catch (error) {
        console.error('Failed to delete post', error);
        throw error;
    }
};
