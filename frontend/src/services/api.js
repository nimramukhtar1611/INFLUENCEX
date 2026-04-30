// services/api.js - COMPLETE PRODUCTION-READY VERSION
import axios from 'axios';
import tokenRefreshService from './tokenRefreshService';

// ==================== CONFIGURATION ====================
const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configuredUrl = normalizeUrl(import.meta.env.VITE_API_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined' && !import.meta.env.PROD) {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${host}:5000/api`;
    }
  }

  return import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
};

const API_BASE_URL = resolveApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // Send cookies if any
});

// ==================== TOKEN MANAGEMENT ====================
const getToken = () => {
  // Try to get from localStorage first (backward compatibility)
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // For HttpOnly cookies, tokens will be sent automatically
  return null;
};

const getRefreshToken = () => {
  // Try to get from localStorage first (backward compatibility)
  const localRefreshToken = localStorage.getItem('refreshToken');
  if (localRefreshToken) return localRefreshToken;
  
  // For HttpOnly cookies, refresh token will be sent automatically
  return null;
};
const getActiveBrandContextId = () => localStorage.getItem('activeBrandContextId');
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const isAdminSession = () => {
  const role = getStoredUser()?.userType || getStoredUser()?.role;
  return role === 'admin' || role === 'super_admin' || window.location.pathname.startsWith('/admin');
};
const getLoginRoute = () => (isAdminSession() ? '/admin/login' : '/login');
const redirectToLogin = () => {
  window.location.href = getLoginRoute();
};
const setTokens = (token, refreshToken) => {
  if (token) localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};
const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.url?.includes('/auth/refresh') && localStorage.getItem('refreshToken')) {
      config.headers['x-refresh-token'] = localStorage.getItem('refreshToken');
    }

    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    })();
    const isBrandUser = (storedUser?.userType || storedUser?.role) === 'brand';
    const isBrandWorkspace = window.location.pathname.startsWith('/brand');
    const activeBrandContextId = localStorage.getItem('activeBrandContextId');
    if (isBrandUser && isBrandWorkspace && activeBrandContextId) {
      config.headers['x-brand-context'] = activeBrandContextId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== RESPONSE INTERCEPTOR ====================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Retry logic for temporary server issues
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const shouldRetry = (error) => {
  const status = error.response?.status;
  const code = error.code;
  
  // Retry on network errors and server errors that might be temporary
  return (
    code === 'ECONNRESET' || 
    code === 'ENOTFOUND' || 
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    status === 503 || // Service Unavailable
    status === 502 || // Bad Gateway
    status === 504 || // Gateway Timeout
    status === 500    // Internal Server Error (might be temporary)
  );
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    
        
    return response;
  },
  async (error) => {
        
    if (import.meta.env.DEV) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }
    const originalRequest = error.config;

    // Initialize retry count
    originalRequest._retryCount = originalRequest._retryCount || 0;
    
    // Check if we should retry this error (before auth handling)
    if (shouldRetry(error) && originalRequest._retryCount < MAX_RETRIES) {
      originalRequest._retryCount++;
      console.log(`🔄 API request retry ${originalRequest._retryCount}/${MAX_RETRIES} for ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
      
      // Exponential backoff
      const delayMs = RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1);
      await delay(delayMs);
      
      // Retry the request
      return api(originalRequest);
    }

    // Prevent infinite loops for auth retries
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        success: false,
        error: 'Request timeout. Please try again.',
        code: 'TIMEOUT',
      });
    }

    if (!error.response) {
      return Promise.reject({
        success: false,
        error: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized - IMPROVED RACE CONDITION HANDLING
    if (status === 401 && !originalRequest._retry) {
      // Don't retry on auth endpoints including refresh
      const isAuthEndpoint =
        originalRequest.url?.includes('/admin/login') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/admin/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/refresh-token');

      if (isAuthEndpoint) {
        // Clear tokens and redirect to login for refresh failures
        if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/refresh-token')) {
          console.warn('Refresh endpoint failed, clearing tokens and redirecting');
          clearTokens();
          redirectToLogin();
        }
        return Promise.reject(error);
      }

      // Check if token exists - if not, this might be race condition, don't logout yet
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        console.warn('No token in localStorage, possible race condition - not logging out');
        return Promise.reject({
          success: false,
          error: 'Authentication token not available',
          code: 'NO_TOKEN_RACE_CONDITION',
          shouldNotLogout: true // Flag to prevent logout
        });
      }

      // Check if refresh token exists
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        console.warn('No refresh token available, redirecting to login');
        clearTokens();
        redirectToLogin();
        return Promise.reject({
          success: false,
          error: 'Session expired. Please login again.',
          code: 'NO_REFRESH_TOKEN',
        });
      }

      // Mark request for retry to prevent infinite loops
      originalRequest._retry = true;

      // If already refreshing, queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Use tokenRefreshService to handle refresh (centralized logic)
        const newToken = await tokenRefreshService.refreshToken();
        
        // Update default auth header
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);
        processQueue(refreshError, null);
        
        // Clear tokens and redirect on refresh failure
        clearTokens();
        redirectToLogin();
        return Promise.reject({
          success: false,
          error: 'Session expired. Please login again.',
          code: 'REFRESH_FAILED',
        });
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (status === 403) {
      return Promise.reject({
        success: false,
        error: data?.error || 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      });
    }

    // Handle 404 Not Found
    if (status === 404) {
      return Promise.reject({
        success: false,
        error: data?.error || 'Resource not found.',
        code: 'NOT_FOUND',
      });
    }

    // Handle 429 Rate Limit
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.warn(`⚠️ Rate limit hit, retry after ${retryAfter}s`);
      
      // Return a promise that rejects after delay to prevent immediate retry
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            code: 'RATE_LIMIT',
            retryAfter,
            shouldNotLogout: true // Flag to prevent logout
          });
        }, Math.min(retryAfter * 1000, 5000)); // Cap at 5 seconds max
      }).then(rejection => Promise.reject(rejection));
    }

    // Handle 500+ Server Errors
    if (status >= 500) {
      return Promise.reject({
        success: false,
        error: 'Internal server error. Please try again later.',
        code: 'SERVER_ERROR',
      });
    }

    // Handle 400 Validation Errors
    if (status === 400 && data?.errors) {
      return Promise.reject({
        success: false,
        errors: data.errors,
        code: 'VALIDATION_ERROR',
      });
    }

    // Default error response
    return Promise.reject({
      success: false,
      error: data?.message || data?.error || error.message,
      code: data?.code || 'UNKNOWN_ERROR',
      status,
      data,
    });
  }
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user is authenticated
 */
api.isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
};

/**
 * Get current user from localStorage
 */
api.getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Upload a file with progress callback
 * @param {string} url - Upload endpoint
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback (percent)
 * @param {Object} config - Additional axios config
 */
api.upload = (url, file, onProgress, config = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(url, formData, {
    ...config,
    headers: {
      ...config.headers,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
};

/**
 * Download a file
 * @param {string} url - Download endpoint
 * @param {string} filename - Suggested filename
 * @param {Object} config - Additional axios config
 */
api.download = async (url, filename, config = {}) => {
  const response = await api.get(url, {
    ...config,
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename || 'download');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return { success: true };
};

/**
 * Clear all auth data and redirect to login
 */
api.logout = () => {
  clearTokens();
  // Optional: call logout endpoint
  // api.post('/auth/logout').catch(() => {});
  redirectToLogin();
};

// ==================== EXPORTS ====================
export default api;