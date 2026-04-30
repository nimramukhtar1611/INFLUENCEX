// services/emailService.js - FULL FIXED VERSION
const nodemailer = require('nodemailer');

// ✅ FIX: Remove circular dependency - don't require settingsService at top level
let settingsService = null;

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.lastCredentialsHash = null; // Track credential changes
    this.settingsListenerAttached = false;
  }

  // ✅ FIX: Lazy load settingsService to avoid circular dependency
  getSettingsService() {
    if (!settingsService) {
      try {
        settingsService = require('./settingsService');
        // Attach event listener only once
        if (!this.settingsListenerAttached && settingsService) {
          settingsService.on('settingsChanged', () => {
            console.log('🔄 Email service: Settings changed, forcing reinitialization');
            this.initialized = false;
            this.lastCredentialsHash = null;
          });
          this.settingsListenerAttached = true;
        }
      } catch (error) {
        console.warn('⚠️ Settings service not available, using environment variables only');
      }
    }
    return settingsService;
  }

  // ==================== INITIALIZE ====================
  async initialize() {
    console.log('🔍 EmailService.initialize() called');
    
    // ✅ FIX: Declare variables outside try-catch to maintain scope
    let currentCredentials = {
      host: process.env.EMAIL_HOST,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      port: parseInt(process.env.EMAIL_PORT) || 587
    };
    let smtpConfig = null;
    
    try {
      // ✅ FIX: Safe settings service access with fallback
      const svc = this.getSettingsService();
      let settings = null;
      
      if (svc) {
        try {
          settings = await svc.getSettings();
          smtpConfig = settings?.notifications?.email?.smtp;
          
          // Update credentials with settings if available
          currentCredentials = {
            host: smtpConfig?.host || process.env.EMAIL_HOST,
            user: smtpConfig?.auth?.user || process.env.EMAIL_USER,
            pass: smtpConfig?.auth?.pass || process.env.EMAIL_PASS,
            port: smtpConfig?.port || parseInt(process.env.EMAIL_PORT) || 587
          };
        } catch (settingsError) {
          console.warn('⚠️ Failed to get settings, using environment variables:', settingsError.message);
        }
      }
    } catch (initError) {
      console.error('❌ Email service initialization error:', initError.message);
      this.initialized = true; // Mark as initialized to prevent retry loops
      return;
    }
    
    // Create hash of current credentials
    const currentHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(currentCredentials))
      .digest('hex');
    
    // If credentials haven't changed and service is initialized, skip
    if (this.initialized && this.lastCredentialsHash === currentHash) {
      console.log('🔍 EmailService credentials unchanged, skipping reinitialization');
      return;
    }
    
    // If credentials changed, force reinitialization
    if (this.initialized) {
      console.log('🔄 EmailService credentials changed, reinitializing...');
      this.initialized = false;
      this.transporter = null;
    }

    try {
      console.log('🔍 Creating email transporter with dynamic credentials...');
      
      // Use the currentCredentials we already calculated above
      const host = currentCredentials.host;
      const user = currentCredentials.user;
      const pass = currentCredentials.pass;

      if (!host || !user || !pass) {
        console.warn('⚠️ Email service not configured. Using console logging instead.');
        console.warn('⚠️ Missing:', { host: !!host, user: !!user, pass: !!pass });
        this.initialized = true;
        return;
      }

      const config = {
        host: host,
        port: currentCredentials.port,
        secure: (process.env.EMAIL_SECURE === 'true'),
        auth: {
          user: user,
          pass: pass
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      };

      this.transporter = nodemailer.createTransport(config);
      console.log('🔍 Email transporter created with dynamic config');

      this.transporter.verify((error) => {
        if (error) {
          console.warn('⚠️ Email server connection warning:', error.message);
        } else {
          console.log('✅ Email server is ready with dynamic credentials');
        }
      });

      this.initialized = true;
      this.lastCredentialsHash = currentHash; // Store the hash
      console.log('✅ Email service initialized with dynamic credentials');
    } catch (error) {
      console.error('❌ Email service initialization ERROR:', error.message);
      console.error('❌ Email service initialization STACK:', error.stack);
      this.initialized = true; // Mark as initialized to prevent retry loops
    }
  }

  isInitialized() {
    return this.initialized;
  }

  // ==================== SEND EMAIL ====================
  async sendEmail(options) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.transporter) {
      console.log('📧 Email would be sent (logging mode):', {
        to: options.to || options.email,
        subject: options.subject,
        template: options.template,
        reason: 'No transporter configured - check SMTP credentials'
      });
      return {
        success: true,
        messageId: 'logged',
        message: 'Email logged (no transporter configured)',
        warning: 'SMTP credentials not properly configured'
      };
    }

    try {
      // ✅ FIX: Safe settings service access
      const svc = this.getSettingsService();
      let settings = null;
      
      if (svc) {
        try {
          settings = await svc.getSettings();
        } catch (settingsError) {
          console.warn('⚠️ Failed to get settings for email, using environment variables:', settingsError.message);
        }
      }
      
      const fromName = options.fromName || settings?.notifications?.email?.fromName || process.env.EMAIL_FROM_NAME || 'InfluenceX';
      const fromEmail = options.from || settings?.notifications?.email?.fromEmail || process.env.EMAIL_FROM || process.env.EMAIL_USER;
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to || options.email,
        subject: options.subject,
        html: options.html || await this.getTemplate(options.template, options.data),
        text: options.text,
        attachments: options.attachments || []
      };

      if (options.replyTo) mailOptions.replyTo = options.replyTo;
      if (options.cc)      mailOptions.cc      = options.cc;
      if (options.bcc)     mailOptions.bcc     = options.bcc;

      const info = await this.transporter.sendMail(mailOptions);

      const accepted = Array.isArray(info.accepted) ? info.accepted : [];
      const rejected = Array.isArray(info.rejected) ? info.rejected : [];
      const pending = Array.isArray(info.pending) ? info.pending : [];

      // Some SMTP providers return messageId even when recipients are rejected/pending.
      if (accepted.length === 0 && (rejected.length > 0 || pending.length > 0)) {
        console.error('❌ Email not accepted by SMTP server:', {
          to: mailOptions.to,
          rejected,
          pending,
          response: info.response,
        });

        return {
          success: false,
          error: 'SMTP server did not accept recipient',
          messageId: info.messageId,
          accepted,
          rejected,
          pending,
          response: info.response,
        };
      }

      console.log(`✅ Email sent: ${info.messageId}`, {
        to: mailOptions.to,
        accepted,
        rejected,
        pending,
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted,
        rejected,
        pending,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== GET DYNAMIC SETTINGS ====================
  async getDynamicSettings() {
    try {
      // ✅ FIX: Safe settings service access
      const svc = this.getSettingsService();
      let settings = null;
      
      if (svc) {
        try {
          settings = await svc.getSettings();
        } catch (settingsError) {
          console.warn('⚠️ Failed to get settings for dynamic settings, using defaults:', settingsError.message);
        }
      }
      
      const currentYear = new Date().getFullYear();
      const companyName = settings?.platform?.name || 'InfluenceX';
      const supportEmail = settings?.platform?.supportEmail || 'support@influencex.com';
      const customFooter = settings?.notifications?.email?.footer || '';
      
      // Get dynamic expiry times
      const otpExpiryMinutes = settings?.security?.otpExpiryMinutes || 10;
      const emailVerificationExpiryHours = settings?.security?.emailVerificationExpiryHours || 24;
      const passwordResetExpiryHours = settings?.security?.passwordResetExpiryHours || 1;
      const twoFactorCodeExpiryMinutes = settings?.security?.twoFactorCodeExpiryMinutes || 5;
      
      // Get dynamic message templates
      const messageTemplates = settings?.notifications?.email?.messageTemplates || {};
      
      return {
        companyName,
        supportEmail,
        customFooter,
        currentYear,
        otpExpiryMinutes,
        emailVerificationExpiryHours,
        passwordResetExpiryHours,
        twoFactorCodeExpiryMinutes,
        messageTemplates
      };
    } catch (error) {
      console.warn('⚠️ Failed to fetch dynamic settings, using defaults:', error.message);
      // Fallback to defaults
      const currentYear = new Date().getFullYear();
      return {
        companyName: 'InfluenceX',
        supportEmail: 'support@influencex.com',
        customFooter: '',
        currentYear,
        otpExpiryMinutes: 10,
        emailVerificationExpiryHours: 24,
        passwordResetExpiryHours: 1,
        twoFactorCodeExpiryMinutes: 5,
        messageTemplates: {}
      };
    }
  }

  // ==================== GET DYNAMIC FOOTER ====================
  async getDynamicFooter() {
    const { companyName, supportEmail, customFooter, currentYear } = await this.getDynamicSettings();
    
    // Elite minimalist footer styling
    if (customFooter && customFooter.trim()) {
      return `
        <div class="footer" style="text-align: center; padding: 32px 20px; color: #71717a; font-size: 13px; background: #18181b; border-top: 1px solid #27272a;">
          <p style="margin: 0; font-weight: 300; letter-spacing: 0.01em;">${customFooter.replace(/© \d{4}/g, `© ${currentYear}`).replace(/InfluenceX/g, companyName)}</p>
          <p style="margin: 12px 0 0; font-weight: 300;">
            <a href="mailto:${supportEmail}" style="color: #a1a1aa; text-decoration: none; border-bottom: 1px solid #3f3f46; padding-bottom: 2px; transition: all 0.2s ease; font-weight: 400;">${supportEmail}</a>
          </p>
        </div>
      `;
    }
    
    // Default elite minimalist footer
    return `
      <div class="footer" style="text-align: center; padding: 32px 20px; color: #71717a; font-size: 13px; background: #18181b; border-top: 1px solid #27272a;">
        <p style="margin: 0; font-weight: 300; letter-spacing: 0.01em;">&copy; ${currentYear} ${companyName}. All rights reserved.</p>
        <p style="margin: 12px 0 0; font-weight: 300;">
          <a href="mailto:${supportEmail}" style="color: #a1a1aa; text-decoration: none; border-bottom: 1px solid #3f3f46; padding-bottom: 2px; transition: all 0.2s ease; font-weight: 400;">${supportEmail}</a>
        </p>
      </div>
    `;
  }

  // ==================== TEMPLATES ====================
  async getTemplate(template, data = {}) {
    // ✅ FIX: Log error if template not found
    const baseStyles = `
      body { 
        font-family: 'Georgia', 'Times New Roman', serif; 
        line-height: 1.6; 
        color: #f4f4f5; 
        margin: 0; 
        padding: 0; 
        background: #18181b;
      }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        padding: 20px; 
        background: #18181b;
      }
      .content { 
        padding: 40px; 
        background: #18181b; 
        border-radius: 0 0 10px 10px; 
        border: 1px solid #27272a;
        border-top: none;
      }
      .footer { 
        text-align: center; 
        padding: 20px; 
        color: #71717a; 
        font-size: 12px; 
        background: #18181b;
      }
    `;

    const primaryHeader = `background: #18181b; border: 1px solid #27272a; border-bottom: none;`;
    const successHeader  = `background: #18181b; border: 1px solid #27272a; border-bottom: none;`;
    const warningHeader  = `background: #18181b; border: 1px solid #27272a; border-bottom: none;`;

    const headerBlock = (title, style = primaryHeader) => `
      <div style="${style} color: #f4f4f5; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #27272a;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; font-family: 'Georgia', 'Times New Roman', serif; letter-spacing: -0.02em;">${title}</h1>
      </div>
    `;

    const buttonBlock = (url, label, color = '#f4f4f5') => `
      <p style="text-align: center; margin: 30px 0;">
        <a href="${url}"
           style="display:inline-block;padding:16px 32px;background:#f4f4f5;color:#18181b;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;font-family: 'Georgia', 'Times New Roman', serif; border: 1px solid #27272a; transition: all 0.2s ease;">
          ${label}
        </a>
      </p>
    `;

    // ✅ FIX: Get dynamic footer from settings
    const footer = await this.getDynamicFooter();

    const wrap = async (headerHtml, contentHtml) => {
      const dynamicFooter = await this.getDynamicFooter();
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles}</style>
        </head>
        <body>
          <div class="container">
            ${headerHtml}
            <div class="content">${contentHtml}</div>
            ${dynamicFooter}
          </div>
        </body>
        </html>
      `;
    };

    const templates = {

      // ── Welcome ──────────────────────────────────────────────────────────
      welcome: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock(`Welcome to ${companyName}`);
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Thank you for joining ${companyName}! We're excited to have you on board.</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">Get started by completing your profile and exploring opportunities:</p>
          ${buttonBlock(data.url || process.env.FRONTEND_URL || '#', 'Get Started')}
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you have any questions, feel free to reply to this email.</p>
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── Email Verification ────────────────────────────────────────────────
      verifyEmail: async () => {
        const { emailVerificationExpiryHours } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Verify Your Email');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">Please verify your email address by clicking the button below:</p>
          ${buttonBlock(data.url || '#', 'Verify Email')}
          <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 20px;">This link will expire in <strong style="color: #f4f4f5;">${emailVerificationExpiryHours} hour${emailVerificationExpiryHours > 1 ? 's' : ''}</strong>.</p>
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you didn't create an account with us, please ignore this email.</p>
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── Password Reset ────────────────────────────────────────────────────
      // ✅ FIX: Both 'resetPassword' and 'forgotPassword' work now
      resetPassword: async () => {
        const { passwordResetExpiryHours } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Reset Your Password');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">You requested to reset your password. Click the button below to proceed:</p>
          ${buttonBlock(data.url || '#', 'Reset Password')}
          <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 20px;">This link will expire in <strong style="color: #f4f4f5;">${passwordResetExpiryHours} hour${passwordResetExpiryHours > 1 ? 's' : ''}</strong>.</p>
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ✅ FIX: Alias for 'forgotPassword' — authController uses this name
      forgotPassword: async () => {
        const { passwordResetExpiryHours } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Reset Your Password');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">You requested to reset your password. Click the button below to proceed:</p>
          ${buttonBlock(data.url || '#', 'Reset Password')}
          <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 20px;">This link will expire in <strong style="color: #f4f4f5;">${passwordResetExpiryHours} hour${passwordResetExpiryHours > 1 ? 's' : ''}</strong>.</p>
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── OTP Code ──────────────────────────────────────────────────────────
      otpCode: async () => {
        const { otpExpiryMinutes, messageTemplates } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Your Verification Code');
        const otpMessage = messageTemplates.otpEmail || 'Your verification code is: {otp}. This code will expire in {expiryMinutes} minutes.';
        const formattedMessage = otpMessage
          .replace('{otp}', data.otp || '000000')
          .replace('{expiryMinutes}', otpExpiryMinutes.toString());
        
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">Your verification code is:</p>
          <div style="font-size:48px;font-weight:700;color:#f4f4f5;text-align:center;padding:35px;background:#27272a;border-radius:12px;margin:30px 0;letter-spacing:10px;border: 2px solid #3f3f46; font-family: 'Georgia', 'Times New Roman', serif; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            ${data.otp || '000000'}
          </div>
          <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 20px;">This code will expire in <strong style="color: #f4f4f5;">${otpExpiryMinutes} minute${otpExpiryMinutes > 1 ? 's' : ''}</strong>.</p>
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── New Deal Offer ────────────────────────────────────────────────────
      newDeal: async () => {
        const headerHtml = headerBlock('New Deal Offer');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">You have received a new deal offer from <strong style="color: #f4f4f5;">${data.brandName || 'a brand'}</strong>.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Campaign:</strong> ${data.campaign || 'Campaign'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Budget:</strong> $${data.budget || '0'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Deadline:</strong> ${data.deadline || 'TBD'}</p>
          </div>
          ${buttonBlock(data.url || '#', 'View Deal')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── Payment Received ──────────────────────────────────────────────────
      paymentReceived: async () => {
        const headerHtml = headerBlock('Payment Received');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">You have received a payment of <strong style="color: #f4f4f5;">$${data.amount || '0'}</strong> from <strong style="color: #f4f4f5;">${data.from || 'a brand'}</strong>.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Amount:</strong> $${data.amount || '0'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">From:</strong> ${data.from || 'N/A'}</p>
          </div>
          ${buttonBlock(data.url || '#', 'View Details')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── Referral Invitation ───────────────────────────────────────────────
      referralInvitation: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock("You've Been Invited");
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi there,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;"><strong style="color: #f4f4f5;">${data.referrerName || 'Someone'}</strong> has invited you to join ${companyName}!</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">As a special bonus, you'll receive <strong style="color: #f4f4f5;">${data.bonusAmount || '$50'}</strong> when you sign up and complete your first deal.</p>
          ${buttonBlock(data.referralLink || '#', 'Accept Invitation')}
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">This invitation expires in ${data.expiresIn || '90 days'}.</p>
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── 2FA Login Alert ───────────────────────────────────────────────────
      twoFAAlert: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock('New Login Attempt');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Hi <strong style="color: #f4f4f5;">${data.name || 'there'}</strong>,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">A login attempt was made to your ${companyName} account.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Time:</strong> ${data.time || new Date().toLocaleString()}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">IP:</strong> ${data.ip || 'Unknown'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Device:</strong> ${data.device || 'Unknown'}</p>
          </div>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 30px;">If this was you, no action is needed. If not, please secure your account immediately.</p>
          ${buttonBlock(data.url || '#', 'Secure My Account')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // ── ADMIN NOTIFICATIONS ─────────────────────────────────────────────────

      // New User Registration
      adminNewUser: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock('New User Registration');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Admin,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">A new user has registered on ${companyName}.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Name:</strong> ${data.name || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Email:</strong> ${data.email || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Type:</strong> ${data.userType || 'User'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Registered:</strong> ${data.registeredAt || new Date().toLocaleString()}</p>
          </div>
          ${buttonBlock(data.url || `${process.env.FRONTEND_URL}/admin/users`, 'View User Details')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // New Campaign Created
      adminNewCampaign: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock('New Campaign Created');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Admin,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">A new campaign has been created on ${companyName}.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Campaign:</strong> ${data.title || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Brand:</strong> ${data.brandName || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Budget:</strong> $${data.budget || '0'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Created:</strong> ${data.createdAt || new Date().toLocaleString()}</p>
          </div>
          ${buttonBlock(data.url || `${process.env.FRONTEND_URL}/admin/campaigns`, 'View Campaign')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // Payment Received
      adminPaymentReceived: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Payment Received');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Admin,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">A payment has been received on ${companyName}.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Amount:</strong> $${data.amount || '0'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">From:</strong> ${data.from || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">To:</strong> ${data.to || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Date:</strong> ${data.date || new Date().toLocaleString()}</p>
          </div>
          ${buttonBlock(data.url || `${process.env.FRONTEND_URL}/admin/payments`, 'View Payment Details')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // Dispute Raised
      adminDisputeRaised: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Dispute Raised');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Admin,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">A dispute has been raised on ${companyName}.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Deal ID:</strong> ${data.dealId || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Raised By:</strong> ${data.raisedBy || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Reason:</strong> ${data.reason || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Priority:</strong> ${data.priority || 'Medium'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Date:</strong> ${data.date || new Date().toLocaleString()}</p>
          </div>
          ${buttonBlock(data.url || `${process.env.FRONTEND_URL}/admin/disputes`, 'Review Dispute')}
        `;
        return await wrap(headerHtml, contentHtml);
      },

      // Report Generated
      adminReportGenerated: async () => {
        const { companyName } = await this.getDynamicSettings();
        const headerHtml = headerBlock('Report Generated');
        const contentHtml = `
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">Admin,</p>
          <p style="color: #f4f4f5; font-size: 16px; margin-bottom: 20px;">A new report has been generated on ${companyName}.</p>
          <div style="background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3f3f46;">
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Report Type:</strong> ${data.reportType || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Period:</strong> ${data.period || 'N/A'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Generated By:</strong> ${data.generatedBy || 'System'}</p>
            <p style="margin: 5px 0; color: #a1a1aa;"><strong style="color: #f4f4f5;">Date:</strong> ${data.date || new Date().toLocaleString()}</p>
          </div>
          ${buttonBlock(data.url || `${process.env.FRONTEND_URL}/admin/reports`, 'View Report')}
        `;
        return await wrap(headerHtml, contentHtml);
      }
    };

    // ✅ FIX: Proper error logging if template not found
    if (!templates[template]) {
      console.error(`❌ Email template not found: "${template}". Available: ${Object.keys(templates).join(', ')}`);
      return `
        <!DOCTYPE html><html><body>
          <p>Email content unavailable. Please contact support at support@influencex.com</p>
        </body></html>
      `;
    }

    // ✅ FIX: Handle async template functions
    const templateFn = templates[template];
    if (typeof templateFn === 'function') {
      return await templateFn();
    }
    return templateFn;
  }

  // ==================== CONVENIENCE METHODS ====================

  async sendWelcome(email, name) {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to InfluenceX! 🎉',
      template: 'welcome',
      data: { name }
    });
  }

  // Backward-compatible alias used by older controllers
  async sendWelcomeEmail(email, name) {
    return this.sendWelcome(email, name);
  }

  async sendVerification(email, name, token) {
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - InfluenceX',
      template: 'verifyEmail',
      data: { name, url }
    });
  }

  async sendPasswordReset(email, name, token) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${baseUrl}/reset-password?token=${token}`;
    console.log('Password reset URL generated:', url);
    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - InfluenceX',
      template: 'resetPassword',
      data: { name, url }
    });
  }

  // Backward-compatible alias supports both signatures:
  // (email, token) and (email, name, token)
  async sendPasswordResetEmail(email, arg2, arg3) {
    const hasName = typeof arg3 === 'string';
    const name = hasName ? arg2 : undefined;
    const token = hasName ? arg3 : arg2;
    return this.sendPasswordReset(email, name || 'there', token);
  }

  // ✅ FIX: Use otpCode template instead of plain HTML
  async sendOTP(email, name, otp) {
    return this.sendEmail({
      to: email,
      subject: 'Your Verification Code - InfluenceX',
      template: 'otpCode',
      data: { name, otp }
    });
  }

  async sendDealOffer(email, name, data) {
    return this.sendEmail({
      to: email,
      subject: 'New Deal Offer - InfluenceX',
      template: 'newDeal',
      data: { name, ...data }
    });
  }

  async sendPaymentNotification(email, name, data) {
    return this.sendEmail({
      to: email,
      subject: 'Payment Received - InfluenceX',
      template: 'paymentReceived',
      data: { name, ...data }
    });
  }

  async sendReferralInvitation(email, referrerName, referralLink, bonusAmount = '$50') {
    return this.sendEmail({
      to: email,
      subject: `${referrerName} invited you to join InfluenceX!`,
      template: 'referralInvitation',
      data: {
        referrerName,
        referralLink,
        bonusAmount,
        expiresIn: '90 days'
      }
    });
  }

  async send2FAAlert(email, name, data) {
    return this.sendEmail({
      to: email,
      subject: 'New Login Attempt Detected - InfluenceX',
      template: 'twoFAAlert',
      data: { name, ...data }
    });
  }

  // ── ADMIN NOTIFICATION CONVENIENCE METHODS ───────────────────────────────

  async sendAdminNewUser(email, data) {
    return this.sendEmail({
      to: email,
      subject: 'New User Registration - InfluenceX Admin',
      template: 'adminNewUser',
      data
    });
  }

  async sendAdminNewCampaign(email, data) {
    return this.sendEmail({
      to: email,
      subject: 'New Campaign Created - InfluenceX Admin',
      template: 'adminNewCampaign',
      data
    });
  }

  async sendAdminPaymentReceived(email, data) {
    return this.sendEmail({
      to: email,
      subject: 'Payment Received - InfluenceX Admin',
      template: 'adminPaymentReceived',
      data
    });
  }

  async sendAdminDisputeRaised(email, data) {
    return this.sendEmail({
      to: email,
      subject: 'Dispute Raised - InfluenceX Admin',
      template: 'adminDisputeRaised',
      data
    });
  }

  async sendAdminReportGenerated(email, data) {
    return this.sendEmail({
      to: email,
      subject: 'Report Generated - InfluenceX Admin',
      template: 'adminReportGenerated',
      data
    });
  }
}

const emailService = new EmailService();

module.exports = emailService;
// Backward compatibility for destructured imports: const { sendEmail } = require('.../emailService')
module.exports.sendEmail = emailService.sendEmail.bind(emailService);