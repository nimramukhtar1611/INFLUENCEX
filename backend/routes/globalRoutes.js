const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const rateLimit = require('express-rate-limit');
const Brand = require('../models/Brand');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Review = require('../models/Review');
const Payment = require('../models/Payment');

// Rate limiting for global settings
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

/**
 * @route   GET /api/global/settings
 * @desc    Get public global settings (no auth required)
 * @access  Public
 */
router.get('/settings', globalLimiter, async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    
    // Return only public-safe settings
    const publicSettings = {
      // Platform settings
      platformName: settings.platform?.name || 'InfluenceX',
      platformDescription: settings.platform?.description || 'Influencer Deal Marketplace',
      supportEmail: settings.platform?.supportEmail || 'support@influencex.com',
      supportPhone: settings.platform?.supportPhone || '+1 (555) 123-4567',
      supportHours: settings.platform?.supportHours || 'Mon-Fri, 9am-5pm EST',
      timezone: settings.platform?.timezone || 'America/New_York',
      dateFormat: settings.platform?.dateFormat || 'MM/DD/YYYY',
      timeFormat: settings.platform?.timeFormat || '12h',
      currency: settings.platform?.currency || 'USD',
      language: settings.platform?.language || 'en',
      
      // Fee settings (public info)
      commissionRate: settings.fees?.commissionRate || 10,
      creatorPayoutMin: settings.payments?.minPayoutAmount || 50,
      brandEscrowMin: settings.fees?.escrowFee || 100,
      escrowFee: settings.fees?.escrowFee || 0,
      featuredListingFee: settings.fees?.featuredListingFee?.base || 50,
      taxRate: settings.fees?.taxRate || 0,
      taxInclusive: settings.fees?.taxInclusive || false,
      withdrawalFeeType: settings.fees?.withdrawalFee?.type || 'fixed',
      withdrawalFee: settings.fees?.withdrawalFee?.amount || 0,
      minPayoutAmount: settings.payments?.minPayoutAmount || 50,
      
      // Security settings (public info)
      emailVerification: settings.security?.emailVerification ?? true,
      maxLoginAttempts: settings.security?.maxLoginAttempts ?? 5,
      sessionTimeout: settings.security?.sessionTimeout ?? 30,
      lockoutDuration: settings.security?.lockoutDuration ?? 30,
      passwordMinLength: settings.security?.passwordMinLength ?? 8,
      passwordRequireUppercase: settings.security?.passwordRequireUppercase ?? true,
      passwordRequireLowercase: settings.security?.passwordRequireLowercase ?? true,
      passwordRequireNumbers: settings.security?.passwordRequireNumbers ?? true,
      passwordRequireSymbols: settings.security?.passwordRequireSymbols ?? false,
      
      // Notification settings (public info)
      emailNotifications: {
        newUser: settings.notifications?.admin?.email?.newUser ?? false,
        newCampaign: settings.notifications?.admin?.email?.newCampaign ?? false,
        paymentReceived: settings.notifications?.admin?.email?.paymentReceived ?? false,
        disputeRaised: settings.notifications?.admin?.email?.disputeRaised ?? false,
        reportGenerated: settings.notifications?.admin?.email?.reportGenerated ?? false
      },
      smsNotifications: {
        enabled: settings.notifications?.sms?.enabled ?? false,
        provider: settings.notifications?.sms?.provider || 'twilio'
      },
      pushNotifications: {
        enabled: settings.notifications?.push?.enabled ?? true
      },
      inAppNotifications: {
        enabled: settings.notifications?.inApp?.enabled ?? true
      },
      // phoneVerification removed - now optional in signup flow
      
      // Feature flags
      features: {
        campaigns: settings.features?.campaigns?.enabled ?? true,
        chat: settings.features?.chat?.enabled ?? true,
        reviews: settings.features?.reviews?.enabled ?? true,
        disputes: settings.features?.disputes?.enabled ?? true,
        contracts: settings.features?.contracts?.enabled ?? true,
        featuredListings: settings.features?.featuredListings?.enabled ?? true,
        affiliate: settings.features?.affiliate?.enabled ?? false,
        subscriptions: settings.subscriptions?.enabled ?? true
      },
      
      // Verification requirements
      verification: {
        minFollowerCount: settings.verification?.minFollowerCount || 1000,
        minAccountAge: settings.verification?.minAccountAge || 30,
        requireSocialAccounts: settings.verification?.requireSocialAccounts || true,
        manualVerificationRequired: settings.verification?.manualVerificationRequired || true
      },
      
      // Upload limits
      upload: {
        maxFileSize: settings.upload?.maxFileSize || 100,
        allowedFileTypes: settings.upload?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip']
      },
      
      // Content moderation settings (public info)
      contentModeration: settings.contentModeration?.moderationType || 'ai',
      autoApproveContent: settings.contentModeration?.autoApproveContent ?? false,
      autoFlagContent: settings.contentModeration?.autoFlagContent ?? true,
      flagThreshold: settings.contentModeration?.flagThreshold ?? 0.7,
      manualReviewRequired: settings.contentModeration?.manualReviewRequired ?? true,
      profanityFilter: settings.contentModeration?.profanityFilter ?? true,
      spamFilter: settings.contentModeration?.spamFilter ?? true,
      duplicateContentFilter: settings.contentModeration?.duplicateContentFilter ?? true,
      
      // Usage limits (public info)
      maxCampaignsPerBrand: settings.customLimits?.maxCampaignsPerBrand || 50,
      maxActiveDealsPerCreator: settings.customLimits?.maxActiveDealsPerCreator || 20,
      maxFileSize: settings.upload?.maxFileSize || 100,
      maxFilesPerUpload: settings.upload?.maxFilesPerUpload || 10,
      dailyUploadLimit: settings.upload?.dailyUploadLimit || 100,
      storageQuotaPerUser: settings.upload?.storageQuotaPerUser || 1000,
      
      // Payment gateway settings (public info)
      paymentProvider: settings.integrations?.stripe?.enabled ? 'stripe' : 'manual',
      paymentTestMode: settings.integrations?.stripe?.testMode ?? true,
      autoCapturePayments: settings.payments?.autoCapture ?? false,
      allowApplePay: settings.payments?.applePayEnabled ?? false,
      allowGooglePay: settings.payments?.googlePayEnabled ?? false,
      
      // SEO settings
      seo: {
        metaTitle: settings.seo?.metaTitle || 'InfluenceX - Influencer Marketing Platform',
        metaDescription: settings.seo?.metaDescription || 'Connect with authentic micro-influencers for your brand campaigns'
      },
      
      // Maintenance status
      maintenance: settings.maintenance?.enabled ?? false,
      maintenanceMessage: settings.maintenance?.message || 'We are currently undergoing maintenance. Please check back soon.',
      
      // Version for cache busting
      version: settings.version || 1
    };

    res.json({
      success: true,
      settings: publicSettings
    });

  } catch (error) {
    console.error('Get global settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load settings'
    });
  }
});

