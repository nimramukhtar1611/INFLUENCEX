// controllers/admin/adminController.js - MERGED FULL VERSION WITH 2FA
const User = require('../../models/User');
const Brand = require('../../models/Brand');
const Creator = require('../../models/Creator');
const Campaign = require('../../models/Campaign');
const Deal = require('../../models/Deal');
const Payment = require('../../models/Payment');
const Dispute = require('../../models/Dispute');
const Withdrawal = require('../../models/Withdrawal');
const Subscription = require('../../models/Subscription');
const AuditLog = require('../../models/AuditLog');
const Settings = require('../../models/Settings');
const FeaturedListing = require('../../models/FeaturedListing');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('crypto');
const stripe = require('../../config/stripe');
const { sendEmail } = require('../../services/emailService');
const notificationService = require('../../services/notificationService');
const TwoFactorService = require('../../services/twoFactorService');
const settingsService = require('../../services/settingsService');

// ==================== ADMIN LOGIN WITH 2FA ====================


// ==================== ADMIN LOGIN WITH 2FA ====================
// adminController.js mein sirf yeh function replace karo

exports.adminLogin = async (req, res) => {
  try {
    const { email, password, two_factor_code } = req.body;
    const Admin = require('../../models/Admin');
    const Settings = require('../../models/Settings');

    // ✅ FIX 1: email aur password dono validate karo pehle
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Get security settings for dynamic enforcement
    // settingsService already required above
    const settings = await settingsService.getSettings();
    const securitySettings = settings.security || {};
    const maxAttempts = securitySettings.maxLoginAttempts || 5;
    const lockoutDuration = (securitySettings.lockoutDuration || 30) * 60 * 1000; // Convert to milliseconds

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
      '+password +twoFactorSecret +twoFactorEnabled +twoFactorBackupCodes +loginAttempts +lockUntil'
    );

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // ✅ FIX 2: isActive check karo
    if (!admin.isActive) {
      return res.status(401).json({ success: false, error: 'Admin account is deactivated' });
    }

    // Account lock check using dynamic settings
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((admin.lockUntil - Date.now()) / (60 * 1000));
      return res.status(401).json({
        success: false,
        error: `Account locked. Try again in ${minutesLeft} minutes.`
      });
    }

    // ✅ FIX 3: comparePassword use karo (Admin model ka method)
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      // increment attempts using dynamic settings
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= maxAttempts) {
        admin.lockUntil = Date.now() + lockoutDuration;
      }
      await admin.save();
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // ✅ 2FA check
    if (admin.twoFactorEnabled) {
      if (!two_factor_code) {
        return res.status(200).json({
          success: true,
          require2FA: true,
          userId: admin._id,
          message: '2FA code required',
          expiresIn: (securitySettings.twoFactorCodeExpiryMinutes || 5) * 60
        });
      }

      const TwoFactorService = require('../../services/twoFactorService');
      const verification = await TwoFactorService.verifyToken(admin._id, two_factor_code);

      if (!verification.success) {
        admin.loginAttempts = (admin.loginAttempts || 0) + 1;
        if (admin.loginAttempts >= maxAttempts) {
          admin.lockUntil = Date.now() + lockoutDuration;
        }
        await admin.save();
        return res.status(401).json({ success: false, error: 'Invalid 2FA code' });
      }
    }

    // ✅ Login successful — reset attempts
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token with dynamic expiry
    const jwtExpiry = securitySettings.jwtExpiry || '7d';
    const refreshTokenExpiry = securitySettings.refreshTokenExpiry || '30d';
    
    const token = jwt.sign(
      { 
        id: admin._id, 
        userId: admin._id,
        userType: 'admin', 
        email: admin.email,
        jti: require('crypto').randomUUID()
      }, 
      process.env.JWT_SECRET, 
      {
        expiresIn: jwtExpiry,
        algorithm: 'HS256',
        issuer: 'influencex',
        audience: 'influencex-users'
      }
    );

    const refreshToken = jwt.sign(
      { 
        id: admin._id, 
        tokenType: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: require('crypto').randomUUID()
      }, 
      process.env.JWT_REFRESH_SECRET, 
      {
        expiresIn: refreshTokenExpiry,
        algorithm: 'HS256',
        issuer: 'influencex',
        audience: 'influencex-users'
      }
    );

    // Audit log (optional — error hone pe ignore)
    try {
      const AuditLog = require('../../models/AuditLog');
      await AuditLog.create({
        adminId: admin._id,
        action: 'admin_login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { email: admin.email }
      });
    } catch (e) { /* ignore */ }

    // Response mein sensitive fields hata do
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.twoFactorSecret;
    delete adminResponse.twoFactorBackupCodes;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      admin: adminResponse
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

// ==================== ADMIN 2FA MANAGEMENT ====================

/**
 * Generate 2FA secret for admin
 */
exports.adminGenerate2FA = async (req, res) => {
  try {
    const result = await TwoFactorService.generateSecret(
      req.admin._id,
      req.admin.email
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_generate',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        secret: result.secret,
        qrCode: result.qrCode,
        otpauth_url: result.otpauth_url
      }
    });
  } catch (error) {
    console.error('2FA generate error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate 2FA secret'
    });
  }
};

/**
 * Verify and enable 2FA for admin
 */
exports.adminVerify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await TwoFactorService.verifyAndEnable(req.admin._id, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_enable',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { success: true }
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        backupCodes: result.backupCodes
      }
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify 2FA'
    });
  }
};

/**
 * Disable 2FA for admin
 */
exports.adminDisable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await TwoFactorService.disable(req.admin._id, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_disable',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disable 2FA'
    });
  }
};

/**
 * Regenerate backup codes for admin
 */
exports.adminRegenerateBackupCodes = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await TwoFactorService.regenerateBackupCodes(req.admin._id, token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Log activity
    await AuditLog.create({
      adminId: req.admin._id,
      action: '2fa_regenerate_codes',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: {
        backupCodes: result.backupCodes
      }
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to regenerate backup codes'
    });
  }
};

/**
 * Get 2FA status for admin
 */
exports.adminGet2FAStatus = async (req, res) => {
  try {
    const result = await TwoFactorService.getStatus(req.admin._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get 2FA status'
    });
  }
};

// ==================== ADMIN ACCOUNT MANAGEMENT ====================

/**
 * Update admin email
 */
exports.updateAdminEmail = async (req, res) => {
  try {
    const { newEmail, confirmNewEmail } = req.body;
    const Admin = require('../../models/Admin');
    const crypto = require('crypto');

    // Validate inputs
    if (!newEmail || !confirmNewEmail) {
      return res.status(400).json({
        success: false,
        error: 'Both email fields are required'
      });
    }

    if (newEmail !== confirmNewEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email addresses do not match'
      });
    }

    // Check if new email is already in use
    const existingAdmin = await Admin.findOne({ email: newEmail.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'This email is already in use'
      });
    }

    // Get current admin
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Update admin with new email (unverified) and verification token
    admin.email = newEmail.toLowerCase();
    admin.isEmailVerified = false;
    admin.emailVerificationToken = emailVerificationToken;
    admin.emailVerificationExpires = emailVerificationExpires;
    await admin.save();

    // Send verification email
    try {
      const { sendEmail } = require('../../services/emailService');
      const verificationUrl = `${process.env.FRONTEND_URL}/admin/verify-email?token=${emailVerificationToken}`;
      
      await sendEmail({
        email: newEmail,
        subject: 'Verify Your New Email Address - InfluenceX Admin',
        html: `
          <h2>Email Verification Required</h2>
          <p>Hi ${admin.fullName},</p>
          <p>You have requested to change your email address. Please click the link below to verify your new email address:</p>
          <p><a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this change, please contact support immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Revert email change if email fails
      admin.email = req.admin.email;
      admin.isEmailVerified = true;
      admin.emailVerificationToken = undefined;
      admin.emailVerificationExpires = undefined;
      await admin.save();
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'admin_email_change',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { 
        oldEmail: req.admin.email,
        newEmail: newEmail 
      }
    });

    res.json({
      success: true,
      message: 'Email updated successfully. Please check your new email for verification.'
    });

  } catch (error) {
    console.error('Update admin email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update email'
    });
  }
};

/**
 * Update admin password
 */
exports.updateAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const Admin = require('../../models/Admin');

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required'
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    // Get current admin
    const admin = await Admin.findById(req.admin._id).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await admin.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'admin_password_change',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send notification email (optional)
    try {
      const { sendEmail } = require('../../services/emailService');
      await sendEmail({
        email: admin.email,
        subject: 'Password Changed - InfluenceX Admin',
        html: `
          <h2>Password Changed Successfully</h2>
          <p>Hi ${admin.fullName},</p>
          <p>Your admin password has been changed successfully.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
          <p>For security reasons, we recommend:</p>
          <ul>
            <li>Using a strong, unique password</li>
            <li>Enabling two-factor authentication</li>
            <li>Not sharing your password with anyone</li>
          </ul>
        `
      });
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update admin password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update password'
    });
  }
};

/**
 * Verify admin email change
 */
exports.verifyAdminEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const Admin = require('../../models/Admin');

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Find admin by verification token
    const admin = await Admin.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    // Verify email
    admin.isEmailVerified = true;
    admin.emailVerificationToken = undefined;
    admin.emailVerificationExpires = undefined;
    await admin.save();

    // Log the action
    await AuditLog.create({
      adminId: admin._id,
      action: 'admin_email_verified',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { email: admin.email }
    });

    // Send confirmation email
    try {
      const { sendEmail } = require('../../services/emailService');
      await sendEmail({
        email: admin.email,
        subject: 'Email Verified Successfully - InfluenceX Admin',
        html: `
          <h2>Email Verified Successfully</h2>
          <p>Hi ${admin.fullName},</p>
          <p>Your email address has been verified successfully.</p>
          <p>You can now use this email address to log in to your admin account.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email verification confirmation:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify admin email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify email'
    });
  }
};

// ==================== DASHBOARD STATS ====================
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Run all queries in parallel for performance
    const [
      // User stats
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalBrands,
      totalCreators,
      pendingVerifications,
      verifiedUsers,
      suspendedUsers,
      
      // Campaign stats
      totalCampaigns,
      activeCampaigns,
      pendingCampaigns,
      completedCampaigns,
      totalCampaignBudget,
      
      // Deal stats
      totalDeals,
      activeDeals,
      completedDeals,
      pendingDeals,
      disputedDeals,
      totalDealValue,
      
      // Payment stats
      totalRevenue,
      todayRevenue,
      thisMonthRevenue,
      pendingPayouts,
      totalFees,
      
      // Dispute stats
      openDisputes,
      urgentDisputes,
      
      // Withdrawal stats
      pendingWithdrawals,
      pendingWithdrawalAmount,
      
      // Featured listings
      activeFeaturedListings,
      
      // Recent activity
      recentUsers,
      recentDeals,
      recentPayments,
      recentDisputes
      
    ] = await Promise.all([
      // User stats
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ userType: 'brand' }),
      User.countDocuments({ userType: 'creator' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ status: 'suspended' }),
      
      // Campaign stats
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'pending' }),
      Campaign.countDocuments({ status: 'completed' }),
      Campaign.aggregate([
        { $group: { _id: null, total: { $sum: '$budget' } } }
      ]),
      
      // Deal stats
      Deal.countDocuments(),
      Deal.countDocuments({ status: { $in: ['accepted', 'in-progress', 'in_progress'] } }),
      Deal.countDocuments({ status: 'completed' }),
      Deal.countDocuments({ status: { $in: ['pending', 'negotiating'] } }),
      Deal.countDocuments({ status: 'disputed' }),
      Deal.aggregate([
        { $group: { _id: null, total: { $sum: '$budget' } } }
      ]),
      
      // Payment stats
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'released'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'released'] }, createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'released'] }, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'pending', type: 'withdrawal' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'released'] } } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]),
      
      // Dispute stats
      Dispute.countDocuments({ status: 'open' }),
      Dispute.countDocuments({ status: 'open', priority: 'urgent' }),
      
      // Withdrawal stats
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // Featured listings
      FeaturedListing.countDocuments({ status: 'active' }),
      
      // Recent activity (limited to 5 each)
      User.find().sort('-createdAt').limit(5).select('fullName email userType createdAt'),
      Deal.find().populate('brandId', 'brandName').populate('creatorId', 'displayName').sort('-createdAt').limit(5),
      Payment.find().populate('from.userId', 'fullName').populate('to.userId', 'fullName').sort('-createdAt').limit(5),
      Dispute.find().populate('raised_by.user_id', 'fullName').sort('-created_at').limit(5)
    ]);

    // Calculate derived metrics
    const userGrowth = newUsersThisMonth > 0 
      ? ((newUsersThisMonth - (await User.countDocuments({ createdAt: { $lt: startOfMonth } })) / 100)) 
      : 0;

    const completionRate = totalDeals > 0 
      ? (completedDeals / totalDeals) * 100 
      : 0;

    const disputeRate = totalDeals > 0 
      ? (openDisputes / totalDeals) * 100 
      : 0;

    // Prepare response
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
          brands: totalBrands,
          creators: totalCreators,
          pendingVerifications,
          verified: verifiedUsers,
          suspended: suspendedUsers,
          growth: parseFloat(userGrowth.toFixed(2))
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          pending: pendingCampaigns,
          completed: completedCampaigns,
          totalBudget: totalCampaignBudget[0]?.total || 0
        },
        deals: {
          total: totalDeals,
          active: activeDeals,
          completed: completedDeals,
          pending: pendingDeals,
          disputed: disputedDeals,
          totalValue: totalDealValue[0]?.total || 0,
          completionRate: parseFloat(completionRate.toFixed(2)),
          disputeRate: parseFloat(disputeRate.toFixed(2))
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0,
          thisMonth: thisMonthRevenue[0]?.total || 0,
          pendingPayouts: pendingPayouts[0]?.total || 0,
          fees: totalFees[0]?.total || 0
        },
        disputes: {
          open: openDisputes,
          urgent: urgentDisputes
        },
        withdrawals: {
          pending: pendingWithdrawals,
          pendingAmount: pendingWithdrawalAmount[0]?.total || 0
        },
        featured: {
          active: activeFeaturedListings
        }
      },
      recent: {
        users: recentUsers,
        deals: recentDeals,
        payments: recentPayments,
        disputes: recentDisputes
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dashboard stats'
    });
  }
};

