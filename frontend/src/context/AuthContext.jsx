import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useGlobalSettings } from './GlobalSettingsContext';
import tokenRefreshService from '../services/tokenRefreshService';
import socketManager from '../utils/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  let globalSettings;
  try {
    globalSettings = useGlobalSettings();
  } catch (error) {
    console.warn('GlobalSettings not available in AuthProvider during initial render:', error.message);
    globalSettings = { getSetting: () => null };
  }
  
  const { getSetting } = globalSettings;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [authLoading, setAuthLoading] = useState(false);

  const normalizeUser = (userData) => {
    if (!userData) return null;
    const normalized = { ...userData };
    if (normalized.role === 'admin' || normalized.userType === 'admin') normalized.userType = 'admin';
    else if (normalized.role === 'brand' || normalized.userType === 'brand') normalized.userType = 'brand';
    else if (normalized.role === 'creator' || normalized.userType === 'creator') normalized.userType = 'creator';
    return normalized;
  };

  // Check if 2FA is globally required
  const isTwoFactorGloballyRequired = useCallback(() => {
    const twoFactorRequired = getSetting('security.twoFactorRequired', false);
    const emailVerification = getSetting('security.emailVerification', true);
    return twoFactorRequired && emailVerification;
  }, [getSetting]);

  const authLoadingRef = useRef(false);
  
  const loadUser = useCallback(async () => {
    // Prevent overlapping auth operations using ref instead of state
    if (authLoadingRef.current) return;
    
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    console.log("loadUser called - token exists:", !!storedToken, "user exists:", !!storedUser);
    
    // If no token, don't call /auth/me - just set user as null and move on
    if (!storedToken) {
      console.log("No token found, skipping /auth/me call");
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      setRefreshToken(null);
      setLoading(false);
      return;
    }
    
    // Validate token format before making any API calls
    if (storedToken === 'undefined' || storedToken === 'null') {
      console.log("❌ Invalid token format, clearing and skipping /auth/me");
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      setRefreshToken(null);
      setLoading(false);
      return;
    }
    
    // Check if token has valid JWT format (3 parts separated by dots)
    const tokenParts = storedToken.split('.');
    if (tokenParts.length !== 3) {
      console.log("❌ Invalid JWT format, clearing and skipping /auth/me");
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      setRefreshToken(null);
      setLoading(false);
      return;
    }
    
    if (storedToken && storedUser) {
      try {
        authLoadingRef.current = true;
        setAuthLoading(true);
        
        // Add delay to prevent rapid successive calls
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // First, validate the token with backend (with retry logic for server restarts)
        let response;
        let retryCount = 0;
        const maxRetries = 2; // Reduced from 3
        const retryDelay = 1000; // 1 second
        
        const token = localStorage.getItem("token");
        console.log("Calling /auth/me with token:", token);
        
        while (retryCount < maxRetries) {
          try {
            response = await api.get('/auth/me');
            break; // Success, exit retry loop
          } catch (retryError) {
            retryCount++;
            console.log(`🔄 /auth/me attempt ${retryCount} failed:`, retryError.message);
            
            // If this is the last retry, throw the error to be handled by the outer catch
            if (retryCount >= maxRetries) {
              throw retryError;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1)));
          }
        }
        
        if (response.data?.success && response.data.user) {
          // Token is valid, restore user state from fresh backend data
          const normalized = normalizeUser(response.data.user);
          setUser(normalized);
          setIsAuthenticated(true);
          setToken(storedToken);
          setRefreshToken(storedRefreshToken);
          
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(normalized));
          console.log('✅ Session restored and validated from backend');
        } else {
          // Token invalid, clear storage
          throw new Error('Invalid token response');
        }
      } catch (error) {
        // Enhanced server crash handling - don't logout on recoverable errors
        if (error.code === 'RATE_LIMIT' || error.shouldNotLogout || 
            error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || 
            error.code === 'ETIMEDOUT' || error.message?.includes('Network Error') ||
            error.message?.includes('ERR_CONNECTION_REFUSED') ||
            error.response?.status === 503 || error.response?.status === 502 ||
            error.response?.status === 504 || error.response?.status === 0) {
          
          console.warn('⚠️ Server crash or network issue detected, preserving session:', error.message);
          
          // Enhanced fallback: validate token locally before restoring session
          try {
            const tokenParts = storedToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const currentTime = Date.now() / 1000;
              
              // Only restore session if token is still valid for at least 30 minutes
              if (payload.exp - currentTime > 1800) {
                const localUser = JSON.parse(storedUser);
                const normalized = normalizeUser(localUser);
                setUser(normalized);
                setIsAuthenticated(true);
                setToken(storedToken);
                setRefreshToken(storedRefreshToken);
                console.log('✅ Session preserved during server crash - token still valid');
                return;
              } else {
                console.log('⚠️ Token expired during server crash, clearing session');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
              }
            }
          } catch (tokenError) {
            console.error('Token validation failed:', tokenError);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
          }
          
          // Fallback to basic restore if token validation fails
          try {
            const localUser = JSON.parse(storedUser);
            const normalized = normalizeUser(localUser);
            setUser(normalized);
            setIsAuthenticated(true);
            setToken(storedToken);
            setRefreshToken(storedRefreshToken);
            console.log('✅ Session restored from localStorage (basic fallback)');
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
          }
          return;
        }
        
        // For 401 errors, try token refresh first before logging out
        if (error.response?.status === 401 && storedRefreshToken) {
          console.log('Token expired, attempting refresh...');
          try {
            const newToken = await tokenRefreshService.refreshToken();
            
            // Retry /auth/me with new token
            const retryResponse = await api.get('/auth/me');
            if (retryResponse.data?.success && retryResponse.data.user) {
              const normalized = normalizeUser(retryResponse.data.user);
              setUser(normalized);
              setIsAuthenticated(true);
              setToken(newToken);
              setRefreshToken(storedRefreshToken);
              localStorage.setItem('user', JSON.stringify(normalized));
              console.log('✅ Session restored after token refresh');
              return;
            }
          } catch (refreshError) {
            console.log('❌ Token refresh failed:', refreshError.message);
          }
        }
        
        // Only logout if we're certain the token is invalid (401 after failed refresh, or 403)
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('❌ Token validation failed, clearing session:', error.message);
          // Clear all auth data
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
          setToken(null);
          setRefreshToken(null);
        } else {
          // For other errors, keep the session and try to restore from localStorage
          console.warn('⚠️ Unexpected error, keeping session:', error.message);
          try {
            const localUser = JSON.parse(storedUser);
            const normalized = normalizeUser(localUser);
            setUser(normalized);
            setIsAuthenticated(true);
            setToken(storedToken);
            setRefreshToken(storedRefreshToken);
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
          }
        }
      } finally {
        authLoadingRef.current = false;
        setAuthLoading(false);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = user || api.getCurrentUser();
      const currentRole = currentUser?.userType || currentUser?.role;

      // For admin users, we need to fetch fresh data from server to get updated profile picture
      if (currentRole === 'admin' || currentRole === 'super_admin') {
        try {
          const res = await api.get('/admin/profile');
          if (res.data?.success) {
            const normalized = normalizeUser(res.data.admin);
            setUser(prev => ({ ...prev, ...normalized }));
            localStorage.setItem('user', JSON.stringify(normalized));
            console.log('Admin user data refreshed from server');
            return normalized;
          }
        } catch (adminError) {
          console.error('Failed to refresh admin data, falling back to local:', adminError);
          // Fallback to local data if admin endpoint fails
          const normalizedAdmin = normalizeUser(currentUser);
          if (normalizedAdmin) {
            setUser((prev) => ({ ...prev, ...normalizedAdmin }));
            localStorage.setItem('user', JSON.stringify(normalizedAdmin));
          }
          return normalizedAdmin;
        }
      }

      const res = await api.get('/auth/me');
      if (res.data?.success) {
        const normalized = normalizeUser(res.data.user);
        setUser(prev => ({ ...prev, ...normalized }));
        localStorage.setItem('user', JSON.stringify(normalized));
        return normalized;
      }
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }, []);

  const login = async (email, password, userType, captchaToken) => {
    setLoading(true);
    setAuthLoading(true);
    try {
      // Send login request - backend will auto-detect user type
      const res = await api.post('/auth/login', { email, password, captchaToken });
      // Check for 2FA requirement FIRST before completing login
      if (res.data?.require2FA) {
        return { success: true, require2FA: true, userId: res.data.userId };
      }
      if (res.data?.success) {
        const { accessToken, refreshToken: newRefresh, user: userData } = res.data;
        const normalized = normalizeUser(userData);
        
        // Set all auth state atomically before dashboard components mount
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        localStorage.setItem('user', JSON.stringify(normalized));
        
        // Wait for localStorage to be fully written and verify token exists
        await new Promise(resolve => setTimeout(resolve, 100));
        const tokenCheck = localStorage.getItem('token');
        if (!tokenCheck) {
          throw new Error('Token failed to save to localStorage');
        }
        
        setToken(accessToken);
        setRefreshToken(newRefresh);
        setUser(normalized);
        setIsAuthenticated(true);
        
        // Reset failed refresh state and setup auto-refresh
        tokenRefreshService.resetFailedRefresh();
        tokenRefreshService.setupAutoRefresh();
        
        // Reconnect socket with new token
        if (socketManager.socket) {
          socketManager.socket.auth = { token: accessToken };
          socketManager.socket.disconnect().connect();
        }
        
        toast.success('Login successful!');
        return { success: true, user: normalized };
      }
      return { success: false, error: res.data?.error || 'Login failed' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Login failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const loginAdmin = async (email, password, twoFactorCode = null) => {
    setLoading(true);
    setAuthLoading(true);
    try {
      const payload = { email, password };
      if (twoFactorCode) payload.two_factor_code = twoFactorCode;
      const res = await api.post('/admin/login', payload);
      if (res.data?.require2FA) return { success: true, require2FA: true, userId: res.data.userId };
      if (res.data?.success) {
        const { token: newToken, refreshToken: newRefresh, admin } = res.data;
        const normalized = normalizeUser(admin);
        
        // Set all auth state atomically before dashboard components mount
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefresh);
        localStorage.setItem('user', JSON.stringify(normalized));
        
        // Wait for localStorage to be fully written and verify token exists
        await new Promise(resolve => setTimeout(resolve, 100));
        const tokenCheck = localStorage.getItem('token');
        if (!tokenCheck) {
          throw new Error('Token failed to save to localStorage');
        }
        
        setToken(newToken);
        setRefreshToken(newRefresh);
        setUser(normalized);
        setIsAuthenticated(true);
        
        // Reconnect socket with new token
        if (socketManager.socket) {
          socketManager.socket.auth = { token: newToken };
          socketManager.socket.disconnect().connect();
        }
        
        toast.success('Admin login successful!');
        return { success: true, user: normalized };
      }
      return { success: false, error: res.data?.error || 'Invalid response' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Admin login failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data?.success) {
        const { accessToken, refreshToken: newRefresh, user: newUser } = res.data;
        const normalized = normalizeUser(newUser);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        localStorage.setItem('user', JSON.stringify(normalized));
        setToken(accessToken);
        setRefreshToken(newRefresh);
        setUser(normalized);
        setIsAuthenticated(true);
        
        // Reset failed refresh state and setup auto-refresh
        tokenRefreshService.resetFailedRefresh();
        tokenRefreshService.setupAutoRefresh();
        
        toast.success('Registration successful!');
        return { success: true, user: normalized };
      }
      return { success: false };
    } catch (error) {
      const msg = error.response?.data?.error || 'Signup failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refToken = localStorage.getItem('refreshToken');
      if (refToken) await api.post('/auth/logout', { refreshToken: refToken }).catch(() => {});
    } finally {
      localStorage.clear();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      window.location.href = isAdminRoute ? '/admin/login' : '/login';
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return { success: false, error: 'Password too short' };
    }
    try {
      const res = await api.post('/auth/change-password', { currentPassword, newPassword });
      if (res.data?.success) {
        toast.success('Password changed successfully');
        return { success: true };
      }
      return { success: false, error: res.data?.message || 'Failed to change password' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to change password';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Password reset link sent');
        return { success: true, message: res.data?.message };
      }

      const msg = res.data?.error || res.data?.message || 'Failed to send reset link';
      toast.error(msg);
      return { success: false, error: msg };
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send reset link';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (password) => {
    try {
      const res = await api.delete('/compliance/account', { data: { password, confirm: 'DELETE' } });
      if (res.data?.success) {
        toast.success('Account deleted successfully');
        await logout();
        return { success: true };
      }
      return { success: false, error: res.data?.message || 'Failed to delete account' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to delete account';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const sendEmailOTP = async (email) => {
    try {
      const res = await api.post('/auth/send-otp', { email });
      if (res.data?.success) {
        toast.success('OTP sent to your email');
        return { success: true };
      }
      toast.error(res.data?.message || 'Failed to send OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const verifyEmailOTP = async (email, code) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: code });
      if (res.data?.success) {
        toast.success('Email verified successfully');
        return { success: true };
      }
      toast.error(res.data?.message || 'Invalid OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const sendPhoneOTP = async (phone) => {
    try {
      const res = await api.post('/auth/send-phone-otp', { phone });
      if (res.data?.success) {
        toast.success('OTP sent to your phone');
        return { success: true };
      }
      toast.error(res.data?.message || 'Failed to send OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const verifyPhoneOTP = async (phone, code) => {
    try {
      const res = await api.post('/auth/verify-phone-otp', { phone, otp: code });
      if (res.data?.success) {
        toast.success('Phone verified successfully');
        return { success: true };
      }
      toast.error(res.data?.message || 'Invalid OTP');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const sendVerificationEmail = async (email) => {
    try {
      const res = await api.post('/auth/send-otp', { email });
      if (res.data?.success) {
        toast.success('Verification email sent');
        return { success: true };
      }
      toast.error(res.data?.message || 'Failed to send verification email');
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification email');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const completeLogin = (userData, newToken, newRefreshToken) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(normalized));
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(normalized);
    setIsAuthenticated(true);
  };

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      // Ensure both profilePicture and profileImage are updated for consistency
      if (newData.profilePicture) {
        updated.profilePicture = newData.profilePicture;
        updated.profileImage = newData.profilePicture;
      }
      if (newData.profileImage) {
        updated.profileImage = newData.profileImage;
        updated.profilePicture = newData.profileImage;
      }
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => { 
    const initializeAuth = async () => {
      // Add a small delay to ensure all providers are mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadUser(); 
    };
    
    initializeAuth();
  }, []);

  // Separate effect for setting up auto-refresh when authenticated (only on initial auth)
  useEffect(() => {
    if (isAuthenticated && token) {
      tokenRefreshService.resetFailedRefresh();
      tokenRefreshService.setupAutoRefresh();
    }
  }, [isAuthenticated]); // Remove token dependency to prevent repeated setup

  const isAdmin = user?.userType === 'admin' || user?.role === 'admin' || user?.role === 'super_admin';
  const isBrand = user?.userType === 'brand';
  const isCreator = user?.userType === 'creator';

  const value = {
    user: user || null,
    loading: loading || false,
    authLoading: authLoading || false,
    isAuthenticated: isAuthenticated || false,
    token: token || null,
    refreshToken: refreshToken || null,
    isAdmin: user?.userType === 'admin' || user?.role === 'admin' || user?.role === 'super_admin' || false,
    isBrand: user?.userType === 'brand' || false,
    isCreator: user?.userType === 'creator' || false,
    updateUser, completeLogin, signup, login, refreshUser, deleteAccount, changePassword, forgotPassword,
    loginAdmin, logout,
    sendEmailOTP, verifyEmailOTP, sendPhoneOTP, verifyPhoneOTP, sendVerificationEmail,
    isTwoFactorGloballyRequired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;