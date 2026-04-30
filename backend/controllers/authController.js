// controllers/authController.js - COMPLETE PRODUCTION-READY VERSION
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Admin = require('../models/Admin');
const TempOTP = require('../models/TempOTP');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const smsService = require('../services/SMSService');
const { setTwoFASession, getTwoFASession, incrementAttempts, resetAttempts, MAX_ATTEMPTS } = require('../utils/twoFASessionStore');
const { generateTokenPair, generateToken, generateRefreshToken, hashToken } = require('../utils/jwtUtils');
const { isValidEmail, isValidPhone, isValidPassword } = require('../utils/validators');
const { catchAsync } = require('../utils/catchAsync');

// ==================== HELPER FUNCTIONS ====================


/**
 * Normalize user response (remove sensitive fields)
 */
const normalizeUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpire;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpire;
  delete userObj.twoFactorSecret;
  delete userObj.twoFactorBackupCodes;
  delete userObj.twoFactorTempSecret;
  delete userObj.twoFactorTempSecretExpires;
  return userObj;
};

// ==================== REGISTER ====================
exports.register = catchAsync(async (req, res) => {
  // Fix HTML entity encoding for website field
  if (req.body.website) {
    req.body.website = req.body.website.replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
  }
  
  const sanitizedBodyForLog = {
    ...req.body,
    password: req.body?.password ? '***REDACTED***' : undefined,
    captchaToken: req.body?.captchaToken ? '***REDACTED***' : undefined,
  };
  console.log('Register request body:', JSON.stringify(sanitizedBodyForLog));
  const {
    email,
    password,
    fullName,
    userType,
    phone,
    profilePicture,
    coverPicture,
    brandName,
    industry,
    website,
    displayName,
    handle,
    niches,
  } = req.body;

  // Get security settings for dynamic validation
  const Settings = require('../models/Settings');
  const settings = await Settings.getSettings();
  const securitySettings = settings.security || {};

  // Validate required fields
  if (!email || !password || !fullName || !userType) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, full name, and user type are required',
    });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Dynamic password validation based on admin settings
  const passwordMinLength = securitySettings.passwordMinLength || 8;
  const requireUppercase = securitySettings.passwordRequireUppercase ?? true;
  const requireLowercase = securitySettings.passwordRequireLowercase ?? true;
  const requireNumbers = securitySettings.passwordRequireNumbers ?? true;
  const requireSymbols = securitySettings.passwordRequireSymbols ?? false;

  // Build password validation error message dynamically
  const passwordRequirements = [];
  if (password.length < passwordMinLength) {
    passwordRequirements.push(`at least ${passwordMinLength} characters`);
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    passwordRequirements.push('uppercase letter');
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    passwordRequirements.push('lowercase letter');
  }
  if (requireNumbers && !/[0-9]/.test(password)) {
    passwordRequirements.push('number');
  }
  if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    passwordRequirements.push('special character');
  }

  if (passwordRequirements.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Password must contain ${passwordRequirements.join(', ')}`,
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }

  // Get user approval settings
  const userApprovalSettings = settings.userApproval || {};
  
  // Determine user status based on auto-approval settings
  const autoApprove = userType === 'brand' 
    ? userApprovalSettings.autoApproveBrands 
    : userApprovalSettings.autoApproveCreators;

  // Create base user object with common fields
  const userObject = {
    email,
    password,
    fullName,
    userType,
    phone: phone || undefined,
    profilePicture: profilePicture || undefined,
    coverPicture: coverPicture || undefined,
    emailVerified: false, // Will be verified via OTP
    phoneVerified: false,
    status: autoApprove ? 'active' : 'pending',
    isVerified: autoApprove,
    verifiedAt: autoApprove ? new Date() : undefined,
    verificationMethod: autoApprove ? 'automatic' : undefined,
    verificationRequestedAt: autoApprove ? undefined : new Date(),
    createdAt: new Date()
  };

  // Add brand-specific fields if userType is brand
  if (userType === 'brand') {
    userObject.brandName = brandName;
    userObject.industry = industry;
    userObject.website = website;
  }

  // Add creator-specific fields if userType is creator
  if (userType === 'creator') {
    userObject.displayName = displayName;
    userObject.handle = handle;
    userObject.niches = niches;
  }

  // Create user
  const user = new User(userObject);

  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  user.refreshToken = refreshToken;
  await user.save();

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user.email, user.fullName);
  } catch (emailError) {
    console.warn('Welcome email failed:', emailError.message);
  }

  // Notify admins about new user registration
  try {
    const adminNotificationService = require('../services/adminNotificationService');
    await adminNotificationService.notifyNewUser({
      user,
      userType,
      autoApproved: autoApprove
    });
  } catch (notificationError) {
    console.warn('Admin notification failed:', notificationError.message);
  }

  // If not auto-approved, trigger verification process
  if (!autoApprove) {
    try {
      const userVerificationService = require('../services/userVerificationService');
      await userVerificationService.processVerification(user._id, userType);
    } catch (verificationError) {
      console.warn('Verification process failed:', verificationError.message);
    }
  }

  // Set HttpOnly cookies for tokens
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.status(201).json({
    success: true,
    message: autoApprove ? 'Registration successful' : 'Registration successful. Verification pending.',
    user: normalizeUserResponse(user),
    accessToken,
    token: accessToken, // For backward compatibility
    refreshToken, // Keep in response for backward compatibility
    verificationStatus: {
      isVerified: autoApprove,
      requiresVerification: !autoApprove,
      method: autoApprove ? 'automatic' : 'manual'
    }
  });
});

// ==================== LOGIN ====================
exports.login = catchAsync(async (req, res) => {
  const { email, password, userType } = req.body;

  // Get security settings for dynamic enforcement
  const Settings = require('../models/Settings');
  const settings = await Settings.getSettings();
  const securitySettings = settings.security || {};

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Find user and include password for comparison - auto-detect user type
  let user = await User.findOne({ email }).select('+password');
  
  // If not found in User collection, try Brand and Creator collections
  if (!user) {
    const Brand = require('../models/Brand');
    const Creator = require('../models/Creator');
    
    user = await Brand.findOne({ email }).select('+password');
    if (!user) {
      user = await Creator.findOne({ email }).select('+password');
    }
  }

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Check if user is active based on status field
  if (user.status === 'suspended' || user.status === 'deleted') {
    return res.status(401).json({ success: false, error: 'Account is deactivated' });
  }

  // Check account lockout using dynamic settings
  const maxAttempts = securitySettings.maxLoginAttempts || 5;
  const lockoutDuration = (securitySettings.lockoutDuration || 30) * 60 * 1000; // Convert to milliseconds

  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    return res.status(401).json({
      success: false,
      error: `Account locked. Try again in ${minutesLeft} minutes.`
    });
  }

  // Check password
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    // Increment attempts and potentially lock account
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= maxAttempts) {
      user.lockUntil = Date.now() + lockoutDuration;
    }
    
    await user.save();
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  user.refreshToken = refreshToken;
  await user.save();

  // Set HttpOnly cookies for tokens
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.json({
    success: true,
    message: 'Login successful',
    user: normalizeUserResponse(user),
    accessToken,
    token: accessToken, // For backward compatibility
    refreshToken // Keep in response for backward compatibility
  });
});

// ==================== REFRESH TOKEN ====================
exports.refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user with additional safety checks
    let user;
    try {
      user = await User.findById(decoded.id).select('+refreshToken');
    } catch (dbError) {
      console.error('Database error during refresh:', dbError);
      return res.status(500).json({ success: false, error: 'Server error during token refresh' });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Check if user is still active based on status field
    if (user.status === 'suspended' || user.status === 'deleted') {
      return res.status(401).json({ success: false, error: 'Account is deactivated' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(user);

    // Update user with new refresh token
    try {
      user.refreshToken = newRefreshToken;
      await user.save();
    } catch (saveError) {
      console.error('Error saving refresh token:', saveError);
      return res.status(500).json({ success: false, error: 'Failed to update refresh token' });
    }

    // Set HttpOnly cookies for new tokens
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.json({
    success: true,
    accessToken,
    token: accessToken, // For backward compatibility
    refreshToken: newRefreshToken // Keep in response for backward compatibility
  });
  } catch (jwtError) {
    console.error('JWT verification error:', jwtError);
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

  // ==================== LOGOUT ====================
exports.logout = catchAsync(async (req, res) => {
  try {
    // Clear refresh token from user document
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save();
    }
  } catch (error) {
    // Log error but don't fail the logout
    console.error('Logout error:', error);
  }
  
  // Clear HttpOnly cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists or not
    return res.json({ success: true, message: 'Password reset email sent' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  try {
    await emailService.sendPasswordResetEmail(user.email, resetToken);
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send password reset email' 
    });
  }

  res.json({ success: true, message: 'Password reset email sent' });
});

// ==================== RESET PASSWORD ====================
exports.resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Reset token is required' });
  }

  if (!newPassword) {
    return res.status(400).json({ success: false, error: 'New password is required' });
  }

  // Hash token and find user
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ 
      success: false, 
      error: 'Password reset token is invalid or has expired' 
    });
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  // Increment token version to invalidate all sessions
  user.tokenVersion = (user.tokenVersion || 1) + 1;
  await user.save();

  res.json({ success: true, message: 'Password reset successful' });
});

// ==================== VERIFY EMAIL ====================
exports.verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;

  try {
    // Hash token and find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email verification token is invalid or has expired' 
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Email verification failed' });
  }
});

// ==================== CHANGE PASSWORD ====================
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'Current password and new password are required' 
    });
  }

  try {
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    // Clear the stored refresh token to force re‑login on all devices
    user.refreshToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Password change failed' });
  }
});

// ==================== GET ME ====================
exports.getMe = catchAsync(async (req, res) => {
  console.log("Auth header:", req.headers.authorization);
  console.log("Secret length:", process.env.JWT_SECRET?.length);
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
  
  let user = await User.findById(req.user._id).select('-password -refreshToken');

  // If not found in User (maybe admin), check Admin model
  if (!user) {
    const Admin = require('../models/Admin');
    const admin = await Admin.findById(req.user._id).select('-password -twoFactorSecret');
    if (admin) {
      return res.json({
        success: true,
        user: { ...admin.toObject(), userType: 'admin' },
      });
    }
  }

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, user: normalizeUserResponse(user) });
});

// ==================== SEND EMAIL OTP ====================
exports.sendOTP = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    const TempOTP = require('../models/TempOTP');
    const crypto = require('crypto');
    const emailService = require('../services/emailService');

    // Check for existing valid OTP
    const existing = await TempOTP.findOne({ email, expiry: { $gt: new Date() } });
    if (existing) {
      return res.json({ success: true, message: 'OTP already sent, please check your email' });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await TempOTP.create({ 
      email, 
      otp, 
      expiry: new Date(Date.now() + 10 * 60 * 1000) 
    });

    // Send OTP email
    await emailService.sendOTP(email, null, otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ==================== VERIFY EMAIL OTP ====================
exports.verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP are required' });
  }

  try {
    const TempOTP = require('../models/TempOTP');

    const otpRecord = await TempOTP.findOne({
      email,
      otp,
      expiry: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    await TempOTP.deleteOne({ _id: otpRecord._id });

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

// ==================== SEND PHONE OTP ====================
exports.sendPhoneOTP = catchAsync(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  try {
    const TempOTP = require('../models/TempOTP');
    const crypto = require('crypto');
    const smsService = require('../services/SMSService');

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await TempOTP.create({
      email: phone, // using email field as key for phone
      otp,
      expiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send SMS OTP
    const smsResult = await smsService.sendOTP(phone, otp);
    
    if (!smsResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send SMS OTP',
        error: smsResult.error 
      });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send Phone OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ==================== VERIFY PHONE OTP ====================
exports.verifyPhoneOTP = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
  }

  try {
    const TempOTP = require('../models/TempOTP');

    const otpRecord = await TempOTP.findOne({
      email: phone,
      otp,
      expiry: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    await TempOTP.deleteOne({ _id: otpRecord._id });

    // Update user phone verified if logged in
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { phoneVerified: true, phone });
    }

    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error) {
    console.error('Verify Phone OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

module.exports = {
  register: exports.register,
  login: exports.login,
  logout: exports.logout,
  refreshToken: exports.refreshToken,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword,
  verifyEmail: exports.verifyEmail,
  changePassword: exports.changePassword,
  getMe: exports.getMe,
  sendOTP: exports.sendOTP,
  verifyOTP: exports.verifyOTP,
  sendPhoneOTP: exports.sendPhoneOTP,
  verifyPhoneOTP: exports.verifyPhoneOTP
};