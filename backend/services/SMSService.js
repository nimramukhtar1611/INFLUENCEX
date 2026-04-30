// services/smsService.js - SINGLE SOURCE OF TRUTH
const twilio = require('twilio');
const config = require('../config/auth');
const logger = require('../utils/logger');
const settingsService = require('./settingsService');

// Listen for settings changes to reinitialize SMS service
settingsService.on('settingsChanged', () => {
  console.log('🔄 SMS service: Settings changed, forcing reinitialization');
  smsService.client = null;
  smsService.lastCredentialsHash = null;
});

class SMSService {
  constructor() {
    this.client = null;
    this.lastCredentialsHash = null; // Track credential changes
  }

  async initialize() {
    try {
      console.log('🔍 Getting dynamic Twilio configuration...');
      const settings = await settingsService.getSettings();
      const twilioConfig = settings.notifications?.sms?.twilio;

      // Use dynamic credentials from database, fallback to environment variables
      const accountSid = twilioConfig?.accountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = twilioConfig?.authToken || process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = twilioConfig?.phoneNumber || process.env.TWILIO_PHONE_NUMBER;
      
      // Create hash of current credentials
      const currentCredentials = { accountSid, authToken, phoneNumber };
      const currentHash = require('crypto')
        .createHash('md5')
        .update(JSON.stringify(currentCredentials))
        .digest('hex');
      
      // If credentials haven't changed and client is initialized, skip
      if (this.client && this.lastCredentialsHash === currentHash) {
        console.log('🔍 SMSService credentials unchanged, skipping reinitialization');
        return;
      }
      
      // If credentials changed, force reinitialization
      if (this.client) {
        console.log('🔄 SMSService credentials changed, reinitializing...');
        this.client = null;
      }

      if (accountSid && authToken) {
        this.client = twilio(accountSid, authToken);
        this.lastCredentialsHash = currentHash; // Store hash
        console.log('✅ Twilio client initialized with dynamic credentials');
      } else {
        console.warn('⚠️ Twilio credentials not found. SMS will be logged only.');
        console.warn('⚠️ Missing:', { accountSid: !!accountSid, authToken: !!authToken });
        this.client = null;
      }
    } catch (error) {
      console.error('❌ Twilio initialization failed:', error);
      this.client = null;
    }
  }

  // ==================== SEND SMS ====================
  async sendSMS(options) {
    try {
      const { to, message, from } = options;
      
      // Ensure initialization with dynamic credentials
      if (!this.client) {
        await this.initialize();
      }
      
      if (!to) {
        return {
          success: false,
          error: 'Phone number is required'
        };
      }

      // Validate phone number format (basic)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanedNumber = to.replace(/[-\s]/g, '');
      if (!phoneRegex.test(cleanedNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format. Use international format (e.g., +1234567890)'
        };
      }

      // In development, just log the SMS
      if (process.env.NODE_ENV === 'development' || !this.client) {
        // Get dynamic phone number from admin settings
        const settings = await settingsService.getSettings();
        const dynamicFrom = from || settings.notifications?.sms?.twilio?.phoneNumber || settings.notifications?.sms?.fromNumber || process.env.TWILIO_PHONE_NUMBER || '+1234567890';
        
        console.log('📱 SMS would be sent:', {
          to,
          from: dynamicFrom,
          message,
          reason: !this.client ? 'Twilio client not initialized - check credentials' : 'Development mode',
          settingsFrom: settings.notifications?.sms?.twilio?.phoneNumber,
          settingsFromNumber: settings.notifications?.sms?.fromNumber
        });
        
        // Log SMS for testing
        await this.logSMS({
          to,
          message,
          status: 'logged',
          createdAt: new Date()
        });

        return {
          success: true,
          message: 'SMS logged (development mode)',
          sid: `LOG-${Date.now()}`,
          warning: !this.client ? 'Twilio client not initialized - check credentials' : null
        };
      }

      // In production, actually send SMS
      // Get dynamic phone number for from field from admin settings
      const settings = await settingsService.getSettings();
      const dynamicFrom = from || settings.notifications?.sms?.twilio?.phoneNumber || settings.notifications?.sms?.fromNumber || process.env.TWILIO_PHONE_NUMBER;
      
      // Validate that the from number is a valid Twilio number format
      if (!dynamicFrom || !dynamicFrom.startsWith('+')) {
        return {
          success: false,
          error: 'Invalid Twilio phone number format. Must be in international format (e.g., +1234567890)'
        };
      }
      
      console.log('🔍 [DEBUG] Using Twilio from number:', dynamicFrom);
      console.log('🔍 [DEBUG] Twilio Payload:', { to: this.formatPhoneNumber(to), body: message, from: dynamicFrom });
      
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: dynamicFrom,
        to: this.formatPhoneNumber(to)
      });

