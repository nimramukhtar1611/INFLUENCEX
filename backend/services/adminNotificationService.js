// services/adminNotificationService.js
const Settings = require('../models/Settings');
const User = require('../models/User');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

class AdminNotificationService {
  /**
   * Send admin notifications for system events
   * @param {string} eventType - Type of event (newUser, newCampaign, etc.)
   * @param {Object} data - Event data
   */
  async notifyAdmins(eventType, data) {
    try {
      const settings = await Settings.getSettings();
      const adminSettings = settings.notifications?.admin;

      if (!adminSettings) {
        console.log('⚠️ Admin notification settings not found');
        return;
      }

      // Get all admin users
      const admins = await User.find({ role: 'admin' }).select('email');
      
      if (!admins || admins.length === 0) {
        console.log('⚠️ No admin users found');
        return;
      }

      // Check if email notifications are enabled for this event type
      if (adminSettings.email?.[eventType]) {
        await this.sendEmailNotifications(admins, eventType, data);
      }

      // Check if in-app notifications are enabled for this event type
      if (adminSettings.inApp?.[eventType]) {
        await this.sendInAppNotifications(admins, eventType, data);
      }

      // Check if push notifications are enabled for this event type
      if (adminSettings.push?.[eventType]) {
        await this.sendPushNotifications(admins, eventType, data);
      }

    } catch (error) {
      console.error('❌ Error sending admin notifications:', error);
    }
  }

  /**
   * Send email notifications to all admins
   */
  async sendEmailNotifications(admins, eventType, data) {
    const emailPromises = admins.map(async (admin) => {
      try {
        switch (eventType) {
          case 'newUser':
            await emailService.sendAdminNewUser(admin.email, data);
            break;
          case 'newCampaign':
            await emailService.sendAdminNewCampaign(admin.email, data);
            break;
          case 'paymentReceived':
            await emailService.sendAdminPaymentReceived(admin.email, data);
            break;
          case 'disputeRaised':
            await emailService.sendAdminDisputeRaised(admin.email, data);
            break;
          case 'reportGenerated':
            await emailService.sendAdminReportGenerated(admin.email, data);
            break;
          case 'systemAlerts':
            await emailService.sendEmail({
              to: admin.email,
              subject: `System Alert - ${data.title || 'InfluenceX'}`,
              html: `<h2>${data.title}</h2><p>${data.message}</p>`
            });
            break;
          case 'maintenance':
            await emailService.sendEmail({
              to: admin.email,
              subject: `Maintenance Notice - InfluenceX`,
              html: `<h2>Maintenance Notice</h2><p>${data.message}</p>`
            });
            break;
          default:
            console.log(`⚠️ Unknown admin notification type: ${eventType}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send email to admin ${admin.email}:`, error);
      }
    });

    await Promise.allSettled(emailPromises);
    console.log(`✅ Sent ${eventType} email notifications to ${admins.length} admins`);
  }

  /**
   * Send in-app notifications to all admins
   */
  async sendInAppNotifications(admins, eventType, data) {
    const titles = {
      newUser: 'New User Registration',
      newCampaign: 'New Campaign Created',
      paymentReceived: 'Payment Received',
      disputeRaised: 'Dispute Raised',
      reportGenerated: 'Report Generated',
      systemAlerts: 'System Alert',
      maintenance: 'Maintenance Notice'
    };

    const messages = {
      newUser: `New user ${data.name || data.email} has registered`,
      newCampaign: `New campaign "${data.title}" has been created`,
      paymentReceived: `Payment of $${data.amount} has been received`,
      disputeRaised: `Dispute has been raised for deal ${data.dealId}`,
      reportGenerated: `New ${data.reportType} report has been generated`,
      systemAlerts: data.message || 'System alert occurred',
      maintenance: data.message || 'Scheduled maintenance'
    };

    const notificationPromises = admins.map(async (admin) => {
      try {
        await notificationService.createNotification(
          admin._id,
          'admin',
          titles[eventType] || 'Admin Notification',
          messages[eventType] || 'Admin notification',
          data,
          { priority: eventType === 'disputeRaised' ? 'high' : 'medium' }
        );
      } catch (error) {
        console.error(`❌ Failed to send in-app notification to admin ${admin._id}:`, error);
      }
    });

    await Promise.allSettled(notificationPromises);
    console.log(`✅ Sent ${eventType} in-app notifications to ${admins.length} admins`);
  }

  /**
   * Send push notifications to all admins
   */
  async sendPushNotifications(admins, eventType, data) {
    const titles = {
      newUser: 'New User Registration',
      newCampaign: 'New Campaign Created',
      paymentReceived: 'Payment Received',
      disputeRaised: 'Dispute Raised',
      reportGenerated: 'Report Generated',
      systemAlerts: 'System Alert',
      maintenance: 'Maintenance Notice'
    };

    const messages = {
      newUser: `New user ${data.name || data.email} has registered`,
      newCampaign: `New campaign "${data.title}" has been created`,
      paymentReceived: `Payment of $${data.amount} has been received`,
      disputeRaised: `Dispute has been raised for deal ${data.dealId}`,
      reportGenerated: `New ${data.reportType} report has been generated`,
      systemAlerts: data.message || 'System alert occurred',
      maintenance: data.message || 'Scheduled maintenance'
    };

    const pushPromises = admins.map(async (admin) => {
      try {
        await notificationService.sendPushNotification(admin._id, {
          title: titles[eventType] || 'Admin Notification',
          message: messages[eventType] || 'Admin notification',
          data
        });
      } catch (error) {
        console.error(`❌ Failed to send push notification to admin ${admin._id}:`, error);
      }
    });

    await Promise.allSettled(pushPromises);
    console.log(`✅ Sent ${eventType} push notifications to ${admins.length} admins`);
  }

  // Convenience methods for specific events
  async notifyNewUser(userData) {
    await this.notifyAdmins('newUser', {
      name: userData.fullName || userData.name,
      email: userData.email,
      userType: userData.userType || 'user',
      registeredAt: new Date().toLocaleString()
    });
  }

  async notifyNewCampaign(campaignData) {
    await this.notifyAdmins('newCampaign', {
      title: campaignData.title,
      brandName: campaignData.brandName,
      budget: campaignData.budget,
      createdAt: new Date().toLocaleString()
    });
  }

  async notifyPaymentReceived(paymentData) {
    await this.notifyAdmins('paymentReceived', {
      amount: paymentData.amount,
      from: paymentData.from,
      to: paymentData.to,
      transactionId: paymentData.transactionId,
      date: new Date().toLocaleString()
    });
  }

  async notifyDisputeRaised(disputeData) {
    await this.notifyAdmins('disputeRaised', {
      dealId: disputeData.dealId,
      raisedBy: disputeData.raisedBy,
      reason: disputeData.reason,
      priority: disputeData.priority || 'Medium',
      date: new Date().toLocaleString()
    });
  }

  async notifyReportGenerated(reportData) {
    await this.notifyAdmins('reportGenerated', {
      reportType: reportData.type,
      period: reportData.period,
      generatedBy: reportData.generatedBy,
      date: new Date().toLocaleString()
    });
  }

  async notifySystemAlert(alertData) {
    await this.notifyAdmins('systemAlerts', {
      title: alertData.title,
      message: alertData.message,
      severity: alertData.severity || 'medium'
    });
  }

  async notifyMaintenance(maintenanceData) {
    await this.notifyAdmins('maintenance', {
      title: 'Maintenance Notice',
      message: maintenanceData.message,
      startTime: maintenanceData.startTime,
      endTime: maintenanceData.endTime
    });
  }
}

module.exports = new AdminNotificationService();
