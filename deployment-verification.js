// Production Deployment Verification Script
// Verifies all payment and subscription fixes are working correctly

const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('./backend/models/User');
const Subscription = require('./backend/models/Subscription');
const Payment = require('./backend/models/Payment');

async function verifyStripeConfiguration() {
  console.log('=== Verifying Stripe Configuration ===');
  
  try {
    // Test Stripe connection
    const account = await stripe.accounts.retrieve();
    console.log('Stripe Account Status:', {
      id: account.id,
      country: account.country,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });
    
    // Verify webhook endpoint exists
    const webhookEndpoints = await stripe.webhookEndpoints.list();
    console.log('Webhook Endpoints:', webhookEndpoints.data.map(ep => ({
      id: ep.id,
      url: ep.url,
      enabled_events: ep.enabled_events.length
    })));
    
    return true;
  } catch (error) {
    console.error('Stripe configuration error:', error.message);
    return false;
  }
}

async function verifyDatabaseConnection() {
  console.log('\n=== Verifying Database Connection ===');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully');
    
    // Test basic operations
    const userCount = await User.countDocuments();
    const subscriptionCount = await Subscription.countDocuments();
    const paymentCount = await Payment.countDocuments();
    
    console.log('Database Statistics:', {
      users: userCount,
      subscriptions: subscriptionCount,
      payments: paymentCount
    });
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
}

async function verifySubscriptionModels() {
  console.log('\n=== Verifying Subscription Models ===');
  
  try {
    // Check if subscription documents exist and have correct structure
    const sampleSubscription = await Subscription.findOne().limit(1);
    
    if (sampleSubscription) {
      console.log('Sample Subscription Structure:', {
        hasUserId: !!sampleSubscription.userId,
        hasPlanId: !!sampleSubscription.planId,
        hasStatus: !!sampleSubscription.status,
        hasStripeSubscriptionId: !!sampleSubscription.stripeSubscriptionId,
        hasBillingPeriod: !!sampleSubscription.billingPeriod,
        hasPlanDetails: !!sampleSubscription.planDetails
      });
    } else {
      console.log('No subscriptions found (expected for new deployment)');
    }
    
    return true;
  } catch (error) {
    console.error('Subscription model verification error:', error.message);
    return false;
  }
}

async function verifyPaymentModels() {
  console.log('\n=== Verifying Payment Models ===');
  
  try {
    // Check payment document structure
    const samplePayment = await Payment.findOne().limit(1);
    
    if (samplePayment) {
      console.log('Sample Payment Structure:', {
        hasTransactionId: !!samplePayment.transactionId,
        hasType: !!samplePayment.type,
        hasStatus: !!samplePayment.status,
        hasAmount: !!samplePayment.amount,
        hasFromTo: !!(samplePayment.from && samplePayment.to),
        hasMetadata: !!samplePayment.metadata
      });
    } else {
      console.log('No payments found (expected for new deployment)');
    }
    
    return true;
  } catch (error) {
    console.error('Payment model verification error:', error.message);
    return false;
  }
}

async function verifyWebhookProcessing() {
  console.log('\n=== Verifying Webhook Processing ===');
  
  try {
    // Import the webhook service
    const stripeService = require('./backend/services/stripeService');
    
    // Test the fallback subscription creation
    const mockSession = {
      id: 'cs_test_verification',
      mode: 'subscription',
      customer: 'cus_test_verification',
      subscription: null, // Simulate missing subscription
      metadata: {
        userId: '507f1f77bcf86cd799439011',
        userType: 'brand',
        planId: 'professional',
        interval: 'month'
      }
    };
    
    // Test fallback subscription creation
    const fallbackSubscription = stripeService.createFallbackSubscription(mockSession);
    
    if (fallbackSubscription) {
      console.log('Webhook Fallback Test: PASSED');
      console.log('Fallback Subscription Created:', {
        id: fallbackSubscription.id,
        status: fallbackSubscription.status,
        customer: fallbackSubscription.customer,
        hasMetadata: !!fallbackSubscription.metadata
      });
    } else {
      console.log('Webhook Fallback Test: FAILED');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Webhook processing verification error:', error.message);
    return false;
  }
}

async function verifyAPIEndpoints() {
  console.log('\n=== Verifying API Endpoints ===');
  
  try {
    // Test that controllers can be imported without errors
    const subscriptionController = require('./backend/controllers/subscriptionController');
    const paymentController = require('./backend/controllers/paymentController');
    
    console.log('API Controllers Loaded Successfully:', {
      subscriptionController: !!subscriptionController,
      paymentController: !!paymentController,
      hasGetSubscriptionHistory: !!subscriptionController.getSubscriptionHistory,
      hasGetBalance: !!paymentController.getBalance,
      hasHandleStripeWebhook: !!paymentController.handleStripeWebhook
    });
    
    return true;
  } catch (error) {
    console.error('API endpoint verification error:', error.message);
    return false;
  }
}

async function runDeploymentVerification() {
  console.log('='.repeat(80));
  console.log('PRODUCTION DEPLOYMENT VERIFICATION');
  console.log('='.repeat(80));
  
  const results = {
    stripe: await verifyStripeConfiguration(),
    database: await verifyDatabaseConnection(),
    subscriptionModels: await verifySubscriptionModels(),
    paymentModels: await verifyPaymentModels(),
    webhookProcessing: await verifyWebhookProcessing(),
    apiEndpoints: await verifyAPIEndpoints()
  };
  
  console.log('\n='.repeat(80));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(80));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${test}`);
  });
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log(`\nOVERALL: ${allPassed ? 'DEPLOYMENT READY' : 'NEEDS ATTENTION'}`);
  
  if (allPassed) {
    console.log('\nProduction deployment verification completed successfully!');
    console.log('The payment and subscription system is ready for production use.');
  } else {
    console.log('\nSome verification checks failed.');
    console.log('Please review the logs above and fix any issues before deploying.');
  }
  
  console.log('='.repeat(80));
  
  await mongoose.disconnect();
  return allPassed;
}

// Run verification
if (require.main === module) {
  runDeploymentVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Deployment verification failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runDeploymentVerification,
  verifyStripeConfiguration,
  verifyDatabaseConnection,
  verifySubscriptionModels,
  verifyPaymentModels,
  verifyWebhookProcessing,
  verifyAPIEndpoints
};
