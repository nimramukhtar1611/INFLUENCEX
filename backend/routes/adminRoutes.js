// routes/adminRoutes.js - UPDATED WITH 2FA ENDPOINTS
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  adminLogin,
  getDashboardStats,
  getAllDeals,
  getAllPayments,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllDisputes,
  assignDispute,
  resolveDispute,
  getPendingWithdrawals,
  approveWithdrawal,
  getPlatformAnalytics,
  getSettings,
  getFees,
  getActivityLog,
  clearCache,
  // 2FA endpoints
  adminGenerate2FA,
  adminVerify2FA,
  adminDisable2FA,
  adminRegenerateBackupCodes,
  adminGet2FAStatus,
  // Admin account management
  updateAdminEmail,
  updateAdminPassword,
  verifyAdminEmail,
  // Usage limits and file upload endpoints
  getUsageLimits,
  updateUsageLimits,
  getFileUploadSettings,
  updateFileUploadSettings,
  addFileType,
  removeFileType,
  updateSettings
} = require('../controllers/admin/adminController');
const {
  getFraudReviewQueue,
  getCreatorFraudDetails,
  updateFraudReviewStatus
} = require('../controllers/admin/fraudController');
const { protect, adminProtect, superAdminProtect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const adminCampaignRoutes = require('./adminCampaignRoutes');
const adminUserRoutes = require('./userRoutes');
const adminReportRoutes = require('./reportRoutes');
const adminNotificationRoutes = require('./admin/adminNotificationRoutes');
const adminVerificationRoutes = require('./admin/verificationRoutes');
const paymentGatewayRoutes = require('./admin/paymentGatewayRoutes');

// Rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// 2FA rate limiter
const twoFALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many 2FA attempts. Please try again later.'
  }
});

// Validation rules
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('two_factor_code')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits')
    .isNumeric()
    .withMessage('2FA code must be numeric')
];

const validate2FAToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Token must be 6 digits')
    .isNumeric()
    .withMessage('Token must be numeric')
];

// Public routes (no auth required)
router.post(
  '/login',
  adminLimiter,
  validateLogin,
  adminLogin
);

// ==================== 2FA MANAGEMENT ROUTES ====================
// All routes below require admin authentication
router.use(adminProtect);

/**
 * @route   POST /api/admin/2fa/generate
 * @desc    Generate 2FA secret for admin
 * @access  Private/Admin
 */
router.post(
  '/2fa/generate',
  twoFALimiter,
  adminGenerate2FA
);
/**
 * @route   POST /api/admin/2fa/verify
 * @desc    Verify and enable 2FA for admin
 * @access  Private/Admin
 */
router.post(
  '/2fa/verify',
  twoFALimiter,
  validate2FAToken,
  adminVerify2FA
);

/**
 * @route   POST /api/admin/2fa/disable
 * @desc    Disable 2FA for admin
 * @access  Private/Admin
 */
router.post(
  '/2fa/disable',
  twoFALimiter,
  validate2FAToken,
  adminDisable2FA
);

/**
 * @route   POST /api/admin/2fa/regenerate-codes
 * @desc    Regenerate backup codes
 * @access  Private/Admin
 */
router.post(
  '/2fa/regenerate-codes',
  twoFALimiter,
  validate2FAToken,
  adminRegenerateBackupCodes
);

/**
 * @route   GET /api/admin/2fa/status
 * @desc    Get 2FA status
 * @access  Private/Admin
 */
router.get(
  '/2fa/status',
  adminGet2FAStatus
);

// ==================== ADMIN ACCOUNT MANAGEMENT ====================

/**
 * @route   PUT /api/admin/account/email
 * @desc    Update admin email
 * @access  Private/Admin
 */
router.put(
  '/account/email',
  [
    body('newEmail')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('confirmNewEmail')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
      .custom((value, { req }) => {
        if (value !== req.body.newEmail) {
          throw new Error('Email addresses do not match');
        }
        return true;
      })
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    try {
      await updateAdminEmail(req, res);
    } catch (error) {
      console.error('Admin email update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update email'
      });
    }
  }
);

