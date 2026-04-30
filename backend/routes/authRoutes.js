const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');
const adminController = require('../controllers/admin/adminController');
const { verifyCaptcha, captchaRateLimit } = require('../middleware/captcha');
const { 
  authLimiter, 
  registerLimiter, 
  passwordResetLimiter, 
  strictLimiter 
} = require('../middleware/rateLimiter');

// ============================================================
// PUBLIC ROUTES
// ============================================================

// ✅ SIGNUP: ALWAYS require CAPTCHA
router.post(
  '/register',
  verifyCaptcha('register'),
  captchaRateLimit,
  authController.register
);

// ✅ LOGIN: Smart CAPTCHA + STRICT RATE LIMITING (Security Fix)
router.post(
  '/login',
  // 🔒 SECURITY: Apply strict rate limiting first (5 attempts per 15 minutes)
  authLimiter,
  (req, res, next) => {
    // Only verify captcha if token is present
    if (req.body.captchaToken || req.headers['x-captcha-token']) {
      console.log('🔐 CAPTCHA token detected for login - verifying');
      verifyCaptcha('login')(req, res, next);
    } else {
      console.log('⏭️ No CAPTCHA token for login - skipping verification');
      req.captcha = { success: true, score: 1.0 };
      next();
    }
  },
  captchaRateLimit,
  authController.login
);

// ✅ ADMIN LOGIN: Smart CAPTCHA + STRICT RATE LIMITING (Security Fix)
router.post(
  '/admin/login',
  // 🔒 SECURITY: Apply strict rate limiting first (5 attempts per 15 minutes)
  authLimiter,
  (req, res, next) => {
    // Only verify captcha if token is present
    if (req.body.captchaToken || req.headers['x-captcha-token']) {
      console.log('🔐 CAPTCHA token detected for admin login - verifying');
      verifyCaptcha('login')(req, res, next);
    } else {
      console.log('⏭️ No CAPTCHA token for admin login - skipping verification');
      req.captcha = { success: true, score: 1.0 };
      next();
    }
  },
  captchaRateLimit,
  adminController.adminLogin
);

// Token management
router.post('/refresh', strictLimiter, authController.refreshToken);

// Password reset
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// Email verification
router.post('/verify-email', strictLimiter, authController.verifyEmail);

// Email OTP
router.post('/send-otp', passwordResetLimiter, authController.sendOTP);
router.post('/send-email-otp', passwordResetLimiter, authController.sendOTP);
router.post('/verify-otp', authLimiter, authController.verifyOTP);
router.post('/verify-email-otp', authLimiter, authController.verifyOTP);

// Phone OTP
router.post('/send-phone-otp', passwordResetLimiter, authController.sendPhoneOTP);
router.post('/verify-phone-otp', authLimiter, authController.verifyPhoneOTP);

// Public security settings (for signup flow)
router.get('/settings/security', async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    
    // Return only security-related settings needed for frontend
    const securitySettings = {
      emailVerification: settings.security?.emailVerification ?? true,
      // phoneVerification removed - now optional in signup flow
      passwordMinLength: settings.security?.passwordMinLength ?? 8,
      passwordRequireUppercase: settings.security?.passwordRequireUppercase ?? true,
      passwordRequireLowercase: settings.security?.passwordRequireLowercase ?? true,
      passwordRequireNumbers: settings.security?.passwordRequireNumbers ?? true,
      passwordRequireSymbols: settings.security?.passwordRequireSymbols ?? false
    };

    res.json({
      success: true,
      data: securitySettings
    });
  } catch (error) {
    console.error('Get public security settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch security settings' 
    });
  }
});

// ============================================================
// PROTECTED ROUTES
// ============================================================
router.use(protect);

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);

module.exports = router;