      console.log('✅ SMS sent:', twilioMessage.sid);

      // Log successful send
      await this.logSMS({
        to,
        message,
        status: 'sent',
        sid: twilioMessage.sid,
        createdAt: new Date()
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status
      };

    } catch (error) {
      console.error('❌ SMS sending error:', error);

      // Check for specific Twilio phone number errors
      if (error.code === 21659) {
        console.error('❌ Twilio phone number error - The from number is not a valid Twilio number');
        return {
          success: false,
          error: 'The configured Twilio phone number is not valid. Please use a Twilio-provided phone number in your settings.'
        };
      }

      // Log error
      await this.logSMS({
        to: options.to,
        message: options.message,
        status: 'failed',
        error: error.message,
        createdAt: new Date()
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== GET DYNAMIC SETTINGS ====================
  async getDynamicSettings() {
    try {
      const settings = await settingsService.getSettings();
      const companyName = settings.platform?.name || 'InfluenceX';
      const otpExpiryMinutes = settings.security?.otpExpiryMinutes || 10;
      const messageTemplates = settings.notifications?.email?.messageTemplates || {};
      
      return {
        companyName,
        otpExpiryMinutes,
        messageTemplates
      };
    } catch (error) {
      console.warn('⚠️ Failed to fetch dynamic settings for SMS, using defaults:', error.message);
      return {
        companyName: 'InfluenceX',
        otpExpiryMinutes: 10,
        messageTemplates: {}
      };
    }
  }

  // ==================== SEND OTP ====================
  async sendOTP(phone, otp) {
    console.log('🔍 [DEBUG] sendOTP called with:', { phone, otp });
    
    const { companyName, otpExpiryMinutes, messageTemplates } = await this.getDynamicSettings();
    const template = messageTemplates.otpSms || 'Your {platformName} verification code: {otp}. Valid for {expiryMinutes} minutes. Do not share this code.';
    const message = template
      .replace('{platformName}', companyName)
      .replace('{otp}', otp)
      .replace('{expiryMinutes}', otpExpiryMinutes.toString());
    
    console.log('🔍 [DEBUG] Generated OTP message:', message);
    console.log('🔍 [DEBUG] Calling sendSMS with:', { to: phone, message: message });
    
    return this.sendSMS({
      to: phone,
      message: message
    });
  }

  // ==================== SEND NOTIFICATION ====================
  async sendNotification(phone, type, data = {}) {
    const { companyName, messageTemplates } = await this.getDynamicSettings();
    let message = '';
    
    switch(type) {
      case 'deal_offer':
        const dealTemplate = messageTemplates.dealOfferSms || '{platformName}: New deal offer from {brandName} for ${budget}. View: {dealUrl}';
        message = dealTemplate
          .replace('{platformName}', companyName)
          .replace('{brandName}', data.brandName || 'a brand')
          .replace('{budget}', data.budget || '0')
          .replace('{dealUrl}', `${process.env.FRONTEND_URL}/deals/${data.dealId}`);
        break;
      case 'deal_accepted':
        message = `${companyName}: Your deal has been accepted. View details in your dashboard.`;
        break;
      case 'payment_received':
        const paymentTemplate = messageTemplates.paymentReceivedSms || '{platformName}: Payment of ${amount} received. View details in your dashboard.';
        message = paymentTemplate
          .replace('{platformName}', companyName)
          .replace('{amount}', data.amount || '0');
        break;
      case 'deadline_reminder':
        const deadlineTemplate = messageTemplates.deadlineReminderSms || '{platformName}: Deal deadline in {days} days. Submit deliverables in your dashboard.';
        message = deadlineTemplate
          .replace('{platformName}', companyName)
          .replace('{days}', data.days || 'several');
        break;
      case 'verification':
        const verificationTemplate = messageTemplates.otpSms || 'Your {platformName} verification code: {otp}. Valid for {expiryMinutes} minutes. Do not share this code.';
        message = verificationTemplate
          .replace('{platformName}', companyName)
          .replace('{otp}', data.otp || '000000')
          .replace('{expiryMinutes}', '10');
        break;
      case '2fa_code':
        const twoFactorTemplate = messageTemplates.twoFactorSms || '{platformName}: Your 2FA code is {code}. Valid for {expiryMinutes} minutes. Do not share.';
        message = twoFactorTemplate
          .replace('{platformName}', companyName)
          .replace('{code}', data.code || '000000')
          .replace('{expiryMinutes}', '5');
        break;
      case 'account_locked':
        const lockedTemplate = messageTemplates.accountLockedSms || '{platformName}: Account locked due to failed attempts. Reset your password to continue.';
        message = lockedTemplate.replace('{platformName}', companyName);
        break;
      case 'password_reset':
        const resetTemplate = messageTemplates.passwordResetSms || '{platformName}: Use this link to reset your password: {resetLink}. Valid for {expiryHours} hour.';
        message = resetTemplate
          .replace('{platformName}', companyName)
          .replace('{resetLink}', data.resetLink || '#')
          .replace('{expiryHours}', '1');
        break;
      default:
        message = `${companyName}: You have a new notification. Check your dashboard.`;
    }

    return this.sendSMS({
      to: phone,
      message: message
    });
  }

  // ==================== BULK SMS ====================
  async sendBulkSMS(recipients, message) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS({
        to: recipient.phone,
        message
      });
      results.push({
        phone: recipient.phone,
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: true,
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // ==================== CHECK BALANCE ====================
  async checkBalance() {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio not configured',
        balance: 0,
        currency: 'USD'
      };
    }

    try {
      // Get account balance
      const balance = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).balance.fetch();
      
      return {
        success: true,
        balance: parseFloat(balance.balance),
        currency: balance.currency
      };
    } catch (error) {
      console.error('❌ Balance check error:', error);
      return {
        success: false,
        error: error.message,
        balance: 0
      };
    }
  }

  // ==================== VERIFY PHONE NUMBER ====================
  async verifyPhoneNumber(phone) {
    try {
      // Basic validation
      const cleaned = this.formatPhoneNumber(phone);
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      
      if (!phoneRegex.test(cleaned)) {
        return {
          success: false,
          valid: false,
          error: 'Invalid phone number format'
        };
      }

      // In production, use Twilio Lookup API for carrier verification
      if (this.client) {
        try {
          const phoneNumber = await this.client.lookups.v1.phoneNumbers(cleaned).fetch({
            type: ['carrier', 'caller-name']
          });
          
          return {
            success: true,
            valid: true,
            countryCode: phoneNumber.countryCode,
            nationalFormat: phoneNumber.nationalFormat,
            carrier: phoneNumber.carrier?.name || 'Unknown',
            lineType: phoneNumber.carrier?.type || 'Unknown'
          };
        } catch (lookupError) {
          console.warn('⚠️ Twilio lookup failed:', lookupError.message);
          // Fallback to basic validation
          return {
            success: true,
            valid: true,
            formatted: cleaned,
            warning: 'Could not verify carrier information'
          };
        }
      }

      return {
        success: true,
        valid: true,
        formatted: cleaned
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: error.message
      };
    }
  }

  // ==================== HELPER METHODS ====================
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.replace(/^0+/, ''); // Remove leading zeros
    }
    
    return cleaned;
  }

  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  async logSMS(data) {
    // In production, you might want to store this in database
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 SMS Log:', data);
    }
    
    // Optional: Store in database for auditing
    // const SMSLog = require('../models/SMSLog');
    // await SMSLog.create(data);
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured() {
    return !!this.client;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: !!this.client,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      mode: process.env.NODE_ENV === 'development' ? 'development (logging)' : 'production'
    };
  }
}

// Create and export singleton instance
const smsService = new SMSService();
module.exports = smsService;