/**
 * @route   PUT /api/admin/account/password
 * @desc    Update admin password
 * @access  Private/Admin
 */
router.put(
  '/account/password',
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmNewPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    try {
      await updateAdminPassword(req, res);
    } catch (error) {
      console.error('Admin password update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update password'
      });
    }
  }
);

/**
 * @route   GET /api/admin/account/verify-email
 * @desc    Verify admin email change
 * @access  Public (with token)
 */
router.get(
  '/account/verify-email',
  [
    query('token')
      .notEmpty()
      .withMessage('Verification token is required')
  ],
  async (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    try {
      const { verifyAdminEmail } = require('../controllers/admin/adminController');
      await verifyAdminEmail(req, res);
    } catch (error) {
      console.error('Admin email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify email'
      });
    }
  }
);

// ==================== DASHBOARD ====================
router.get(
  '/dashboard',
  getDashboardStats
);

router.get(
  '/deals',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isString().withMessage('Status must be a string')
  ],
  getAllDeals
);

router.get(
  '/payments',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isString().withMessage('Status must be a string'),
    query('type').optional().isString().withMessage('Type must be a string'),
    query('search').optional().isString().withMessage('Search must be a string')
  ],
  getAllPayments
);

// ==================== USER MANAGEMENT ====================
router.get(
  '/users',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('user_type')
      .optional()
      .isIn(['brand', 'creator', 'agency'])
      .withMessage('Invalid user type'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'blocked', 'pending'])
      .withMessage('Invalid status'),
    query('verified')
      .optional()
      .isBoolean()
      .withMessage('Verified must be true or false'),
    query('sort_by')
      .optional()
      .isIn(['created_at', 'full_name', 'email', 'last_active'])
      .withMessage('Invalid sort field'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  getAllUsers
);

router.get(
  '/users/:userId',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],
  getUserDetails
);

router.put(
  '/users/:userId/status',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    body('action')
      .isIn(['verify', 'unverify', 'block', 'unblock'])
      .withMessage('Invalid action'),
    body('reason')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],
  updateUserStatus
);

// ==================== DISPUTE MANAGEMENT ====================
router.get(
  '/disputes',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['open', 'investigating', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    query('type')
      .optional()
      .isIn(['payment', 'delivery', 'quality', 'communication', 'contract_breach'])
      .withMessage('Invalid dispute type')
  ],
  getAllDisputes
);

router.post(
  '/disputes/:disputeId/assign',
  [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    body('admin_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid admin ID')
  ],
  assignDispute
);

