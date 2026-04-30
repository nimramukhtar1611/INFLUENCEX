// tokenRefreshService.js - Auto-refresh token service
import api from './api';

class TokenRefreshService {
  constructor() {
    this.isRefreshing = false;
    this.failedRefresh = false;
    this.refreshSubscribers = [];
    this.refreshTimer = null;
  }

  // Add request to queue when refresh is in progress
  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  // Notify all subscribers about new token
  notifySubscribers(token) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  // Check if token is expired
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Get time until token expires (in milliseconds)
  getTimeUntilExpiry(token) {
    if (!token) return 0;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = (payload.exp - currentTime) * 1000;
      return Math.max(0, timeUntilExpiry);
    } catch (error) {
      console.error('Error getting token expiry time:', error);
      return 0;
    }
  }

  // Refresh the access token
  async refreshToken() {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve) => {
        this.addRefreshSubscriber(resolve);
      });
    }

    if (this.failedRefresh) {
      throw new Error('Refresh token failed, please login again');
    }

    this.isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      
      if (response.data?.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Update localStorage
        localStorage.setItem('token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // Notify all waiting requests
        this.notifySubscribers(accessToken);

        this.isRefreshing = false;
        return accessToken;
      } else {
        throw new Error(response.data?.error || 'Token refresh failed');
      }
    } catch (error) {
      this.isRefreshing = false;
      this.failedRefresh = true;
      
      // Clear tokens on refresh failure
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        const isAdminRoute = window.location.pathname.startsWith('/admin');
        window.location.href = isAdminRoute ? '/admin/login' : '/login';
      }, 1000);
      
      throw error;
    }
  }

  // Setup automatic token refresh with server crash resilience
  setupAutoRefresh() {
    // Enhanced auto-refresh for better server crash handling
    // Tokens now last 30 days, but we still refresh proactively
    console.log('Setting up enhanced auto-refresh for server crash resilience');
    
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    // Check token every 5 minutes and refresh if needed
    this.refreshTimer = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token || this.failedRefresh) return;
      
      // Refresh if token expires in less than 7 days
      const timeUntilExpiry = this.getTimeUntilExpiry(token);
      const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      
      if (timeUntilExpiry < sevenDays && timeUntilExpiry > 0) {
        try {
          console.log('Proactively refreshing token for server crash resilience');
          await this.refreshToken();
        } catch (error) {
          console.warn('Proactive refresh failed:', error.message);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Reset failed refresh state (called on successful login)
  resetFailedRefresh() {
    this.failedRefresh = false;
  }

  // Cleanup timer when needed
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Create singleton instance
const tokenRefreshService = new TokenRefreshService();

export default tokenRefreshService;
