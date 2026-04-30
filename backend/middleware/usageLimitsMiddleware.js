// middleware/usageLimitsMiddleware.js
const Settings = require('../models/Settings');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const fs = require('fs');
const path = require('path');

/**
 * Middleware to enforce usage limits for brands and creators
 */
class UsageLimitsMiddleware {
  /**
   * Check if brand has reached campaign limit
   */
  static async checkCampaignLimit(req, res, next) {
    try {
      if (!req.user || req.user.userType !== 'brand') {
        return next();
      }

      const settings = await Settings.getSettings();
      const maxCampaigns = settings.usageLimits?.maxCampaignsPerBrand || 50;

      const campaignCount = await Campaign.countDocuments({
        brandId: req.user._id,
        status: { $ne: 'deleted' }
      });

      if (campaignCount >= maxCampaigns) {
        return res.status(429).json({
          success: false,
          error: `Campaign limit reached. You can create maximum ${maxCampaigns} campaigns.`,
          code: 'CAMPAIGN_LIMIT_EXCEEDED',
          limit: maxCampaigns,
          current: campaignCount
        });
      }

      next();
    } catch (error) {
      console.error('Campaign limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check campaign limit'
      });
    }
  }

  /**
   * Check if creator has reached active deals limit
   */
  static async checkActiveDealsLimit(req, res, next) {
    try {
      if (!req.user || req.user.userType !== 'creator') {
        return next();
      }

      const settings = await Settings.getSettings();
      const maxActiveDeals = settings.usageLimits?.maxActiveDealsPerCreator || 20;

      const activeDealsCount = await Deal.countDocuments({
        creatorId: req.user._id,
        status: { $in: ['accepted', 'in-progress', 'in_progress'] }
      });

      if (activeDealsCount >= maxActiveDeals) {
        return res.status(429).json({
          success: false,
          error: `Active deals limit reached. You can have maximum ${maxActiveDeals} active deals.`,
          code: 'ACTIVE_DEALS_LIMIT_EXCEEDED',
          limit: maxActiveDeals,
          current: activeDealsCount
        });
      }

      next();
    } catch (error) {
      console.error('Active deals limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check active deals limit'
      });
    }
  }

  /**
   * Check file upload limits
   */
  static async checkFileUploadLimits(req, res, next) {
    try {
      if (!req.user) {
        return next();
      }

      const settings = await Settings.getSettings();
      const usageLimits = settings.usageLimits || {};
      const fileUploadSettings = settings.fileUpload || {};

      // Check file size limit
      const maxFileSize = usageLimits.maxFileSize || 100; // MB
      if (req.file && req.file.size > maxFileSize * 1024 * 1024) {
        // Delete the uploaded file if it exists
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(413).json({
          success: false,
          error: `File size exceeds limit. Maximum allowed size is ${maxFileSize}MB.`,
          code: 'FILE_SIZE_LIMIT_EXCEEDED',
          limit: maxFileSize,
          actual: Math.round(req.file.size / 1024 / 1024)
        });
      }

      // Check file type
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname).toLowerCase().substring(1);
        const allowedFileTypes = fileUploadSettings.allowedFileTypes || 
          ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'];

        if (!allowedFileTypes.includes(fileExtension)) {
          // Delete the uploaded file if it exists
          if (req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({
            success: false,
            error: `File type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`,
            code: 'FILE_TYPE_NOT_ALLOWED',
            allowedTypes: allowedFileTypes,
            attemptedType: fileExtension
          });
        }
      }

      // Check daily upload limit
      const dailyUploadLimit = usageLimits.dailyUploadLimit || 100;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // This would require tracking uploads in a separate collection or model
      // For now, we'll implement a basic check using audit logs or similar
      // In a production environment, you'd want a dedicated UploadUsage model

      next();
    } catch (error) {
      console.error('File upload limits check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check file upload limits'
      });
    }
  }

  /**
   * Check storage quota for user
   */
  static async checkStorageQuota(req, res, next) {
    try {
      if (!req.user) {
        return next();
      }

      const settings = await Settings.getSettings();
      const storageQuotaPerUser = settings.usageLimits?.storageQuotaPerUser || 1000; // MB

      // This would require calculating current storage usage for the user
      // In a production environment, you'd track this in a dedicated model
      // For now, we'll implement a basic check

      next();
    } catch (error) {
      console.error('Storage quota check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check storage quota'
      });
    }
  }

  /**
   * Check multiple files per upload limit
   */
  static async checkMultipleFilesLimit(req, res, next) {
    try {
      if (!req.user) {
        return next();
      }

      const settings = await Settings.getSettings();
      const maxFilesPerUpload = settings.usageLimits?.maxFilesPerUpload || 10;

      // Check if multiple files are being uploaded
      const fileCount = req.files ? req.files.length : (req.file ? 1 : 0);

      if (fileCount > maxFilesPerUpload) {
        // Delete uploaded files if they exist
        if (req.files) {
          req.files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        } else if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(413).json({
          success: false,
          error: `Too many files. Maximum allowed per upload is ${maxFilesPerUpload}.`,
          code: 'FILES_PER_UPLOAD_LIMIT_EXCEEDED',
          limit: maxFilesPerUpload,
          actual: fileCount
        });
      }

      next();
    } catch (error) {
      console.error('Multiple files limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check multiple files limit'
      });
    }
  }

  /**
   * Get current usage statistics for a user
   */
  static async getUserUsageStats(userId, userType) {
    try {
      const stats = {
        campaigns: 0,
        activeDeals: 0,
        storageUsed: 0,
        uploadsToday: 0
      };

      if (userType === 'brand') {
        stats.campaigns = await Campaign.countDocuments({
          brandId: userId,
          status: { $ne: 'deleted' }
        });
      }

      if (userType === 'creator') {
        stats.activeDeals = await Deal.countDocuments({
          creatorId: userId,
          status: { $in: ['accepted', 'in-progress', 'in_progress'] }
        });
      }

      // Calculate storage usage (this would require tracking file uploads)
      // For now, return 0 as placeholder

      return stats;
    } catch (error) {
      console.error('Get user usage stats error:', error);
      throw error;
    }
  }

  /**
   * Middleware to add usage stats to request
   */
  static async addUsageStats(req, res, next) {
    try {
      if (!req.user) {
        return next();
      }

      req.usageStats = await UsageLimitsMiddleware.getUserUsageStats(
        req.user._id,
        req.user.userType
      );

      next();
    } catch (error) {
      console.error('Add usage stats error:', error);
      next(); // Don't block the request if stats fail
    }
  }
}

module.exports = UsageLimitsMiddleware;