router.post(
  '/disputes/:disputeId/resolve',
  [
    param('disputeId')
      .isMongoId()
      .withMessage('Invalid dispute ID'),
    body('type')
      .isIn(['refund_brand', 'release_payment', 'split_funds', 'cancel_contract', 'no_action'])
      .withMessage('Invalid resolution type'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a number'),
    body('details')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Details cannot exceed 1000 characters')
  ],
  resolveDispute
);

// ==================== WITHDRAWAL MANAGEMENT ====================
router.get(
  '/withdrawals/pending',
  getPendingWithdrawals
);

router.post(
  '/withdrawals/:withdrawalId/approve',
  [
    param('withdrawalId')
      .isMongoId()
      .withMessage('Invalid withdrawal ID'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  approveWithdrawal
);

// ==================== ANALYTICS ====================
router.get(
  '/analytics',
  [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('group_by')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Group by must be day, week, or month')
  ],
  getPlatformAnalytics
);

// ==================== FRAUD REVIEW ====================
router.get(
  '/fraud/review-queue',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('queue').optional().isIn(['manual_review', 'high_risk', 'all_flagged']).withMessage('Invalid queue type'),
    query('riskLevel').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid risk level')
  ],
  getFraudReviewQueue
);

router.get(
  '/fraud/creators/:creatorId',
  [
    param('creatorId').isMongoId().withMessage('Invalid creator ID')
  ],
  getCreatorFraudDetails
);

router.patch(
  '/fraud/creators/:creatorId/review',
  [
    param('creatorId').isMongoId().withMessage('Invalid creator ID'),
    body('action').isIn(['clear_hold', 'mark_manual_review']).withMessage('Invalid action'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters')
  ],
  updateFraudReviewStatus
);

// ==================== ADMIN PROFILE ====================
router.get(
  '/profile',
  adminProtect,
  async (req, res) => {
    try {
      const Admin = require('../models/Admin');
      const admin = await Admin.findById(req.user._id).select('-password -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes');
      
      if (!admin) {
        return res.status(404).json({ success: false, error: 'Admin not found' });
      }

      res.json({
        success: true,
        admin: admin
      });
    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to get admin profile' });
    }
  }
);

// ==================== SETTINGS (Super Admin only) ====================
router.get(
  '/settings',
  adminProtect,
  getSettings
);

router.get(
  '/settings/security',
  async (req, res) => {
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      
      // Return only security-related settings
      const securitySettings = {
        emailVerification: settings.security?.emailVerification ?? true,
        // phoneVerification removed - now optional in signup flow
        maxLoginAttempts: settings.security?.maxLoginAttempts ?? 5,
        lockoutDuration: settings.security?.lockoutDuration ?? 30,
        passwordMinLength: settings.security?.passwordMinLength ?? 8,
        passwordRequireUppercase: settings.security?.passwordRequireUppercase ?? true,
        passwordRequireLowercase: settings.security?.passwordRequireLowercase ?? true,
        passwordRequireNumbers: settings.security?.passwordRequireNumbers ?? true,
        passwordRequireSymbols: settings.security?.passwordRequireSymbols ?? false,
        jwtExpiry: settings.security?.jwtExpiry ?? '7d',
        refreshTokenExpiry: settings.security?.refreshTokenExpiry ?? '30d',
        twoFactorRequired: settings.security?.twoFactorRequired ?? false,
        twoFactorForAdmins: settings.security?.twoFactorForAdmins ?? true,
        sessionTimeout: settings.security?.sessionTimeout ?? 30,
        passwordExpiryDays: settings.security?.passwordExpiryDays ?? 90,
        passwordHistoryCount: settings.security?.passwordHistoryCount ?? 5
      };

      res.json({
        success: true,
        data: securitySettings
      });
    } catch (error) {
      console.error('Get security settings error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch security settings' 
      });
    }
  }
);

router.get(
  '/fees',
  adminProtect,
  getFees
);

router.put(
  '/settings',
  adminProtect,
  updateSettings
);

// ==================== USAGE LIMITS MANAGEMENT ====================
router.get(
  '/usage-limits',
  adminProtect,
  getUsageLimits
);

router.put(
  '/usage-limits',
  [
    body('maxCampaignsPerBrand')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Max campaigns per brand must be between 1 and 1000'),
    body('maxActiveDealsPerCreator')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Max active deals per creator must be between 1 and 500'),
    body('maxFileSize')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Max file size must be between 1 and 500 MB'),
    body('maxFilesPerUpload')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Max files per upload must be between 1 and 50'),
    body('dailyUploadLimit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Daily upload limit must be between 1 and 1000'),
    body('storageQuotaPerUser')
      .optional()
      .isInt({ min: 100, max: 10000 })
      .withMessage('Storage quota per user must be between 100 and 10000 MB')
  ],
  adminProtect,
  updateUsageLimits
);

// ==================== FILE UPLOAD SETTINGS MANAGEMENT ====================
router.get(
  '/file-upload-settings',
  adminProtect,
  getFileUploadSettings
);

router.put(
  '/file-upload-settings',
  [
    body('allowedFileTypes')
      .optional()
      .isArray()
      .withMessage('Allowed file types must be an array'),
    body('imageOptimization.enabled')
      .optional()
      .isBoolean()
      .withMessage('Image optimization enabled must be true or false'),
    body('imageOptimization.maxWidth')
      .optional()
      .isInt({ min: 100, max: 4000 })
      .withMessage('Max width must be between 100 and 4000'),
    body('imageOptimization.maxHeight')
      .optional()
      .isInt({ min: 100, max: 4000 })
      .withMessage('Max height must be between 100 and 4000'),
    body('imageOptimization.quality')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Quality must be between 1 and 100'),
    body('videoOptimization.enabled')
      .optional()
      .isBoolean()
      .withMessage('Video optimization enabled must be true or false'),
    body('videoOptimization.maxDuration')
      .optional()
      .isInt({ min: 10, max: 3600 })
      .withMessage('Max duration must be between 10 and 3600 seconds'),
    body('videoOptimization.maxBitrate')
      .optional()
      .isInt({ min: 100, max: 20000 })
      .withMessage('Max bitrate must be between 100 and 20000 kbps'),
    body('storage.provider')
      .optional()
      .isIn(['local', 's3', 'cloudinary'])
      .withMessage('Storage provider must be local, s3, or cloudinary')
  ],
  adminProtect,
  updateFileUploadSettings
);

router.post(
  '/file-types',
  [
    body('fileType')
      .notEmpty()
      .withMessage('File type is required')
      .isIn(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'])
      .withMessage('Invalid file type')
  ],
  adminProtect,
  addFileType
);

router.delete(
  '/file-types/:fileType',
  [
    param('fileType')
      .notEmpty()
      .withMessage('File type is required')
  ],
  adminProtect,
  removeFileType
);

// ==================== ACTIVITY LOG (Super Admin only) ====================
router.get(
  '/activity-log',
  superAdminProtect,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Limit must be between 1 and 200'),
    query('admin_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid admin ID')
  ],
  getActivityLog
);

// ==================== MOUNT SUB-ROUTES ====================
router.use('/campaigns', adminCampaignRoutes);
router.use('/users', adminUserRoutes);
router.use('/reports', adminReportRoutes);
router.use('/notifications', adminNotificationRoutes);
router.use('/verification', adminVerificationRoutes);
router.use('/payment-gateway', paymentGatewayRoutes);

// ==================== SYSTEM MANAGEMENT ====================
router.post('/system/clear-cache', clearCache);

// ==================== NOTIFICATION SETTINGS ====================
// 🔒 FIX: Add missing notification settings API for frontend compatibility
router.get('/notifications/settings', adminProtect, async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    
    // Return notification settings
    const notificationSettings = {
      emailNotifications: settings.notifications?.emailTemplates || {
        newUser: true,
        newCampaign: true,
        paymentReceived: true,
        disputeRaised: true,
        reportGenerated: true
      },
      smsNotifications: {
        enabled: settings.notifications?.sms?.enabled || false,
        provider: settings.notifications?.sms?.provider || 'twilio'
      },
      pushNotifications: {
        enabled: settings.notifications?.push?.enabled || true
      },
      inAppNotifications: {
        enabled: settings.notifications?.inApp?.enabled || true
      }
    };

    res.json({
      success: true,
      settings: notificationSettings
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notification settings' 
    });
  }
});

router.put('/notifications/settings', adminProtect, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, pushNotifications, inAppNotifications } = req.body;
    
    const settingsService = require('../services/settingsService');
    const updatedSettings = await settingsService.updateSettings({
      notifications: {
        emailTemplates: emailNotifications,
        sms: smsNotifications,
        push: pushNotifications,
        inApp: inAppNotifications
      }
    }, req.user._id);

    res.json({
      success: true,
      settings: updatedSettings.notifications
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update notification settings' 
    });
  }
});

// ==================== STRIPE SYNC ROUTES ====================
// const stripeSyncRoutes = require('./admin/stripeSyncRoutes');
// router.use('/stripe-sync', stripeSyncRoutes);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString(),
    features: {
      twoFactorAuth: true,
      stripeSync: true
    }
  });
});

module.exports = router;