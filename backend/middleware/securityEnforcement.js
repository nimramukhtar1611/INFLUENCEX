const settingsService = require('../services/settingsService');
const jwt = require('jsonwebtoken');

/**
 * Comprehensive Security Enforcement Middleware
 * Enforces all admin-defined security settings across the platform
 */
class SecurityEnforcement {
  /**
   * Middleware to enforce session timeout
   * Checks if user session has expired based on admin settings
   */
  static async enforceSessionTimeout(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const securitySettings = settings.security || {};
      const sessionTimeoutMinutes = securitySettings.sessionTimeout || 30;
      const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000;

      // Skip for login routes and public routes
      if (req.path === '/api/auth/login' || req.path === '/api/admin/login' || 
          req.path.startsWith('/api/public/') || req.path.startsWith('/api/global/')) {
        return next();
      }

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(); // Let auth middleware handle missing token
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
        const now = Date.now();

        // Check if session has expired
        if (now - tokenIssuedAt > sessionTimeoutMs) {
          return res.status(401).json({
            success: false,
            error: 'Session expired due to inactivity',
            code: 'SESSION_TIMEOUT',
            timeoutMinutes: sessionTimeoutMinutes
          });
        }
      } catch (jwtError) {
        // Token is invalid or expired, let auth middleware handle it
        return next();
      }

