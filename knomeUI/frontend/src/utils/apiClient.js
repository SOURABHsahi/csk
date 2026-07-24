const BASE_URL = 'http://localhost:5095/api';

export const apiClient = {
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        
        // Setup headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = localStorage.getItem('knome_jwt');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                console.error("Unauthorized: Please log in again");
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

            return data.data; // Backend uses ApiResponse<T> where data is in .data property
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
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
        const url = `${BASE_URL}/users/profile/image`;
        const token = localStorage.getItem('knome_jwt');
        const formData = new FormData();
        formData.append('File', file);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            if (!response.ok) throw new Error((data && data.message) || 'Upload failed');
            return data.data;
        } catch (error) {
            console.error(`Upload Error on profile/image:`, error);
            throw error;
        }
    },

    async uploadFile(endpoint, file, type = 'doc') {
        const url = `${BASE_URL}${endpoint}`;
        const token = localStorage.getItem('knome_jwt');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            if (!response.ok) throw new Error((data && data.message) || 'Upload failed');
            return data.data; // MediaUploadResult
        } catch (error) {
            console.error(`Upload Error on ${endpoint}:`, error);
            throw error;
        }
    }
};
