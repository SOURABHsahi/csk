/**
 * Knome API Service Layer
 * Centralized, typed API methods for all backend endpoints.
 * Replaces all scattered mock utilities.
 */
import { apiClient } from './apiClient';

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
export const authApi = {
    /** POST /Auth/login — get JWT for employee */
    login: (employeeId) =>
        apiClient.post('/Auth/login', { employeeId, password: 'Password@123' }),

    /** POST /Auth/refresh — refresh access token */
    refresh: (refreshToken) =>
        apiClient.post('/Auth/refresh', { refreshToken }),

    /** POST /Auth/logout */
    logout: (refreshToken) =>
        apiClient.post('/Auth/logout', { refreshToken }),
};

// ─────────────────────────────────────────────
//  PROFILES
// ─────────────────────────────────────────────
export const profileApi = {
    /** GET /users/profile */
    getMe: () => apiClient.get('/users/profile'),

    /** GET /users/{id} */
    getById: (id) => apiClient.get(`/users/${id}`),

    /** PUT /users/profile */
    update: (data) => apiClient.put('/users/profile', data),

    /** PUT /users/profile/visibility */
    updateVisibility: (data) => apiClient.put('/users/profile/visibility', data),

    /** GET /Profiles/search?query=&departmentId= */
    search: (query, departmentId) => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (departmentId) params.append('departmentId', departmentId);
        return apiClient.get(`/Profiles/search?${params}`);
    },

    /** GET /Profiles/suggestions */
    getSuggestions: () => apiClient.get('/Profiles/suggestions'),

    /** POST /Profiles/{userId}/follow */
    follow: (userId) => apiClient.post(`/Profiles/${userId}/follow`),

    /** POST /Profiles/{userId}/unfollow */
    unfollow: (userId) => apiClient.post(`/Profiles/${userId}/unfollow`),

    /** GET /Profiles/{userId}/followers */
    getFollowers: (userId) => apiClient.get(`/Profiles/${userId}/followers`),

    /** GET /Profiles/{userId}/following */
    getFollowing: (userId) => apiClient.get(`/Profiles/${userId}/following`),
};

// ─────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────
export const dashboardApi = {
    /** GET /Dashboard/feed?feedType=&cursor=&limit= */
    getFeed: (feedType, cursor, limit = 15) => {
        const params = new URLSearchParams({ limit });
        if (feedType && feedType !== 'All') params.append('feedType', feedType);
        if (cursor) params.append('cursor', cursor);
        return apiClient.get(`/Dashboard/feed?${params}`);
    },

    getSuggestedCommunities: () => apiClient.get('/Dashboard/widgets/suggested-communities'),
    getSuggestedUsers: () => apiClient.get('/Dashboard/widgets/suggested-users'),
    getLatestArticles: () => apiClient.get('/Dashboard/widgets/latest-articles'),
    getLatestVideos: () => apiClient.get('/Dashboard/widgets/latest-videos'),
    getLatestPodcasts: () => apiClient.get('/Dashboard/widgets/latest-podcasts'),
    getTrendingPosts: () => apiClient.get('/Dashboard/widgets/trending-posts'),
    getHotPosts: () => apiClient.get('/Dashboard/widgets/hot-posts'),
    getInternalJobs: () => apiClient.get('/Dashboard/widgets/internal-jobs'),
    getKarmaLeaderboard: () => apiClient.get('/Dashboard/widgets/karma-leaderboard'),
    getAnnouncements: () => apiClient.get('/Dashboard/widgets/announcements'),
};

// ─────────────────────────────────────────────
//  POSTS
// ─────────────────────────────────────────────
export const postsApi = {
    /** GET /Posts */
    getAll: () => apiClient.get('/Posts'),

    /** GET /Posts/{id} */
    getById: (id) => apiClient.get(`/Posts/${id}`),

    /** POST /Posts */
    create: (data) => apiClient.post('/Posts', data),

    /** DELETE /Posts/{id} */
    delete: (id) => apiClient.delete(`/Posts/${id}`),
};

