// controllers/admin/verificationController.js
const User = require('../../models/User');
const Brand = require('../../models/Brand');
const Creator = require('../../models/Creator');
const SocialAccount = require('../../models/SocialAccount');
const Campaign = require('../../models/Campaign');
const Deal = require('../../models/Deal');
const AuditLog = require('../../models/AuditLog');
const notificationService = require('../../services/notificationService');
const userVerificationService = require('../../services/userVerificationService');
const contentModerationService = require('../../services/contentModerationService');
const Settings = require('../../models/Settings');

// @desc    Get pending user verifications
// @route   GET /api/admin/verifications/pending
// @access  Private (Admin)
exports.getPendingVerifications = async (req, res) => {
  try {
    const { userType, page = 1, limit = 20, search } = req.query;
    
    const result = await userVerificationService.getPendingVerifications(
      userType,
      parseInt(page),
      parseInt(limit)
    );

    // Filter results if search provided
    if (search) {
      result.users = result.users.filter(user => 
        user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Approve user verification
// @route   POST /api/admin/verifications/:userId/approve
// @access  Private (Admin)
exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    const adminId = req.user._id;

    const result = await userVerificationService.manualApproveUser(userId, adminId, notes);

    res.json({
      success: true,
      message: 'User approved successfully',
      data: result
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Reject user verification
// @route   POST /api/admin/verifications/:userId/reject
// @access  Private (Admin)
exports.rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.user._id;

    const result = await userVerificationService.manualRejectUser(userId, adminId, reason, notes);

    res.json({
      success: true,
      message: 'User rejected successfully',
      data: result
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get user verification details
// @route   GET /api/admin/verifications/:userId
// @access  Private (Admin)
exports.getVerificationDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let profile = null;
    let socialAccounts = [];

    if (user.userType === 'brand') {
      profile = await Brand.findById(userId).lean();
    } else if (user.userType === 'creator') {
      profile = await Creator.findById(userId).lean();
      socialAccounts = await SocialAccount.find({ 
        creator_id: userId, 
        status: 'connected' 
      }).select('-access_token -refreshToken').lean();
    }

    // Get verification history
    const verificationHistory = await AuditLog.find({
      targetUser: userId,
      action: { $in: ['user_verified', 'user_rejected', 'verification_requested'] }
    }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        user,
        profile,
        socialAccounts,
        verificationHistory
      }
    });
  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get pending content moderation
// @route   GET /api/admin/moderation/pending
// @access  Private (Admin)
exports.getPendingModeration = async (req, res) => {
  try {
    const { contentType, page = 1, limit = 20, search } = req.query;
    
    const result = await contentModerationService.getPendingContent(
      contentType,
      parseInt(page),
      parseInt(limit)
    );

    // Filter results if search provided
    if (search) {
      result.content = result.content.filter(item => 
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get pending moderation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Approve content
// @route   POST /api/admin/moderation/:contentId/approve
// @access  Private (Admin)
exports.approveContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { notes } = req.body;
    const adminId = req.user._id;

    const result = await contentModerationService.approveContent(contentId, adminId, notes);

    res.json({
      success: true,
      message: 'Content approved successfully',
      data: result
    });
  } catch (error) {
    console.error('Approve content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Reject content
// @route   POST /api/admin/moderation/:contentId/reject
// @access  Private (Admin)
exports.rejectContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.user._id;

    const result = await contentModerationService.rejectContent(contentId, adminId, reason, notes);

    res.json({
      success: true,
      message: 'Content rejected successfully',
      data: result
    });
  } catch (error) {
    console.error('Reject content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get moderation statistics
// @route   GET /api/admin/moderation/stats
// @access  Private (Admin)
exports.getModerationStats = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const userApprovalSettings = settings.userApproval || {};
    const contentModerationSettings = settings.contentModeration || {};

    // Get user verification stats
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const pendingVerifications = await User.countDocuments({ status: 'pending' });

    // Get content moderation stats
    const pendingContent = await Campaign.countDocuments({ status: 'pending_moderation' }) +
                         await Deal.countDocuments({ status: 'pending_moderation' });

    // Get recent activity
    const recentVerifications = await AuditLog.countDocuments({
      action: { $in: ['user_verified', 'user_rejected'] },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    const recentModerations = await AuditLog.countDocuments({
      action: { $in: ['content_approved', 'content_rejected'] },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    res.json({
      success: true,
      data: {
        userVerification: {
          totalUsers,
          verifiedUsers,
          pendingVerifications,
          verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(1) : 0,
          autoApproveBrands: userApprovalSettings.autoApproveBrands || false,
          autoApproveCreators: userApprovalSettings.autoApproveCreators || false,
          verificationMethod: userApprovalSettings.verificationMethod || 'manual'
        },
        contentModeration: {
          pendingContent,
          moderationType: contentModerationSettings.moderationType || 'ai',
          autoApproveContent: contentModerationSettings.autoApproveContent || false,
          manualReviewRequired: contentModerationSettings.manualReviewRequired || false,
          recentActivity: recentModerations
        },
        activity: {
          recentVerifications,
          recentModerations
        }
      }
    });
  } catch (error) {
    console.error('Get moderation stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Bulk approve users
// @route   POST /api/admin/verifications/bulk-approve
// @access  Private (Admin)
exports.bulkApproveUsers = async (req, res) => {
  try {
    const { userIds, notes } = req.body;
    const adminId = req.user._id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const result = await userVerificationService.manualApproveUser(userId, adminId, notes);
        results.push({ userId, success: true, result });
      } catch (error) {
        errors.push({ userId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Approved ${results.length} users successfully`,
      data: {
        approved: results,
        errors,
        totalProcessed: userIds.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });
  } catch (error) {
    console.error('Bulk approve users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Bulk reject users
// @route   POST /api/admin/verifications/bulk-reject
// @access  Private (Admin)
exports.bulkRejectUsers = async (req, res) => {
  try {
    const { userIds, reason, notes } = req.body;
    const adminId = req.user._id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const result = await userVerificationService.manualRejectUser(userId, adminId, reason, notes);
        results.push({ userId, success: true, result });
      } catch (error) {
        errors.push({ userId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Rejected ${results.length} users successfully`,
      data: {
        rejected: results,
        errors,
        totalProcessed: userIds.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });
  } catch (error) {
    console.error('Bulk reject users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Re-moderate content
// @route   POST /api/admin/moderation/:contentId/remoderate
// @access  Private (Admin)
exports.remoderateContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const adminId = req.user._id;

    // Find the content and reset its status
    let content;
    const contentType = req.body.contentType || 'campaign';

    switch (contentType) {
      case 'campaign':
        content = await Campaign.findById(contentId);
        break;
      case 'deal':
        content = await Deal.findById(contentId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid content type'
        });
    }

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Reset status to pending moderation
    content.status = 'pending_moderation';
    content.moderationResult = null;
    content.moderatedAt = null;
    content.moderatedBy = null;
    await content.save();

    // Log the action
    await AuditLog.create({
      adminId,
      action: 'content_remoderated',
      metadata: {
        contentId,
        contentType,
        timestamp: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Content sent back for moderation',
      data: {
        contentId,
        contentType,
        status: 'pending_moderation'
      }
    });
  } catch (error) {
    console.error('Remoderate content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
