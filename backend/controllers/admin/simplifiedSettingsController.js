// Simplified Settings Controller for minimalist admin interface
const Settings = require('../../models/Settings');
const AuditLog = require('../../models/AuditLog');
const feeService = require('../../services/feeService');
const settingsService = require('../../services/settingsService');

// ==================== GET SIMPLIFIED SETTINGS ====================
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    
    // Return simplified settings structure for minimalist UI
    const simplifiedSettings = {
      // Platform settings
      platformName: String(settings?.platform?.name || process.env.PLATFORM_NAME || 'InfluenceX').trim(),
      platformDescription: String(settings?.platform?.description || 'Influencer Deal Marketplace').trim(),
      supportEmail: String(settings?.platform?.supportEmail || process.env.SUPPORT_EMAIL || 'support@influencex.com').trim().toLowerCase(),
      
      // Commission settings (from database or environment)
      commissionRate: parseFloat(settings?.fees?.commissionRate ?? process.env.COMMISSION_RATE ?? 10),
      
      // Email settings (from database or environment)
      senderName: String(settings?.notifications?.email?.fromName || process.env.EMAIL_FROM_NAME || 'InfluenceX'),
      emailFooter: String(settings?.notifications?.email?.footer || process.env.EMAIL_FOOTER || '© 2024 InfluenceX. All rights reserved.'),
      
      // SMTP settings (from database or environment)
      notifications: {
        email: {
          smtp: {
            host: settings?.notifications?.email?.smtp?.host || process.env.SMTP_HOST || '',
            port: settings?.notifications?.email?.smtp?.port || process.env.SMTP_PORT || 587,
            secure: settings?.notifications?.email?.smtp?.secure || process.env.SMTP_SECURE === 'true' || false,
            auth: {
              user: settings?.notifications?.email?.smtp?.auth?.user || process.env.SMTP_USER || '',
              pass: settings?.notifications?.email?.smtp?.auth?.pass || process.env.SMTP_PASS || ''
            }
          }
        }
      },
      
      // Email notification toggles
      emailNotifications: {
        newUser: Boolean(settings?.notifications?.admin?.email?.newUser ?? true),
        newCampaign: Boolean(settings?.notifications?.admin?.email?.newCampaign ?? true),
        paymentReceived: Boolean(settings?.notifications?.admin?.email?.paymentReceived ?? true),
        disputeRaised: Boolean(settings?.notifications?.admin?.email?.disputeRaised ?? true),
        reportGenerated: Boolean(settings?.notifications?.admin?.email?.reportGenerated ?? true)
      }
    };

    res.json({
      success: true,
      settings: simplifiedSettings
    });

  } catch (error) {
    console.error('Get simplified settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings'
    });
  }
};

