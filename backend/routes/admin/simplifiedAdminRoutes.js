// Simplified Admin Routes for minimalist admin interface
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  getSettings,
  updateSettings,
  getSmsConfig,
  getCommissionConfig
} = require('../controllers/admin/simplifiedSettingsController');
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
  verifyAdminEmail
} = require('../controllers/admin/adminController');
const { protect, adminProtect, superAdminProtect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
router.post('/login', adminLimiter, validateLogin, adminLogin);

// All routes below require admin authentication
router.use(adminProtect);

// ==================== 2FA MANAGEMENT ROUTES ====================
router.post('/2fa/generate', twoFALimiter, adminGenerate2FA);
router.post('/2fa/verify', twoFALimiter, validate2FAToken, adminVerify2FA);
router.post('/2fa/disable', twoFALimiter, validate2FAToken, adminDisable2FA);
router.post('/2fa/regenerate-codes', twoFALimiter, validate2FAToken, adminRegenerateBackupCodes);
router.get('/2fa/status', adminGet2FAStatus);

// ==================== ADMIN ACCOUNT MANAGEMENT ====================
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

// ==================== SIMPLIFIED SETTINGS ====================
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Additional endpoints for environment-based configurations
router.get('/settings/sms-config', getSmsConfig);
router.get('/settings/commission-config', getCommissionConfig);

// ==================== DASHBOARD ====================
router.get('/dashboard', getDashboardStats);

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
      .withMessage('Verified must be true or false')
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

// ==================== DEALS AND PAYMENTS ====================
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
      .withMessage('Invalid priority')
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
router.get('/withdrawals/pending', getPendingWithdrawals);

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

// ==================== SYSTEM MANAGEMENT ====================
router.post('/system/clear-cache', clearCache);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Simplified Admin API is running',
    timestamp: new Date().toISOString(),
    features: {
      twoFactorAuth: true,
      simplifiedSettings: true,
      environmentBasedConfig: true
    }
  });
});

module.exports = router;