// ==================== GET ALL DEALS ====================
exports.getAllDeals = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate('campaignId', 'title')
        .populate('brandId', 'brandName fullName')
        .populate('creatorId', 'displayName fullName')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Deal.countDocuments(query)
    ]);

    res.json({
      success: true,
      deals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all deals error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get deals'
    });
  }
};

// ==================== GET ALL PAYMENTS ====================
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search, start_date, end_date } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) query.transactionId = { $regex: search, $options: 'i' };
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const [payments, total, summary] = await Promise.all([
      Payment.find(query)
        .populate('from.userId', 'fullName brandName email userType')
        .populate('to.userId', 'fullName displayName email userType')
        .populate({ path: 'dealId', populate: { path: 'campaignId', select: 'title' } })
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$fee' },
            totalNet: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      payments,
      summary: summary[0] || { totalAmount: 0, totalFees: 0, totalNet: 0, count: 0 },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payments'
    });
  }
};

// ==================== GET ALL USERS ====================
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      user_type, 
      status, 
      verified,
      search,
      sort_by = 'createdAt',
      sort_order = 'desc'
    } = req.query;

    const query = {};

    // Apply filters
    if (user_type) query.userType = user_type;
    if (status) query.status = status;
    if (verified !== undefined) query.isVerified = verified === 'true';

    // Search by name or email
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { handle: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken -resetPasswordToken -emailVerificationToken -twoFactorSecret')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let stats = {};
        
        if (user.userType === 'brand') {
          const brand = await Brand.findById(user._id).lean();
          stats = {
            campaigns: brand?.stats?.totalCampaigns || 0,
            spent: brand?.stats?.totalSpent || 0,
            creators: brand?.stats?.totalCreators || 0,
            rating: brand?.stats?.averageRating || 0
          };
        } else if (user.userType === 'creator') {
          const creator = await Creator.findById(user._id).lean();
          stats = {
            earnings: creator?.stats?.totalEarnings || 0,
            campaigns: creator?.stats?.completedCampaigns || 0,
            followers: creator?.totalFollowers || 0,
            engagement: creator?.averageEngagement || 0,
            rating: creator?.stats?.averageRating || 0
          };
        }

        return {
          ...user,
          stats
        };
      })
    );

    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users'
    });
  }
};

// ==================== GET USER DETAILS ====================
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshToken -resetPasswordToken -emailVerificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let profile = null;
    let activity = {};

    // Get specific profile based on user type
    if (user.userType === 'brand') {
      profile = await Brand.findById(user._id)
        .populate('teamMembers.userId', 'fullName email profilePicture')
        .lean();

      // Get brand's campaigns and deals
      const [campaigns, deals] = await Promise.all([
        Campaign.find({ brandId: user._id })
          .sort('-createdAt')
          .limit(10)
          .lean(),
        Deal.find({ brandId: user._id })
          .populate('creatorId', 'displayName handle profilePicture')
          .sort('-createdAt')
          .limit(10)
          .lean()
      ]);

      activity = { campaigns, deals };
    } 
    else if (user.userType === 'creator') {
      profile = await Creator.findById(user._id).lean();

      // Get creator's deals
      const deals = await Deal.find({ creatorId: user._id })
        .populate('brandId', 'brandName logo')
        .populate('campaignId', 'title')
        .sort('-createdAt')
        .limit(10)
        .lean();

      activity = { deals };
    }

    // Get user's payment history
    const payments = await Payment.find({
      $or: [
        { 'from.userId': user._id },
        { 'to.userId': user._id }
      ]
    })
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Get user's disputes
    const disputes = await Dispute.find({
      $or: [
        { 'raisedBy.userId': user._id },
        { 'against.userId': user._id }
      ]
    })
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.json({
      success: true,
      user: {
        ...user,
        profile,
        activity,
        payments,
        disputes
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user details'
    });
  }
};

// ==================== UPDATE USER STATUS ====================
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let message = '';
    let emailSubject = '';
    let emailMessage = '';

    switch(action) {
      case 'verify':
        user.isVerified = true;
        user.verifiedAt = new Date();
        user.verifiedBy = req.admin._id;
        message = 'User verified successfully';
        emailSubject = 'Account Verified - InfluenceX';
        emailMessage = `
          <h2>Account Verified</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account has been verified successfully! You now have full access to all features.</p>
        `;
        break;

      case 'unverify':
        user.isVerified = false;
        user.verifiedAt = undefined;
        user.verifiedBy = undefined;
        message = 'User unverified successfully';
        emailSubject = 'Account Verification Removed - InfluenceX';
        emailMessage = `
          <h2>Verification Removed</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account verification has been removed. Please contact support for more information.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        `;
        break;

      case 'block':
        user.status = 'suspended';
        user.suspendedAt = new Date();
        user.suspendedBy = req.admin._id;
        user.suspensionReason = reason;
        message = 'User blocked successfully';
        emailSubject = 'Account Suspended - InfluenceX';
        emailMessage = `
          <h2>Account Suspended</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account has been suspended.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you believe this is a mistake, please contact support.</p>
        `;
        break;

      case 'unblock':
        user.status = 'active';
        user.suspendedAt = undefined;
        user.suspendedBy = undefined;
        user.suspensionReason = undefined;
        message = 'User unblocked successfully';
        emailSubject = 'Account Reactivated - InfluenceX';
        emailMessage = `
          <h2>Account Reactivated</h2>
          <p>Hi ${user.fullName},</p>
          <p>Your account has been reactivated. You can now log in and use the platform normally.</p>
        `;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    await user.save();

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: `user_${action}`,
      targetUser: user._id,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: emailSubject,
        html: emailMessage
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    // Send in-app notification
    await notificationService.createNotification(
      user._id,
      'system',
      'Account Update',
      emailSubject,
      { action, reason }
    );

    res.json({
      success: true,
      message,
      user: {
        id: user._id,
        status: user.status,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user status'
    });
  }
};

// ==================== GET ALL DISPUTES ====================
exports.getAllDisputes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority,
      type,
      search
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.dispute_type = type;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { dispute_id: { $regex: search, $options: 'i' } }
      ];
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('raised_by.user_id', 'fullName email')
        .populate('raised_against.user_id', 'fullName email')
        .populate('deal_id')
        .populate('assigned_admin', 'fullName email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Dispute.countDocuments(query)
    ]);

    res.json({
      success: true,
      disputes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all disputes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get disputes'
    });
  }
};

// ==================== ASSIGN DISPUTE ====================
exports.assignDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { admin_id } = req.body;

    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    const assignedAdminId = admin_id || req.user._id;

    dispute.assigned_admin = assignedAdminId;
    dispute.status = 'investigating';
    
    // Add to timeline
    dispute.timeline.push({
      action: 'admin_assigned',
      description: `Admin assigned to dispute`,
      performed_by: {
        user_id: req.admin._id,
        user_type: 'admin'
      },
      timestamp: new Date()
    });

    await dispute.save();

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'dispute_assigned',
      targetResource: {
        type: 'dispute',
        id: dispute._id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Notify assigned admin
    if (assignedAdminId !== req.user._id) {
      await notificationService.createNotification(
        assignedAdminId,
        'system',
        'Dispute Assigned',
        `A dispute has been assigned to you.`,
        { disputeId: dispute._id }
      );
    }

    res.json({
      success: true,
      message: 'Dispute assigned successfully',
      dispute
    });

  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign dispute'
    });
  }
};

// ==================== RESOLVE DISPUTE ====================
exports.resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { type, amount, details } = req.body;

    const dispute = await Dispute.findById(disputeId)
      .populate('deal_id');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    // Update dispute status
    dispute.status = 'resolved';
    dispute.resolution = {
      type,
      amount: amount || 0,
      details,
      resolved_by: req.admin._id,
      resolved_at: new Date()
    };

    // Add to timeline
    dispute.timeline.push({
      action: 'resolved',
      description: `Dispute resolved: ${type}`,
      performed_by: {
        user_id: req.admin._id,
        user_type: 'admin'
      },
      timestamp: new Date()
    });

    await dispute.save();

    // Handle deal based on resolution type
    if (dispute.deal_id) {
      const deal = await Deal.findById(dispute.deal_id);
      
      if (deal) {
        switch(type) {
          case 'refund_brand':
            // Refund to brand
            await Payment.findOneAndUpdate(
              { dealId: deal._id },
              { 
                status: 'refunded',
                refundedAt: new Date(),
                refundReason: details
              }
            );
            deal.paymentStatus = 'refunded';
            deal.status = 'cancelled';
            break;

          case 'release_payment':
            // Release payment to creator
            await Payment.findOneAndUpdate(
              { dealId: deal._id },
              { 
                status: 'completed',
                paidAt: new Date()
              }
            );
            deal.paymentStatus = 'released';
            deal.status = 'completed';
            break;

          case 'split_funds':
            // Split funds between parties
            const splitAmount = amount || deal.budget / 2;
            // Implementation depends on payment system
            break;

          case 'cancel_contract':
            deal.status = 'cancelled';
            deal.paymentStatus = 'cancelled';
            break;
        }
        
        await deal.save();
      }
    }

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'dispute_resolved',
      targetResource: {
        type: 'dispute',
        id: dispute._id
      },
      changes: { resolution: { type, amount, details } },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Notify both parties
    const parties = [dispute.raised_by.user_id, dispute.raised_against.user_id];
    for (const userId of parties) {
      await notificationService.createNotification(
        userId,
        'system',
        'Dispute Resolved',
        `The dispute has been resolved. Resolution: ${type}`,
        { disputeId: dispute._id }
      );
    }

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute
    });

  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve dispute'
    });
  }
};

// ==================== GET PENDING WITHDRAWALS ====================
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Payment.find({
      type: 'withdrawal',
      status: 'pending'
    })
      .populate('from.userId', 'fullName email stripeAccountId stripeAccountStatus')
      .sort('-createdAt')
      .lean();

    // Calculate total amount
    const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    res.json({
      success: true,
      withdrawals,
      summary: {
        count: withdrawals.length,
        totalAmount
      }
    });

  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending withdrawals'
    });
  }
};