// ==================== UPDATE SIMPLIFIED SETTINGS ====================
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const adminId = req.admin?._id;

    // Validate required fields
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings data provided'
      });
    }

    // Validate platform name if provided
    if (updates.platformName !== undefined) {
      if (typeof updates.platformName !== 'string' || updates.platformName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Platform Name must be a non-empty string'
        });
      }
    }

    // Validate support email if provided
    if (updates.supportEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.supportEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Support Email must be a valid email address'
        });
      }
    }

    // Validate commission rate if provided
    if (updates.commissionRate !== undefined) {
      const value = parseFloat(updates.commissionRate);
      if (isNaN(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          error: 'Commission Rate must be a number between 0 and 100'
        });
      }
    }

    // Get existing settings or create new
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    // Transform flat structure to nested structure
    const transformedUpdates = {};

    // Platform settings
    if (updates.platformName !== undefined) {
      transformedUpdates.platform = {
        ...settings.platform,
        name: String(updates.platformName).trim()
      };
    }

    if (updates.platformDescription !== undefined) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        description: String(updates.platformDescription).trim()
      };
    }

    if (updates.supportEmail !== undefined) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        supportEmail: String(updates.supportEmail).trim().toLowerCase()
      };
    }

    // Commission settings
    if (updates.commissionRate !== undefined) {
      transformedUpdates.fees = {
        ...settings.fees,
        commissionRate: parseFloat(updates.commissionRate)
      };
    }

    // Email settings
    if (updates.senderName !== undefined || updates.emailFooter !== undefined) {
      transformedUpdates.notifications = {
        ...settings.notifications,
        email: {
          ...settings.notifications?.email,
          fromName: updates.senderName || settings.notifications?.email?.fromName,
          footer: updates.emailFooter || settings.notifications?.email?.footer
        }
      };
    }

    // SMTP settings
    if (updates.notifications?.email?.smtp) {
      const smtp = updates.notifications.email.smtp;
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        email: {
          ...transformedUpdates.notifications?.email || settings.notifications?.email,
          smtp: {
            host: smtp.host || settings.notifications?.email?.smtp?.host,
            port: parseInt(smtp.port) || settings.notifications?.email?.smtp?.port,
            secure: Boolean(smtp.secure),
            auth: {
              user: smtp.auth?.user || settings.notifications?.email?.smtp?.auth?.user,
              pass: smtp.auth?.pass || settings.notifications?.email?.smtp?.auth?.pass
            }
          }
        }
      };
    }

    // Email notification toggles
    if (updates.emailNotifications) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        admin: {
          ...transformedUpdates.notifications?.admin || settings.notifications?.admin,
          email: {
            ...transformedUpdates.notifications?.admin?.email || settings.notifications?.admin?.email,
            newUser: Boolean(updates.emailNotifications.newUser),
            newCampaign: Boolean(updates.emailNotifications.newCampaign),
            paymentReceived: Boolean(updates.emailNotifications.paymentReceived),
            disputeRaised: Boolean(updates.emailNotifications.disputeRaised),
            reportGenerated: Boolean(updates.emailNotifications.reportGenerated)
          }
        }
      };
    }

    // Update settings
    Object.assign(settings, transformedUpdates);
    settings.updatedBy = adminId;
    settings.version = (settings.version || 1) + 1;

    await settings.save();

    // Clear caches to ensure updates reflect globally immediately
    settingsService.clearCache();
    feeService.clearCache();

    // Log the action
    try {
      await AuditLog.create({
        adminId: adminId,
        action: 'settings_update',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { 
          updatedFields: Object.keys(transformedUpdates),
          version: settings.version
        }
      });
    } catch (logError) {
      console.error('Failed to log settings update:', logError);
      // Don't fail the request if logging fails
    }

    // Return updated settings
    const updatedSettings = await exports.getSettings(req, res);
    if (!updatedSettings.headersSent) {
      // Emit real-time update event before returning response
      if (global.socketService) {
        // We need the flat settings for the socket event
        const settings = await Settings.findOne();
        const simplifiedSettings = {
          platformName: String(settings?.platform?.name || 'InfluenceX').trim(),
          platformDescription: String(settings?.platform?.description || '').trim(),
          supportEmail: String(settings?.platform?.supportEmail || '').trim().toLowerCase(),
          commissionRate: parseFloat(settings?.fees?.commissionRate ?? 10),
          senderName: String(settings?.notifications?.email?.fromName || 'InfluenceX'),
          emailFooter: String(settings?.notifications?.email?.footer || ''),
          notifications: {
            email: {
              smtp: {
                host: settings?.notifications?.email?.smtp?.host || '',
                port: settings?.notifications?.email?.smtp?.port || 587,
                secure: settings?.notifications?.email?.smtp?.secure || false,
                auth: {
                  user: settings?.notifications?.email?.smtp?.auth?.user || '',
                  pass: settings?.notifications?.email?.smtp?.auth?.pass || ''
                }
              }
            }
          },
          emailNotifications: {
            newUser: Boolean(settings?.notifications?.admin?.email?.newUser ?? true),
            newCampaign: Boolean(settings?.notifications?.admin?.email?.newCampaign ?? true),
            paymentReceived: Boolean(settings?.notifications?.admin?.email?.paymentReceived ?? true),
            disputeRaised: Boolean(settings?.notifications?.admin?.email?.disputeRaised ?? true),
            reportGenerated: Boolean(settings?.notifications?.admin?.email?.reportGenerated ?? true)
          }
        };

        global.socketService.emitToAdmins('settingsUpdated', {
          type: 'GLOBAL_SETTINGS_UPDATE',
          timestamp: new Date().toISOString(),
          settings: simplifiedSettings
        });
        console.log('📡 Real-time update (simplified) emitted to admins');
      }
      return updatedSettings;
    }

  } catch (error) {
    console.error('Update simplified settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update settings'
    });
  }
};

// ==================== GET SMS CONFIGURATION (FROM ENVIRONMENT) ====================
exports.getSmsConfig = async (req, res) => {
  try {
    // Return SMS configuration from environment variables only
    const smsConfig = {
      enabled: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      provider: 'twilio',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
      }
    };

    res.json({
      success: true,
      config: smsConfig,
      source: 'environment_variables'
    });

  } catch (error) {
    console.error('Get SMS config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve SMS configuration'
    });
  }
};

// ==================== GET COMMISSION CONFIGURATION ====================
exports.getCommissionConfig = async (req, res) => {
  try {
    // Get commission rate from database first, fallback to environment
    const settings = await Settings.findOne();
    const commissionRate = parseFloat(settings?.fees?.commissionRate ?? process.env.COMMISSION_RATE ?? 10);

    res.json({
      success: true,
      commissionRate: commissionRate,
      source: settings?.fees?.commissionRate ? 'database' : 'environment_variables'
    });

  } catch (error) {
    console.error('Get commission config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve commission configuration'
    });
  }
};
