const cron = require('node-cron');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running notification jobs...');
  
  try {
    // Check for upcoming deadlines (24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingDeals = await Deal.find({
      deadline: { $lte: tomorrow, $gt: new Date() },
      status: { $in: ['accepted', 'in-progress'] }
    }).populate('creatorId brandId campaignId');

    for (const deal of upcomingDeals) {
      // Notify creator
      await Notification.create({
        userId: deal.creatorId._id,
        type: 'deal',
        title: 'Deal Deadline Reminder',
        message: `Your deal "${deal.campaignId?.title || 'Untitled Deal'}" deadline is approaching (${deal.deadline.toLocaleDateString()})`,
        data: { 
          dealId: deal._id,
          campaignId: deal.campaignId?._id,
          brandId: deal.brandId._id,
          url: `/creator/deals/${deal._id}`
        }
      });

      // Send email
      await sendEmail({
        email: deal.creatorId.email,
        subject: 'Deal Deadline Reminder - InfluenceX',
        html: `<p>Your deal "${deal.campaignId?.title || 'Untitled Deal'}" deadline is approaching on ${deal.deadline.toLocaleDateString()}. Please submit your deliverables soon.</p>`
      });

      // Notify brand
      await Notification.create({
        userId: deal.brandId._id,
        type: 'deal',
        title: 'Deal Deadline Reminder',
        message: `Deal "${deal.campaignId?.title || 'Untitled Deal'}" deadline is approaching`,
        data: { 
          dealId: deal._id,
          campaignId: deal.campaignId?._id,
          creatorId: deal.creatorId._id,
          url: `/brand/deals/${deal._id}`
        }
      });
    }

    // Create hourly deal activity notifications
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentDeals = await Deal.find({
      updatedAt: { $gte: oneHourAgo },
      status: { $in: ['accepted', 'in-progress', 'negotiating'] }
    }).populate('creatorId brandId campaignId');

    for (const deal of recentDeals) {
      // Notify creator about deal updates
      await Notification.create({
        userId: deal.creatorId._id,
        type: 'deal',
        title: 'Deal Activity Update',
        message: `There's new activity on your deal "${deal.campaignId?.title || 'Untitled Deal'}"`,
        data: { 
          dealId: deal._id,
          campaignId: deal.campaignId?._id,
          brandId: deal.brandId._id,
          url: `/creator/deals/${deal._id}`
        }
      });

      // Notify brand about deal updates
      await Notification.create({
        userId: deal.brandId._id,
        type: 'deal',
        title: 'Deal Activity Update',
        message: `There's new activity on deal "${deal.campaignId?.title || 'Untitled Deal'}"`,
        data: { 
          dealId: deal._id,
          campaignId: deal.campaignId?._id,
          creatorId: deal.creatorId._id,
          url: `/brand/deals/${deal._id}`
        }
      });
    }

    console.log(`Sent ${upcomingDeals.length * 2} deadline reminders and ${recentDeals.length * 2} deal activity notifications`);
  } catch (error) {
    console.error('Error in notification jobs:', error);
  }
});

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily cleanup jobs...');
  
  try {
    // Clean up old notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('Error in cleanup jobs:', error);
  }
});

module.exports = { runNotificationJobs: () => console.log('Notification jobs scheduled') };