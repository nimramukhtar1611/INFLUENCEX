// routes/admin/adminNotificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const {
  getAdminNotificationSettings,
  updateAdminNotificationSettings,
  testAdminNotification,
  getNotificationStats
} = require('../../controllers/admin/adminNotificationController');

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/notifications/settings
// @desc    Get admin notification settings
router.get('/settings', getAdminNotificationSettings);

// @route   PUT /api/admin/notifications/settings
// @desc    Update admin notification settings
router.put('/settings', updateAdminNotificationSettings);

// @route   POST /api/admin/notifications/test
// @desc    Send test admin notification
router.post('/test', testAdminNotification);

// @route   GET /api/admin/notifications/stats
// @desc    Get notification statistics
router.get('/stats', getNotificationStats);

module.exports = router;
