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

    /** POST /users/profile/image */
    uploadImage: (file) => apiClient.uploadProfileImage(file),

    /** GET /Profiles/search?query=&departmentId= */
    search: (query, departmentId) => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (departmentId) params.append('departmentId', departmentId);
        return apiClient.get(`/Profiles/search?${params}`);
    },

    /** GET /users/suggestions */
    getSuggestions: () => apiClient.get('/users/suggestions'),

    /** POST /users/{userId}/follow */
    follow: (userId) => apiClient.post(`/users/${userId}/follow`),

    /** DELETE /users/{userId}/follow */
    unfollow: (userId) => apiClient.delete(`/users/${userId}/follow`),

    /** GET /users/{userId}/followers */
    getFollowers: (userId) => apiClient.get(`/users/${userId}/followers`),

    /** GET /users/{userId}/following */
    getFollowing: (userId) => apiClient.get(`/users/${userId}/following`),

    /** POST /users/{userId}/connect */
    connect: (userId) => apiClient.post(`/users/${userId}/connect`),

    /** DELETE /users/{userId}/connect/cancel */
    cancelConnection: (userId) => apiClient.delete(`/users/${userId}/connect/cancel`),

    /** DELETE /users/{userId}/connect */
    removeConnection: (userId) => apiClient.delete(`/users/${userId}/connect`),

    /** POST /users/connect/accept/{requestId} */
    acceptConnection: (requestId) => apiClient.post(`/users/connect/accept/${requestId}`),

    /** POST /users/connect/reject/{requestId} */
    rejectConnection: (requestId) => apiClient.post(`/users/connect/reject/${requestId}`),

    /** GET /users/connections/requests */
    getPendingRequests: () => apiClient.get('/users/connections/requests'),

    /** GET /users/{userId}/connections */
    getConnections: (userId) => apiClient.get(`/users/${userId}/connections`),
};

export const userApi = profileApi;

// ─────────────────────────────────────────────
//  FEED & DASHBOARD
// ─────────────────────────────────────────────
export const dashboardApi = {
    /** GET /feed/home?contentType=&pageNumber=&pageSize= */
    getFeed: (contentType, pageNumber = 1, pageSize = 20) => {
        const params = new URLSearchParams({ pageNumber, pageSize });
        if (contentType && contentType !== 'All') params.append('contentType', contentType);
        return apiClient.get(`/feed/home?${params}`);
    },

    /** GET /feed/hot?window=&top= */
    getHotFeed: (window = 'Daily', top = 10) => {
        const params = new URLSearchParams({ window, top });
        return apiClient.get(`/feed/hot?${params}`);
    },

    /** GET /feed/dashboard */
    getDashboardSummary: () => apiClient.get('/feed/dashboard'),

    // Reusing the old mock-oriented endpoints just in case they are wired elsewhere, 
    // but they should be migrated to real endpoints
    getSuggestedCommunities: () => apiClient.get('/feed/widgets/suggested-communities'),
    getSuggestedUsers: () => apiClient.get('/feed/widgets/suggested-users'),
    getLatestArticles: () => apiClient.get('/feed/widgets/latest-articles'),
    getLatestVideos: () => apiClient.get('/feed/widgets/latest-videos'),
    getLatestPodcasts: () => apiClient.get('/feed/widgets/latest-podcasts'),
    getTrendingPosts: () => apiClient.get('/feed/widgets/trending-posts'),
    getInternalJobs: () => apiClient.get('/feed/widgets/internal-jobs'),
    getKarmaLeaderboard: () => apiClient.get('/Karma/leaderboard'),
    getAnnouncements: () => apiClient.get('/Admin/announcements'),
};

