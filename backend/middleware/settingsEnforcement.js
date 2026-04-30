const settingsService = require('../services/settingsService');
const mongoose = require('mongoose');

/**
 * Middleware to enforce admin-defined limits across the platform
 * This middleware acts as "Guardrails" for Brand and Creator actions
 */
class SettingsEnforcement {
  /**
   * Check if user is within withdrawal limits
   */
  static async checkWithdrawalLimit(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const userId = req.user.id;
      const withdrawalAmount = req.body.amount || req.query.amount;
      
      if (!withdrawalAmount) {
        return res.status(400).json({
          success: false,
          error: 'Withdrawal amount is required'
        });
      }

      // Get user's current withdrawal total for this period (month)
      const Withdrawal = require('../models/Withdrawal');
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyWithdrawals = await Withdrawal.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: 'approved',
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const currentMonthlyTotal = monthlyWithdrawals[0]?.total || 0;
      const maxMonthlyWithdrawal = settings.payments?.maxPayoutAmount || 10000;
      const minWithdrawalAmount = settings.payments?.minPayoutAmount || 50;

      // Check minimum amount
      if (withdrawalAmount < minWithdrawalAmount) {
        return res.status(400).json({
          success: false,
          error: `Minimum withdrawal amount is $${minWithdrawalAmount}`,
          enforcement: {
            type: 'minimum_amount',
            limit: minWithdrawalAmount,
            requested: withdrawalAmount
          }
        });
      }

      // Check maximum monthly limit
      if (currentMonthlyTotal + withdrawalAmount > maxMonthlyWithdrawal) {
        const remaining = maxMonthlyWithdrawal - currentMonthlyTotal;
        return res.status(400).json({
          success: false,
          error: `Monthly withdrawal limit exceeded. You can withdraw $${remaining.toFixed(2)} more this month.`,
          enforcement: {
            type: 'monthly_limit',
            limit: maxMonthlyWithdrawal,
            current: currentMonthlyTotal,
            requested: withdrawalAmount,
            remaining
          }
        });
      }

      // Apply withdrawal fees
      const withdrawalFee = settings.fees?.withdrawalFee?.amount || 0;
      const feeType = settings.fees?.withdrawalFee?.type || 'fixed';
      
      let totalFee = 0;
      if (feeType === 'fixed') {
        totalFee = withdrawalFee;
      } else if (feeType === 'percentage') {
        totalFee = (withdrawalAmount * (settings.fees?.withdrawalFee?.percentage || 0)) / 100;
      }

      // Attach enforcement data to request
      req.enforcement = {
        withdrawalFee: totalFee,
        netAmount: withdrawalAmount - totalFee,
        limits: {
          monthly: { used: currentMonthlyTotal, max: maxMonthlyWithdrawal },
          minimum: minWithdrawalAmount
        }
      };

      next();
    } catch (error) {
      console.error('Withdrawal limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check withdrawal limits'
      });
    }
  }

  /**
   * Check if brand is within campaign limits
   */
  static async checkCampaignLimit(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const userId = req.user.id;
      
      const maxCampaignsPerBrand = settings.customLimits?.maxCampaignsPerBrand || 50;

      // Count brand's active campaigns
      const Campaign = require('../models/Campaign');
      const activeCampaignsCount = await Campaign.countDocuments({
        brandId: userId,
        status: { $in: ['active', 'pending'] }
      });

      if (activeCampaignsCount >= maxCampaignsPerBrand) {
        return res.status(400).json({
          success: false,
          error: `Maximum campaign limit reached. You can have up to ${maxCampaignsPerBrand} active campaigns.`,
          enforcement: {
            type: 'campaign_limit',
            limit: maxCampaignsPerBrand,
            current: activeCampaignsCount
          }
        });
      }

      req.enforcement = {
        campaignLimits: {
          used: activeCampaignsCount,
          max: maxCampaignsPerBrand,
          remaining: maxCampaignsPerBrand - activeCampaignsCount
        }
      };

      next();
    } catch (error) {
      console.error('Campaign limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check campaign limits'
      });
    }
  }

  /**
   * Check if creator is within deal limits
   */
  static async checkDealLimit(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const userId = req.user.id;
      
      const maxActiveDealsPerCreator = settings.customLimits?.maxActiveDealsPerCreator || 20;

      // Count creator's active deals
      const Deal = require('../models/Deal');
      const activeDealsCount = await Deal.countDocuments({
        creatorId: userId,
        status: { $in: ['active', 'pending', 'in_progress'] }
      });

      if (activeDealsCount >= maxActiveDealsPerCreator) {
        return res.status(400).json({
          success: false,
          error: `Maximum active deals limit reached. You can have up to ${maxActiveDealsPerCreator} active deals.`,
          enforcement: {
            type: 'deal_limit',
            limit: maxActiveDealsPerCreator,
            current: activeDealsCount
          }
        });
      }

      req.enforcement = {
        dealLimits: {
          used: activeDealsCount,
          max: maxActiveDealsPerCreator,
          remaining: maxActiveDealsPerCreator - activeDealsCount
        }
      };

      next();
    } catch (error) {
      console.error('Deal limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check deal limits'
      });
    }
  }

  /**
   * Apply platform fees to transactions
   */
  static async applyPlatformFees(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const amount = req.body.amount || req.body.budget || req.query.amount;
      
      if (!amount) {
        return next(); // Skip if no amount to process
      }

      const commissionRate = settings.fees?.commissionRate || 10;
      const commissionAmount = (amount * commissionRate) / 100;
      const netAmount = amount - commissionAmount;

      // Attach fee calculation to request
      req.enforcement = {
        ...req.enforcement,
        fees: {
          commissionRate,
          commissionAmount,
          grossAmount: amount,
          netAmount,
          totalFees: commissionAmount
        }
      };

      next();
    } catch (error) {
      console.error('Platform fee calculation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate platform fees'
      });
    }
  }

  /**
   * Check file upload constraints
   */
  static async checkFileUploadLimits(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const file = req.file;
      
      if (!file) {
        return next();
      }

      const maxFileSize = settings.upload?.maxFileSize || 100; // MB
      const allowedFileTypes = settings.upload?.allowedFileTypes?.map(f => f.type) || 
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'];

      // Check file size (convert MB to bytes)
      if (file.size > maxFileSize * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds maximum limit of ${maxFileSize}MB`,
          enforcement: {
            type: 'file_size_limit',
            limit: maxFileSize * 1024 * 1024,
            actual: file.size
          }
        });
      }

      // Check file type
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      if (!allowedFileTypes.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          error: `File type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`,
          enforcement: {
            type: 'file_type_not_allowed',
            allowed: allowedFileTypes,
            actual: fileExtension
          }
        });
      }

      req.enforcement = {
        ...req.enforcement,
        fileLimits: {
          maxSize: maxFileSize,
          allowedTypes: allowedFileTypes,
          uploadedFile: {
            name: file.originalname,
            size: file.size,
            type: fileExtension
          }
        }
      };

      next();
    } catch (error) {
      console.error('File upload limit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check file upload limits'
      });
    }
  }

  /**
   * Check if platform is in maintenance mode
   */
  static async checkMaintenanceMode(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      const maintenanceStatus = await settingsService.getMaintenanceStatus();
      
      if (maintenanceStatus.enabled) {
        // Check if IP is allowed during maintenance
        const clientIP = req.ip || req.connection.remoteAddress;
        const allowedIPs = settings.maintenance?.allowedIPs || [];
        
        if (!allowedIPs.includes(clientIP)) {
          return res.status(503).json({
            success: false,
            error: 'Platform is currently under maintenance',
            message: maintenanceStatus.message || 'Please check back later',
            enforcement: {
              type: 'maintenance_mode',
              allowedIPs,
              clientIP
            }
          });
        }
      }

      next();
    } catch (error) {
      console.error('Maintenance mode check error:', error);
      // Don't block requests if maintenance check fails
      next();
    }
  }

  /**
   * Enforce security policies
   */
  static async enforceSecurityPolicies(req, res, next) {
    try {
      // Security policies enforcement without IP whitelist
      // Future: Add other security policies here
      next();
    } catch (error) {
      console.error('Security policy enforcement error:', error);
      // Don't block requests if security check fails
      next();
    }
  }
}

module.exports = SettingsEnforcement;