// ==================== APPROVE WITHDRAWAL ====================
exports.approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { notes } = req.body;

    const withdrawal = await Payment.findOne({
      _id: withdrawalId,
      type: 'withdrawal'
    }).populate('from.userId', 'fullName email stripeAccountId stripeAccountStatus');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Withdrawal is already ${withdrawal.status}`
      });
    }

    const creatorUser = withdrawal.from?.userId;
    if (!creatorUser?.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Creator has no connected Stripe account'
      });
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(Number(withdrawal.netAmount || withdrawal.amount || 0) * 100),
      currency: String(withdrawal.currency || 'USD').toLowerCase(),
      destination: creatorUser.stripeAccountId,
      transfer_group: withdrawal.transactionId,
      metadata: {
        withdrawalId: withdrawal._id.toString(),
        creatorId: creatorUser._id.toString(),
        approvedBy: (req.user?._id || req.admin?._id || '').toString()
      }
    });

    // Update withdrawal status
    withdrawal.status = 'completed';
    withdrawal.paymentMethod = {
      type: 'stripe',
      details: {
        destinationAccount: creatorUser.stripeAccountId,
        stripeTransferId: transfer.id
      }
    };
    withdrawal.metadata = {
      ...(withdrawal.metadata || {}),
      adminApprovedAt: new Date(),
      adminApprovedBy: req.user?._id || req.admin?._id,
      stripeTransferId: transfer.id
    };
    withdrawal.processedAt = new Date();
    withdrawal.paidAt = new Date();
    withdrawal.adminNotes = notes;
    await withdrawal.save();

    // Auxiliary actions should not fail the approval after funds transfer is created.
    try {
      await AuditLog.create({
        adminId: req.user?._id || req.admin?._id,
        action: 'withdrawal_approved',
        targetUser: creatorUser._id,
        metadata: {
          amount: withdrawal.amount,
          transactionId: withdrawal.transactionId,
          stripeTransferId: transfer.id
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      console.error('Failed to write withdrawal audit log:', auditError.message);
    }

    try {
      await notificationService.createNotification(
        creatorUser._id,
        'payment',
        'Withdrawal Approved',
        `Your withdrawal of $${withdrawal.amount} has been approved and processed.`,
        { withdrawalId: withdrawal._id }
      );
    } catch (notificationError) {
      console.error('Failed to create withdrawal notification:', notificationError.message);
    }

    try {
      await sendEmail({
        email: creatorUser.email,
        subject: 'Withdrawal Approved - InfluenceX',
        html: `
          <h2>Withdrawal Approved</h2>
          <p>Hi ${creatorUser.fullName},</p>
          <p>Your withdrawal request for <strong>$${withdrawal.amount}</strong> has been approved and processed.</p>
          <p><strong>Transaction ID:</strong> ${withdrawal.transactionId}</p>
          <p><strong>Stripe Transfer ID:</strong> ${transfer.id}</p>
          <p>Funds should appear in your account within 2-3 business days.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve withdrawal'
    });
  }
};

// ==================== GET PLATFORM ANALYTICS ====================
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    let startDate = start_date ? new Date(start_date) : new Date();
    let endDate = end_date ? new Date(end_date) : new Date();

    if (!start_date) {
      startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    }

    // User growth analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          brands: {
            $sum: { $cond: [{ $eq: ['$userType', 'brand'] }, 1, 0] }
          },
          creators: {
            $sum: { $cond: [{ $eq: ['$userType', 'creator'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Revenue analytics
    const revenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          fees: { $sum: '$fee' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Campaign performance
    const campaignPerformance = await Campaign.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' }
        }
      }
    ]);

    // Deal performance
    const dealPerformance = await Deal.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$budget' }
        }
      }
    ]);

    // Top brands by spend
    const topBrands = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$brandId',
          totalSpent: { $sum: '$budget' },
          deals: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brand'
        }
      },
      { $unwind: '$brand' },
      {
        $project: {
          brandName: '$brand.brandName',
          logo: '$brand.logo',
          totalSpent: 1,
          deals: 1
        }
      }
    ]);

    // Top creators by earnings
    const topCreators = await Deal.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$creatorId',
          totalEarned: { $sum: '$netAmount' },
          deals: { $sum: 1 }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: '$creator' },
      {
        $project: {
          displayName: '$creator.displayName',
          handle: '$creator.handle',
          profilePicture: '$creator.profilePicture',
          totalEarned: 1,
          deals: 1
        }
      }
    ]);

    // Platform distribution
    const platformDistribution = await Deal.aggregate([
      { $unwind: '$deliverables' },
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$deliverables.platform',
          deals: { $sum: 1 },
          spend: { $sum: '$deliverables.budget' }
        }
      },
      { $sort: { spend: -1 } }
    ]);

    // Calculate summary statistics
    const summary = {
      totalUsers: await User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      totalRevenue: revenue.reduce((sum, r) => sum + r.amount, 0),
      totalFees: revenue.reduce((sum, r) => sum + r.fees, 0),
      totalCampaigns: campaignPerformance.reduce((sum, c) => sum + c.count, 0),
      totalDeals: dealPerformance.reduce((sum, d) => sum + d.count, 0),
      avgDealValue: dealPerformance.reduce((sum, d) => sum + d.totalValue, 0) / (dealPerformance.reduce((sum, d) => sum + d.count, 0) || 1)
    };

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        summary,
        userGrowth,
        revenue,
        campaignPerformance,
        dealPerformance,
        topBrands,
        topCreators,
        platformDistribution
      }
    });

  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get analytics'
    });
  }
};

// ==================== GET SETTINGS ====================
exports.getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    
    // Transform nested structure to flat structure for frontend compatibility
    console.log('=== GET SETTINGS DEBUG ===');
    console.log('Raw settings from DB:', settings);
    console.log('Settings.fees.withdrawalFee:', settings.fees?.withdrawalFee);
    console.log('Settings.fees object:', settings.fees);
    
    const flatSettings = {
      // Platform settings - Use actual saved values without hardcoded defaults
      platformName: String(settings.platform?.name || 'InfluenceX').trim(),
      platformDescription: String(settings.platform?.description || 'Influencer Deal Marketplace').trim(),
      supportEmail: String(settings.platform?.supportEmail || 'snimramukhtar321@gmail.com').trim().toLowerCase(),
      supportPhone: String(settings.platform?.supportPhone || '+1 (555) 123-4567').trim(),
      supportHours: settings.platform?.supportHours || 'Mon-Fri, 9am-5pm EST',
      timezone: settings.platform?.timezone || 'America/New_York',
      dateFormat: settings.platform?.dateFormat || 'MM/DD/YYYY',
      timeFormat: settings.platform?.timeFormat || '12h',
      currency: settings.platform?.currency || 'USD',
      language: settings.platform?.language || 'en',
      
      // Fee settings - Ensure proper float conversion and validation
      commissionRate: parseFloat(settings.fees?.commissionRate ?? 10),
      creatorPayoutMin: parseFloat(settings.payments?.minPayoutAmount ?? 50),
      brandEscrowMin: parseFloat(settings.fees?.escrowFee ?? 100),
      escrowFee: parseFloat(settings.fees?.escrowFee ?? 0),
      featuredListingFee: parseFloat(settings.fees?.featuredListingFee?.base ?? 50),
      taxRate: parseFloat(settings.fees?.taxRate ?? 0),
      taxInclusive: Boolean(settings.fees?.taxInclusive ?? false),
      withdrawalFeeType: String(settings.fees?.withdrawalFee?.type ?? 'fixed'),
      // Return withdrawal fee from database without aggressive filtering
      withdrawalFee: parseFloat(settings.fees?.withdrawalFee?.amount ?? 0),
      
      // Security settings
      twoFactorRequired: settings.security?.twoFactorRequired ?? false,
      emailVerification: settings.security?.emailVerification ?? true,
      // phoneVerification removed - now optional in signup flow
      maxLoginAttempts: settings.security?.maxLoginAttempts ?? 5,
            lockoutDuration: settings.security?.lockoutDuration ?? 30,
      passwordMinLength: settings.security?.passwordMinLength ?? 8,
      passwordRequireUppercase: settings.security?.passwordRequireUppercase ?? true,
      passwordRequireLowercase: settings.security?.passwordRequireLowercase ?? true,
      passwordRequireNumbers: settings.security?.passwordRequireNumbers ?? true,
      passwordRequireSymbols: settings.security?.passwordRequireSymbols ?? false,
      passwordExpiryDays: settings.security?.passwordExpiryDays ?? 90,
      passwordHistoryCount: settings.security?.passwordHistoryCount ?? 5,
      jwtExpiry: settings.security?.jwtExpiry ?? '7d',
      refreshTokenExpiry: settings.security?.refreshTokenExpiry ?? '30d',
      
      // OTP and verification expiry times
      otpExpiryMinutes: settings.security?.otpExpiryMinutes ?? 10,
      emailVerificationExpiryHours: settings.security?.emailVerificationExpiryHours ?? 24,
      passwordResetExpiryHours: settings.security?.passwordResetExpiryHours ?? 1,
      twoFactorCodeExpiryMinutes: settings.security?.twoFactorCodeExpiryMinutes ?? 5,
      
      // Email settings - Transform from nested to flat structure for frontend
      senderEmail: settings.notifications?.email?.fromEmail || 'noreply@influencex.com',
      senderName: settings.notifications?.email?.fromName || 'InfluenceX',
      emailFooter: settings.notifications?.email?.footer || '© 2024 InfluenceX. All rights reserved.',
      
      // SMS Notifications - Transform from nested to flat structure for frontend compatibility
      smsNotifications: {
        enabled: settings.notifications?.sms?.enabled ?? false,
        provider: settings.notifications?.sms?.provider || 'twilio',
        accountSid: settings.notifications?.sms?.twilio?.accountSid || '',
        authToken: settings.notifications?.sms?.twilio?.authToken || '',
        phoneNumber: settings.notifications?.sms?.twilio?.phoneNumber || ''
      },
      
      // OTP and verification expiry times
      messageTemplates: {
        twoFactorSms: '{platformName}: Your 2FA code is {code}. Valid for {expiryMinutes} minutes. Do not share.',
        dealOfferSms: '{platformName}: New deal offer from {brandName} for ${budget}. View: {dealUrl}',
        paymentReceivedSms: '{platformName}: Payment of ${amount} received. View details in your dashboard.',
        deadlineReminderSms: '{platformName}: Deal deadline in {days} days. Submit deliverables in your dashboard.',
        accountLockedSms: '{platformName}: Account locked due to failed attempts. Reset your password to continue.'
      },
      
      // Notification settings - Fix email template toggles to use correct database structure
      emailNotifications: {
        newUser: Boolean(settings.notifications?.admin?.email?.newUser ?? false),
        newCampaign: Boolean(settings.notifications?.admin?.email?.newCampaign ?? false),
        paymentReceived: Boolean(settings.notifications?.admin?.email?.paymentReceived ?? false),
        disputeRaised: Boolean(settings.notifications?.admin?.email?.disputeRaised ?? false),
        reportGenerated: Boolean(settings.notifications?.admin?.email?.reportGenerated ?? false)
      },
      
      // SMTP and Twilio credentials for frontend
      notifications: {
        email: {
          smtp: {
            host: settings.notifications?.email?.smtp?.host || '',
            port: settings.notifications?.email?.smtp?.port || 587,
            secure: settings.notifications?.email?.smtp?.secure || false,
            auth: {
              user: settings.notifications?.email?.smtp?.auth?.user || '',
              pass: settings.notifications?.email?.smtp?.auth?.pass || ''
            }
          }
        },
        sms: {
          twilio: {
            accountSid: settings.notifications?.sms?.twilio?.accountSid || '',
            authToken: settings.notifications?.sms?.twilio?.authToken || '',
            phoneNumber: settings.notifications?.sms?.twilio?.phoneNumber || ''
          }
        }
      },
      
      // User Approval and Content Moderation settings - Fix toggle handling
      autoApproveBrands: Boolean(settings.userApproval?.autoApproveBrands ?? false),
      autoApproveCreators: Boolean(settings.userApproval?.autoApproveCreators ?? false),
      requireVerification: Boolean(settings.userApproval?.requireVerification ?? true),
      verificationMethod: String(settings.userApproval?.verificationMethod ?? 'manual'),
      contentModeration: String(settings.contentModeration?.moderationType ?? 'ai'),
      autoApproveContent: Boolean(settings.contentModeration?.autoApproveContent ?? false),
      autoFlagContent: Boolean(settings.contentModeration?.autoFlagContent ?? true),
      flagThreshold: parseFloat(settings.contentModeration?.flagThreshold ?? 0.7),
      manualReviewRequired: Boolean(settings.contentModeration?.manualReviewRequired ?? true),
      bannedWords: settings.contentModeration?.bannedWords?.map(w => w.word).join('\n') || '',
      bannedPhrases: settings.contentModeration?.bannedPhrases?.map(p => p.phrase).join('\n') || '',
      allowedDomains: settings.contentModeration?.allowedDomains?.join('\n') || '',
      blockedDomains: settings.contentModeration?.blockedDomains?.join('\n') || '',
      profanityFilter: settings.contentModeration?.profanityFilter !== undefined ? settings.contentModeration.profanityFilter : true,
      spamFilter: settings.contentModeration?.spamFilter !== undefined ? settings.contentModeration.spamFilter : true,
      duplicateContentFilter: settings.contentModeration?.duplicateContentFilter !== undefined ? settings.contentModeration.duplicateContentFilter : true,
      
      // Limits
      maxCampaignsPerBrand: settings.customLimits?.maxCampaignsPerBrand || 50,
      maxActiveDealsPerCreator: settings.customLimits?.maxActiveDealsPerCreator || 20,
      maxFileSize: settings.upload?.maxFileSize || 100,
      allowedFileTypes: settings.upload?.allowedFileTypes || ['jpg', 'png', 'mp4', 'pdf', 'doc', 'docx'],
      
      // Payment gateway
      paymentProvider: settings.integrations?.stripe?.enabled ? 'stripe' : 'manual',
      stripePublishableKey: settings.integrations?.stripe?.publishableKey || '',
      stripeSecretKeyMasked: settings.integrations?.stripe?.secretKey ? 
        (settings.integrations.stripe.secretKey.startsWith('sk_') ? 
          settings.integrations.stripe.secretKey.substring(0, 7) + '************************' : 
          'sk_************************') : '',
      stripeWebhookSecretMasked: settings.integrations?.stripe?.webhookSecret ? 
        (settings.integrations.stripe.webhookSecret.startsWith('whsec_') ? 
          settings.integrations.stripe.webhookSecret.substring(0, 8) + '************************' : 
          'whsec_************************') : '',
      paymentTestMode: settings.integrations?.stripe?.testMode ?? true,
      autoCapturePayments: settings.payments?.autoCapture ?? false,
      allowApplePay: settings.payments?.applePayEnabled ?? false,
      allowGooglePay: settings.payments?.googlePayEnabled ?? false,
      invoicePrefix: settings.payments?.invoicePrefix || 'INV'
    };

    res.json({
      success: true,
      settings: flatSettings,
      debug: {
        originalPlatformName: settings.platform?.name,
        originalPlatformNameType: typeof settings.platform?.name,
        transformedPlatformName: flatSettings.platformName,
        transformedPlatformNameType: typeof flatSettings.platformName,
        originalSupportEmail: settings.platform?.supportEmail,
        originalSupportEmailType: typeof settings.platform?.supportEmail,
        transformedSupportEmail: flatSettings.supportEmail,
        transformedSupportEmailType: typeof flatSettings.supportEmail
      }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get settings'
    });
  }
};