/**
 * @route   GET /api/global/fees
 * @desc    Get public fee structure
 * @access  Public
 */
router.get('/fees', globalLimiter, async (req, res) => {
  try {
    const fees = await settingsService.getFees();
    
    res.json({
      success: true,
      fees
    });

  } catch (error) {
    console.error('Get global fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load fee information'
    });
  }
});

/**
 * @route   GET /api/global/maintenance
 * @desc    Check maintenance status
 * @access  Public
 */
router.get('/maintenance', globalLimiter, async (req, res) => {
  try {
    const maintenanceStatus = await settingsService.getMaintenanceStatus();
    
    res.json({
      success: true,
      maintenance: maintenanceStatus
    });

  } catch (error) {
    console.error('Get maintenance status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check maintenance status'
    });
  }
});

/**
 * @route   GET /api/global/feature/:feature
 * @desc    Check if a feature is enabled
 * @access  Public
 */
router.get('/feature/:feature', globalLimiter, async (req, res) => {
  try {
    const { feature } = req.params;
    const isEnabled = await settingsService.isFeatureEnabled(feature);
    
    res.json({
      success: true,
      feature,
      enabled: isEnabled
    });

  } catch (error) {
    console.error('Get feature flag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check feature status'
    });
  }
});

/**
 * @route   GET /api/global/brands/:id
 * @desc    Get public brand details by ID
 * @access  Public
 */
router.get('/brands/:id', globalLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Brand ID is required'
      });
    }

    // Find brand and populate relevant fields
    const brand = await Brand.findById(id)
      .select('brandName logo coverImage industry description website email phone address socialMedia founded companySize businessType createdAt')
      .lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    // Fetch real statistics from database
    const [
      totalCampaigns,
      activeCampaigns,
      completedDeals,
      totalCreators,
      totalSpent,
      reviews
    ] = await Promise.all([
      // Total campaigns for this brand
      Campaign.countDocuments({ 
        brandId: id,
        status: { $in: ['active', 'paused', 'completed', 'archived'] }
      }),
      
      // Active campaigns
      Campaign.countDocuments({ 
        brandId: id,
        status: 'active'
      }),
      
      // Completed deals
      Deal.countDocuments({ 
        brandId: id,
        status: 'completed'
      }),
      
      // Unique creators worked with
      Deal.distinct('creatorId', { 
        brandId: id,
        status: { $in: ['accepted', 'in-progress', 'completed'] }
      }).then(creators => creators.length),
      
      // Total amount spent (sum of completed payments)
      Payment.aggregate([
        {
          $match: {
            type: 'payment',
            status: 'completed',
            // Find payments related to this brand's deals
            'metadata.dealId': { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'deals',
            localField: 'metadata.dealId',
            foreignField: '_id',
            as: 'deal'
          }
        },
        {
          $match: {
            'deal.brandId': id
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]).then(result => result.length > 0 ? result[0].total : 0),
      
      // Reviews for this brand (as the recipient)
      Review.find({ 
        toUser: id,
        isPublic: true,
        isVerified: true
      }).select('rating')
    ]);

    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    const stats = {
      totalCampaigns,
      activeCampaigns,
      totalSpent,
      totalCreators,
      averageRating: parseFloat(averageRating.toFixed(1)),
      completedDeals,
      joinedDate: brand.createdAt
    };

    res.json({
      success: true,
      brand,
      stats
    });

  } catch (error) {
    console.error('Get public brand details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load brand details'
    });
  }
});

module.exports = router;
