// middleware/contentModerationMiddleware.js
const contentModerationService = require('../services/contentModerationService');
const userVerificationService = require('../services/userVerificationService');

/**
 * Middleware to moderate content before creation/update
 */
const moderateContent = (contentType) => {
  return async (req, res, next) => {
    try {
      // Skip moderation for admin users
      if (req.user && req.user.userType === 'admin') {
        return next();
      }

      const content = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Run content moderation
      const moderationResult = await contentModerationService.moderateContent(
        contentType,
        content,
        userId
      );

      // Store moderation result in request for later use
      req.moderationResult = moderationResult;

      // If content is approved, proceed
      if (moderationResult.approved) {
        return next();
      }

      // If content requires manual review, mark as pending
      if (moderationResult.requiresManualReview) {
        content.status = 'pending_moderation';
        content.moderationResult = moderationResult;
        
        // Save content but mark as pending
        // This would be handled by the specific controller
        return next();
      }

      // If content is rejected, block the request
      return res.status(400).json({
        success: false,
        error: 'Content rejected by moderation',
        moderation: moderationResult
      });

    } catch (error) {
      console.error('Content moderation middleware error:', error);
      
      // On error, allow content but flag for manual review
      req.moderationResult = {
        approved: false,
        requiresManualReview: true,
        error: error.message
      };
      
      next();
    }
  };
};

/**
 * Middleware to check user verification before content creation
 */
const requireVerification = (userTypes = ['creator', 'brand']) => {
  return async (req, res, next) => {
    try {
      // Skip verification check for admin users
      if (req.user && req.user.userType === 'admin') {
        return next();
      }

      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Check if user type requires verification
      if (!userTypes.includes(user.userType)) {
        return next();
      }

      // Check if user is already verified
      if (user.isVerified) {
        return next();
      }

      // Process verification based on platform settings
      const verificationResult = await userVerificationService.processVerification(
        user.id,
        user.userType
      );

      if (verificationResult.success && verificationResult.verified) {
        // User was verified during this process
        return next();
      }

      // If verification is pending or failed
      return res.status(403).json({
        success: false,
        error: 'User verification required',
        verification: verificationResult
      });

    } catch (error) {
      console.error('User verification middleware error:', error);
      
      // On error, allow but log
      next();
    }
  };
};

/**
 * Middleware to check auto-approval settings for user registration
 */
const checkAutoApproval = () => {
  return async (req, res, next) => {
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const userApprovalSettings = settings.userApproval || {};

      const userType = req.body.userType;
      
      if (!userType) {
        return next();
      }

      // Check if auto-approval is enabled for this user type
      const autoApprove = userType === 'brand' 
        ? userApprovalSettings.autoApproveBrands 
        : userApprovalSettings.autoApproveCreators;

      if (autoApprove) {
        // User will be auto-approved, set status accordingly
        req.body.status = 'active';
        req.body.isVerified = true;
        req.body.verifiedAt = new Date();
        req.body.verificationMethod = 'automatic';
      } else {
        // User requires verification
        req.body.status = 'pending';
        req.body.isVerified = false;
      }

      next();
    } catch (error) {
      console.error('Auto-approval check error:', error);
      next();
    }
  };
};

/**
 * Middleware to add verification status to API responses
 */
const addVerificationStatus = () => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json;

    // Override res.json to add verification status
    res.json = function(data) {
      if (req.user && data.success && data.data) {
        // Add verification status to response
        data.data.userVerification = {
          isVerified: req.user.isVerified || false,
          verifiedAt: req.user.verifiedAt,
          verificationMethod: req.user.verificationMethod,
          status: req.user.status
        };
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to filter content based on user verification status
 */
const filterContentByVerification = () => {
  return async (req, res, next) => {
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const userApprovalSettings = settings.userApproval || {};

      // If verification is not required, no filtering needed
      if (!userApprovalSettings.requireVerification) {
        return next();
      }

      // Store original res.json
      const originalJson = res.json;

      // Override res.json to filter content
      res.json = function(data) {
        if (data.success && data.data) {
          // Filter content based on verification settings
          data.data = filterContent(data.data, req.user, settings);
        }

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Content filtering error:', error);
      next();
    }
  };
};

/**
 * Helper function to filter content based on verification
 */
function filterContent(data, user, settings) {
  if (!user || user.userType === 'admin') {
    return data; // Admins see everything
  }

  // If user is verified, no filtering needed
  if (user.isVerified) {
    return data;
  }

  // Filter content for unverified users
  if (Array.isArray(data)) {
    return data.filter(item => {
      // Only show content from verified users or system content
      return item.createdBy?.isVerified || !item.createdBy;
    });
  } else if (data.items && Array.isArray(data.items)) {
    data.items = data.items.filter(item => {
      return item.createdBy?.isVerified || !item.createdBy;
    });
    return data;
  }

  return data;
}

/**
 * Middleware to log content creation attempts
 */
const logContentCreation = (contentType) => {
  return async (req, res, next) => {
    try {
      const AuditLog = require('../models/AuditLog');
      
      // Log after response is sent
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await AuditLog.create({
            action: 'content_created',
            targetUser: req.user?.id,
            metadata: {
              contentType,
              contentId: res.locals.contentId,
              moderationResult: req.moderationResult,
              timestamp: new Date()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
      });

      next();
    } catch (error) {
      console.error('Content creation logging error:', error);
      next();
    }
  };
};

module.exports = {
  moderateContent,
  requireVerification,
  checkAutoApproval,
  addVerificationStatus,
  filterContentByVerification,
  logContentCreation
};