// ─────────────────────────────────────────────
//  POSTS
// ─────────────────────────────────────────────
export const postsApi = {
    getAll: () => apiClient.get('/Posts'),
    getPosts: (audienceType = null, search = null, pageNumber = 1, pageSize = 100) => {
        let endpoint = `/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`;
        if (audienceType) endpoint += `&audienceType=${audienceType}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        return apiClient.get(endpoint);
    },
    getMyPosts: (pageNumber = 1, pageSize = 20) => apiClient.get(`/posts/my?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getById: (id) => apiClient.get(`/Posts/${id}`),
    getPost: (postId) => apiClient.get(`/posts/${postId}`),
    create: (data) => apiClient.post('/Posts', data),
    delete: (id) => apiClient.delete(`/Posts/${id}`),
};

// ─────────────────────────────────────────────
//  SAVED CONTENT & BOOKMARKS
// ─────────────────────────────────────────────
export const savedContentApi = {
    getSavedContent: ({ contentType = 'All', search = '', sortBy = 'NewestSaved', pageNumber = 1, pageSize = 20 } = {}) => {
        let endpoint = `/interactions/saved-content?pageNumber=${pageNumber}&pageSize=${pageSize}&sortBy=${sortBy}`;
        if (contentType && contentType !== 'All') endpoint += `&contentType=${encodeURIComponent(contentType)}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        return apiClient.get(endpoint);
    },
    getSavedCounts: () => apiClient.get('/interactions/saved-content/count'),
    getBookmarkStatus: (contentType, contentId) => apiClient.get(`/interactions/${contentType}/${contentId}/saved-status`),
    toggleBookmark: (contentType, contentId) => apiClient.post(`/interactions/${contentType}/${contentId}/bookmark`),
};

// ─────────────────────────────────────────────
//  ARTICLES
// ─────────────────────────────────────────────
export const articlesApi = {
    /** GET /Articles */
    getAll: () => apiClient.get('/Articles'),

    /** GET /Articles/{id} */
    getById: (id) => apiClient.get(`/Articles/${id}`),

    /** GET /Articles?authorId={id} (mock implementation using getAll) */
    getMyArticles: () => apiClient.get('/Articles?authorId=me'),

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

    /** GET /Videos/my */
    getMyVideos: (pageNumber = 1, pageSize = 20) => apiClient.get(`/Videos/my?pageNumber=${pageNumber}&pageSize=${pageSize}`),

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
    /** GET /Podcasts/series */
    getAllSeries: () => apiClient.get('/Podcasts/series'),
    /** GET /Podcasts */
    getAll: () => apiClient.get('/Podcasts'),
    /** GET /Podcasts/my */
    getMyPodcasts: (pageNumber = 1, pageSize = 20) => apiClient.get(`/Podcasts/my?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    /** GET /Podcasts/{id} */
    getById: (id) => apiClient.get(`/Podcasts/${id}`),
    /** POST /Podcasts */
    create: (data) => apiClient.post('/Podcasts', data),
    /** DELETE /Podcasts/{id} */
    delete: (id) => apiClient.delete(`/Podcasts/${id}`),
};

// ─────────────────────────────────────────────
//  COMMUNITIES
// ─────────────────────────────────────────────
export const communitiesApi = {
    getAll: () => apiClient.get('/Communities'),
    getMyCommunities: () => apiClient.get('/Communities/my'),
    getById: (id) => apiClient.get(`/Communities/${id}`),
    create: (data) => apiClient.post('/Communities', data),
    update: (id, data) => apiClient.put(`/Communities/${id}`, data),
    join: (id) => apiClient.post(`/Communities/${id}/join`),
    leave: (id) => apiClient.post(`/Communities/${id}/leave`),
    getMembers: (id) => apiClient.get(`/Communities/${id}/members`),
    getPosts: (id) => apiClient.get(`/Communities/${id}/posts`),
    decideMembership: (communityId, targetUserId, status) => apiClient.put(`/Communities/${communityId}/members/${targetUserId}/decide`, { status }),
};

// ─────────────────────────────────────────────
//  INTERACTIONS (Comments, Reactions, Bookmarks, Shares)
// ─────────────────────────────────────────────
export const interactionsApi = {
    getSummary: (type, id) => apiClient.get(`/interactions/${type}/${id}/summary`),
    getComments: (type, id) => apiClient.get(`/interactions/${type}/${id}/comments`),
    addComment: (type, id, commentText, parentCommentId = null) => apiClient.post(`/interactions/${type}/${id}/comments`, { commentText, parentCommentId }),
    getReactions: (type, id) => apiClient.get(`/interactions/${type}/${id}/reactions`),
    toggleReaction: (type, id, reactionType) => apiClient.post(`/interactions/${type}/${id}/react`, { reactionType }),
    toggleBookmark: (type, id) => apiClient.post(`/interactions/${type}/${id}/bookmark`),
    shareContent: (type, id, sharedToType, sharedToId = null) => apiClient.post(`/interactions/${type}/${id}/share`, { sharedToType, sharedToId }),
    reportContent: (type, id, data) => apiClient.post(`/interactions/${type}/${id}/report`, data),
    getPendingReports: (pageNumber = 1, pageSize = 20) => apiClient.get(`/interactions/reports/pending?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    resolveReport: (reportId, action, notes = '') => apiClient.put(`/interactions/reports/${reportId}/resolve`, { action, notes }),
};


// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────
export const notificationsApi = {
    /** GET /notifications?unreadOnly=false&pageNumber=1&pageSize=20 */
    getAll: (unreadOnly = false, pageNumber = 1, pageSize = 20) =>
        apiClient.get(`/notifications?unreadOnly=${unreadOnly}&pageNumber=${pageNumber}&pageSize=${pageSize}`),

    /** GET /notifications/unread-count */
    getUnreadCount: () => apiClient.get('/notifications/unread-count'),

    /** POST /notifications */
    create: (data) => apiClient.post('/notifications', data),

    /** PUT /notifications/{id}/read */
    markRead: (notificationId) =>
        apiClient.put(`/notifications/${notificationId}/read`),

    /** PUT /notifications/read-all */
    markAllRead: () => apiClient.put('/notifications/read-all'),

    /** DELETE /notifications/{id} */
    delete: (notificationId) => apiClient.delete(`/notifications/${notificationId}`),

    /** GET /notifications/preferences */
    getPreferences: () => apiClient.get('/notifications/preferences'),

    /** PUT /notifications/preferences */
    updatePreferences: (data) => apiClient.put('/notifications/preferences', data),
};

// ─────────────────────────────────────────────
//  KARMA
// ─────────────────────────────────────────────
export const karmaApi = {
    /** GET /karma/my */
    getMyBalance: () => apiClient.get('/karma/my'),

    /** GET /karma/user/{userId} */
    getUserBalance: (userId) => apiClient.get(`/karma/user/${userId}`),

    /** GET /karma/leaderboard */
    getLeaderboard: (top = 10) => apiClient.get(`/karma/leaderboard?top=${top}`),
};

// ─────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────
export const searchApi = {
    /** GET /Search?query=&contentType=&pageNumber=&pageSize=&sortBy=&department=&author=&tags=&fromDate=&toDate= */
    search: (query, contentType, pageNumber = 1, pageSize = 20, sortBy = 'relevance', department = null, author = null, tags = null, fromDate = null, toDate = null) => {
        const params = new URLSearchParams({ query: query || '', pageNumber, pageSize, sortBy });
        if (contentType && contentType !== 'All') params.append('contentType', contentType);
        if (department && department !== 'All') params.append('department', department);
        if (author) params.append('author', author);
        if (tags) params.append('tags', tags);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        return apiClient.get(`/Search?${params}`);
    },

    /** GET /Search/suggestions?query=&count= */
    getSuggestions: (query, count = 8) => {
        const params = new URLSearchParams({ query: query || '', count });
        return apiClient.get(`/Search/suggestions?${params}`);
    },

    /** GET /Search/trending?count= */
    getTrending: (count = 10) => {
        return apiClient.get(`/Search/trending?count=${count}`);
    },

    searchUsers: (query, pageSize = 100) => {
        const params = new URLSearchParams({ query: query || '', pageSize });
        return apiClient.get(`/Search/users?${params}`);
    },

    /** GET /Search/history */
    getHistory: (count = 10) => apiClient.get(`/Search/history?count=${count}`),

    /** DELETE /Search/history?term= */
    clearHistory: (term = null) => {
        const params = term ? `?term=${encodeURIComponent(term)}` : '';
        return apiClient.delete(`/Search/history${params}`);
    },
};

// ─────────────────────────────────────────────
//  ADMIN & MODERATION
// ─────────────────────────────────────────────
export const adminApi = {
    /** GET /users */
    getUsers: (pageNumber = 1, pageSize = 20, search = '') => {
        const params = new URLSearchParams({ pageNumber, pageSize });
        if (search) params.append('search', search);
        return apiClient.get(`/users?${params}`);
    },

    /** PUT /users/{id}/suspend */
    suspendUser: (userId, reason, durationDays = 7) => {
        const isPermanent = Number(durationDays) >= 3650;
        const suspendedUntil = isPermanent 
            ? null 
            : new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000).toISOString();

        return apiClient.put(`/users/${userId}/suspend`, {
            reason: reason || 'Violation of Guidelines',
            isPermanent,
            suspendedUntil
        });
    },

    /** PUT /users/{id}/activate */
    activateUser: (userId) => 
        apiClient.put(`/users/${userId}/activate`),

    /** GET /audit/logs */
    getAuditLogs: (pageNumber = 1, pageSize = 20) => 
        apiClient.get(`/audit/logs?pageNumber=${pageNumber}&pageSize=${pageSize}`),

    /** GET /Admin/announcements */
    getAnnouncements: () => apiClient.get('/Admin/announcements'),

    /** POST /Admin/announcements */
    createAnnouncement: (data) => apiClient.post('/Admin/announcements', data),

    /** DELETE /Admin/announcements/{id} */
    deleteAnnouncement: (id) => apiClient.delete(`/Admin/announcements/${id}`),
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
//  MEDIA
// ─────────────────────────────────────────────
export const mediaApi = {
    /** POST /media/upload */
    uploadFile: (file, type, onProgress) => {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            if (type) formData.append('type', type);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://localhost:5095/api/media/upload', true);
            
            const token = localStorage.getItem('knome_jwt');
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            if (onProgress && xhr.upload) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 100);
                        onProgress(percentComplete);
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const json = JSON.parse(xhr.responseText);
                        resolve(json.data);
                    } catch (err) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`Failed to upload file: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    }
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

export const resolveMediaUrl = (url) => {
    if (!url) return null;
    let cleaned = url.replace(/\\/g, '/');
    if (cleaned.startsWith('http')) {
        return cleaned;
    }
    if (!cleaned.startsWith('/')) {
        cleaned = '/' + cleaned;
    }
    if (cleaned.startsWith('/media/')) {
        cleaned = '/uploads' + cleaned;
    }
    return `http://localhost:5095${cleaned}`;
};

export const mapPost = (post) => {
    const extractedTags = (post.tags && post.tags.length > 0)
        ? post.tags
        : (post.contentText ? (post.contentText.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.replace('#', '')) : []);

    const authorName = post.authorFullName || post.authorUser?.fullName || 'User';

    return {
        id: post.postId,
        author: {
            id: post.authorId || post.authorUserId,
            name: authorName,
            role: post.authorDesignation || post.authorUser?.designation || 'Contributor',
            avatar: resolveMediaUrl(post.authorProfilePhotoUrl || post.authorUser?.profilePhotoUrl) ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&size=256&bold=true`,
            isVerified: false,
        },
        type: 'post',
        time: new Date(post.publishedDate || post.createdDate).toLocaleString(),
        content: post.contentText || '',
        tags: extractedTags,
        attachments: (post.attachments && post.attachments.length > 0)
            ? post.attachments.map((a) => ({
                id: a.attachmentId,
                type: ATTACHMENT_TYPE_MAP[a.fileType] || 'image',
                url: resolveMediaUrl(a.fileUrl),
                name: a.fileUrl?.split('/').pop() || 'attachment',
            }))
            : (post.postAttachments && post.postAttachments.length > 0)
            ? post.postAttachments.map((a) => ({
                id: a.attachmentId,
                type: ATTACHMENT_TYPE_MAP[a.fileType] || 'image',
                url: resolveMediaUrl(a.fileUrl),
                name: a.fileUrl?.split('/').pop() || 'attachment',
            }))
            : (post.attachmentUrls || []).map((url, idx) => ({
                id: idx + 1,
                type: 'image',
                url: resolveMediaUrl(url),
                name: url?.split('/').pop() || 'attachment',
            })),
        likes: post.reactionCount || post.engagementSummary?.reactionCount || post.engagementSummary?.reactionSummary?.totalCount || 0,
        shares: post.shareCount || post.engagementSummary?.shareCount || post.engagementSummary?.sharesCount || 0,
        isSaved: post.isBookmarked || post.engagementSummary?.isBookmarkedByCurrentUser || false,
        userReaction: post.engagementSummary?.reactionSummary?.currentUserReactionType?.toLowerCase() || null,
        comments: [],
        communityName: post.communityName || null,
    };
};

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
            `https://ui-avatars.com/api/?name=${encodeURIComponent(article.authorFullName)}&background=6366f1&color=fff&size=256&bold=true`,
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
            `https://ui-avatars.com/api/?name=${encodeURIComponent(v.authorFullName)}&background=6366f1&color=fff&size=256&bold=true`,
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
            `https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorFullName)}&background=6366f1&color=fff&size=256&bold=true`,
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

export const mapFeedItem = (item) => {
    const author = {
        id: item.authorUserId,
        name: item.authorFullName,
        role: item.authorDesignation || 'Contributor',
        avatar: resolveMediaUrl(item.authorProfilePhotoUrl) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.authorFullName || 'User')}&background=6366f1&color=fff`,
        isVerified: false,
    };

    const base = {
        id: item.contentId,
        type: item.contentType.toLowerCase(),
        author,
        time: new Date(item.publishedDate).toLocaleString(),
        likes: item.engagementSummary?.reactionCount || 0,
        shares: item.engagementSummary?.shareCount || 0,
        views: item.engagementSummary?.viewCount || 0,
        isSaved: item.engagementSummary?.isBookmarkedByCurrentUser || false,
        comments: [], // Comments are loaded lazily on expand
        title: item.title,
        content: item.textSummary,
    };

    if (item.contentType === 'Post') {
        base.attachments = item.attachmentUrl ? [{
            id: 1,
            type: 'image', // simplified for feed item mapping
            url: item.attachmentUrl.startsWith('/') ? `http://localhost:5095${item.attachmentUrl}` : item.attachmentUrl,
            name: 'attachment'
        }] : [];
    } else if (item.contentType === 'Article') {
        base.image = item.attachmentUrl?.startsWith('/') ? `http://localhost:5095${item.attachmentUrl}` : (item.attachmentUrl || '');
        base.readTime = '5 min read'; // Default fallback
        base.subtitle = item.textSummary;
    } else if (item.contentType === 'Video') {
        base.thumbnail = item.attachmentUrl;
    } else if (item.contentType === 'Podcast') {
        base.coverImage = item.attachmentUrl;
    }
    return base;
};
