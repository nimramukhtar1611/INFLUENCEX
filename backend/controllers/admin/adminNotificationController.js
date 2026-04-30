// controllers/admin/adminNotificationController.js
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const emailService = require('../../services/emailService');
const asyncHandler = require('express-async-handler');

// @route   GET /api/admin/notifications/settings
// @access  Private/Admin
const getAdminNotificationSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  
  const adminSettings = settings.notifications?.admin || {
    email: {
      newUser: true,
      newCampaign: true,
      paymentReceived: true,
      disputeRaised: true,
      reportGenerated: true,
      systemAlerts: true,
      maintenance: true
    },
    push: {
      newUser: true,
      newCampaign: true,
      paymentReceived: true,
      disputeRaised: true,
      reportGenerated: true,
      systemAlerts: true,
      maintenance: false
    },
    inApp: {
      newUser: true,
      newCampaign: true,
      paymentReceived: true,
      disputeRaised: true,
      reportGenerated: true,
      systemAlerts: true,
      maintenance: true
    }
  };

  res.json({
    success: true,
    settings: adminSettings
  });
});

// @route   PUT /api/admin/notifications/settings
// @access  Private/Admin
const updateAdminNotificationSettings = asyncHandler(async (req, res) => {
  const { email, push, inApp } = req.body;
  
  const settings = await Settings.getSettings();
  
  // Initialize admin notifications if not exists
  if (!settings.notifications) settings.notifications = {};
  if (!settings.notifications.admin) settings.notifications.admin = {};
  
  // Update settings
  if (email) {
    settings.notifications.admin.email = {
      ...settings.notifications.admin.email,
      ...email
    };
  }
  
  if (push) {
    settings.notifications.admin.push = {
      ...settings.notifications.admin.push,
      ...push
    };
  }
  
  if (inApp) {
    settings.notifications.admin.inApp = {
      ...settings.notifications.admin.inApp,
      ...inApp
    };
  }
  
  await settings.save();
  
  res.json({
    success: true,
    message: 'Admin notification settings updated',
    settings: settings.notifications.admin
  });
});

// @route   POST /api/admin/notifications/test
// @access  Private/Admin
const testAdminNotification = asyncHandler(async (req, res) => {
  const { type, email } = req.body;
  
  if (!type || !email) {
    res.status(400);
    throw new Error('Type and email are required');
  }
  
  const testData = {
    name: 'Test Admin',
    email: 'admin@example.com',
    userType: 'Admin',
    registeredAt: new Date().toLocaleString(),
    title: 'Test Campaign',
    brandName: 'Test Brand',
    budget: '1000',
    amount: '500',
    from: 'Test User',
    to: 'Test Creator',
    transactionId: 'TEST_123',
    dealId: 'DEAL_123',
    raisedBy: 'Test User',
    reason: 'Test dispute reason',
    priority: 'Medium',
    reportType: 'Revenue Report',
    period: 'Monthly',
    generatedBy: 'Admin',
    date: new Date().toLocaleString()
  };
  
  let result;
  
  switch (type) {
    case 'newUser':
      result = await emailService.sendAdminNewUser(email, testData);
      break;
    case 'newCampaign':
      result = await emailService.sendAdminNewCampaign(email, testData);
      break;
    case 'paymentReceived':
      result = await emailService.sendAdminPaymentReceived(email, testData);
      break;
    case 'disputeRaised':
      result = await emailService.sendAdminDisputeRaised(email, testData);
      break;
    case 'reportGenerated':
      result = await emailService.sendAdminReportGenerated(email, testData);
      break;
    default:
      res.status(400);
      throw new Error('Invalid notification type');
  }
  
  res.json({
    success: true,
    message: 'Test notification sent',
    result
  });
});

// @route   GET /api/admin/notifications/stats
// @access  Private/Admin
const getNotificationStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalAdmins = await User.countDocuments({ role: 'admin' });
  const totalCreators = await User.countDocuments({ userType: 'creator' });
  const totalBrands = await User.countDocuments({ userType: 'brand' });
  
  const stats = {
    totalUsers,
    totalAdmins,
    totalCreators,
    totalBrands,
    settings: await Settings.getSettings()
  };
  
  res.json({
    success: true,
    stats
  });
});

module.exports = {
  getAdminNotificationSettings,
  updateAdminNotificationSettings,
  testAdminNotification,
  getNotificationStats
};
