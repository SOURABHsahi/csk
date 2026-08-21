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

    /** User Content for Profile View */
    getUserPosts: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/posts/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getUserArticles: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/articles/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getUserVideos: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/videos/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getUserPodcasts: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/podcasts/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getUserCommunities: (userId) => apiClient.get(`/communities/user/${userId}`),
};

export const userApi = profileApi;

// ─────────────────────────────────────────────
//  ROLE ASSIGNMENT REQUESTS
// ─────────────────────────────────────────────
export const roleRequestsApi = {
    /** GET /users/role-requests?status= */
    getAll: (status) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        return apiClient.get(`/users/role-requests?${params}`);
    },
    /** POST /users/role-requests/{id}/approve */
    approve: (requestId, roleName = 'Employee', comment = '') =>
        apiClient.post(`/users/role-requests/${requestId}/approve`, { roleName, comment }),
    /** POST /users/role-requests/{id}/reject */
    reject: (requestId, reason = '') =>
        apiClient.post(`/users/role-requests/${requestId}/reject`, { reason }),
};

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
    getAnnouncements: () => apiClient.get('/notifications').catch(() => []),
};

// ─────────────────────────────────────────────
//  POSTS
// ─────────────────────────────────────────────
export const postsApi = {
    getAll: (pageNumber = 1, pageSize = 20) => apiClient.get(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getPosts: (audienceType = null, search = null, pageNumber = 1, pageSize = 100) => {
        let endpoint = `/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`;
        if (audienceType) endpoint += `&audienceType=${audienceType}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
        return apiClient.get(endpoint);
    },
    getMyPosts: (pageNumber = 1, pageSize = 20) => apiClient.get(`/posts/my?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getByUserId: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/posts/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    getById: (id) => apiClient.get(`/posts/${id}`),
    getPost: (postId) => apiClient.get(`/posts/${postId}`),
    create: (data) => apiClient.post('/posts', data),
    delete: (id) => apiClient.delete(`/posts/${id}`),
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

    /** GET /Articles/my */
    getMyArticles: (pageNumber = 1, pageSize = 20) => apiClient.get(`/Articles/my?pageNumber=${pageNumber}&pageSize=${pageSize}`),

    /** GET /Articles/user/{userId} */
    getByUserId: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/Articles/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),

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

    /** GET /Videos/user/{userId} */
    getByUserId: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/Videos/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),

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
    /** GET /Podcasts/user/{userId} */
    getByUserId: (userId, pageNumber = 1, pageSize = 20) => apiClient.get(`/Podcasts/user/${userId}?pageNumber=${pageNumber}&pageSize=${pageSize}`),
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
    getByUserId: (userId) => apiClient.get(`/Communities/user/${userId}`),
    getById: (id) => apiClient.get(`/Communities/${id}`),
    create: (data) => apiClient.post('/Communities', data),
    update: (id, data) => apiClient.put(`/Communities/${id}`, data),
    delete: (id) => apiClient.delete(`/Communities/${id}`),
    join: (id) => apiClient.post(`/Communities/${id}/join`),
    leave: (id) => apiClient.post(`/Communities/${id}/leave`),
    getMembers: (id) => apiClient.get(`/Communities/${id}/members`),
    getPosts: (id) => apiClient.get(`/Communities/${id}/posts`),
    decideMembership: (communityId, targetUserId, status) => apiClient.put(`/Communities/${communityId}/members/${targetUserId}/decide`, { status }),
};

