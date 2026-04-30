// Direct test of webhook subscription creation without Stripe dependencies
const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Subscription = require('./backend/models/Subscription');
const Plan = require('./backend/models/Plan');

async function testDirectSubscriptionCreation() {
  console.log('='.repeat(80));
  console.log('TESTING DIRECT SUBSCRIPTION CREATION');
  console.log('='.repeat(80));

  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://jabbarpriv_db_user:6HOFN9XqAwlcJicA@cluster0.ppkaqgb.mongodb.net/?appName=Cluster0');
    console.log('Connected to production database');

    // Find a real user to test with
    const testUser = await User.findOne({ userType: 'brand' }).limit(1);
    if (!testUser) {
      console.log('No brand user found. Creating test user...');
      const newUser = await User.create({
        email: 'testbrand@influencex.com',
        password: 'password123',
        userType: 'brand',
        fullName: 'Test Brand Account',
        stripeCustomerId: 'cus_test_' + Date.now()
      });
      console.log('Created test user:', newUser.email);
      testUser = newUser;
    }

    console.log('Using test user:', {
      id: testUser._id,
      email: testUser.email,
      userType: testUser.userType,
      stripeCustomerId: testUser.stripeCustomerId
    });

    // Check existing subscriptions
    const existingSubs = await Subscription.find({ userId: testUser._id });
    console.log(`User currently has ${existingSubs.length} subscriptions`);

    // Create a professional plan subscription directly
    const subscriptionData = {
      userId: testUser._id,
      planId: 'professional',
      status: 'active',
      stripeCustomerId: testUser.stripeCustomerId,
      stripeSubscriptionId: 'sub_test_' + Date.now(),
      stripePriceId: 'price_1TF9GzCki01r58Eloq9NjC02',
      planDetails: {
        name: 'Professional',
        price: 149,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        features: ['Advanced Analytics', 'Priority Support', 'Unlimited Campaigns'],
        limits: {
          campaigns: -1,
          activeDeals: 30,
          teamMembers: 5,
          storage: 1000,
          apiCalls: 10000,
          analytics: true,
          api_access: true,
          priority_support: true
        }
      },
      billingPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      cancelAtPeriodEnd: false
    };

    console.log('Creating subscription with data:', {
      userId: subscriptionData.userId,
      planId: subscriptionData.planId,
      status: subscriptionData.status,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId
    });

    const newSubscription = await Subscription.create(subscriptionData);
    console.log('SUCCESS: Subscription created!');
    console.log('Subscription details:', {
      id: newSubscription._id,
      planId: newSubscription.planId,
      status: newSubscription.status,
      stripeSubscriptionId: newSubscription.stripeSubscriptionId,
      billingPeriod: {
        start: newSubscription.billingPeriod.start,
        end: newSubscription.billingPeriod.end
      }
    });

    // Update user subscription status
    await User.findByIdAndUpdate(testUser._id, {
      'subscription.status': 'active',
      'subscription.currentPeriodStart': newSubscription.billingPeriod.start,
      'subscription.currentPeriodEnd': newSubscription.billingPeriod.end,
      'subscription.planId': 'professional'
    });

    console.log('User subscription status updated');

    // Test the subscription history API response
    const subscriptions = await Subscription.find({ userId: testUser._id })
      .populate('planId')
      .sort({ createdAt: -1 });

    console.log('\n=== SUBSCRIPTION HISTORY API RESPONSE ===');
    console.log(`Found ${subscriptions.length} subscriptions:`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`);
      console.log(`- ID: ${sub._id}`);
      console.log(`- Plan: ${sub.planId?.name || sub.planId} (${sub.planId})`);
      console.log(`- Status: ${sub.status}`);
      console.log(`- Stripe ID: ${sub.stripeSubscriptionId}`);
      console.log(`- Billing Period: ${sub.billingPeriod.start.toISOString()} to ${sub.billingPeriod.end.toISOString()}`);
      console.log(`- Price: $${sub.planDetails?.price || 0}/${sub.planDetails?.interval || 'month'}`);
      console.log('');
    });

    // Test what the frontend would receive
    console.log('=== FRONTEND API RESPONSE SIMULATION ===');
    const apiResponse = {
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        planId: sub.planId,
        status: sub.status,
        planDetails: sub.planDetails,
        billingPeriod: sub.billingPeriod,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      })),
      invoices: [], // Would be populated from Stripe
      pagination: {
        page: 1,
        limit: 10,
        total: subscriptions.length,
        pages: Math.ceil(subscriptions.length / 10)
      }
    };

    console.log('Frontend would receive:', JSON.stringify(apiResponse, null, 2));

    console.log('\n='.repeat(80));
    console.log('DIRECT SUBSCRIPTION TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

// Test the subscription history endpoint directly
async function testSubscriptionHistoryAPI() {
  console.log('\n=== TESTING SUBSCRIPTION HISTORY API ===');
  
  try {
    await mongoose.connect('mongodb+srv://jabbarpriv_db_user:6HOFN9XqAwlcJicA@cluster0.ppkaqgb.mongodb.net/?appName=Cluster0');
    
    // Find a brand user
    const testUser = await User.findOne({ userType: 'brand' }).limit(1);
    if (!testUser) {
      console.log('No brand user found for API test');
      return;
    }

    console.log(`Testing subscription history for user: ${testUser.email}`);

    // Simulate the getSubscriptionHistory controller logic
    const subscriptions = await Subscription.find({ userId: testUser._id })
      .populate('planId')
      .sort({ createdAt: -1 })
      .limit(10)
      .skip(0);

    const total = await Subscription.countDocuments({ userId: testUser._id });

    console.log(`API Response Simulation:`);
    console.log({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        planId: sub.planId,
        status: sub.status,
        planDetails: sub.planDetails,
        billingPeriod: sub.billingPeriod,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        createdAt: sub.createdAt
      })),
      invoices: [], // Would be populated from Stripe
      pagination: {
        page: 1,
        limit: 10,
        total,
        pages: Math.ceil(total / 10)
      }
    });

  } catch (error) {
    console.error('API test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run tests
if (require.main === module) {
  testDirectSubscriptionCreation()
    .then(() => testSubscriptionHistoryAPI())
    .then(() => {
      console.log('\nAll tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testDirectSubscriptionCreation,
  testSubscriptionHistoryAPI
};
