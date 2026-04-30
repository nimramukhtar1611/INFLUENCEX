// services/subscriptionService.js - COMPLETE SUBSCRIPTION MANAGEMENT
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const stripe = require('../config/stripe');
const mongoose = require('mongoose');
const { catchAsync } = require('../utils/catchAsync');

class SubscriptionService {
  constructor() {
    this.plans = {
      free: {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: {
          campaigns: 2,
          deals: 5,
          aiCredits: 0,
          creatorSearch: true,
          analytics: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false
        }
      },
      starter: {
        id: 'starter',
        name: 'Starter',
        price: 49,
        interval: 'month',
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
        features: {
          campaigns: 10,
          deals: 25,
          aiCredits: 50,
          creatorSearch: true,
          analytics: true,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false
        }
      },
      professional: {
        id: 'professional',
        name: 'Professional',
        price: 149,
        interval: 'month',
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        features: {
          campaigns: 50,
          deals: 200,
          aiCredits: 500,
          creatorSearch: true,
          analytics: true,
          prioritySupport: true,
          customBranding: false,
          apiAccess: true
        }
      },
      enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 499,
        interval: 'month',
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        features: {
          campaigns: Infinity,
          deals: Infinity,
          aiCredits: Infinity,
          creatorSearch: true,
          analytics: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true
        }
      }
    };
  }

  // Get user's current subscription plan
  async getUserSubscription(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing'] }
    }).populate('planId');

    if (!subscription) {
      return {
        plan: this.plans.free,
        status: 'inactive',
        subscription: null
      };
    }

    const plan = this.plans[subscription.planId] || this.plans.free;
    return {
      plan,
      status: subscription.status,
      subscription,
      usage: await this.getUsageStats(userId)
    };
  }

  // Get usage statistics for a user
  async getUsageStats(userId) {
    const [campaigns, deals, aiCredits] = await Promise.all([
      Campaign.countDocuments({ createdBy: userId }),
      Deal.countDocuments({ $or: [{ brandId: userId }, { creatorId: userId }] }),
      // AI credits would be tracked separately in a usage collection
      this.getAiCreditUsage(userId)
    ]);

    return {
      campaigns,
      deals,
      aiCredits
    };
  }

  // Get AI credit usage (placeholder - would need actual tracking)
  async getAiCreditUsage(userId) {
    // This would typically query a usage tracking collection
    return 0;
  }

  // Check if user can perform an action based on their plan
  async canPerformAction(userId, action, count = 1) {
    const { plan, usage } = await this.getUserSubscription(userId);
    
    switch (action) {
      case 'create_campaign':
        return usage.campaigns + count <= plan.features.campaigns;
      case 'create_deal':
        return usage.deals + count <= plan.features.deals;
      case 'use_ai':
        return usage.aiCredits + count <= plan.features.aiCredits;
      case 'access_analytics':
        return plan.features.analytics;
      case 'access_priority_support':
        return plan.features.prioritySupport;
      case 'access_api':
        return plan.features.apiAccess;
      case 'use_custom_branding':
        return plan.features.customBranding;
      default:
        return true;
    }
  }

  // Enforce plan limits and throw error if exceeded
  async enforceLimits(userId, action, count = 1) {
    const canPerform = await this.canPerformAction(userId, action, count);
    
    if (!canPerform) {
      const { plan } = await this.getUserSubscription(userId);
      const feature = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      throw new Error(
        `Your ${plan.name} plan limit has been reached for ${feature}. ` +
        `Upgrade to unlock more features.`
      );
    }
  }

  // Create Stripe checkout session for subscription upgrade
  async createSubscriptionCheckout(userId, planId) {
    const plan = this.plans[planId];
    if (!plan || plan.id === 'free') {
      throw new Error('Invalid plan selected');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user._id.toString() }
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: plan.stripePriceId,
        quantity: 1
      }],
      success_url: `${process.env.FRONTEND_URL}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/subscription?canceled=true`,
      metadata: {
        userId: userId.toString(),
        planId: planId
      }
    });

    return session;
  }

  // Handle Stripe webhook for subscription events
  async handleSubscriptionWebhook(event) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.updateSubscriptionFromStripe(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscription(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleSuccessfulPayment(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleFailedPayment(event.data.object);
        break;
    }
  }

  // Update subscription from Stripe data
  async updateSubscriptionFromStripe(stripeSubscription) {
    const userId = stripeSubscription.metadata.userId;
    const planId = stripeSubscription.metadata.planId;

    if (!userId || !planId) {
      console.error('Missing metadata in subscription webhook');
      return;
    }

    await Subscription.findOneAndUpdate(
      { userId },
      {
        userId,
        planId,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      },
      { upsert: true, new: true }
    );

    // Send notification
    const notificationService = require('./notificationService');
    await notificationService.createNotification(
      userId,
      'subscription_update',
      'Subscription Updated',
      `Your ${this.plans[planId].name} subscription has been updated`,
      { planId, status: stripeSubscription.status }
    );
  }

  // Cancel subscription
  async cancelSubscription(stripeSubscription) {
    const userId = stripeSubscription.metadata.userId;
    
    await Subscription.findOneAndUpdate(
      { userId },
      {
        status: 'canceled',
        canceledAt: new Date()
      }
    );

    // Send notification
    const notificationService = require('./notificationService');
    await notificationService.createNotification(
      userId,
      'subscription_canceled',
      'Subscription Canceled',
      'Your subscription has been canceled. You will continue to have access until the end of your billing period.',
      { canceledAt: new Date() }
    );
  }

  // Handle successful payment
  async handleSuccessfulPayment(invoice) {
    const subscriptionId = invoice.subscription;
    const userId = invoice.customer_metadata?.userId;

    if (userId) {
      // Reset usage counters for new billing period
      await this.resetUsageCounters(userId);
      
      // Send notification
      const notificationService = require('./notificationService');
      await notificationService.createNotification(
        userId,
        'payment_successful',
        'Payment Successful',
        `Your payment of $${(invoice.amount_paid / 100).toFixed(2)} has been processed successfully`,
        { amount: invoice.amount_paid, invoiceId: invoice.id }
      );
    }
  }

  // Handle failed payment
  async handleFailedPayment(invoice) {
    const userId = invoice.customer_metadata?.userId;

    if (userId) {
      // Send notification
      const notificationService = require('./notificationService');
      await notificationService.createNotification(
        userId,
        'payment_failed',
        'Payment Failed',
        'We were unable to process your payment. Please update your payment method to avoid service interruption.',
        { invoiceId: invoice.id, attemptCount: invoice.attempt_count }
      );
    }
  }

  // Reset usage counters for new billing period
  async resetUsageCounter(userId) {
    // This would typically reset counters in a usage tracking collection
    // For now, we'll just log it
    console.log(`Reset usage counters for user ${userId}`);
  }

  // Get available plans for frontend
  getAvailablePlans() {
    return Object.values(this.plans).map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      features: plan.features,
      stripePriceId: plan.stripePriceId
    }));
  }

  // Upgrade/downgrade subscription
  async changeSubscription(userId, newPlanId) {
    const currentSub = await this.getUserSubscription(userId);
    const newPlan = this.plans[newPlanId];

    if (!newPlan) {
      throw new Error('Invalid plan selected');
    }

    if (currentSub.plan.id === newPlanId) {
      throw new Error('You are already on this plan');
    }

    // If downgrading, check if user exceeds new plan limits
    if (newPlan.price < currentSub.plan.price) {
      const { usage } = currentSub;
      
      if (usage.campaigns > newPlan.features.campaigns) {
        throw new Error(
          `You have ${usage.campaigns} campaigns but the ${newPlan.name} plan only allows ${newPlan.features.campaigns}. ` +
          `Please delete some campaigns before downgrading.`
        );
      }
      
      if (usage.deals > newPlan.features.deals) {
        throw new Error(
          `You have ${usage.deals} deals but the ${newPlan.name} plan only allows ${newPlan.features.deals}. ` +
          `Please close some deals before downgrading.`
        );
      }
    }

    // Create checkout session for plan change
    return await this.createSubscriptionCheckout(userId, newPlanId);
  }

  // Cancel subscription at period end
  async cancelSubscriptionAtPeriodEnd(userId) {
    const subscription = await Subscription.findOne({ userId, status: 'active' });
    
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // Update local record
    await Subscription.findByIdAndUpdate(subscription._id, {
      cancelAtPeriodEnd: true
    });

    // Send notification
    const notificationService = require('./notificationService');
    await notificationService.createNotification(
      userId,
      'subscription_cancellation_scheduled',
      'Subscription Cancellation Scheduled',
      'Your subscription will be canceled at the end of your current billing period.',
      { cancelAtPeriodEnd: true }
    );
  }
}

module.exports = new SubscriptionService();