/** Helper to resolve high-res cover banner & avatar photo for enterprise communities */
export const getCommunityImages = (name = '', category = '') => {
    const n = (name || '').toLowerCase().trim();
    if (n.includes('dotnet') || n.includes('c#')) {
        return {
            banner: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('executive') || n.includes('ai') || n.includes('data') || n.includes('ml')) {
        return {
            banner: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('fullstack') || n.includes('frontend') || n.includes('guild') || n.includes('web')) {
        return {
            banner: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('tech') || n.includes('architecture') || n.includes('engineering')) {
        return {
            banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('hr') || n.includes('people') || n.includes('culture') || n.includes('employee')) {
        return {
            banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('finance') || n.includes('accounting') || n.includes('budget')) {
        return {
            banner: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('marketing') || n.includes('brand') || n.includes('design')) {
        return {
            banner: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1542744094-3a3172720189?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }
    if (n.includes('cto') || n.includes('leadership') || n.includes('circle')) {
        return {
            banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200&h=400',
            thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=300&h=300'
        };
    }

    return {
        banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400',
        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=300&h=300'
    };
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
    resolveReport: (reportId, action, notes = '') => {
        const isDismiss = action === 'Ignore' || action === 'Dismiss';
        const status = isDismiss ? 'Dismissed' : 'Resolved';
        const actionTaken = action === 'Ignore' ? 'Dismissed' : (action || 'Action Taken');
        return apiClient.put(`/interactions/reports/${reportId}/resolve`, { status, actionTaken });
    },
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

    /** POST /Search/history */
    saveHistory: (term) => {
        if (!term || typeof term !== 'string' || term.trim().length < 3) return Promise.resolve(null);
        return apiClient.post('/Search/history', { searchTerm: term.trim() }).catch(() => null);
    },

    /** DELETE /Search/history?term= */
    clearHistory: (term = null) => {
        const params = term ? `?term=${encodeURIComponent(term)}` : '';
        return apiClient.delete(`/Search/history${params}`);
    },
};

/** Helper to save recent searches locally in localStorage (Max 10) */
export const saveRecentSearch = (term) => {
    if (!term || typeof term !== 'string') return;
    const cleanTerm = term.trim();
    if (!cleanTerm || cleanTerm.length < 3) return;

    try {
        const stored = localStorage.getItem('knome_recent_searches');
        let list = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(list)) list = [];

        list = list.filter(item => item && item.searchTerm && item.searchTerm.toLowerCase() !== cleanTerm.toLowerCase());
        list.unshift({
            searchTerm: cleanTerm,
            searchDate: new Date().toISOString()
        });

        list = list.slice(0, 10);
        localStorage.setItem('knome_recent_searches', JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save recent search to localStorage', e);
    }
};

export const getLocalRecentSearches = () => {
    try {
        const stored = localStorage.getItem('knome_recent_searches');
        const list = stored ? JSON.parse(stored) : [];
        return Array.isArray(list) ? list.slice(0, 10) : [];
    } catch (e) {
        return [];
    }
};

export const clearLocalRecentSearches = (term = null) => {
    try {
        if (term) {
            const stored = localStorage.getItem('knome_recent_searches');
            let list = stored ? JSON.parse(stored) : [];
            if (Array.isArray(list)) {
                list = list.filter(item => item && item.searchTerm && item.searchTerm.toLowerCase() !== term.toLowerCase());
                localStorage.setItem('knome_recent_searches', JSON.stringify(list));
            }
        } else {
            localStorage.removeItem('knome_recent_searches');
        }
    } catch (e) {
        console.error('Failed to clear recent searches from localStorage', e);
    }
};

// ─────────────────────────────────────────────
//  ADMIN & MODERATION
// ─────────────────────────────────────────────
export const adminApi = {
    getRoleRequests: (status) => roleRequestsApi.getAll(status),
    approveRoleRequest: (requestId, roleName, comment) => roleRequestsApi.approve(requestId, roleName, comment),
    rejectRoleRequest: (requestId, reason) => roleRequestsApi.reject(requestId, reason),

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

    /** PUT /users/{id}/roles */
    changeUserRoles: (userId, roleNames) =>
        apiClient.put(`/users/${userId}/roles`, { roleNames: Array.isArray(roleNames) ? roleNames : [roleNames] }),

    /** GET /audit/logs */
    getAuditLogs: (pageNumber = 1, pageSize = 20) => 
        apiClient.get(`/audit/logs?pageNumber=${pageNumber}&pageSize=${pageSize}`),

    /** POST /audit/logs */
    createAuditLog: (action, targetType, targetId, reason) =>
        apiClient.post('/audit/logs', { action, targetType, targetId: Number(targetId) || 0, reason }).catch(() => {}),

    /** GET /notifications/user */
    getAnnouncements: () => apiClient.get('/notifications').catch(() => []),

    /** POST /notifications/broadcast */
    createAnnouncement: (data) => apiClient.post('/notifications/broadcast', data),

    /** DELETE /notifications/{id} */
    deleteAnnouncement: (id) => apiClient.delete(`/notifications/${id}`),
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
    upload: (file, type) => mediaApi.uploadFile(file, type),
    /** POST /media/upload */
    uploadFile: (file, type, onProgress) => {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            if (type) formData.append('type', type);

            const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://${host}:5095/api/media/upload`, true);
            
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
    /** GET /analytics/engagement */
    getEngagement: () => apiClient.get('/analytics/engagement'),

    /** GET /analytics/community-health */
    getCommunityHealth: () => apiClient.get('/analytics/community-health'),

    /** GET /analytics/content-performance */
    getContentPerformance: () => apiClient.get('/analytics/content-performance'),

    /** GET /analytics/content (alias) */
    getContent: () => apiClient.get('/analytics/content-performance'),

    /** GET /analytics/trending (alias) */
    getTrending: () => apiClient.get('/analytics/community-health'),

    /** GET /analytics/moderation (alias) */
    getModeration: () => apiClient.get('/interactions/reports/pending'),
};

// ─────────────────────────────────────────────
//  MAPPERS — Backend DTO → Frontend shape
// ─────────────────────────────────────────────
const ATTACHMENT_TYPE_MAP = { Image: 'image', Document: 'doc', Video: 'video', Audio: 'audio' };

export const resolveMediaUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    if (url.startsWith('oklch') || url.startsWith('rgb') || url.startsWith('hsl') || url.startsWith('#')) {
        return null;
    }
    let cleaned = url.replace(/\\/g, '/');
    if (!cleaned.startsWith('/')) {
        cleaned = '/' + cleaned;
    }
    if (cleaned.startsWith('/media/')) {
        cleaned = '/uploads' + cleaned;
    }
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
    return `http://${host}:5095${cleaned}`;
};

export const getVideoThumbnail = (video) => {
    if (!video) return null;
    
    const url = video.sourceUrl || video.videoUrl || video.url || '';
    
    // 1. Extract YouTube Thumbnail directly from YouTube Video ID
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    if (ytMatch && ytMatch[1]) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }

    if (url.includes('PLfqMhTWNBTe2C_dQAP1UoemcgAxBTlItp')) {
        return 'https://img.youtube.com/vi/tVzUXW6siu0/hqdefault.jpg';
    }

    // 2. Direct custom thumbnail if specified and not an unsplash fallback
    const rawThumb = video.thumbnail || video.thumbnailUrl || video.coverImageUrl;
    if (rawThumb && typeof rawThumb === 'string' && !rawThumb.includes('unsplash.com')) {
        if (rawThumb.startsWith('http://') || rawThumb.startsWith('https://')) {
            return rawThumb;
        }
        return resolveMediaUrl(rawThumb) || rawThumb;
    }
    
    // Return null so HTML5 <video preload="metadata"> renders frame 0 from the video itself
    return null;
};


export const mapPost = (post) => {
    const extractedTags = (post.tags && post.tags.length > 0)
        ? post.tags
        : (post.contentText ? (post.contentText.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.replace('#', '')) : []);

    const authorName = post.authorFullName || post.authorUser?.fullName || 'User';
    const commentsCount = post.commentsCount ?? post.commentCount ?? post.engagementSummary?.commentsCount ?? post.engagementSummary?.commentCount ?? (Array.isArray(post.comments) ? post.comments.length : 0);

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
        commentsCount: commentsCount,
        isSaved: post.isBookmarked || post.engagementSummary?.isBookmarkedByCurrentUser || false,
        userReaction: post.engagementSummary?.reactionSummary?.currentUserReactionType?.toLowerCase() || null,
        comments: Array.isArray(post.comments) ? post.comments : [],
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
    image: resolveMediaUrl(article.thumbnailUrl) || (article.thumbnailUrl || ''),
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
    commentsCount: article.commentsCount ?? article.commentCount ?? article.engagementSummary?.commentsCount ?? 0,
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
    commentsCount: v.commentsCount ?? v.commentCount ?? v.engagementSummary?.commentsCount ?? 0,
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
    commentsCount: p.commentsCount ?? p.commentCount ?? p.engagementSummary?.commentsCount ?? 0,
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
            url: resolveMediaUrl(item.attachmentUrl) || item.attachmentUrl,
            name: 'attachment'
        }] : [];
    } else if (item.contentType === 'Article') {
        base.image = resolveMediaUrl(item.attachmentUrl) || (item.attachmentUrl || '');
        base.readTime = '5 min read'; // Default fallback
        base.subtitle = item.textSummary;
    } else if (item.contentType === 'Video') {
        base.thumbnail = item.attachmentUrl;
    } else if (item.contentType === 'Podcast') {
        base.coverImage = item.attachmentUrl;
    }
    return base;
};

/**
 * Personalized Recommendation Engine:
 * Scores content items (Posts, Articles, Videos, Podcasts) based on:
 * 1. User recent search queries
 * 2. User saved categories/bookmarks
 * 3. Topic matches (tags, category, title, description)
 * 4. Engagement signals (likes, views)
 * 5. Returns items sorted by highest relevance match percentage!
 */
export const getPersonalizedRecommendations = (items = [], currentUser = null) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const recentSearches = getLocalRecentSearches().map(s => s.searchTerm.toLowerCase());
    
    let savedKeywords = [];
    try {
        const savedPosts = JSON.parse(localStorage.getItem('knome_saved_posts_full') || '[]');
        const savedArticles = JSON.parse(localStorage.getItem('knome_saved_articles_full') || '[]');
        const savedVideos = JSON.parse(localStorage.getItem('knome_saved_videos_full') || '[]');
        const savedPodcasts = JSON.parse(localStorage.getItem('knome_saved_podcasts_full') || '[]');
        const allSaved = [...savedPosts, ...savedArticles, ...savedVideos, ...savedPodcasts];

        allSaved.forEach(item => {
            if (item.category) savedKeywords.push(item.category.toLowerCase());
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(t => savedKeywords.push(typeof t === 'string' ? t.replace('#', '').toLowerCase() : ''));
            }
        });
    } catch (e) {}

    const userDept = currentUser?.department?.toLowerCase() || '';

    const scored = items.map(item => {
        let score = 65; // base score
        let matchReasons = [];

        const title = (item.title || item.contentText || '').toLowerCase();
        const desc = (item.description || item.subtitle || item.content || '').toLowerCase();
        const category = (item.category || item.categoryName || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.map(t => typeof t === 'string' ? t.replace('#', '').toLowerCase() : '') : [];

        // 1. Search term match (+20 pts)
        recentSearches.forEach(term => {
            if (term && (title.includes(term) || desc.includes(term) || category.includes(term) || tags.includes(term))) {
                score += 20;
                if (!matchReasons.includes(`Matches search "${term}"`)) {
                    matchReasons.push(`Based on recent search "${term}"`);
                }
            }
        });

        // 2. Saved interest match (+15 pts)
        savedKeywords.forEach(kw => {
            if (kw && (category.includes(kw) || tags.includes(kw) || title.includes(kw))) {
                score += 15;
                if (!matchReasons.includes(`Matches interest in ${kw}`)) {
                    matchReasons.push(`Based on interest in ${kw}`);
                }
            }
        });

        // 3. Department relevance (+10 pts)
        if (userDept && (category.includes(userDept) || desc.includes(userDept) || title.includes(userDept))) {
            score += 10;
            matchReasons.push(`Relevant for ${currentUser.department}`);
        }

        // 4. Popularity bonus (+5 pts)
        const likes = item.likes || item.reactionCount || item.views || 0;
        if (likes > 5) score += 5;

        const matchPercent = Math.min(Math.max(score, 50), 99);
        const reasonText = matchReasons[0] || (category ? `Popular in ${category}` : `Top pick for your profile`);

        return {
            ...item,
            recommendationScore: matchPercent,
            recommendationReason: reasonText,
            isRecommended: true
        };
    });

    return scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
};


