const EventEmitter = require('events');
const settingsService = require('./settingsService');
const { broadcastToAll, broadcastToUser } = require('./socketService');

/**
 * Real-time settings service that broadcasts admin changes across the platform
 * Ensures Brand and Creator panels immediately reflect admin-defined limits
 */
class RealtimeSettingsService extends EventEmitter {
  constructor() {
    super();
    this.connectedClients = new Map(); // userId -> socket info
    this.settingsCache = null;
    this.lastUpdate = 0;
    
    // Listen to settings service changes
    settingsService.on('settingsChanged', this.handleSettingsChange.bind(this));
  }

  /**
   * Handle settings changes and broadcast to relevant clients
   */
  async handleSettingsChange(newSettings) {
    try {
      this.settingsCache = newSettings;
      this.lastUpdate = Date.now();
      
      console.log('Settings changed, broadcasting to clients...');
      
      // Broadcast to all connected clients
      const broadcastData = {
        type: 'SETTINGS_UPDATED',
        settings: this.getPublicSettings(newSettings),
        timestamp: this.lastUpdate,
        changes: this.detectChanges(newSettings)
      };

      // Emit to all connected clients via WebSocket
      this.emit('broadcast', broadcastData);
      
      // Use socket service if available
      if (broadcastToAll) {
        broadcastToAll('settings_updated', broadcastData);
      }

      // Emit specific events for different setting types
      this.emitSpecificChanges(newSettings);

    } catch (error) {
      console.error('Error broadcasting settings change:', error);
    }
  }

  /**
   * Emit specific events for different types of settings changes
   */
  emitSpecificChanges(settings) {
    // Fee changes
    if (settings.fees) {
      this.emit('fees_updated', {
        commissionRate: settings.fees.commissionRate,
        withdrawalFee: settings.fees.withdrawalFee,
        escrowFee: settings.fees.escrowFee
      });
    }

    // Limit changes
    if (settings.payments?.minPayoutAmount || settings.customLimits) {
      this.emit('limits_updated', {
        minPayoutAmount: settings.payments?.minPayoutAmount,
        maxPayoutAmount: settings.payments?.maxPayoutAmount,
        maxCampaignsPerBrand: settings.customLimits?.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: settings.customLimits?.maxActiveDealsPerCreator
      });
    }

    // Security changes
    if (settings.security) {
      this.emit('security_updated', {
        twoFactorRequired: settings.security.twoFactorRequired,
        ipWhitelistEnabled: settings.security.ipWhitelistEnabled,
        allowedIPs: settings.security.allowedIPs,
        blockedIPs: settings.security.blockedIPs
      });
    }

    // Maintenance mode changes
    if (settings.maintenance) {
      this.emit('maintenance_updated', {
        enabled: settings.maintenance.enabled,
        message: settings.maintenance.message
      });
    }
  }

  /**
   * Detect what specific settings changed
   */
  detectChanges(newSettings) {
    const changes = {};
    
    if (!this.settingsCache) {
      return { all: true }; // First time loading
    }

    // Compare key sections
    const sections = ['fees', 'security', 'payments', 'maintenance', 'customLimits'];
    
    sections.forEach(section => {
      if (JSON.stringify(newSettings[section]) !== JSON.stringify(this.settingsCache[section])) {
        changes[section] = true;
      }
    });

    return changes;
  }

  /**
   * Get public-safe settings for broadcasting
   */
  getPublicSettings(settings) {
    const publicSettings = { ...settings };
    
    // Remove sensitive data
    delete publicSettings.integrations?.stripe?.secretKey;
    delete publicSettings.integrations?.paypal?.clientSecret;
    delete publicSettings.notifications?.email?.smtp?.auth;
    delete publicSettings.notifications?.email?.sendgrid?.apiKey;
    delete publicSettings.notifications?.sms?.twilio?.authToken;
    
    return publicSettings;
  }

  /**
   * Register a client for real-time updates
   */
  registerClient(userId, socketId, userType) {
    this.connectedClients.set(userId, {
      socketId,
      userType,
      connectedAt: new Date()
    });

    console.log(`Client registered: ${userType} ${userId}`);
    
    // Send current settings to new client
    if (this.settingsCache) {
      this.sendCurrentSettings(userId);
    }
  }

  /**
   * Unregister a client
   */
  unregisterClient(userId) {
    this.connectedClients.delete(userId);
    console.log(`Client unregistered: ${userId}`);
  }

  /**
   * Send current settings to a specific client
   */
  async sendCurrentSettings(userId) {
    try {
      const currentSettings = await settingsService.getSettings();
      const client = this.connectedClients.get(userId);
      
      if (client && broadcastToUser) {
        broadcastToUser(userId, 'current_settings', {
          settings: this.getPublicSettings(currentSettings),
          timestamp: this.lastUpdate
        });
      }
    } catch (error) {
      console.error('Error sending current settings to client:', error);
    }
  }

  /**
   * Get current enforcement rules for a specific action type
   */
  async getEnforcementRules(actionType) {
    try {
      const settings = await settingsService.getSettings();
      
      switch (actionType) {
        case 'withdrawal':
          return {
            minAmount: settings.payments?.minPayoutAmount || 50,
            maxMonthlyAmount: settings.payments?.maxPayoutAmount || 10000,
            feeType: settings.fees?.withdrawalFee?.type || 'fixed',
            feeAmount: settings.fees?.withdrawalFee?.amount || 0,
            feePercentage: settings.fees?.withdrawalFee?.percentage || 0
          };
          
        case 'campaign':
          return {
            maxCampaigns: settings.customLimits?.maxCampaignsPerBrand || 50,
            featuredListingFee: settings.fees?.featuredListingFee?.base || 50
          };
          
        case 'deal':
          return {
            maxActiveDeals: settings.customLimits?.maxActiveDealsPerCreator || 20,
            commissionRate: settings.fees?.commissionRate || 10
          };
          
        case 'upload':
          return {
            maxFileSize: settings.upload?.maxFileSize || 100,
            allowedFileTypes: settings.upload?.allowedFileTypes?.map(f => f.type) || 
              ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx']
          };
          
        default:
          return {};
      }
    } catch (error) {
      console.error('Error getting enforcement rules:', error);
      return {};
    }
  }

  /**
   * Force refresh settings cache
   */
  async refreshCache() {
    try {
      this.settingsCache = await settingsService.getSettings();
      this.lastUpdate = Date.now();
      
      // Broadcast refresh to all clients
      this.emit('cache_refreshed', {
        timestamp: this.lastUpdate
      });
      
      return this.settingsCache;
    } catch (error) {
      console.error('Error refreshing settings cache:', error);
      throw error;
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      lastUpdate: this.lastUpdate,
      connectedClients: this.connectedClients.size,
      cacheValid: this.settingsCache !== null
    };
  }
}

// Export singleton instance
const realtimeSettingsService = new RealtimeSettingsService();

module.exports = realtimeSettingsService;