// ─────────────────────────────────────────────
//  ARTICLES
// ─────────────────────────────────────────────
export const articlesApi = {
    /** GET /Articles */
    getAll: () => apiClient.get('/Articles'),

    /** GET /Articles/{id} */
    getById: (id) => apiClient.get(`/Articles/${id}`),

    /** POST /Articles */
    create: (data) => apiClient.post('/Articles', data),

    /** PUT /Articles/{id} */
    update: (id, data) => apiClient.put(`/Articles/${id}`, data),

    /** DELETE /Articles/{id} */
    delete: (id) => apiClient.delete(`/Articles/${id}`),
};

// ─────────────────────────────────────────────
//  VIDEOS
// ─────────────────────────────────────────────
export const videosApi = {
    /** GET /Videos */
    getAll: () => apiClient.get('/Videos'),

    /** GET /Videos/{id} */
    getById: (id) => apiClient.get(`/Videos/${id}`),

    /** POST /Videos */
    create: (data) => apiClient.post('/Videos', data),

    /** DELETE /Videos/{id} */
    delete: (id) => apiClient.delete(`/Videos/${id}`),
};

// ─────────────────────────────────────────────
//  PODCASTS
// ─────────────────────────────────────────────
export const podcastsApi = {
    /** GET /Podcasts */
    getAll: () => apiClient.get('/Podcasts'),

    /** GET /Podcasts/{id} */
    getById: (id) => apiClient.get(`/Podcasts/${id}`),

    /** POST /Podcasts */
    create: (data) => apiClient.post('/Podcasts', data),

    /** DELETE /Podcasts/{id} */
    delete: (id) => apiClient.delete(`/Podcasts/${id}`),
};

// ─────────────────────────────────────────────
//  INTERACTIONS (Comments, Reactions, Bookmarks, Shares)
// ─────────────────────────────────────────────
export const interactionsApi = {
    // Comments
    getComments: (contentType, contentId) =>
        apiClient.get(`/Interactions/comments?contentType=${contentType}&contentId=${contentId}`),

    addComment: (data) => apiClient.post('/Interactions/comments', data),

    deleteComment: (commentId) => apiClient.delete(`/Interactions/comments/${commentId}`),

    // Reactions
    getReactions: (contentType, contentId) =>
        apiClient.get(`/Interactions/reactions?contentType=${contentType}&contentId=${contentId}`),

    addReaction: (data) => apiClient.post('/Interactions/reactions', data),

    removeReaction: (contentType, contentId) =>
        apiClient.delete(`/Interactions/reactions?contentType=${contentType}&contentId=${contentId}`),

    // Bookmarks
    getBookmarks: () => apiClient.get('/Interactions/bookmarks'),

    bookmark: (contentType, contentId) =>
        apiClient.post('/Interactions/bookmarks', { contentType, contentId }),

    unbookmark: (contentType, contentId) =>
        apiClient.delete(`/Interactions/bookmarks?contentType=${contentType}&contentId=${contentId}`),

    // Shares
    share: (data) => apiClient.post('/Interactions/shares', data),
};


// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────
export const notificationsApi = {
    /** GET /Notifications?unreadOnly=true */
    getAll: (unreadOnly = false) =>
        apiClient.get(`/Notifications?unreadOnly=${unreadOnly}`),

    /** POST /Notifications/{id}/read */
    markRead: (notificationId) =>
        apiClient.post(`/Notifications/${notificationId}/read`),

    /** POST /Notifications/read-all */
    markAllRead: () => apiClient.post('/Notifications/read-all'),

    /** GET /Notifications/preferences */
    getPreferences: () => apiClient.get('/Notifications/preferences'),

    /** PUT /Notifications/preferences */
    updatePreferences: (data) => apiClient.put('/Notifications/preferences', data),
};

// ─────────────────────────────────────────────
//  KARMA
// ─────────────────────────────────────────────
export const karmaApi = {
    /** GET /Karma/leaderboard */
    getLeaderboard: () => apiClient.get('/Karma/leaderboard'),

    /** GET /Karma/history */
    getHistory: () => apiClient.get('/Karma/history'),

    /** GET /Karma/badge */
    getBadge: () => apiClient.get('/Karma/badge'),
};

