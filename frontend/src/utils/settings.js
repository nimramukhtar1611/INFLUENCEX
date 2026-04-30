import { useGlobalSettings } from '../context/GlobalSettingsContext';

/**
 * Higher-order component that provides settings as props
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with settings props
 */
export const withSettings = (Component) => {
  return function WrappedComponent(props) {
    const settings = useGlobalSettings();
    
    return <Component {...props} settings={settings} />;
  };
};

/**
 * Hook for getting specific setting values with fallbacks
 * @returns {Object} - Object containing common getter functions
 */
export const useSettings = () => {
  const { 
    getSetting, 
    getPlatformName, 
    getCurrency, 
    getTimezone, 
    getDateFormat,
    getCommissionRate,
    getSupportEmail,
    isFeatureEnabled,
    formatCurrency,
    formatDate,
    calculateFee,
    isMaintenanceMode,
    getUploadLimits
  } = useGlobalSettings();

  return {
    // Basic getters
    getSetting,
    getPlatformName,
    getCurrency,
    getTimezone,
    getDateFormat,
    getCommissionRate,
    getSupportEmail,
    
    // Feature checks
    isFeatureEnabled,
    isMaintenanceMode,
    
    // Utility functions
    formatCurrency,
    formatDate,
    calculateFee,
    getUploadLimits,
    
    // Commonly used settings
    siteName: getPlatformName(),
    currency: getCurrency(),
    timezone: getTimezone(),
    dateFormat: getDateFormat(),
    commissionRate: getCommissionRate(),
    supportEmail: getSupportEmail(),
  };
};

/**
 * Get a specific setting value (for use outside of React components)
 * @param {string} path - Dot notation path to setting
 * @param {*} defaultValue - Default value if setting not found
 * @returns {*} - Setting value or default
 */
export const getStaticSetting = (path, defaultValue = null) => {
  try {
    const cachedSettings = localStorage.getItem('globalSettings');
    if (cachedSettings) {
      const settings = JSON.parse(cachedSettings);
      return path.split('.').reduce((obj, key) => {
        return obj && obj[key] !== undefined ? obj[key] : defaultValue;
      }, settings);
    }
    return defaultValue;
  } catch (error) {
    console.error('Failed to get static setting:', error);
    return defaultValue;
  }
};

/**
 * Get platform name (for use outside of React components)
 * @returns {string} - Platform name
 */
export const getStaticSiteName = () => {
  return getStaticSetting('platformName', 'InfluenceX');
};

/**
 * Get currency (for use outside of React components)
 * @returns {string} - Currency code
 */
export const getStaticCurrency = () => {
  return getStaticSetting('currency', 'USD');
};

/**
 * Format currency for static usage (outside React components)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (optional)
 * @returns {string} - Formatted currency string
 */
export const formatStaticCurrency = (amount, currency = null) => {
  const targetCurrency = currency || getStaticCurrency();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: targetCurrency,
  }).format(amount);
};

/**
 * Check if feature is enabled (for use outside of React components)
 * @param {string} feature - Feature name
 * @returns {boolean} - Whether feature is enabled
 */
export const isStaticFeatureEnabled = (feature) => {
  return getStaticSetting(`features.${feature}`, false);
};

export default {
  withSettings,
  useSettings,
  getStaticSetting,
  getStaticSiteName,
  getStaticCurrency,
  formatStaticCurrency,
  isStaticFeatureEnabled,
};