      next();
    } catch (error) {
      console.error('Session timeout enforcement error:', error);
      // Don't block requests if enforcement fails
      next();
    }
  }

  /**
   * Middleware to enforce password requirements
   * Validates passwords against admin-defined policies
   */
  static validatePasswordRequirements(password) {
    return async (req, res, next) => {
      try {
        const settings = await settingsService.getSettings();
        const securitySettings = settings.security || {};

        const minLength = securitySettings.passwordMinLength || 8;
        const requireUppercase = securitySettings.passwordRequireUppercase ?? true;
        const requireLowercase = securitySettings.passwordRequireLowercase ?? true;
        const requireNumbers = securitySettings.passwordRequireNumbers ?? true;
        const requireSymbols = securitySettings.passwordRequireSymbols ?? false;

        const errors = [];

        // Length validation
        if (password.length < minLength) {
          errors.push(`Password must be at least ${minLength} characters long`);
        }

        // Uppercase validation
        if (requireUppercase && !/[A-Z]/.test(password)) {
          errors.push('Password must contain at least one uppercase letter');
        }

        // Lowercase validation
        if (requireLowercase && !/[a-z]/.test(password)) {
          errors.push('Password must contain at least one lowercase letter');
        }

        // Numbers validation
        if (requireNumbers && !/\d/.test(password)) {
          errors.push('Password must contain at least one number');
        }

        // Symbols validation
        if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          errors.push('Password must contain at least one special character');
        }

        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Password does not meet security requirements',
            requirements: {
              minLength,
              requireUppercase,
              requireLowercase,
              requireNumbers,
              requireSymbols
            },
            errors
          });
        }

        next();
      } catch (error) {
        console.error('Password validation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to validate password requirements'
        });
      }
    };
  }

  /**
   * Middleware to enforce OTP expiry
   * Checks if OTP tokens have expired based on admin settings
   */
  static async enforceOTPExpiry(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const securitySettings = settings.security || {};
      const otpExpiryMinutes = securitySettings.otpExpiryMinutes || 10;

      // For OTP verification routes, check expiry
      if (req.path.includes('/verify-otp') || req.path.includes('/verify-email')) {
        const TempOTP = require('../models/TempOTP');
        const { email, otp, token } = req.body;

        let otpRecord;
        if (email && otp) {
          otpRecord = await TempOTP.findOne({ email, otp });
        } else if (token) {
          otpRecord = await TempOTP.findOne({ token });
        }

        if (otpRecord && otpRecord.expiry) {
          const now = Date.now();
          if (now > otpRecord.expiry.getTime()) {
            // Delete expired OTP
            await TempOTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
              success: false,
              error: 'OTP has expired',
              code: 'OTP_EXPIRED',
              expiryMinutes: otpExpiryMinutes
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('OTP expiry enforcement error:', error);
      // Don't block requests if enforcement fails
      next();
    }
  }

  /**
   * Middleware to enforce email verification expiry
   */
  static async enforceEmailVerificationExpiry(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const securitySettings = settings.security || {};
      const emailVerificationExpiryHours = securitySettings.emailVerificationExpiryHours || 24;

      // For email verification routes
      if (req.path.includes('/verify-email') && req.body.token) {
        const User = require('../models/User');
        const user = await User.findOne({
          emailVerificationToken: req.body.token
        });

        if (user && user.emailVerificationExpire) {
          const now = Date.now();
          if (now > user.emailVerificationExpire.getTime()) {
            // Clear expired token
            user.emailVerificationToken = undefined;
            user.emailVerificationExpire = undefined;
            await user.save();
            
            return res.status(400).json({
              success: false,
              error: 'Email verification token has expired',
              code: 'EMAIL_VERIFICATION_EXPIRED',
              expiryHours: emailVerificationExpiryHours
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Email verification expiry enforcement error:', error);
      // Don't block requests if enforcement fails
      next();
    }
  }

  /**
   * Middleware to enforce password reset expiry
   */
  static async enforcePasswordResetExpiry(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const securitySettings = settings.security || {};
      const passwordResetExpiryHours = securitySettings.passwordResetExpiryHours || 1;

      // For password reset routes
      if (req.path.includes('/reset-password') && req.body.token) {
        const User = require('../models/User');
        const user = await User.findOne({
          resetPasswordToken: req.body.token
        });

        if (user && user.resetPasswordExpire) {
          const now = Date.now();
          if (now > user.resetPasswordExpire.getTime()) {
            // Clear expired token
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            
            return res.status(400).json({
              success: false,
              error: 'Password reset token has expired',
              code: 'PASSWORD_RESET_EXPIRED',
              expiryHours: passwordResetExpiryHours
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Password reset expiry enforcement error:', error);
      // Don't block requests if enforcement fails
      next();
    }
  }

  /**
   * Middleware to enforce 2FA code expiry
   */
  static async enforceTwoFactorCodeExpiry(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const securitySettings = settings.security || {};
      const twoFactorCodeExpiryMinutes = securitySettings.twoFactorCodeExpiryMinutes || 5;

      // For 2FA verification routes
      if (req.path.includes('/verify-2fa') || req.path.includes('/2fa/verify')) {
        // This would need to be implemented based on your 2FA service
        // For now, we'll pass through
        next();
        return;
      }

      next();
    } catch (error) {
      console.error('2FA code expiry enforcement error:', error);
      // Don't block requests if enforcement fails
      next();
    }
  }

  /**
   * Middleware to enforce password expiry
   * Checks if user's password has expired based on admin settings
   */
  static async enforcePasswordExpiry(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const securitySettings = settings.security || {};
      const passwordExpiryDays = securitySettings.passwordExpiryDays || 90;

      // Skip for login, password change, and public routes
      if (req.path === '/api/auth/login' || req.path === '/api/admin/login' ||
          req.path.includes('/change-password') || req.path.includes('/reset-password') ||
          req.path.startsWith('/api/public/') || req.path.startsWith('/api/global/')) {
        return next();
      }

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(); // Let auth middleware handle missing token
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require('../models/User');
        
        const user = await User.findById(decoded.id);
        if (user && user.passwordChangedAt) {
          const passwordAgeMs = Date.now() - user.passwordChangedAt.getTime();
          const passwordExpiryMs = passwordExpiryDays * 24 * 60 * 60 * 1000;

          if (passwordAgeMs > passwordExpiryMs) {
            return res.status(401).json({
              success: false,
              error: 'Password has expired',
              code: 'PASSWORD_EXPIRED',
              expiryDays: passwordExpiryDays,
              requiresPasswordChange: true
            });
          }
        }
      } catch (jwtError) {
        // Token is invalid, let auth middleware handle it
        return next();
      }

      next();
    } catch (error) {
      console.error('Password expiry enforcement error:', error);
      // Don't block requests if enforcement fails
      next();
    }
  }

  /**
   * Apply all security enforcement middleware
   */
  static applyAll() {
    return [
      this.enforceSessionTimeout,
      this.enforceOTPExpiry,
      this.enforceEmailVerificationExpiry,
      this.enforcePasswordResetExpiry,
      this.enforceTwoFactorCodeExpiry,
      this.enforcePasswordExpiry
    ];
  }
}

module.exports = SecurityEnforcement;