// ==================== GET FEES ====================
exports.getFees = async (req, res) => {
  try {
    const fees = await settingsService.getFees();

    res.json({
      success: true,
      fees
    });

  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get fees'
    });
  }
};

// ==================== UPDATE SETTINGS ====================
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const startTime = Date.now();

    // DEBUG: Log incoming request
    console.log('\n🔥 === ADMIN SETTINGS UPDATE STARTED ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📤 Request body keys:', Object.keys(updates));
    console.log('👤 Admin ID:', req.admin?._id);
    console.log('📧 Admin Email:', req.admin?.email);
    
    // Log security settings specifically
    const securityUpdates = {};
    Object.keys(updates).forEach(key => {
      if (key.includes('password') || key.includes('login') || key.includes('session') || 
          key.includes('otp') || key.includes('expiry') || key.includes('jwt') || key.includes('twoFactor')) {
        securityUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(securityUpdates).length > 0) {
      console.log('🔒 Security Settings Updates:', securityUpdates);
    }
    
    // Log fee updates
    const feeUpdates = {};
    ['commissionRate', 'withdrawalFee', 'escrowFee', 'featuredListingFee', 'taxRate'].forEach(key => {
      if (updates[key] !== undefined) {
        feeUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(feeUpdates).length > 0) {
      console.log('💰 Fee Settings Updates:', feeUpdates);
    }

    console.log('📋 Full Request Body:', JSON.stringify(updates, null, 2));

    // Validate required fields
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings data provided'
      });
    }

    // Enhanced validation for platform fields
    if (updates.platformName !== undefined) {
      if (typeof updates.platformName !== 'string' || updates.platformName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Platform Name must be a non-empty string'
        });
      }
    }

    if (updates.supportEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.supportEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Support Email must be a valid email address'
        });
      }
    }

    if (updates.supportPhone !== undefined) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;
      if (!phoneRegex.test(updates.supportPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Support Phone must be a valid phone number (international format)'
        });
      }
    }

    // Enhanced validation for fee fields
    if (updates.commissionRate !== undefined) {
      const value = parseFloat(updates.commissionRate);
      if (isNaN(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          error: 'Commission Rate must be a number between 0 and 100'
        });
      }
    }

    if (updates.withdrawalFee !== undefined) {
      const value = parseFloat(updates.withdrawalFee);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'Withdrawal Fee must be a non-negative number'
        });
      }
    }

    if (updates.escrowFee !== undefined) {
      const value = parseFloat(updates.escrowFee);
      if (isNaN(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          error: 'Escrow Fee must be a number between 0 and 100'
        });
      }
    }

    if (updates.featuredListingFee !== undefined) {
      const value = parseFloat(updates.featuredListingFee);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'Featured Listing Fee must be a non-negative number'
        });
      }
    }

    if (updates.taxRate !== undefined) {
      const value = parseFloat(updates.taxRate);
      if (isNaN(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          error: 'Tax Rate must be a number between 0 and 100'
        });
      }
    }

    if (updates.creatorPayoutMin !== undefined) {
      const value = parseFloat(updates.creatorPayoutMin);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'Minimum Payout Amount must be a non-negative number'
        });
      }
    }

    if (updates.brandEscrowMin !== undefined) {
      const value = parseFloat(updates.brandEscrowMin);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'Minimum Brand Escrow must be a non-negative number'
        });
      }
    }

    // Validate SMTP settings only if values are provided (not empty)
    if (updates.notifications?.email?.smtp?.host !== undefined) {
      const host = updates.notifications.email.smtp.host;
      if (typeof host === 'string' && host.trim().length > 0) {
        const hostRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!hostRegex.test(host)) {
          return res.status(400).json({
            success: false,
            error: 'SMTP Host must be a valid hostname'
          });
        }
      }
    }

    if (updates.notifications?.email?.smtp?.port !== undefined) {
      const port = updates.notifications.email.smtp.port;
      if (port !== undefined && port !== '') {
        const portNum = parseInt(port);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          return res.status(400).json({
            success: false,
            error: 'SMTP Port must be a number between 1 and 65535'
          });
        }
      }
    }

    if (updates.notifications?.email?.smtp?.auth?.user !== undefined) {
      const email = updates.notifications.email.smtp.auth.user;
      if (typeof email === 'string' && email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: 'SMTP Email must be a valid email address'
          });
        }
      }
    }

    if (updates.notifications?.email?.smtp?.auth?.pass !== undefined) {
      const pass = updates.notifications.email.smtp.auth.pass;
      if (typeof pass === 'string' && pass.length > 0) {
        if (pass.length < 1) {
          return res.status(400).json({
            success: false,
            error: 'SMTP App Password is required'
          });
        }
      }
    }

    // Validate Twilio settings only if values are provided (not empty)
    if (updates.notifications?.sms?.twilio?.accountSid !== undefined) {
      const accountSid = updates.notifications.sms.twilio.accountSid;
      if (typeof accountSid === 'string' && accountSid.trim().length > 0) {
        if (!accountSid.startsWith('AC')) {
          return res.status(400).json({
            success: false,
            error: 'Twilio Account SID must start with "AC"'
          });
        }
      }
    }

    if (updates.notifications?.sms?.twilio?.authToken !== undefined) {
      const authToken = updates.notifications.sms.twilio.authToken;
      if (typeof authToken === 'string' && authToken.trim().length > 0) {
        if (authToken.length < 32) {
          return res.status(400).json({
            success: false,
            error: 'Twilio Auth Token must be at least 32 characters long'
          });
        }
      }
    }

    if (updates.notifications?.sms?.twilio?.phoneNumber !== undefined) {
      const phoneNumber = updates.notifications.sms.twilio.phoneNumber;
      if (typeof phoneNumber === 'string' && phoneNumber.trim().length > 0) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
          return res.status(400).json({
            success: false,
            error: 'Twilio Phone Number must be in international format (e.g., +1234567890)'
          });
        }
      }
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    // Handle Admin profile picture update if included
    if (updates.profilePicture || updates.profileImage) {
      console.log('=== PROFILE PICTURE UPDATE DEBUG ===');
      const Admin = require('../../models/Admin');
      const User = require('../../models/User');
      
      try {
        const adminId = req.admin?._id || req.user?._id;
        console.log('Admin ID found:', adminId);
        
        if (adminId) {
          const profilePictureUrl = updates.profilePicture || updates.profileImage;
          console.log('Profile picture URL to update:', profilePictureUrl);
          
          // Update Admin model
          const adminUpdateResult = await Admin.findByIdAndUpdate(
            adminId,
            { 
              profilePicture: profilePictureUrl,
              profileImage: profilePictureUrl
            },
            { new: true }
          );
          console.log('Admin update result:', adminUpdateResult);
          
          // Update corresponding User model for consistency
          const userUpdateResult = await User.findByIdAndUpdate(
            adminId,
            { 
              profilePicture: profilePictureUrl,
              profileImage: profilePictureUrl
            },
            { new: true }
          );
          console.log('User update result:', userUpdateResult);
          
          console.log('Admin profile picture updated in database');
        } else {
          console.log('No admin ID found for profile picture update');
        }
      } catch (adminUpdateError) {
        console.error('Admin profile picture update error:', adminUpdateError);
        // Don't fail the entire settings update if admin update fails
      }
    } else {
      console.log('No profile picture in updates to process');
    }

    // Transform flat structure to nested structure
    const transformedUpdates = {};
    let transformationErrors = [];
    
    console.log('\n🔄 Starting settings transformation...');
    
    try {
      // Platform settings - Ensure string typing
      if (updates.platformName !== undefined) {
        try {
          const platformName = String(updates.platformName).trim();
          if (!platformName) {
            transformationErrors.push('Platform name cannot be empty');
          } else {
            transformedUpdates.platform = {
              ...settings.platform,
              name: platformName
            };
            console.log('✅ Platform name transformed:', platformName);
          }
        } catch (error) {
          transformationErrors.push(`Platform name transformation failed: ${error.message}`);
        }
      }
      
      if (updates.platformDescription !== undefined) {
        try {
          const platformDescription = String(updates.platformDescription).trim();
          transformedUpdates.platform = {
            ...transformedUpdates.platform || settings.platform,
            description: platformDescription
          };
          console.log('✅ Platform description transformed:', platformDescription);
        } catch (error) {
          transformationErrors.push(`Platform description transformation failed: ${error.message}`);
        }
      }
      
      if (updates.supportEmail !== undefined) {
        try {
          const supportEmail = String(updates.supportEmail).trim().toLowerCase();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(supportEmail)) {
            transformationErrors.push('Support email format is invalid');
          } else {
            transformedUpdates.platform = {
              ...transformedUpdates.platform || settings.platform,
              supportEmail: supportEmail
            };
            console.log('✅ Support email transformed:', supportEmail);
          }
        } catch (error) {
          transformationErrors.push(`Support email transformation failed: ${error.message}`);
        }
      }
        if (updates.supportPhone !== undefined) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        supportPhone: String(updates.supportPhone).trim()
      };
    }
    if (updates.supportHours) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        supportHours: updates.supportHours
      };
    }
    if (updates.timezone) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        timezone: updates.timezone
      };
    }
    if (updates.dateFormat) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        dateFormat: updates.dateFormat
      };
    }
    if (updates.timeFormat) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        timeFormat: updates.timeFormat
      };
    }
    if (updates.currency) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        currency: updates.currency
      };
    }
    if (updates.language) {
      transformedUpdates.platform = {
        ...transformedUpdates.platform || settings.platform,
        language: updates.language
      };
    }

    // Fee settings - Ensure proper float conversion and merging
    // Initialize fees object if any fee-related updates exist
    const feeFields = ['commissionRate', 'creatorPayoutMin', 'brandEscrowMin', 'withdrawalFee', 'withdrawalFeeType', 'escrowFee', 'featuredListingFee', 'taxRate', 'taxInclusive'];
    const hasFeeUpdates = feeFields.some(field => updates[field] !== undefined);
    
    if (hasFeeUpdates) {
      // Initialize fees and payments objects properly
      transformedUpdates.fees = {
        ...settings.fees
      };
      transformedUpdates.payments = {
        ...settings.payments
      };
    }

    // Commission Rate
    if (updates.commissionRate !== undefined) {
      transformedUpdates.fees.commissionRate = parseFloat(updates.commissionRate);
    }
    
    // Creator Payout Minimum (goes to payments.minPayoutAmount)
    if (updates.creatorPayoutMin !== undefined) {
      transformedUpdates.payments.minPayoutAmount = parseFloat(updates.creatorPayoutMin);
    }
    
    // Brand Escrow Minimum (goes to fees.escrowFee)
    if (updates.brandEscrowMin !== undefined) {
      transformedUpdates.fees.escrowFee = parseFloat(updates.brandEscrowMin);
    }
    
    // Withdrawal Fee
    if (updates.withdrawalFee !== undefined) {
      // Ensure withdrawalFee object exists
      transformedUpdates.fees.withdrawalFee = {
        ...settings.fees?.withdrawalFee,
        type: settings.fees?.withdrawalFee?.type || 'fixed',
        amount: parseFloat(updates.withdrawalFee)
      };
    }
    
    // Withdrawal Fee Type
    if (updates.withdrawalFeeType !== undefined) {
      transformedUpdates.fees.withdrawalFee = {
        ...transformedUpdates.fees.withdrawalFee || settings.fees?.withdrawalFee || { type: 'fixed', amount: 0 },
        type: String(updates.withdrawalFeeType)
      };
    }
    
    // Escrow Fee
    if (updates.escrowFee !== undefined) {
      transformedUpdates.fees.escrowFee = parseFloat(updates.escrowFee);
    }
    
    // Featured Listing Fee
    if (updates.featuredListingFee !== undefined) {
      transformedUpdates.fees.featuredListingFee = {
        ...settings.fees?.featuredListingFee,
        base: parseFloat(updates.featuredListingFee),
        daily: settings.fees?.featuredListingFee?.daily || 5
      };
    }
    
    // Tax Rate
    if (updates.taxRate !== undefined) {
      transformedUpdates.fees.taxRate = parseFloat(updates.taxRate);
    }
    
    // Tax Inclusive
    if (updates.taxInclusive !== undefined) {
      transformedUpdates.fees.taxInclusive = updates.taxInclusive;
    }

    // Security settings - Ensure proper merging of all security-related updates
    // Initialize security object if any security-related updates exist
    const securityFields = [
      'twoFactorRequired', 'emailVerification', 'maxLoginAttempts', 
      'lockoutDuration', 'passwordMinLength', 'passwordRequireUppercase', 
      'passwordRequireLowercase', 'passwordRequireNumbers', 'passwordRequireSymbols',
      'passwordExpiryDays', 'passwordHistoryCount', 'jwtExpiry', 'refreshTokenExpiry',
      'otpExpiryMinutes', 'emailVerificationExpiryHours', 'passwordResetExpiryHours', 
      'twoFactorCodeExpiryMinutes'
    ];
    const hasSecurityUpdates = securityFields.some(field => updates[field] !== undefined);
    
    if (hasSecurityUpdates) {
      // Initialize security object properly
      transformedUpdates.security = {
        ...settings.security
      };
    }

    // Two Factor Authentication
    if (updates.twoFactorRequired !== undefined) {
      transformedUpdates.security.twoFactorRequired = Boolean(updates.twoFactorRequired);
    }
    
    // Email Verification
    if (updates.emailVerification !== undefined) {
      transformedUpdates.security.emailVerification = Boolean(updates.emailVerification);
    }
    
    // Login Management
    if (updates.maxLoginAttempts !== undefined) {
      transformedUpdates.security.maxLoginAttempts = parseInt(updates.maxLoginAttempts);
    }
    
    if (updates.lockoutDuration !== undefined) {
      transformedUpdates.security.lockoutDuration = parseInt(updates.lockoutDuration);
    }
    
    // Password Requirements
    if (updates.passwordMinLength !== undefined) {
      transformedUpdates.security.passwordMinLength = parseInt(updates.passwordMinLength);
    }
    
    if (updates.passwordRequireUppercase !== undefined) {
      transformedUpdates.security.passwordRequireUppercase = Boolean(updates.passwordRequireUppercase);
    }
    
    if (updates.passwordRequireLowercase !== undefined) {
      transformedUpdates.security.passwordRequireLowercase = Boolean(updates.passwordRequireLowercase);
    }
    
    if (updates.passwordRequireNumbers !== undefined) {
      transformedUpdates.security.passwordRequireNumbers = Boolean(updates.passwordRequireNumbers);
    }
    
    if (updates.passwordRequireSymbols !== undefined) {
      transformedUpdates.security.passwordRequireSymbols = Boolean(updates.passwordRequireSymbols);
    }
    
    // Password Expiry and History
    if (updates.passwordExpiryDays !== undefined) {
      transformedUpdates.security.passwordExpiryDays = parseInt(updates.passwordExpiryDays);
    }
    
    if (updates.passwordHistoryCount !== undefined) {
      transformedUpdates.security.passwordHistoryCount = parseInt(updates.passwordHistoryCount);
    }
    
    // JWT Settings
    if (updates.jwtExpiry !== undefined) {
      transformedUpdates.security.jwtExpiry = String(updates.jwtExpiry);
    }
    
    if (updates.refreshTokenExpiry !== undefined) {
      transformedUpdates.security.refreshTokenExpiry = String(updates.refreshTokenExpiry);
    }
    
    // OTP and Verification Expiry Times
    if (updates.otpExpiryMinutes !== undefined) {
      transformedUpdates.security.otpExpiryMinutes = parseInt(updates.otpExpiryMinutes);
    }
    
    if (updates.emailVerificationExpiryHours !== undefined) {
      transformedUpdates.security.emailVerificationExpiryHours = parseInt(updates.emailVerificationExpiryHours);
    }
    
    if (updates.passwordResetExpiryHours !== undefined) {
      transformedUpdates.security.passwordResetExpiryHours = parseInt(updates.passwordResetExpiryHours);
    }
    
    if (updates.twoFactorCodeExpiryMinutes !== undefined) {
      transformedUpdates.security.twoFactorCodeExpiryMinutes = parseInt(updates.twoFactorCodeExpiryMinutes);
    }

    // Email settings
    if (updates.senderEmail) {
      transformedUpdates.notifications = {
        ...settings.notifications,
        email: {
          ...settings.notifications?.email,
          fromEmail: updates.senderEmail
        }
      };
    }
    if (updates.senderName) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        email: {
          ...transformedUpdates.notifications?.email || settings.notifications?.email,
          fromName: updates.senderName
        }
      };
    }
    if (updates.emailFooter !== undefined) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        email: {
          ...transformedUpdates.notifications?.email || settings.notifications?.email,
          footer: updates.emailFooter
        }
      };
    }

    // Handle nested notifications structure from frontend - partial update logic
    if (updates.notifications?.email?.smtp) {
      const smtpConfig = updates.notifications.email.smtp;
      const existingSmtp = settings.notifications?.email?.smtp || {};
      
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        email: {
          ...transformedUpdates.notifications?.email || settings.notifications?.email,
          smtp: {
            // Only update fields that are provided and non-empty
            host: smtpConfig.host !== undefined && smtpConfig.host !== '' ? smtpConfig.host : existingSmtp.host,
            port: smtpConfig.port !== undefined && smtpConfig.port !== '' ? parseInt(smtpConfig.port) : existingSmtp.port,
            secure: smtpConfig.secure !== undefined ? smtpConfig.secure : (existingSmtp.secure !== undefined ? existingSmtp.secure : false),
            auth: {
              user: smtpConfig.auth?.user !== undefined && smtpConfig.auth?.user !== '' ? smtpConfig.auth.user : existingSmtp.auth?.user || '',
              pass: smtpConfig.auth?.pass !== undefined && smtpConfig.auth?.pass !== '' ? smtpConfig.auth.pass : existingSmtp.auth?.pass || ''
            }
          }
        }
      };
    }

    if (updates.notifications?.sms?.twilio) {
      const twilioConfig = updates.notifications.sms.twilio;
      const existingTwilio = settings.notifications?.sms?.twilio || {};
      
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        sms: {
          ...transformedUpdates.notifications?.sms || settings.notifications?.sms,
          twilio: {
            // Only update fields that are provided and non-empty
            accountSid: twilioConfig.accountSid !== undefined && twilioConfig.accountSid !== '' ? twilioConfig.accountSid : existingTwilio.accountSid || '',
            authToken: twilioConfig.authToken !== undefined && twilioConfig.authToken !== '' ? twilioConfig.authToken : existingTwilio.authToken || '',
            phoneNumber: twilioConfig.phoneNumber !== undefined && twilioConfig.phoneNumber !== '' ? twilioConfig.phoneNumber : existingTwilio.phoneNumber || ''
          }
        }
      };
    }
    
    // OTP and verification expiry times
    if (updates.otpExpiryMinutes !== undefined) {
      transformedUpdates.security = {
        ...transformedUpdates.security || settings.security,
        otpExpiryMinutes: updates.otpExpiryMinutes
      };
    }
    if (updates.emailVerificationExpiryHours !== undefined) {
      transformedUpdates.security = {
        ...transformedUpdates.security || settings.security,
        emailVerificationExpiryHours: updates.emailVerificationExpiryHours
      };
    }
    if (updates.passwordResetExpiryHours !== undefined) {
      transformedUpdates.security = {
        ...transformedUpdates.security || settings.security,
        passwordResetExpiryHours: updates.passwordResetExpiryHours
      };
    }
    if (updates.twoFactorCodeExpiryMinutes !== undefined) {
      transformedUpdates.security = {
        ...transformedUpdates.security || settings.security,
        twoFactorCodeExpiryMinutes: updates.twoFactorCodeExpiryMinutes
      };
    }
    
    // Message templates
    if (updates.messageTemplates) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        email: {
          ...transformedUpdates.notifications?.email || settings.notifications?.email,
          messageTemplates: updates.messageTemplates
        }
      };
    }

    // Notification settings (emailNotifications) - Save to correct database structure
    if (updates.emailNotifications) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        admin: {
          ...transformedUpdates.notifications?.admin || settings.notifications?.admin,
          email: updates.emailNotifications
        }
      };
    }
    
    // SMS Notifications - Transform from flat to nested structure for database
    if (updates.smsNotifications) {
      const smsConfig = updates.smsNotifications;
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        sms: {
          ...settings.notifications?.sms,
          enabled: smsConfig.enabled,
          provider: smsConfig.provider,
          twilio: {
            accountSid: smsConfig.accountSid,
            authToken: smsConfig.authToken,
            phoneNumber: smsConfig.phoneNumber
          }
        }
      };
    }
    if (updates.pushNotifications) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        push: {
          ...settings.notifications?.push,
          enabled: updates.pushNotifications?.enabled,
          vapidPublicKey: updates.pushNotifications?.vapidPublicKey,
          vapidPrivateKey: updates.pushNotifications?.vapidPrivateKey,
          vapidEmail: updates.pushNotifications?.vapidEmail
        }
      };
    }
    if (updates.inAppNotifications) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        inApp: {
          ...settings.notifications?.inApp,
          enabled: updates.inAppNotifications?.enabled,
          retentionDays: updates.inAppNotifications?.retentionDays
        }
      };
    }
    if (updates.notificationTriggers) {
      transformedUpdates.notifications = {
        ...transformedUpdates.notifications || settings.notifications,
        triggers: updates.notificationTriggers
      };
    }

    // User Approval Settings
    if (updates.autoApproveBrands !== undefined) {
      transformedUpdates.userApproval = {
        ...settings.userApproval,
        autoApproveBrands: updates.autoApproveBrands
      };
    }
    if (updates.autoApproveCreators !== undefined) {
      transformedUpdates.userApproval = {
        ...transformedUpdates.userApproval || settings.userApproval,
        autoApproveCreators: updates.autoApproveCreators
      };
    }
    if (updates.requireVerification !== undefined) {
      transformedUpdates.userApproval = {
        ...transformedUpdates.userApproval || settings.userApproval,
        requireVerification: updates.requireVerification
      };
    }
    if (updates.verificationMethod !== undefined) {
      transformedUpdates.userApproval = {
        ...transformedUpdates.userApproval || settings.userApproval,
        verificationMethod: updates.verificationMethod
      };
    }

    // Content Moderation Settings
    if (updates.contentModeration !== undefined) {
      transformedUpdates.contentModeration = {
        ...settings.contentModeration,
        moderationType: updates.contentModeration
      };
    }
    if (updates.autoApproveContent !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        autoApproveContent: updates.autoApproveContent
      };
    }
    if (updates.autoFlagContent !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        autoFlagContent: updates.autoFlagContent
      };
    }
    if (updates.flagThreshold !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        flagThreshold: parseFloat(updates.flagThreshold)
      };
    }
    if (updates.manualReviewRequired !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        manualReviewRequired: updates.manualReviewRequired
      };
    }
    if (updates.bannedWords !== undefined) {
      const bannedWords = updates.bannedWords.split('\n')
        .filter(word => word.trim())
        .map(word => ({ 
          word: word.trim(), 
          severity: 'medium' 
        }));
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        bannedWords
      };
    }
    if (updates.bannedPhrases !== undefined) {
      const bannedPhrases = updates.bannedPhrases.split('\n')
        .filter(phrase => phrase.trim())
        .map(phrase => ({ 
          phrase: phrase.trim(), 
          severity: 'medium' 
        }));
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        bannedPhrases
      };
    }
    if (updates.allowedDomains !== undefined) {
      const allowedDomains = updates.allowedDomains.split('\n')
        .filter(domain => domain.trim())
        .map(domain => domain.trim());
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        allowedDomains
      };
    }
    if (updates.blockedDomains !== undefined) {
      const blockedDomains = updates.blockedDomains.split('\n')
        .filter(domain => domain.trim())
        .map(domain => domain.trim());
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        blockedDomains
      };
    }
    if (updates.profanityFilter !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        profanityFilter: updates.profanityFilter
      };
    }
    if (updates.spamFilter !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        spamFilter: updates.spamFilter
      };
    }
    if (updates.duplicateContentFilter !== undefined) {
      transformedUpdates.contentModeration = {
        ...transformedUpdates.contentModeration || settings.contentModeration,
        duplicateContentFilter: updates.duplicateContentFilter
      };
    }

    // Limits settings - Ensure proper merging of all limits-related updates
    const limitsFields = ['maxCampaignsPerBrand', 'maxActiveDealsPerCreator'];
    const hasLimitsUpdates = limitsFields.some(field => updates[field] !== undefined);
    
    if (hasLimitsUpdates) {
      // Initialize customLimits object properly
      transformedUpdates.customLimits = {
        ...settings.customLimits
      };
    }

    // Usage Limits
    if (updates.maxCampaignsPerBrand !== undefined) {
      transformedUpdates.customLimits.maxCampaignsPerBrand = parseInt(updates.maxCampaignsPerBrand);
    }
    if (updates.maxActiveDealsPerCreator !== undefined) {
      transformedUpdates.customLimits.maxActiveDealsPerCreator = parseInt(updates.maxActiveDealsPerCreator);
    }
    if (updates.maxFileSize !== undefined) {
      transformedUpdates.upload = {
        ...settings.upload,
        maxFileSize: updates.maxFileSize
      };
    }
    if (updates.allowedFileTypes) {
      transformedUpdates.upload = {
        ...transformedUpdates.upload || settings.upload,
        allowedFileTypes: updates.allowedFileTypes
      };
    }

    // Payment gateway settings - Ensure proper merging of all payment-related updates
    // Initialize integrations object if any payment-related updates exist
    const paymentFields = [
      'paymentProvider', 'stripePublishableKey', 'stripeSecretKeyMasked', 
      'stripeWebhookSecretMasked', 'paymentTestMode', 'autoCapturePayments', 
      'allowApplePay', 'allowGooglePay'
    ];
    const hasPaymentUpdates = paymentFields.some(field => updates[field] !== undefined);
    
    if (hasPaymentUpdates) {
      // Initialize integrations and payments objects properly
      transformedUpdates.integrations = {
        ...settings.integrations,
        stripe: {
          ...settings.integrations?.stripe
        }
      };
      transformedUpdates.payments = {
        ...settings.payments
      };
    }

    // Payment Provider
    if (updates.paymentProvider !== undefined) {
      transformedUpdates.integrations.stripe.enabled = updates.paymentProvider === 'stripe';
    }
    
    // Stripe Configuration
    if (updates.stripePublishableKey !== undefined) {
      transformedUpdates.integrations.stripe.publishableKey = updates.stripePublishableKey;
    }
    
    if (updates.stripeSecretKeyMasked !== undefined) {
      // Check if this is a new key (not masked) or an update
      if (updates.stripeSecretKeyMasked && !updates.stripeSecretKeyMasked.includes('************************')) {
        // This is a new secret key, save it
        transformedUpdates.integrations.stripe.secretKey = updates.stripeSecretKeyMasked;
      }
      // If it's masked, don't update the database (keep existing value)
    }
    
    if (updates.stripeWebhookSecretMasked !== undefined) {
      // Check if this is a new key (not masked) or an update
      if (updates.stripeWebhookSecretMasked && !updates.stripeWebhookSecretMasked.includes('************************')) {
        // This is a new webhook secret, save it
        transformedUpdates.integrations.stripe.webhookSecret = updates.stripeWebhookSecretMasked;
      }
      // If it's masked, don't update the database (keep existing value)
    }
    
    // Payment Settings
    if (updates.paymentTestMode !== undefined) {
      transformedUpdates.integrations.stripe.testMode = Boolean(updates.paymentTestMode);
    }
    
    if (updates.autoCapturePayments !== undefined) {
      transformedUpdates.payments.autoCapture = Boolean(updates.autoCapturePayments);
    }
    
    if (updates.allowApplePay !== undefined) {
      transformedUpdates.payments.applePayEnabled = Boolean(updates.allowApplePay);
    }
    
    if (updates.allowGooglePay !== undefined) {
      transformedUpdates.payments.googlePayEnabled = Boolean(updates.allowGooglePay);
    }
    
    if (updates.invoicePrefix !== undefined) {
      transformedUpdates.payments.invoicePrefix = updates.invoicePrefix;
    }

    } catch (transformationError) {
      console.error('❌ Settings transformation failed:', transformationError);
      transformationErrors.push(`General transformation error: ${transformationError.message}`);
    }

    // Check if there were any transformation errors
    if (transformationErrors.length > 0) {
      console.error('❌ Transformation errors detected:', transformationErrors);
      return res.status(400).json({
        success: false,
        error: 'Settings transformation failed',
        details: transformationErrors,
        message: 'Some settings could not be processed. Please check your input values.'
      });
    }

    console.log('✅ Settings transformation completed successfully');
    console.log('📊 Transformed fields:', Object.keys(transformedUpdates));

    // Update settings using settings service with validation
    console.log('\n📡 Calling settingsService.updateSettings...');
    let updatedSettings;
    try {
      updatedSettings = await settingsService.updateSettings(transformedUpdates, req.admin._id);
      
      if (!updatedSettings) {
        throw new Error('Settings update failed - no data returned');
      }
      
      console.log('✅ Database update successful');
    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);
      
      // Handle specific database errors
      if (dbError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Database validation failed',
          details: dbError.message,
          message: 'The settings values are invalid. Please check your input.'
        });
      }
      
      if (dbError.name === 'MongoError' || dbError.name === 'MongoServerError') {
        return res.status(503).json({
          success: false,
          error: 'Database temporarily unavailable',
          message: 'Please try again later. If the problem persists, contact support.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Database update failed',
        details: dbError.message,
        message: 'Failed to save settings to database. Please try again.'
      });
    }

    // Verify the update was successful
    if (!updatedSettings) {
      throw new Error('Settings update failed - no data returned');
    }

    console.log('\n✅ Settings update successful!');
    console.log('📄 Updated settings document ID:', updatedSettings._id);
    console.log('⏰ Update completed at:', new Date().toISOString());
    console.log('🔍 Processing time:', Date.now() - startTime, 'ms');

    // Clear cache to ensure new values are used immediately
    settingsService.clearCache();
    
    // Emit real-time update event if socket is available
    if (global.socketService) {
      global.socketService.emitToAdmins('settings_updated', {
        type: 'PLATFORM_CONFIG_UPDATED',
        settings: {
          platformName: updatedSettings.platform?.name,
          supportEmail: updatedSettings.platform?.supportEmail,
          supportPhone: updatedSettings.platform?.supportPhone
        }
      });
      console.log('📡 Real-time update event emitted to admins');
    }

    // Transform response back to flat structure for frontend compatibility
    console.log('\n📋 Preparing response for frontend...');
    console.log('🔒 Security settings in response:', {
      maxLoginAttempts: updatedSettings.security?.maxLoginAttempts,
      lockoutDuration: updatedSettings.security?.lockoutDuration,
      passwordMinLength: updatedSettings.security?.passwordMinLength,
      otpExpiryMinutes: updatedSettings.security?.otpExpiryMinutes
    });
    
    let responseSettings;
    try {
      // CRITICAL FIX: Use request values first, then database values to preserve user inputs
      responseSettings = {
      // Platform settings - Use request values if provided, otherwise database values
      platformName: updates.platformName !== undefined ? String(updates.platformName).trim() : String(updatedSettings.platform?.name || 'InfluenceX').trim(),
      platformDescription: updates.platformDescription !== undefined ? String(updates.platformDescription).trim() : String(updatedSettings.platform?.description || 'Influencer Deal Marketplace').trim(),
      supportEmail: updates.supportEmail !== undefined ? String(updates.supportEmail).trim().toLowerCase() : String(updatedSettings.platform?.supportEmail || 'snimramukhtar321@gmail.com').trim().toLowerCase(),
      supportPhone: updates.supportPhone !== undefined ? String(updates.supportPhone).trim() : String(updatedSettings.platform?.supportPhone || '+1 (555) 123-4567').trim(),
      supportHours: updates.supportHours !== undefined ? updates.supportHours : (updatedSettings.platform?.supportHours || 'Mon-Fri, 9am-5pm EST'),
      timezone: updates.timezone !== undefined ? updates.timezone : (updatedSettings.platform?.timezone || 'America/New_York'),
      dateFormat: updates.dateFormat !== undefined ? updates.dateFormat : (updatedSettings.platform?.dateFormat || 'MM/DD/YYYY'),
      timeFormat: updates.timeFormat !== undefined ? updates.timeFormat : (updatedSettings.platform?.timeFormat || '12h'),
      currency: updates.currency !== undefined ? updates.currency : (updatedSettings.platform?.currency || 'USD'),
      language: updates.language !== undefined ? updates.language : (updatedSettings.platform?.language || 'en'),
      
      // Fee settings - Use request values first to ensure preservation
      commissionRate: updates.commissionRate !== undefined ? parseFloat(updates.commissionRate) : parseFloat(updatedSettings.fees?.commissionRate ?? 10),
      creatorPayoutMin: updates.creatorPayoutMin !== undefined ? parseFloat(updates.creatorPayoutMin) : parseFloat(updatedSettings.payments?.minPayoutAmount ?? 50),
      brandEscrowMin: updates.brandEscrowMin !== undefined ? parseFloat(updates.brandEscrowMin) : parseFloat(updatedSettings.fees?.escrowFee ?? 100),
      escrowFee: updates.escrowFee !== undefined ? parseFloat(updates.escrowFee) : parseFloat(updatedSettings.fees?.escrowFee ?? 0),
      featuredListingFee: updates.featuredListingFee !== undefined ? parseFloat(updates.featuredListingFee) : parseFloat(updatedSettings.fees?.featuredListingFee?.base ?? 50),
      taxRate: updates.taxRate !== undefined ? parseFloat(updates.taxRate) : parseFloat(updatedSettings.fees?.taxRate ?? 0),
      taxInclusive: updates.taxInclusive !== undefined ? Boolean(updates.taxInclusive) : Boolean(updatedSettings.fees?.taxInclusive ?? false),
      withdrawalFeeType: updates.withdrawalFeeType !== undefined ? String(updates.withdrawalFeeType) : String(updatedSettings.fees?.withdrawalFee?.type ?? 'fixed'),
      withdrawalFee: updates.withdrawalFee !== undefined ? parseFloat(updates.withdrawalFee) : parseFloat(updatedSettings.fees?.withdrawalFee?.amount ?? 0),
      
      // Security settings - Use request values if provided
      twoFactorRequired: updates.twoFactorRequired !== undefined ? Boolean(updates.twoFactorRequired) : (updatedSettings.security?.twoFactorRequired ?? false),
      emailVerification: updates.emailVerification !== undefined ? Boolean(updates.emailVerification) : (updatedSettings.security?.emailVerification ?? true),
      maxLoginAttempts: updates.maxLoginAttempts !== undefined ? parseInt(updates.maxLoginAttempts) : (updatedSettings.security?.maxLoginAttempts ?? 5),
            lockoutDuration: updates.lockoutDuration !== undefined ? parseInt(updates.lockoutDuration) : (updatedSettings.security?.lockoutDuration ?? 30),
      passwordMinLength: updates.passwordMinLength !== undefined ? parseInt(updates.passwordMinLength) : (updatedSettings.security?.passwordMinLength ?? 8),
      passwordRequireUppercase: updates.passwordRequireUppercase !== undefined ? Boolean(updates.passwordRequireUppercase) : (updatedSettings.security?.passwordRequireUppercase ?? true),
      passwordRequireLowercase: updates.passwordRequireLowercase !== undefined ? Boolean(updates.passwordRequireLowercase) : (updatedSettings.security?.passwordRequireLowercase ?? true),
      passwordRequireNumbers: updates.passwordRequireNumbers !== undefined ? Boolean(updates.passwordRequireNumbers) : (updatedSettings.security?.passwordRequireNumbers ?? true),
      passwordRequireSymbols: updates.passwordRequireSymbols !== undefined ? Boolean(updates.passwordRequireSymbols) : (updatedSettings.security?.passwordRequireSymbols ?? false),
      passwordExpiryDays: updatedSettings.security?.passwordExpiryDays ?? 90,
      passwordHistoryCount: updatedSettings.security?.passwordHistoryCount ?? 5,
      jwtExpiry: updatedSettings.security?.jwtExpiry ?? '7d',
      refreshTokenExpiry: updatedSettings.security?.refreshTokenExpiry ?? '30d',
      ipWhitelistEnabled: updatedSettings.security?.ipWhitelistEnabled ?? false,
      allowedIPs: updatedSettings.security?.allowedIPs?.join('\n') ?? '',
      blockedIPs: updatedSettings.security?.blockedIPs?.join('\n') ?? '',
      
      // Email settings - Use request values if provided
      senderEmail: updates.senderEmail !== undefined ? String(updates.senderEmail).trim() : (updatedSettings.notifications?.email?.fromEmail || 'noreply@influencex.com'),
      senderName: updates.senderName !== undefined ? String(updates.senderName).trim() : (updatedSettings.notifications?.email?.fromName || 'InfluenceX'),
      emailFooter: updates.emailFooter !== undefined ? String(updates.emailFooter).trim() : (updatedSettings.notifications?.email?.footer || '© 2024 InfluenceX. All rights reserved.'),
      
      // Notification settings - Use request values for toggles, read from correct database structure
      emailNotifications: {
        newUser: updates.emailNotifications?.newUser !== undefined ? Boolean(updates.emailNotifications.newUser) : Boolean(updatedSettings.notifications?.admin?.email?.newUser ?? false),
        newCampaign: updates.emailNotifications?.newCampaign !== undefined ? Boolean(updates.emailNotifications.newCampaign) : Boolean(updatedSettings.notifications?.admin?.email?.newCampaign ?? false),
        paymentReceived: updates.emailNotifications?.paymentReceived !== undefined ? Boolean(updates.emailNotifications.paymentReceived) : Boolean(updatedSettings.notifications?.admin?.email?.paymentReceived ?? false),
        disputeRaised: updates.emailNotifications?.disputeRaised !== undefined ? Boolean(updates.emailNotifications.disputeRaised) : Boolean(updatedSettings.notifications?.admin?.email?.disputeRaised ?? false),
        reportGenerated: updates.emailNotifications?.reportGenerated !== undefined ? Boolean(updates.emailNotifications.reportGenerated) : Boolean(updatedSettings.notifications?.admin?.email?.reportGenerated ?? false)
      },
      
      // SMS Notifications - Transform from nested to flat structure for frontend compatibility
      smsNotifications: {
        enabled: updates.smsNotifications?.enabled !== undefined ? Boolean(updates.smsNotifications.enabled) : (updatedSettings.notifications?.sms?.enabled ?? false),
        provider: updates.smsNotifications?.provider !== undefined ? String(updates.smsNotifications.provider) : (updatedSettings.notifications?.sms?.provider || 'twilio'),
        accountSid: updates.smsNotifications?.accountSid !== undefined ? String(updates.smsNotifications.accountSid) : (updatedSettings.notifications?.sms?.twilio?.accountSid || ''),
        authToken: updates.smsNotifications?.authToken !== undefined ? String(updates.smsNotifications.authToken) : (updatedSettings.notifications?.sms?.twilio?.authToken || ''),
        phoneNumber: updates.smsNotifications?.phoneNumber !== undefined ? String(updates.smsNotifications.phoneNumber) : (updatedSettings.notifications?.sms?.twilio?.phoneNumber || '')
      },
      
      // User Approval and Content Moderation Settings - Use request values
      autoApproveBrands: updates.autoApproveBrands !== undefined ? Boolean(updates.autoApproveBrands) : Boolean(updatedSettings.userApproval?.autoApproveBrands ?? false),
      autoApproveCreators: updates.autoApproveCreators !== undefined ? Boolean(updates.autoApproveCreators) : Boolean(updatedSettings.userApproval?.autoApproveCreators ?? false),
      requireVerification: updates.requireVerification !== undefined ? Boolean(updates.requireVerification) : Boolean(updatedSettings.userApproval?.requireVerification ?? true),
      verificationMethod: updates.verificationMethod !== undefined ? String(updates.verificationMethod) : String(updatedSettings.userApproval?.verificationMethod ?? 'manual'),
      contentModeration: updates.contentModeration !== undefined ? String(updates.contentModeration) : String(updatedSettings.contentModeration?.moderationType ?? 'ai'),
      autoApproveContent: updates.autoApproveContent !== undefined ? Boolean(updates.autoApproveContent) : Boolean(updatedSettings.contentModeration?.autoApproveContent ?? false),
      autoFlagContent: updates.autoFlagContent !== undefined ? Boolean(updates.autoFlagContent) : Boolean(updatedSettings.contentModeration?.autoFlagContent ?? true),
      flagThreshold: updates.flagThreshold !== undefined ? parseFloat(updates.flagThreshold) : parseFloat(updatedSettings.contentModeration?.flagThreshold ?? 0.7),
      manualReviewRequired: updates.manualReviewRequired !== undefined ? Boolean(updates.manualReviewRequired) : Boolean(updatedSettings.contentModeration?.manualReviewRequired ?? true),
      bannedWords: updates.bannedWords !== undefined ? String(updates.bannedWords) : (updatedSettings.contentModeration?.bannedWords?.map(w => w.word).join('\n') ?? ''),
      bannedPhrases: updates.bannedPhrases !== undefined ? String(updates.bannedPhrases) : (updatedSettings.contentModeration?.bannedPhrases?.map(p => p.phrase).join('\n') ?? ''),
      allowedDomains: updates.allowedDomains !== undefined ? String(updates.allowedDomains) : (updatedSettings.contentModeration?.allowedDomains?.join('\n') ?? ''),
      blockedDomains: updates.blockedDomains !== undefined ? String(updates.blockedDomains) : (updatedSettings.contentModeration?.blockedDomains?.join('\n') ?? ''),
      profanityFilter: updates.profanityFilter !== undefined ? Boolean(updates.profanityFilter) : (updatedSettings.contentModeration?.profanityFilter ?? true),
      spamFilter: updates.spamFilter !== undefined ? Boolean(updates.spamFilter) : (updatedSettings.contentModeration?.spamFilter ?? true),
      duplicateContentFilter: updates.duplicateContentFilter !== undefined ? Boolean(updates.duplicateContentFilter) : (updatedSettings.contentModeration?.duplicateContentFilter ?? true),
      
      // Apply only non-fee updates from request to preserve proper transformation
      ...Object.keys(updates).reduce((acc, key) => {
        // Skip fee-related fields as they're properly handled above
        const feeFields = ['withdrawalFee', 'withdrawalFeeType', 'commissionRate', 'escrowFee', 'featuredListingFee', 'taxRate', 'taxInclusive', 'creatorPayoutMin', 'brandEscrowMin'];
        if (!feeFields.includes(key)) {
          acc[key] = updates[key];
        }
        return acc;
      }, {})
    };

    } catch (responseError) {
      console.error('❌ Response transformation failed:', responseError);
      return res.status(500).json({
        success: false,
        error: 'Response preparation failed',
        details: responseError.message,
        message: 'Settings were updated but failed to prepare response. Please refresh the page.'
      });
    }

    console.log('✅ Response transformation completed successfully');
    console.log('Final Response Settings withdrawalFee:', responseSettings.withdrawalFee);
    console.log('=== END BACKEND RESPONSE DEBUG ===');

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'settings_updated',
          changes: updates,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        console.log('📝 Audit log created for settings update');
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    // If maintenance mode changed, notify all admins
    if (updates.maintenance?.enabled !== undefined) {
      const admins = await User.find({ userType: 'admin' });
      
      for (const admin of admins) {
        await notificationService.createNotification(
          admin._id,
          'system',
          updates.maintenance.enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
          updates.maintenance.enabled 
            ? `Platform is now in maintenance mode. Message: ${updates.maintenance.message || 'No message'}`
            : 'Platform is now out of maintenance mode.',
          { maintenance: updates.maintenance }
        );
      }
      console.log('📢 Maintenance mode notifications sent to admins');
    }

    // Return success response with updated settings in expected format
    console.log('\n📤 Sending response to frontend...');
    console.log('✅ Response success: true');
    console.log('📝 Response message: Settings updated successfully');
    console.log('📋 Response settings keys:', Object.keys(responseSettings));
    console.log('🔒 Security settings in response:', {
      maxLoginAttempts: responseSettings.maxLoginAttempts,
      lockoutDuration: responseSettings.lockoutDuration,
      passwordMinLength: responseSettings.passwordMinLength,
      otpExpiryMinutes: responseSettings.otpExpiryMinutes
    });
    console.log('🔥 === ADMIN SETTINGS UPDATE COMPLETED ===\n');
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: responseSettings
    });

  } catch (error) {
    console.error('Update settings error:', error);
    
    // Handle specific error types with proper response format
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: ' + error.message
      });
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable. Please try again later.'
      });
    }
    
    // Ensure consistent error response format
    const errorMessage = error.message || 'Failed to update settings';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

