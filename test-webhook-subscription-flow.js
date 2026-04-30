// Test script to verify webhook subscription flow
const mongoose = require('mongoose');
const stripeService = require('./backend/services/stripeService');
const User = require('./backend/models/User');
const Subscription = require('./backend/models/Subscription');
const Plan = require('./backend/models/Plan');

// Mock webhook events for testing
const mockCheckoutSessionCompleted = {
  id: 'cs_test_1234567890',
  mode: 'subscription',
  customer: 'cus_test_customer_123',
  subscription: 'sub_test_subscription_123',
  payment_intent: 'pi_test_payment_123',
  amount_total: 49900, // $499.00
  currency: 'usd',
  metadata: {
    userId: '507f1f77bcf86cd799439011', // Mock user ID
    userType: 'brand',
    planId: 'professional',
    interval: 'month'
  }
};

const mockSubscriptionCreated = {
  id: 'sub_test_subscription_123',
  customer: 'cus_test_customer_123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
  current_period_end: Math.floor(Date.now() / 1000) + (30 * 86400), // 30 days from now
  cancel_at_period_end: false,
  metadata: {
    userId: '507f1f77bcf86cd799439011',
    userType: 'brand',
    planId: 'professional',
    interval: 'month'
  },
  items: {
    data: [{
      price: {
        id: 'price_1TF9GzCki01r58Eloq9NjC02',
        recurring: {
          interval: 'month'
        }
      }
    }]
  }
};

async function testWebhookFlow() {
  console.log('='.repeat(80));
  console.log('TESTING WEBHOOK SUBSCRIPTION FLOW');
  console.log('='.repeat(80));

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex_test');
    console.log('Connected to database');

    // Create test user if doesn't exist
    let testUser = await User.findById('507f1f77bcf86cd799439011');
    if (!testUser) {
      testUser = await User.create({
        _id: '507f1f77bcf86cd799439011',
        email: 'testbrand@example.com',
        password: 'password123',
        userType: 'brand',
        fullName: 'Test Brand',
        stripeCustomerId: 'cus_test_customer_123'
      });
      console.log('Created test user:', testUser.email);
    } else {
      console.log('Found existing test user:', testUser.email);
    }

    // Test 1: Process checkout.session.completed
    console.log('\n--- Test 1: Processing checkout.session.completed ---');
    await stripeService.handleCheckoutSessionCompleted(mockCheckoutSessionCompleted);

    // Test 2: Process customer.subscription.created
    console.log('\n--- Test 2: Processing customer.subscription.created ---');
    await stripeService.handleSubscriptionCreated(mockSubscriptionCreated);

    // Test 3: Check if subscription was created
    console.log('\n--- Test 3: Verifying subscription creation ---');
    const subscription = await Subscription.findOne({ userId: testUser._id });
    if (subscription) {
      console.log('SUCCESS: Subscription found in database');
      console.log('Subscription details:', {
        id: subscription._id,
        planId: subscription.planId,
        status: subscription.status,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        billingPeriod: {
          start: subscription.billingPeriod.start,
          end: subscription.billingPeriod.end
        }
      });
    } else {
      console.log('FAILED: No subscription found in database');
    }

    // Test 4: Check user subscription status
    console.log('\n--- Test 4: Checking user subscription status ---');
    const updatedUser = await User.findById(testUser._id);
    console.log('User subscription info:', updatedUser.subscription);

    // Test 5: Simulate subscription history API call
    console.log('\n--- Test 5: Testing subscription history API simulation ---');
    const subscriptions = await Subscription.find({ userId: testUser._id })
      .populate('planId')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${subscriptions.length} subscriptions for user`);
    subscriptions.forEach(sub => {
      console.log(`- ${sub.planId?.name || sub.planId} (${sub.status})`);
    });

    console.log('\n='.repeat(80));
    console.log('WEBHOOK TEST COMPLETED');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

// Test webhook event handler directly
async function testWebhookEventHandler() {
  console.log('\n--- Testing Webhook Event Handler ---');
  
  const mockEvent = {
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: mockCheckoutSessionCompleted
    }
  };

  try {
    await stripeService.handleWebhookEvent(mockEvent);
    console.log('Webhook event processed successfully');
  } catch (error) {
    console.error('Webhook event processing failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('Starting webhook subscription flow tests...');
  testWebhookFlow()
    .then(() => testWebhookEventHandler())
    .then(() => {
      console.log('All tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testWebhookFlow,
  testWebhookEventHandler,
  mockCheckoutSessionCompleted,
  mockSubscriptionCreated
};
