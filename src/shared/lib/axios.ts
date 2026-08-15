// ============================================================
// Axios Instance — Configured with JWT interceptors
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor: attach auth token (clientToken for portal, qt_tokens for admin CRM)
api.interceptors.request.use((config) => {
  if (config.url?.includes('/v1/portal') || window.location.pathname.startsWith('/portal')) {
    const clientToken = localStorage.getItem('clientToken');
    if (clientToken) {
      config.headers.Authorization = `Bearer ${clientToken}`;
      return config;
    }
  }

  const tokens = localStorage.getItem('qt_tokens');
  if (tokens) {
    const { accessToken } = JSON.parse(tokens) as { accessToken: string };
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queue to hold failed requests while token is refreshing
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: handle 401 with queued token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the response is unauthorized and the request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If this is a client portal request or user is on a portal route
      if (originalRequest.url?.includes('/v1/portal') || window.location.pathname.startsWith('/portal')) {
        localStorage.removeItem('clientToken');
        localStorage.removeItem('clientInfo');
        if (window.location.pathname !== '/portal/login' && window.location.pathname !== '/portal/activate') {
          window.location.href = '/portal/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request until the token is refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = localStorage.getItem('qt_tokens');
        if (!tokens) throw new Error('No tokens');

        const { refreshToken } = JSON.parse(tokens) as { refreshToken: string };
        
        // Resolve dynamic refresh URL to prevent routing issues in production
        const baseURL = import.meta.env.VITE_API_URL || '/api';
        const refreshUrl = `${baseURL.replace(/\/$/, '')}/auth/refresh-token`;
        
        const { data } = await axios.post(refreshUrl, { refreshToken });

        const newTokens = data.data;
        localStorage.setItem('qt_tokens', JSON.stringify(newTokens));

        // Update the original request's authorization header
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

        // Resolve all waiting requests with the new token
        processQueue(null, newTokens.accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (err) {
        // Reject all queued requests and log the user out
        processQueue(err, null);
        isRefreshing = false;

        if (window.location.pathname.startsWith('/portal')) {
          localStorage.removeItem('clientToken');
          localStorage.removeItem('clientInfo');
          window.location.href = '/portal/login';
        } else {
          localStorage.removeItem('qt_tokens');
          localStorage.removeItem('qt_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
