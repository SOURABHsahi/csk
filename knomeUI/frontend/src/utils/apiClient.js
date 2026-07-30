// Layer 1 (React UI) -> Layer 2 (Next.js BFF) -> Layer 3 & 4 (API Gateway + YARP) -> Layer 5 (Backend API) -> Layer 6 (Database)
const PRIMARY_URL = window.ENV_BFF_URL || 'http://localhost:3000/api/proxy';
const GATEWAY_URL = 'http://localhost:5000/api';
const DIRECT_BACKEND_URL = 'http://localhost:5095/api';

export const apiClient = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('knome_jwt');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const config = { ...options, headers };

        // Attempt 1: Next.js BFF -> Gateway -> Backend -> SQL Server DB
        try {
            const url = `${PRIMARY_URL}${endpoint}`;
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (bffError) {
            // Attempt 2: Direct API Gateway (YARP) -> Backend -> SQL Server DB
            try {
                const url = `${GATEWAY_URL}${endpoint}`;
                const response = await fetch(url, config);
                return await this.handleResponse(response);
            } catch (gatewayError) {
                // Attempt 3: Direct Backend API -> SQL Server DB
                try {
                    const url = `${DIRECT_BACKEND_URL}${endpoint}`;
                    const response = await fetch(url, config);
                    return await this.handleResponse(response);
                } catch (backendError) {
                    console.error(`API Call failed across all layers for ${endpoint}:`, backendError);
                    throw backendError;
                }
            }
        }
    },

    async handleResponse(response) {
        if (response.status === 401) {
            localStorage.removeItem('knome_jwt');
            localStorage.removeItem('knome_refresh');
            localStorage.removeItem('knome_employeeId');
            throw new Error('Unauthorized');
        }

        if (response.status === 204) {
            return null;
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        
        if (!response.ok) {
            throw new Error((data && data.message) || 'API request failed');
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
            const response = await fetch(`${PRIMARY_URL}/users/profile/image`, { method: 'POST', headers, body: formData });
            return (await this.handleResponse(response));
        } catch (e) {
            try {
                const response = await fetch(`${DIRECT_BACKEND_URL}/users/profile/image`, { method: 'POST', headers, body: formData });
                return (await this.handleResponse(response));
            } catch (err) {
                console.error(`Upload Error on profile/image:`, err);
                throw err;
            }
        }
    },

    async uploadFile(endpoint, file, type = 'doc') {
        const token = localStorage.getItem('knome_jwt');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        try {
            const response = await fetch(`${PRIMARY_URL}${endpoint}`, { method: 'POST', headers, body: formData });
            return (await this.handleResponse(response));
        } catch (e) {
            try {
                const response = await fetch(`${DIRECT_BACKEND_URL}${endpoint}`, { method: 'POST', headers, body: formData });
                return (await this.handleResponse(response));
            } catch (err) {
                console.error(`Upload Error on ${endpoint}:`, err);
                throw err;
            }
        }
    }
};
