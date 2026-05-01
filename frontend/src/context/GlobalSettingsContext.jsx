import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const GlobalSettingsContext = createContext();

export const useGlobalSettings = () => {
  const context = useContext(GlobalSettingsContext);
  if (!context) throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  return context;
};

export const GlobalSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [securitySettings, setSecuritySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load security settings from API
  const loadSecuritySettings = useCallback(async () => {
    try {
      const response = await api.get('/auth/settings/security');
      
      if (response.data.success) {
        setSecuritySettings(response.data.data);
        
        // Store in localStorage for offline access
        localStorage.setItem('securitySettings', JSON.stringify(response.data.data));
        localStorage.setItem('securitySettingsUpdated', new Date().toISOString());
      } else {
        throw new Error(response.data.error || 'Failed to load security settings');
      }
    } catch (err) {
      console.error('Failed to load security settings:', err);
      
      // Try to load from localStorage as fallback
      try {
        const cachedSettings = localStorage.getItem('securitySettings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setSecuritySettings(parsed);
          console.warn('Using cached security settings from localStorage');
        }
      } catch (cacheErr) {
        console.error('Failed to load cached security settings:', cacheErr);
      }
    }
  }, []);

  // Load global settings from API
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/global/settings');
      
      if (response.data.success) {
        setSettings(response.data.settings);
        setLastUpdated(new Date());
        
        // Store in localStorage for offline access
        localStorage.setItem('globalSettings', JSON.stringify(response.data.settings));
        localStorage.setItem('globalSettingsUpdated', new Date().toISOString());
      } else {
        throw new Error(response.data.error || 'Failed to load settings');
      }
    } catch (err) {
      console.error('Failed to load global settings:', err);
      setError(err.message || 'Failed to load settings');
      
      // Try to load from localStorage as fallback
      try {
        const cachedSettings = localStorage.getItem('globalSettings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setSettings(parsed);
          console.warn('Using cached settings from localStorage');
        }
      } catch (cacheErr) {
        console.error('Failed to load cached settings:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specific setting by path (e.g., 'platform.name', 'fees.commissionRate')
  const getSetting = useCallback((path, defaultValue = null) => {
    if (!settings) return defaultValue;
    
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : defaultValue;
    }, settings);
  }, [settings]);

  // Get platform name with fallback
  const getPlatformName = useCallback(() => {
    return getSetting('platformName', 'InfluenceX');
  }, [getSetting]);

  // Get currency with fallback
  const getCurrency = useCallback(() => {
    return getSetting('currency', 'USD');
  }, [getSetting]);

  // Get timezone with fallback
  const getTimezone = useCallback(() => {
    return getSetting('timezone', 'America/New_York');
  }, [getSetting]);

  // Get date format with fallback
  const getDateFormat = useCallback(() => {
    return getSetting('dateFormat', 'MM/DD/YYYY');
  }, [getSetting]);

  // Get commission rate with fallback
  const getCommissionRate = useCallback(() => {
    return getSetting('commissionRate', 10);
  }, [getSetting]);

  // Check if feature is enabled
  const isFeatureEnabled = useCallback((feature) => {
    return getSetting(`features.${feature}`, false);
  }, [getSetting]);

  // Get support email
  const getSupportEmail = useCallback(() => {
    return getSetting('supportEmail', 'support@influencex.com');
  }, [getSetting]);

  // Refresh settings (force reload from server)
  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/global/settings');
      
      if (response.data.success) {
        setSettings(response.data.settings);
        setLastUpdated(new Date());
        
        // Store in localStorage for offline access
        localStorage.setItem('globalSettings', JSON.stringify(response.data.settings));
        localStorage.setItem('globalSettingsUpdated', new Date().toISOString());
      } else {
        throw new Error(response.data.error || 'Failed to load settings');
      }
    } catch (err) {
      console.error('Failed to refresh global settings:', err);
      setError(err.message || 'Failed to refresh settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear cached settings
  const clearCache = useCallback(() => {
    localStorage.removeItem('globalSettings');
    localStorage.removeItem('globalSettingsUpdated');
    setSettings(null);
    setLastUpdated(null);
  }, []);

  // Format currency based on settings
  const formatCurrency = useCallback((amount, currency = null) => {
    const targetCurrency = currency || getCurrency();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
    }).format(amount);
  }, [getCurrency]);

  // Format date based on settings
  const formatDate = useCallback((date, format = null) => {
    const targetFormat = format || getDateFormat();
    const dateObj = new Date(date);
    
    switch (targetFormat) {
      case 'DD/MM/YYYY':
        return dateObj.toLocaleDateString('en-GB');
      case 'YYYY-MM-DD':
        return dateObj.toISOString().split('T')[0];
      case 'MM/DD/YYYY':
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  }, [getDateFormat]);

  // Calculate platform fee for amount
  const calculateFee = useCallback((amount) => {
    const commissionRate = getCommissionRate();
    const fee = (amount * commissionRate) / 100;
    return {
      amount,
      fee,
      netAmount: amount - fee,
      commissionRate
    };
  }, [getCommissionRate]);

  // Check if maintenance mode is active
  const isMaintenanceMode = useCallback(() => {
    return getSetting('maintenance', false);
  }, [getSetting]);

  // Get upload limits
  const getUploadLimits = useCallback(() => {
    return {
      maxFileSize: getSetting('upload.maxFileSize', 100),
      allowedFileTypes: getSetting('upload.allowedFileTypes', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'])
    };
  }, [getSetting]);

  // Security setting getters
  const getEmailVerificationRequired = useCallback(() => {
    return securitySettings?.emailVerification ?? true;
  }, [securitySettings]);

  // getPhoneVerificationRequired removed - phone verification is now optional
  const getPasswordRequirements = useCallback(() => {
    return {
      minLength: securitySettings?.passwordMinLength ?? 8,
      requireUppercase: securitySettings?.passwordRequireUppercase ?? true,
      requireLowercase: securitySettings?.passwordRequireLowercase ?? true,
      requireNumbers: securitySettings?.passwordRequireNumbers ?? true,
      requireSymbols: securitySettings?.passwordRequireSymbols ?? false,
    };
  }, [securitySettings]);

  const getMaxLoginAttempts = useCallback(() => {
    return securitySettings?.maxLoginAttempts ?? 5;
  }, [securitySettings]);

  const getLockoutDuration = useCallback(() => {
    return securitySettings?.lockoutDuration ?? 30;
  }, [securitySettings]);

  const getVerificationFlow = useCallback(() => {
    const emailRequired = getEmailVerificationRequired();
    // Phone verification is now optional - not part of verification flow
    
    return {
      emailRequired,
      phoneRequired: false, // Always false since phone is optional
      flow: emailRequired ? 'email' : 'none'
    };
  }, [getEmailVerificationRequired]);

  // Initialize settings on mount
  useEffect(() => {
    // Load both global and security settings
    const initializeSettings = async () => {
      await Promise.all([
        loadSettings(),
        loadSecuritySettings()
      ]);
    };
    
    initializeSettings();

    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(() => {
      initializeSettings();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []); // Remove function dependencies to prevent infinite loop

  // Refresh security settings specifically
  const refreshSecuritySettings = useCallback(async () => {
    try {
      const response = await api.get('/auth/settings/security');
      
      if (response.data.success) {
        setSecuritySettings(response.data.data);
        
        // Store in localStorage for offline access
        localStorage.setItem('securitySettings', JSON.stringify(response.data.data));
        localStorage.setItem('securitySettingsUpdated', new Date().toISOString());
      } else {
        throw new Error(response.data.error || 'Failed to load security settings');
      }
    } catch (err) {
      console.error('Failed to refresh security settings:', err);
    }
  }, []);

  // 🚀 REAL-TIME SYNC: Listen for WebSocket settings updates
  useEffect(() => {
    // Import socket dynamically to avoid SSR issues
    let socket;
    
    const initializeSocket = async () => {
      try {
        const socketManager = (await import('../utils/socket')).default;
        
        // Get auth token for socket initialization
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = user?.token || localStorage.getItem('token');
        
        if (token) {
          socketManager.initialize(token);
          socket = socketManager;
          
          console.log('🔌 Connected to settings real-time updates');
          
          // Listen for real-time settings updates
          const handleSettingsUpdate = (data) => {
            console.log('📡 Real-time settings update received:', data);
            
            if (data.type === 'GLOBAL_SETTINGS_UPDATE' && data.settings) {
              // Update global settings immediately
              setSettings(data.settings);
              setLastUpdated(new Date(data.timestamp));
              
              // Update localStorage
              localStorage.setItem('globalSettings', JSON.stringify(data.settings));
              localStorage.setItem('globalSettingsUpdated', data.timestamp);
              
              // Show toast notification for user feedback
              toast.success('Settings updated successfully', {
                duration: 3000,
                position: 'top-right'
              });
              
              console.log('✅ Settings updated in real-time');
            }
          };
          
          // Register event listener for settings updates
          socket.on('settingsUpdated', handleSettingsUpdate);
          
          return () => {
            if (socket) {
              socket.off('settingsUpdated', handleSettingsUpdate);
            }
          };
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize real-time settings sync:', error.message);
      }
    };
    
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Listen for storage events (settings updated in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'globalSettings') {
        try {
          const newSettings = JSON.parse(e.newValue);
          setSettings(newSettings);
          setLastUpdated(new Date());
        } catch (err) {
          console.error('Failed to parse updated settings from storage:', err);
        }
      } else if (e.key === 'securitySettings') {
        try {
          const newSecuritySettings = JSON.parse(e.newValue);
          setSecuritySettings(newSecuritySettings);
          console.log('Security settings updated from storage event');
        } catch (err) {
          console.error('Failed to parse updated security settings from storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    // State
    settings,
    securitySettings,
    loading,
    error,
    lastUpdated,
    
    // Core methods
    loadSettings,
    loadSecuritySettings,
    refreshSettings,
    refreshSecuritySettings,
    clearCache,
    getSetting,
    
    // Convenience getters
    getPlatformName,
    getCurrency,
    getTimezone,
    getDateFormat,
    getCommissionRate,
    getSupportEmail,
    
    // Security getters
    getEmailVerificationRequired,
    // getPhoneVerificationRequired removed - phone verification is now optional
    getPasswordRequirements,
    getMaxLoginAttempts,
    getLockoutDuration,
    getVerificationFlow,
    
    // Feature checks
    isFeatureEnabled,
    isMaintenanceMode,
    
    // Utility methods
    formatCurrency,
    formatDate,
    calculateFee,
    getUploadLimits,
  };

  return (
    <GlobalSettingsContext.Provider value={value}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export default GlobalSettingsContext;
