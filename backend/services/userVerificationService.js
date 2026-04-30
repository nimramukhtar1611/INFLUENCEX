// services/userVerificationService.js
const Settings = require('../models/Settings');
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const SocialAccount = require('../models/SocialAccount');
const notificationService = require('./notificationService');
const contentModerationService = require('./contentModerationService');

class UserVerificationService {
  constructor() {
    this.verificationMethods = {
      automatic: this.automaticVerification.bind(this),
      manual: this.manualVerification.bind(this),
      hybrid: this.hybridVerification.bind(this)
    };
  }

  /**
   * Process user verification based on platform settings
   * @param {string} userId - User ID to verify
   * @param {string} userType - Type of user (brand, creator)
   * @returns {Object} Verification result
   */
  async processVerification(userId, userType) {
    try {
      const settings = await Settings.getSettings();
      const userApprovalSettings = settings.userApproval || {};
      const verificationMethod = userApprovalSettings.verificationMethod || 'manual';

      // Check if auto-approval is enabled for this user type
      const autoApprove = userType === 'brand' 
        ? userApprovalSettings.autoApproveBrands 
        : userApprovalSettings.autoApproveCreators;

      if (autoApprove) {
        return await this.autoApproveUser(userId, userType);
      }

      // Process verification based on method
      const verificationHandler = this.verificationMethods[verificationMethod];
      if (!verificationHandler) {
        throw new Error(`Unknown verification method: ${verificationMethod}`);
      }

      return await verificationHandler(userId, userType, settings);
    } catch (error) {
      console.error('User verification error:', error);
      return {
        success: false,
        error: error.message,
        requiresManualReview: true
      };
    }
  }

  /**
   * Automatic verification
   */
  async automaticVerification(userId, userType, settings) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get verification criteria
      const criteria = userType === 'brand' 
        ? settings.userApproval?.brandVerificationCriteria 
        : settings.userApproval?.creatorVerificationCriteria;

      // Check verification criteria
      const criteriaCheck = await this.checkVerificationCriteria(userId, userType, criteria);
      