// ─────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────
export const searchApi = {
    /** GET /Search?query=&type= */
    search: (query, type) => {
        const params = new URLSearchParams({ query });
        if (type && type !== 'All') params.append('type', type);
        return apiClient.get(`/Search?${params}`);
    },

    /** GET /Search/history */
    getHistory: () => apiClient.get('/Search/history'),
};

// ─────────────────────────────────────────────
//  JOBS
// ─────────────────────────────────────────────
export const jobsApi = {
    /** GET /Jobs */
    getAll: () => apiClient.get('/Jobs'),

    /** GET /Jobs/{id} */
    getById: (id) => apiClient.get(`/Jobs/${id}`),

    /** POST /Jobs */
    create: (data) => apiClient.post('/Jobs', data),

    /** POST /Jobs/{id}/apply */
    apply: (id) => apiClient.post(`/Jobs/${id}/apply`),

    /** DELETE /Jobs/{id} */
    delete: (id) => apiClient.delete(`/Jobs/${id}`),
};

// ─────────────────────────────────────────────
//  COMMUNITIES
// ─────────────────────────────────────────────
export const communitiesApi = {
    /** GET /Communities */
    getAll: () => apiClient.get('/Communities'),

    /** GET /Communities/{id} */
    getById: (id) => apiClient.get(`/Communities/${id}`),

    /** POST /Communities */
    create: (data) => apiClient.post('/Communities', data),

    /** PUT /Communities/{id} */
    update: (id, data) => apiClient.put(`/Communities/${id}`, data),

    /** POST /Communities/{id}/join */
    join: (id) => apiClient.post(`/Communities/${id}/join`),

    /** POST /Communities/{id}/leave */
    leave: (id) => apiClient.post(`/Communities/${id}/leave`),

    /** GET /Communities/{id}/members */
    getMembers: (id) => apiClient.get(`/Communities/${id}/members`),

    /** GET /Communities/{id}/posts */
    getPosts: (id) => apiClient.get(`/Communities/${id}/posts`),
};

// ─────────────────────────────────────────────
//  MEDIA
// ─────────────────────────────────────────────
export const mediaApi = {
    /** POST /media/upload */
    uploadFile: async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        if (type) formData.append('type', type);

        // Uses standard fetch without JSON headers because we are sending FormData
        const response = await fetch('http://localhost:5095/api/media/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('knome_jwt')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload file');
        }

        const json = await response.json();
        return json.data;
    }
};


// ─────────────────────────────────────────────
//  ADMIN
// ─────────────────────────────────────────────
export const adminApi = {
    /** GET /Admin/users */
    getUsers: () => apiClient.get('/Admin/users'),

    /** GET /Admin/announcements */
    getAnnouncements: () => apiClient.get('/Admin/announcements'),

    /** POST /Admin/announcements */
    createAnnouncement: (data) => apiClient.post('/Admin/announcements', data),

    /** DELETE /Admin/announcements/{id} */
    deleteAnnouncement: (id) => apiClient.delete(`/Admin/announcements/${id}`),

    /** PUT /Admin/users/{userId}/suspend */
    suspendUser: (userId) => apiClient.put(`/Admin/users/${userId}/suspend`),

    /** PUT /Admin/users/{userId}/reactivate */
    reactivateUser: (userId) => apiClient.put(`/Admin/users/${userId}/reactivate`),
};

// ─────────────────────────────────────────────
//  ANALYTICS (HR)
// ─────────────────────────────────────────────
export const analyticsApi = {
    /** GET /Analytics/engagement */
    getEngagement: () => apiClient.get('/Analytics/engagement'),

    /** GET /Analytics/community-health */
    getCommunityHealth: () => apiClient.get('/Analytics/community-health'),

    /** GET /Analytics/content */
    getContent: () => apiClient.get('/Analytics/content'),

    /** GET /Analytics/trending */
    getTrending: () => apiClient.get('/Analytics/trending'),

    /** GET /Analytics/moderation */
    getModeration: () => apiClient.get('/Analytics/moderation'),
};

// ─────────────────────────────────────────────
//  MAPPERS — Backend DTO → Frontend shape
// ─────────────────────────────────────────────
const ATTACHMENT_TYPE_MAP = { Image: 'image', Document: 'doc', Video: 'video', Audio: 'audio' };

