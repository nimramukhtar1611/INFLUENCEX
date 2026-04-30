const SettingsEnforcement = require('./settingsEnforcement');
const settingsService = require('../services/settingsService');

/**
 * Global settings middleware that applies admin-defined rules across the platform
 * This should be applied to all routes to ensure consistent enforcement
 */
const applyGlobalSettings = async (req, res, next) => {
  try {
    // Apply maintenance mode check first
    await SettingsEnforcement.checkMaintenanceMode(req, res, () => {});
    
    // Apply security policy enforcement
    await SettingsEnforcement.enforceSecurityPolicies(req, res, () => {});
    
    // Attach current settings to request for easy access
    req.settings = await settingsService.getSettings();
    
    next();
  } catch (error) {
    console.error('Global settings middleware error:', error);
    // Don't block requests if global settings check fails
    next();
  }
};

/**
 * Middleware to enforce rate limits based on admin settings
 */
const applyRateLimits = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    
    // Skip rate limiting for admin users
    if (req.user && req.user.userType === 'admin') {
      return next();
    }
    
    const rateLimitSettings = settings.system?.rateLimits;
    
    if (rateLimitSettings && settings.api?.rateLimit?.enabled) {
      const rateLimit = require('express-rate-limit');
      
      const limiter = rateLimit({
        windowMs: rateLimitSettings.apiWindowMinutes * 60 * 1000,
        max: rateLimitSettings.apiMaxRequests,
        message: {
          success: false,
          error: 'Too many requests. Please try again later.',
          enforcement: {
            type: 'rate_limit',
            maxRequests: rateLimitSettings.apiMaxRequests,
            windowMinutes: rateLimitSettings.apiWindowMinutes
          }
        }
      });
      
      return limiter(req, res, next);
    }
    
    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    next();
  }
};

module.exports = {
  applyGlobalSettings,
  applyRateLimits
};