// ==================== GET ACTIVITY LOG ====================
exports.getActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, admin_id } = req.query;

    const query = {};
    if (admin_id) query.adminId = admin_id;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('adminId', 'fullName email')
        .populate('targetUser', 'fullName email')
        .sort('-createdAt')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Get summary statistics
    const summary = await AuditLog.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      logs,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get activity log'
    });
  }
};

// ==================== GET SYSTEM HEALTH ====================
exports.getSystemHealth = async (req, res) => {
  try {
    const start = Date.now();

    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
    
    // Check Redis connection (if configured)
    let redisStatus = 'not_configured';
    try {
      const redis = require('../../config/redis');
      if (redis.getRedisClient()) {
        await redis.getRedisClient().ping();
        redisStatus = 'healthy';
      }
    } catch (error) {
      redisStatus = 'unhealthy';
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Get CPU usage
    const cpuUsage = process.cpuUsage();

    // Get uptime
    const uptime = process.uptime();

    // Get active connections
    const activeConnections = mongoose.connection.base?.connections?.length || 0;

    // Calculate response time
    const responseTime = Date.now() - start;

    // Get queue stats (if using Bull)
    let queueStats = {};
    try {
      const Queue = require('bull');
      const emailQueue = new Queue('email');
      const notificationQueue = new Queue('notification');
      
      const [emailCount, notificationCount] = await Promise.all([
        emailQueue.count(),
        notificationQueue.count()
      ]);

      queueStats = {
        email: emailCount,
        notification: notificationCount
      };
    } catch (error) {
      queueStats = { error: 'Queue not configured' };
    }

    res.json({
      success: true,
      status: dbStatus === 'healthy' && redisStatus !== 'unhealthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm',
      responseTime: responseTime + 'ms',
      database: {
        status: dbStatus,
        connections: activeConnections,
        name: mongoose.connection.name
      },
      redis: {
        status: redisStatus
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
      },
      cpu: {
        user: cpuUsage.user / 1000 + 'ms',
        system: cpuUsage.system / 1000 + 'ms'
      },
      queues: queueStats
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get system health'
    });
  }
};

// ==================== CLEAR CACHE ====================
exports.clearCache = async (req, res) => {
  try {
    const { type = 'all' } = req.body;

    const cacheService = require('../../services/cacheService');
    
    let cleared = false;

    switch(type) {
      case 'all':
        await cacheService.flush();
        cleared = true;
        break;
      case 'users':
        await cacheService.delPattern('user:*');
        cleared = true;
        break;
      case 'campaigns':
        await cacheService.delPattern('campaign:*');
        cleared = true;
        break;
      case 'deals':
        await cacheService.delPattern('deal:*');
        cleared = true;
        break;
      case 'search':
        await cacheService.delPattern('search:*');
        cleared = true;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid cache type'
        });
    }

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'cache_cleared',
      metadata: { type },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Cache cleared successfully (${type})`,
      cleared
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
};

// ==================== GET BACKUP STATUS ====================
exports.getBackupStatus = async (req, res) => {
  try {
    const backupService = require('../../services/backupService');
    
    const [backups, stats] = await Promise.all([
      backupService.listBackups(),
      backupService.getStats()
    ]);

    res.json({
      success: true,
      backups: backups.backups.slice(0, 10), // Last 10 backups
      stats
    });

  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get backup status'
    });
  }
};

// ==================== CREATE BACKUP ====================
exports.createBackup = async (req, res) => {
  try {
    const { type = 'full' } = req.body;

    const backupService = require('../../services/backupService');
    
    const result = await backupService.createBackup({ type });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'backup_created',
      metadata: { type, filename: result.filename },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: result
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create backup'
    });
  }
};

// ==================== RESTORE BACKUP ====================
exports.restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;

    const backupService = require('../../services/backupService');
    const backupPath = require('path').join(backupService.backupDir, filename);

    const result = await backupService.restoreBackup(backupPath);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Log the action
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'backup_restored',
      metadata: { filename },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Backup restored successfully',
      result
    });

  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to restore backup'
    });
  }
};

// ==================== USAGE LIMITS MANAGEMENT ====================

/**
 * Get usage limits settings
 */
exports.getUsageLimits = async (req, res) => {
  try {
    // settingsService already required above
    const settings = await settingsService.getSettings();
    
    const usageLimits = {
      maxCampaignsPerBrand: settings.customLimits?.maxCampaignsPerBrand || 50,
      maxActiveDealsPerCreator: settings.customLimits?.maxActiveDealsPerCreator || 20,
      maxFileSize: settings.upload?.maxFileSize || 100,
      maxFilesPerUpload: settings.upload?.maxFilesPerUpload || 10,
      dailyUploadLimit: settings.upload?.dailyUploadLimit || 100,
      storageQuotaPerUser: settings.usageLimits?.storageQuotaPerUser || 1000
    };

    res.json({
      success: true,
      data: usageLimits
    });

  } catch (error) {
    console.error('Get usage limits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get usage limits'
    });
  }
};

/**
 * Update usage limits settings
 */
exports.updateUsageLimits = async (req, res) => {
  try {
    const {
      maxCampaignsPerBrand,
      maxActiveDealsPerCreator,
      maxFileSize,
      maxFilesPerUpload,
      dailyUploadLimit,
      storageQuotaPerUser
    } = req.body;

    // settingsService already required above
    const settings = await settingsService.getSettings();
    
    // Validate inputs
    const updates = {
      customLimits: {
        maxCampaignsPerBrand: Math.max(1, Math.min(1000, parseInt(maxCampaignsPerBrand) || 50)),
        maxActiveDealsPerCreator: Math.max(1, Math.min(500, parseInt(maxActiveDealsPerCreator) || 20))
      },
      upload: {
        maxFileSize: Math.max(1, Math.min(500, parseInt(maxFileSize) || 100)),
        maxFilesPerUpload: Math.max(1, Math.min(50, parseInt(maxFilesPerUpload) || 10)),
        dailyUploadLimit: Math.max(1, Math.min(1000, parseInt(dailyUploadLimit) || 100)),
        storageQuotaPerUser: Math.max(100, Math.min(10000, parseInt(storageQuotaPerUser) || 1000))
      }
    };

    // settingsService already required above
    await settingsService.updateSettings(updates, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'usage_limits_updated',
          metadata: updates,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'Usage limits updated successfully',
      data: {
        customLimits: updates.customLimits,
        upload: updates.upload
      }
    });

  } catch (error) {
    console.error('Update usage limits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update usage limits'
    });
  }
};

// ==================== FILE UPLOAD SETTINGS MANAGEMENT ====================

/**
 * Get file upload settings
 */
exports.getFileUploadSettings = async (req, res) => {
  try {
    // settingsService already required above
    const settings = await settingsService.getSettings();
    
    const fileUploadSettings = {
      allowedFileTypes: settings.upload?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'],
      maxFileSize: settings.upload?.maxFileSize || 100,
      maxFilesPerUpload: settings.upload?.maxFilesPerUpload || 10,
      dailyUploadLimit: settings.upload?.dailyUploadLimit || 100,
      storageQuotaPerUser: settings.upload?.storageQuotaPerUser || 1000,
      imageOptimization: {
        enabled: settings.upload?.imageOptimization?.enabled ?? true,
        maxWidth: settings.upload?.imageOptimization?.maxWidth || 1920,
        maxHeight: settings.upload?.imageOptimization?.maxHeight || 1080,
        quality: settings.upload?.imageOptimization?.quality || 80
      },
      videoOptimization: {
        enabled: settings.upload?.videoOptimization?.enabled ?? true,
        maxDuration: settings.upload?.videoOptimization?.maxDuration || 300,
        maxBitrate: settings.upload?.videoOptimization?.maxBitrate || 5000
      },
      storage: {
        provider: settings.upload?.storage?.provider || 'local',
        s3: settings.upload?.storage?.s3 || {},
        cloudinary: settings.upload?.storage?.cloudinary || {}
      }
    };

    res.json({
      success: true,
      data: fileUploadSettings
    });

  } catch (error) {
    console.error('Get file upload settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get file upload settings'
    });
  }
};

/**
 * Update file upload settings
 */
exports.updateFileUploadSettings = async (req, res) => {
  try {
    const {
      allowedFileTypes,
      maxFileSize,
      maxFilesPerUpload,
      dailyUploadLimit,
      storageQuotaPerUser,
      imageOptimization,
      videoOptimization,
      storage
    } = req.body;

    // settingsService already required above
    const settings = await settingsService.getSettings();
    
    // Validate file types
    const validFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'];
    const validatedFileTypes = (allowedFileTypes || []).filter(type => validFileTypes.includes(type));

    const updates = {
      upload: {
        allowedFileTypes: validatedFileTypes,
        maxFileSize: Math.max(1, Math.min(500, parseInt(maxFileSize) || 100)),
        maxFilesPerUpload: Math.max(1, Math.min(50, parseInt(maxFilesPerUpload) || 10)),
        dailyUploadLimit: Math.max(1, Math.min(1000, parseInt(dailyUploadLimit) || 100)),
        storageQuotaPerUser: Math.max(100, Math.min(10000, parseInt(storageQuotaPerUser) || 1000)),
        imageOptimization: {
          enabled: imageOptimization?.enabled ?? true,
          maxWidth: Math.max(100, Math.min(4000, parseInt(imageOptimization?.maxWidth) || 1920)),
          maxHeight: Math.max(100, Math.min(4000, parseInt(imageOptimization?.maxHeight) || 1080)),
          quality: Math.max(10, Math.min(100, parseInt(imageOptimization?.quality) || 80))
        },
        videoOptimization: {
          enabled: videoOptimization?.enabled ?? true,
          maxDuration: Math.max(10, Math.min(3600, parseInt(videoOptimization?.maxDuration) || 300)),
          maxBitrate: Math.max(100, Math.min(20000, parseInt(videoOptimization?.maxBitrate) || 5000))
        },
        storage: {
          provider: storage?.provider || 'local',
          s3: storage?.s3 || {},
          cloudinary: storage?.cloudinary || {}
        }
      }
    };

    // settingsService already required above
    await settingsService.updateSettings(updates, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'file_upload_settings_updated',
          metadata: updates,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'File upload settings updated successfully',
      data: updates.upload
    });

  } catch (error) {
    console.error('Update file upload settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update file upload settings'
    });
  }
};

/**
 * Add file type to allowed list
 */
exports.addFileType = async (req, res) => {
  try {
    const { fileType } = req.body;

    if (!fileType) {
      return res.status(400).json({
        success: false,
        error: 'File type is required'
      });
    }

    const validFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'];
    
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type'
      });
    }

    // settingsService already required above
    // settingsService already required above
    const currentSettings = await settingsService.getSettings();
    
    if (!currentSettings.upload) {
      currentSettings.upload = { allowedFileTypes: [] };
    }
    
    if (!currentSettings.upload.allowedFileTypes) {
      currentSettings.upload.allowedFileTypes = [];
    }

    if (currentSettings.upload.allowedFileTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'File type already exists'
      });
    }

    // Update settings using settingsService
    const updatedSettings = await settingsService.updateSettings({
      upload: {
        ...currentSettings.upload,
        allowedFileTypes: [...currentSettings.upload.allowedFileTypes, fileType]
      }
    }, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'file_type_added',
          metadata: { fileType },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'File type added successfully',
      data: {
        fileType,
        allowedFileTypes: updatedSettings.upload.allowedFileTypes
      }
    });

  } catch (error) {
    console.error('Add file type error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add file type'
    });
  }
};

/**
 * Remove file type from allowed list
 */
exports.removeFileType = async (req, res) => {
  try {
    const { fileType } = req.params;

    if (!fileType) {
      return res.status(400).json({
        success: false,
        error: 'File type is required'
      });
    }

    // settingsService already required above
    // settingsService already required above
    const currentSettings = await settingsService.getSettings();
    
    if (!currentSettings.upload?.allowedFileTypes) {
      return res.status(404).json({
        success: false,
        error: 'File upload settings not found'
      });
    }

    const index = currentSettings.upload.allowedFileTypes.indexOf(fileType);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'File type not found'
      });
    }

    // Update settings using settingsService
    const updatedSettings = await settingsService.updateSettings({
      upload: {
        ...currentSettings.upload,
        allowedFileTypes: currentSettings.upload.allowedFileTypes.filter(type => type !== fileType)
      }
    }, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'file_type_removed',
          metadata: { fileType },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'File type removed successfully',
      data: {
        fileType,
        allowedFileTypes: updatedSettings.upload.allowedFileTypes
      }
    });

  } catch (error) {
    console.error('Remove file type error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove file type'
    });
  }
};