export const mapPost = (post) => ({
    id: post.postId,
    author: {
        id: post.authorId,
        name: post.authorFullName,
        role: post.authorDesignation || 'Contributor',
        avatar: post.authorProfilePhotoUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorFullName)}&background=6366f1&color=fff`,
        isVerified: false,
    },
    type: 'post',
    time: new Date(post.publishedDate || post.createdDate).toLocaleString(),
    content: post.contentText,
    tags: [],
    attachments: (post.attachments || []).map((a) => ({
        id: a.attachmentId,
        type: ATTACHMENT_TYPE_MAP[a.fileType] || 'doc',
        url: a.fileUrl?.startsWith('/') ? `http://localhost:5095${a.fileUrl}` : a.fileUrl,
        name: a.fileUrl?.split('/').pop() || 'attachment',
    })),
    likes: post.reactionCount || 0,
    shares: post.shareCount || 0,
    isSaved: post.isBookmarked || false,
    comments: [],
    communityName: post.communityName || null,
});

export const mapArticle = (article) => ({
    id: article.articleId,
    title: article.title,
    subtitle: article.summary || '',
    content: article.contentBody || '',
    category: article.category || 'General',
    tags: article.tags || [],
    image: article.thumbnailUrl?.startsWith('/') ? `http://localhost:5095${article.thumbnailUrl}` : (article.thumbnailUrl || ''),
    author: {
        id: article.authorId,
        name: article.authorFullName,
        role: article.authorDesignation || 'Writer',
        avatar: article.authorProfilePhotoUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorFullName)}&background=6366f1&color=fff`,
    },
    time: new Date(article.publishedDate || article.createdDate).toLocaleString(),
    readTime: article.estimatedReadMinutes ? `${article.estimatedReadMinutes} min read` : '5 min read',
    likes: article.reactionCount || 0,
    views: article.viewCount || 0,
    status: article.status || 'Published',
});

export const mapVideo = (v) => ({
    id: v.videoId,
    title: v.title,
    description: v.description || '',
    category: v.category || 'General',
    tags: v.tags || [],
    thumbnail: v.thumbnailUrl || '',
    videoUrl: v.videoUrl || '',
    duration: v.durationSeconds ? formatDuration(v.durationSeconds) : '0:00',
    author: {
        id: v.authorId,
        name: v.authorFullName,
        avatar: v.authorProfilePhotoUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(v.authorFullName)}&background=6366f1&color=fff`,
    },
    views: v.viewCount || 0,
    likes: v.reactionCount || 0,
    time: new Date(v.uploadedDate || v.createdDate).toLocaleString(),
});

export const mapPodcast = (p) => ({
    id: p.podcastId || p.seriesId,
    seriesId: p.seriesId,
    title: p.title,
    description: p.description || '',
    category: p.category || 'General',
    tags: p.tags || [],
    coverImage: p.coverImageUrl || '',
    audioUrl: p.audioUrl || '',
    duration: p.durationSeconds ? formatDuration(p.durationSeconds) : '0:00',
    author: {
        id: p.authorId,
        name: p.authorFullName,
        avatar: p.authorProfilePhotoUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorFullName)}&background=6366f1&color=fff`,
    },
    episodeNumber: p.episodeNumber || 1,
    plays: p.playCount || 0,
    time: new Date(p.uploadedDate || p.createdDate).toLocaleString(),
});

export const mapNotification = (n) => {
    const iconMap = {
        Reaction: { icon: 'favorite', color: 'text-pink-400', bg: 'bg-pink-500/10' },
        Comment: { icon: 'chat_bubble', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        Follow: { icon: 'person_add', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        Mention: { icon: 'alternate_email', color: 'text-amber-400', bg: 'bg-amber-500/10' },
        JoinRequest: { icon: 'group_add', color: 'text-purple-400', bg: 'bg-purple-500/10' },
        Announcement: { icon: 'campaign', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    };
    const style = iconMap[n.notificationType] || { icon: 'notifications', color: 'text-slate-400', bg: 'bg-slate-500/10' };
    return {
        id: n.notificationId,
        type: n.notificationType?.toLowerCase() || 'general',
        text: n.message,
        time: formatRelativeTime(n.createdAt),
        unread: !n.isRead,
        ...style,
    };
};

// Helpers
function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}