      if (criteriaCheck.passed) {
        // Approve user automatically
        await this.approveUser(userId, userType, 'automatic');
        
        return {
          success: true,
          verified: true,
          method: 'automatic',
          reason: 'User met all automatic verification criteria',
          criteriaResults: criteriaCheck.results
        };
      } else {
        // Failed automatic verification, require manual review
        await this.requestManualVerification(userId, userType, criteriaCheck.reasons);
        
        return {
          success: false,
          verified: false,
          requiresManualReview: true,
          method: 'automatic',
          reason: 'User did not meet automatic verification criteria',
          criteriaResults: criteriaCheck.results
        };
      }
    } catch (error) {
      console.error('Automatic verification error:', error);
      return {
        success: false,
        error: error.message,
        requiresManualReview: true
      };
    }
  }

  /**
   * Manual verification
   */
  async manualVerification(userId, userType, settings) {
    try {
      // Always require manual review
      await this.requestManualVerification(userId, userType, 'Manual verification required by settings');
      
      return {
        success: false,
        verified: false,
        requiresManualReview: true,
        method: 'manual',
        reason: 'Manual verification required by platform settings'
      };
    } catch (error) {
      console.error('Manual verification error:', error);
      return {
        success: false,
        error: error.message,
        requiresManualReview: true
      };
    }
  }

  /**
   * Hybrid verification
   */
  async hybridVerification(userId, userType, settings) {
    try {
      // First try automatic verification
      const autoResult = await this.automaticVerification(userId, userType, settings);
      
      if (autoResult.success && autoResult.verified) {
        // If automatic verification passes, still flag for manual review of sensitive accounts
        const user = await User.findById(userId);
        const isHighValue = await this.isHighValueAccount(user, userType);
        
        if (isHighValue) {
          await this.requestManualVerification(userId, userType, 'High-value account requires manual review');
          
          return {
            success: false,
            verified: false,
            requiresManualReview: true,
            method: 'hybrid',
            reason: 'High-value account requires manual review despite passing automatic checks',
            autoVerificationResult: autoResult
          };
        }
        
        return autoResult;
      } else {
        // If automatic verification fails, require manual review
        await this.requestManualVerification(userId, userType, autoResult.reason || 'Failed automatic verification');
        
        return {
          ...autoResult,
          method: 'hybrid',
          requiresManualReview: true
        };
      }
    } catch (error) {
      console.error('Hybrid verification error:', error);
      return {
        success: false,
        error: error.message,
        requiresManualReview: true
      };
    }
  }

  /**
   * Check verification criteria for user
   */
  async checkVerificationCriteria(userId, userType, criteria) {
    const results = {
      passed: true,
      results: {},
      reasons: []
    };

    try {
      if (userType === 'brand') {
        await this.checkBrandCriteria(userId, criteria, results);
      } else if (userType === 'creator') {
        await this.checkCreatorCriteria(userId, criteria, results);
      }

      // Determine overall pass/fail
      results.passed = results.reasons.length === 0;
    } catch (error) {
      console.error('Criteria check error:', error);
      results.passed = false;
      results.reasons.push('Error checking verification criteria');
    }

    return results;
  }

  /**
   * Check brand-specific criteria
   */
  async checkBrandCriteria(userId, criteria, results) {
    const brand = await Brand.findById(userId);
    if (!brand) {
      results.reasons.push('Brand profile not found');
      return;
    }

    // Check business email
    if (criteria.requireBusinessEmail) {
      const hasBusinessEmail = brand.email && !brand.email.includes('@gmail.com') && !brand.email.includes('@yahoo.com');
      results.results.businessEmail = hasBusinessEmail;
      if (!hasBusinessEmail) {
        results.reasons.push('Business email required');
      }
    }

    // Check business age
    if (criteria.minBusinessAge > 0) {
      const businessAge = this.calculateBusinessAge(brand);
      results.results.businessAge = businessAge;
      if (businessAge < criteria.minBusinessAge) {
        results.reasons.push(`Business must be at least ${criteria.minBusinessAge} days old`);
      }
    }

    // Check business documents if required
    if (criteria.requireBusinessDocuments) {
      const hasDocuments = brand.documents && brand.documents.length > 0;
      results.results.businessDocuments = hasDocuments;
      if (!hasDocuments) {
        results.reasons.push('Business documents required');
      }
    }
  }

  /**
   * Check creator-specific criteria
   */
  async checkCreatorCriteria(userId, criteria, results) {
    const creator = await Creator.findById(userId);
    if (!creator) {
      results.reasons.push('Creator profile not found');
      return;
    }

    // Check follower count
    if (criteria.minFollowers > 0) {
      const totalFollowers = await this.getTotalFollowers(userId);
      results.results.followers = totalFollowers;
      if (totalFollowers < criteria.minFollowers) {
        results.reasons.push(`Minimum ${criteria.minFollowers} followers required`);
      }
    }

    // Check engagement rate
    if (criteria.minEngagementRate > 0) {
      const engagementRate = await this.getEngagementRate(userId);
      results.results.engagementRate = engagementRate;
      if (engagementRate < criteria.minEngagementRate) {
        results.reasons.push(`Minimum ${criteria.minEngagementRate}% engagement rate required`);
      }
    }

    // Check content samples
    if (criteria.requireContentSamples) {
      const socialAccounts = await SocialAccount.find({ creator_id: userId, status: 'connected' });
      const hasSamples = socialAccounts.length >= (criteria.contentSampleCount || 1);
      results.results.contentSamples = socialAccounts.length;
      if (!hasSamples) {
        results.reasons.push(`At least ${criteria.contentSampleCount || 1} connected social account(s) required`);
      }
    }
  }

  /**
   * Calculate business age in days
   */
  calculateBusinessAge(brand) {
    if (!brand.createdAt) return 0;
    const now = new Date();
    const created = new Date(brand.createdAt);
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get total followers across all connected social accounts
   */
  async getTotalFollowers(userId) {
    const socialAccounts = await SocialAccount.find({ creator_id: userId, status: 'connected' });
    return socialAccounts.reduce((total, account) => total + (account.metrics?.followers || 0), 0);
  }

  /**
   * Get average engagement rate across all connected social accounts
   */
  async getEngagementRate(userId) {
    const socialAccounts = await SocialAccount.find({ creator_id: userId, status: 'connected' });
    if (socialAccounts.length === 0) return 0;
    
    const totalEngagement = socialAccounts.reduce((total, account) => total + (account.metrics?.engagement_rate || 0), 0);
    return totalEngagement / socialAccounts.length;
  }

  /**
   * Check if account is high-value (requires additional scrutiny)
   */
  async isHighValueAccount(user, userType) {
    if (userType === 'creator') {
      const followers = await this.getTotalFollowers(user._id);
      return followers > 100000; // High-value creators have >100k followers
    } else if (userType === 'brand') {
      const brand = await Brand.findById(user._id);
      return brand && brand.companySize === 'enterprise'; // Enterprise brands are high-value
    }
    return false;
  }

  /**
   * Auto-approve user
   */
  async autoApproveUser(userId, userType, method = 'auto') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user verification status
      user.isVerified = true;
      user.verifiedAt = new Date();
      user.verifiedBy = 'system';
      user.verificationMethod = method;
      user.status = 'active';
      await user.save();

      // Log the verification
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'user_verified',
        targetUser: userId,
        metadata: {
          method,
          userType,
          timestamp: new Date()
        },
        ipAddress: 'system',
        userAgent: 'verification-service'
      });

      // Send notification to user
      await notificationService.createNotification(
        userId,
        'account_verified',
        'Account Verified Successfully',
        `Your ${userType} account has been verified and is now active.`,
        { verifiedAt: new Date(), method }
      );

      return { success: true, verified: true };
    } catch (error) {
      console.error('Auto-approve user error:', error);
      throw error;
    }
  }

  /**
   * Request manual verification
   */
  async requestManualVerification(userId, userType, reason) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user status to pending verification
      user.status = 'pending';
      user.verificationRequestedAt = new Date();
      user.verificationReason = reason;
      await user.save();

      // Log the verification request
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'verification_requested',
        targetUser: userId,
        metadata: {
          userType,
          reason,
          timestamp: new Date()
        },
        ipAddress: 'system',
        userAgent: 'verification-service'
      });

      // Send notification to user
      await notificationService.createNotification(
        userId,
        'verification_pending',
        'Verification Pending',
        'Your account is pending manual verification. We will review your application shortly.',
        { requestedAt: new Date(), reason }
      );

      // Notify admins about pending verification
      await this.notifyAdminsOfPendingVerification(userId, userType, reason);

      return { success: true, pending: true };
    } catch (error) {
      console.error('Request manual verification error:', error);
      throw error;
    }
  }

  /**
   * Notify admins about pending verification
   */
  async notifyAdminsOfPendingVerification(userId, userType, reason) {
    try {
      // Get all admin users
      const admins = await User.find({ userType: 'admin', isActive: true });
      
      for (const admin of admins) {
        await notificationService.createNotification(
          admin._id,
          'pending_verification',
          'Pending User Verification',
          `A ${userType} account is pending manual verification.`,
          { userId, userType, reason, timestamp: new Date() }
        );
      }
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  }

  /**
   * Manual approve user (admin action)
   */
  async manualApproveUser(userId, adminId, notes = '') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userType = user.userType;

      // Update user verification status
      user.isVerified = true;
      user.verifiedAt = new Date();
      user.verifiedBy = adminId;
      user.verificationMethod = 'manual';
      user.status = 'active';
      user.verificationNotes = notes;
      await user.save();

      // Log the approval
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        adminId,
        action: 'user_manually_verified',
        targetUser: userId,
        metadata: {
          userType,
          notes,
          timestamp: new Date()
        },
        ipAddress: 'system',
        userAgent: 'admin-panel'
      });

      // Send notification to user
      await notificationService.createNotification(
        userId,
        'account_verified',
        'Account Verified Successfully',
        `Your ${userType} account has been manually verified and is now active.`,
        { verifiedAt: new Date(), method: 'manual', notes }
      );

      return { success: true, verified: true };
    } catch (error) {
      console.error('Manual approve user error:', error);
      throw error;
    }
  }

  /**
   * Manual reject user (admin action)
   */
  async manualRejectUser(userId, adminId, reason, notes = '') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userType = user.userType;

      // Update user status
      user.status = 'rejected';
      user.rejectedAt = new Date();
      user.rejectedBy = adminId;
      user.rejectionReason = reason;
      user.rejectionNotes = notes;
      await user.save();

      // Log the rejection
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        adminId,
        action: 'user_rejected',
        targetUser: userId,
        metadata: {
          userType,
          reason,
          notes,
          timestamp: new Date()
        },
        ipAddress: 'system',
        userAgent: 'admin-panel'
      });

      // Send notification to user
      await notificationService.createNotification(
        userId,
        'account_rejected',
        'Account Verification Rejected',
        `Your ${userType} account verification has been rejected. Reason: ${reason}`,
        { rejectedAt: new Date(), reason, notes }
      );

      return { success: true, rejected: true };
    } catch (error) {
      console.error('Manual reject user error:', error);
      throw error;
    }
  }

  /**
   * Get pending verifications for admin review
   */
  async getPendingVerifications(userType = null, page = 1, limit = 20) {
    try {
      const query = { status: 'pending' };
      
      if (userType) {
        query.userType = userType;
      }

      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password -refreshToken -resetPasswordToken')
          .sort('verificationRequestedAt')
          .limit(limit)
          .skip((page - 1) * limit)
          .lean(),
        User.countDocuments(query)
      ]);

      // Enrich with profile data
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          let profile = null;
          
          if (user.userType === 'brand') {
            profile = await Brand.findById(user._id).lean();
          } else if (user.userType === 'creator') {
            profile = await Creator.findById(user._id).lean();
            // Add social accounts for creators
            profile.socialAccounts = await SocialAccount.find({ 
              creator_id: user._id, 
              status: 'connected' 
            }).select('-access_token -refresh_token');
          }

          return {
            ...user,
            profile
          };
        })
      );

      return {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get pending verifications error:', error);
      throw error;
    }
  }
}

module.exports = new UserVerificationService();
