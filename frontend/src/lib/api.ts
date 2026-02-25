import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies (refresh token)
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

// Request interceptor - add access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token using cookie (normal login) or localStorage (OAuth login)
        const localRefreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          localRefreshToken ? { refreshToken: localRefreshToken } : {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.accessToken;

        // Store new access token
        localStorage.setItem('accessToken', newAccessToken);

        // Update the failed request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Process queued requests
        refreshQueue.forEach((callback) => callback(newAccessToken));
        refreshQueue = [];

        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        isRefreshing = false;
        refreshQueue = [];

        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');

        // Redirect to login
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
