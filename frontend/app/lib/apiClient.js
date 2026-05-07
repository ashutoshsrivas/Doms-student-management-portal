import axios from 'axios';
import Cookie from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookie.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[apiClient] Token found, Authorization header set:', token.substring(0, 20) + '...');
    } else {
      console.log('[apiClient] No token found in cookies');
    }

    // Normalize relative API URLs so baseURL path segments are preserved.
    if (typeof config.url === 'string' && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }

    // Don't force Content-Type for FormData - let axios/browser set it automatically with boundary
    if (config.data instanceof FormData) {
      console.log('[apiClient] FormData detected, removing Content-Type to let browser set it with boundary');
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    console.log('[apiClient] Error response:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: originalRequest?.url,
    });

    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookie.get('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { token } = response.data;
        Cookie.set('token', token, { expires: 1 });

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
