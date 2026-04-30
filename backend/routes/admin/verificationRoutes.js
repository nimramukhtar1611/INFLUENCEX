// routes/admin/verificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPendingVerifications,
  approveUser,
  rejectUser,
  getVerificationDetails,
  getPendingModeration,
  approveContent,
  rejectContent,
  getModerationStats,
  bulkApproveUsers,
  bulkRejectUsers,
  remoderateContent
} = require('../../controllers/admin/verificationController');
const { protect, authorize } = require('../../middleware/auth');

// Apply authentication and authorization middleware
router.use(protect);
router.use(authorize('admin'));

// User Verification Routes
router.get('/verifications/pending', getPendingVerifications);
router.post('/verifications/:userId/approve', approveUser);
router.post('/verifications/:userId/reject', rejectUser);
router.get('/verifications/:userId', getVerificationDetails);
router.post('/verifications/bulk-approve', bulkApproveUsers);
router.post('/verifications/bulk-reject', bulkRejectUsers);

// Content Moderation Routes
router.get('/moderation/pending', getPendingModeration);
router.post('/moderation/:contentId/approve', approveContent);
router.post('/moderation/:contentId/reject', rejectContent);
router.post('/moderation/:contentId/remoderate', remoderateContent);

// Statistics Routes
router.get('/moderation/stats', getModerationStats);

module.exports = router;
