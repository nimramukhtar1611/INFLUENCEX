const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const EventEmitter = require('events');

class SettingsService extends EventEmitter {
  constructor() {
    super();
    this.cache = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  /**
   * Get settings with caching
   */
  async getSettings() {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (this.cache && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      let settings = await Settings.findOne();
      
      if (!settings) {
        settings = await Settings.create({});
      }

      this.cache = settings.toObject(); // Return full settings for internal use
      this.lastCacheUpdate = now;
      
      return this.cache;
    } catch (error) {
      console.error('Settings service error:', error);
      throw error;
    }
  }

  /**
   * Get public settings (safe for frontend)
   */
  async getPublicSettings() {
    const settings = await this.getSettings();
    const Settings = require('../models/Settings');
    
    // Create a temporary settings instance to use the getPublicSettings method
    const tempSettings = new Settings(settings);
    return tempSettings.getPublicSettings();
  }

  /**
   * Update settings and invalidate cache
   */
  async updateSettings(updates, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Validate input
      if (!updates || typeof updates !== 'object') {
        throw new Error('Invalid settings data provided');
      }
      
      console.log('\n💾 === SETTINGS SERVICE DATABASE SAVE ===');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('👤 User ID:', userId);
      console.log('📦 Updates to save:', JSON.stringify(updates, null, 2));
      
      let settings = await Settings.findOne().session(session);
      
      if (!settings) {
        console.log('🆕 No settings found, creating new settings document');
        settings = new Settings();
      } else {
        console.log('📄 Found existing settings document, ID:', settings._id);
      }

      // Deep merge updates to preserve nested structure
      console.log('\n🔄 Performing deep merge...');
      console.log('📋 Original settings keys:', Object.keys(settings.toObject()));
      console.log('📋 Update keys:', Object.keys(updates));
      
      const mergedSettings = this.deepMerge(settings.toObject(), updates);
      
      console.log('\n✨ Merged Settings Preview:');
      console.log('🔒 Security settings:', mergedSettings.security || 'None');
      console.log('💰 Fee settings:', mergedSettings.fees || 'None');
      console.log('📧 Notification settings:', mergedSettings.notifications ? 'Present' : 'None');
      console.log('🌐 Platform settings:', mergedSettings.platform || 'None');
      
      Object.assign(settings, mergedSettings);
      
      settings.updatedBy = userId;
      settings.updatedAt = new Date();
      
      console.log('\n💾 Saving to database...');
      console.log('📄 Settings before save:', {
        id: settings._id,
        updatedBy: settings.updatedBy,
        updatedAt: settings.updatedAt,
        securityKeys: settings.security ? Object.keys(settings.security) : [],
        feeKeys: settings.fees ? Object.keys(settings.fees) : []
      });
      
      await settings.save({ session });
      
      console.log('✅ Settings saved successfully!');
      console.log('📄 Settings after save:', {
        id: settings._id,
        version: settings.version,
        updatedAt: settings.updatedAt,
        securityKeys: settings.security ? Object.keys(settings.security) : [],
        feeKeys: settings.fees ? Object.keys(settings.fees) : []
      });
      console.log('=== END SETTINGS SERVICE SAVE ===\n');
      
      await session.commitTransaction();
      
      // Invalidate cache
      this.cache = null;
      this.lastCacheUpdate = 0;
      
      // Clear fee service cache
      const feeService = require('./feeService');
      feeService.clearCache();
      
      // Emit change event with public settings
      const publicSettings = settings.getPublicSettings();
      this.emit('settingsChanged', publicSettings);
      
      // 🚀 REAL-TIME SYNC: Broadcast settings changes to all connected clients
      try {
        const { getIO } = require('../socket/chatSocket');
        const io = getIO();
        
        if (io) {
          console.log('📡 Broadcasting settings update to all clients...');
          
          // Broadcast to all users (admin, creators, brands)
          io.emit('settingsUpdated', {
            type: 'GLOBAL_SETTINGS_UPDATE',
            data: publicSettings,
            timestamp: new Date().toISOString(),
            updatedBy: userId
          });
          
          console.log('✅ Settings broadcast sent successfully');
        } else {
          console.warn('⚠️ Socket.IO not available for real-time sync');
        }
      } catch (socketError) {
        console.error('❌ Failed to broadcast settings update:', socketError.message);
        // Don't fail the settings update if broadcast fails
      }
      
      return publicSettings;
    } catch (error) {
      await session.abortTransaction();
      
      console.error('Update settings error:', error);
      
      // Enhanced error handling
      if (error.name === 'ValidationError') {
        throw new Error(`Validation failed: ${error.message}`);
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new Error('Database operation failed. Please try again.');
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Deep merge objects for nested settings updates
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          // Special handling for allowedFileTypes to prevent Cast errors
          if ((key === 'allowedFileTypes') && Array.isArray(source[key])) {
            result[key] = this.normalizeAllowedFileTypes(source[key]);
          } else {
            result[key] = source[key];
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Normalize allowedFileTypes to prevent Cast errors
   */
  normalizeAllowedFileTypes(fileTypes) {
    if (!Array.isArray(fileTypes)) {
      return fileTypes;
    }
    
    // Process each item individually to handle mixed arrays
    return fileTypes.map(item => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object' && item.type && typeof item.type === 'string') {
        return item.type;
      }
      // Convert other types to string (skip null/undefined)
      if (item != null) {
        return String(item);
      }
      return null;
    }).filter(type => type != null && typeof type === 'string'); // Remove invalid entries
  }

  /**
   * Get specific setting by path
   */
  async getSetting(path) {
    const settings = await this.getSettings();
    return path.split('.').reduce((obj, key) => obj && obj[key], settings);
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.cache = null;
    this.lastCacheUpdate = 0;
    this.emit('cacheCleared');
  }

  /**
   * Get fee structure
   */
  async getFees() {
    const settings = await this.getSettings();
    
    return {
      commissionRate: settings.fees?.commissionRate || 10,
      creatorPayoutMin: settings.payments?.minPayoutAmount || 50,
      brandEscrowMin: settings.fees?.escrowFee || 100,
      withdrawalFee: settings.fees?.withdrawalFee?.amount || 0,
      totalFees: 0 // This would be calculated from actual transactions
    };
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(feature) {
    const settings = await this.getSettings();
    return settings.features?.[feature]?.enabled ?? true;
  }

  /**
   * Get maintenance status
   */
  async getMaintenanceStatus() {
    const settings = await this.getSettings();
    
    if (!settings.maintenance?.enabled) {
      return { enabled: false };
    }
    
    const now = new Date();
    const inMaintenanceWindow = (!settings.maintenance.startTime || now >= settings.maintenance.startTime) &&
                                (!settings.maintenance.endTime || now <= settings.maintenance.endTime);
    
    return {
      enabled: settings.maintenance.enabled && inMaintenanceWindow,
      message: settings.maintenance.message,
      startTime: settings.maintenance.startTime,
      endTime: settings.maintenance.endTime
    };
  }
}

// Export singleton instance
const settingsService = new SettingsService();

module.exports = settingsService;
