const getHostIp = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        return window.location.hostname;
    }
    return 'localhost';
};

// Candidate Backend URLs ordered by priority (Direct Backend API first to avoid 5-10s connection timeouts)
const CANDIDATES = [
    `http://${getHostIp()}:5095/api`,
    'http://localhost:5095/api',
    `http://${getHostIp()}:5000/api`
];

let activeBaseUrl = CANDIDATES[0];

export const apiClient = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('knome_jwt');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const config = { ...options, headers };

        // 1. Try active cached base URL first
        try {
            const url = `${activeBaseUrl}${endpoint}`;
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (activeErr) {
            // If the server was reached and responded with an API error (4xx/5xx), do not failover to fallback proxies
            if (activeErr?.isApiError) {
                throw activeErr;
            }

            // 2. Only if network fetch failed completely, try candidate URLs
            for (const candidate of CANDIDATES) {
                if (candidate === activeBaseUrl) continue;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 500);
                    const url = `${candidate}${endpoint}`;
                    const response = await fetch(url, { ...config, signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    activeBaseUrl = candidate; // Cache working URL
                    return await this.handleResponse(response);
                } catch (candidateErr) {
                    if (candidateErr?.isApiError) throw candidateErr;
                }
            }
            console.error(`API Call failed across all endpoints for ${endpoint}`);
            throw activeErr;
        }
    },

    async handleResponse(response) {
        if (response.status === 401) {
            localStorage.removeItem('knome_jwt');
            localStorage.removeItem('knome_refresh');
            localStorage.removeItem('knome_employeeId');
            const err = new Error('Unauthorized');
            err.isApiError = true;
            err.status = 401;
            throw err;
        }

        if (response.status === 204) {
            return null;
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        
        if (!response.ok) {
            const errMessage = (data && (data.message || data.title)) || `API request failed with status ${response.status}`;
            const err = new Error(errMessage);
            err.isApiError = true;
            err.status = response.status;
            err.data = data;
            throw err;
        }

        return data?.data !== undefined ? data.data : data;
    },

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
    },

    put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
    },

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    },

    async uploadProfileImage(file) {
        const token = localStorage.getItem('knome_jwt');
        const formData = new FormData();
        formData.append('File', file);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        try {
            const response = await fetch(`${activeBaseUrl}/users/profile/image`, { method: 'POST', headers, body: formData });
            return (await this.handleResponse(response));
        } catch (e) {
            for (const candidate of CANDIDATES) {
                if (candidate === activeBaseUrl) continue;
                try {
                    const response = await fetch(`${candidate}/users/profile/image`, { method: 'POST', headers, body: formData });
                    activeBaseUrl = candidate;
                    return (await this.handleResponse(response));
                } catch { /* continue */ }
            }
            throw e;
        }
    },

    async uploadFile(endpoint, file, type = 'doc') {
        const token = localStorage.getItem('knome_jwt');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        try {
            const response = await fetch(`${activeBaseUrl}${endpoint}`, { method: 'POST', headers, body: formData });
            return (await this.handleResponse(response));
        } catch (e) {
            for (const candidate of CANDIDATES) {
                if (candidate === activeBaseUrl) continue;
                try {
                    const response = await fetch(`${candidate}${endpoint}`, { method: 'POST', headers, body: formData });
                    activeBaseUrl = candidate;
                    return (await this.handleResponse(response));
                } catch { /* continue */ }
            }
            throw e;
        }
    }
};
