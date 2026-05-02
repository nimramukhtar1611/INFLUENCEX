// INFLUENCEX/backend/test-deposit-webhook.js
const mongoose = require('mongoose');
const path = require('path');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: path.join(__dirname, '.env') });

const stripeService = require('./services/stripeService');
const Payment = require('./models/Payment');
const User = require('./models/User');

async function runTest() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is missing from .env');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const userId = '69de56b3bd8342bbb19ffe49';
    const user = await User.findById(userId);

    if (!user) {
      console.error('❌ User 69de56b3bd8342bbb19ffe49 not found in database!');
      const anyUser = await User.findOne();
      if (anyUser) {
        console.log(`💡 Found a different user instead: ${anyUser._id} (${anyUser.email})`);
        console.log('Please update the userId in this script to a valid one from your DB.');
      }
      return;
    }

    console.log(`👤 Found User: ${user.email} (${user.userType})`);
    console.log(`💳 Current Stripe Customer ID in DB: ${user.stripeCustomerId || 'NONE'}`);

    // Mock the session object from your Stripe log
    const mockSession = {
      id: "cs_test_a1cPEo3gu8IueWeBuR0PxuocUK1BzBfL4aniXrAjOxd2wjhbHH23TTlFMs",
      object: "checkout.session",
      mode: "payment",
      status: "complete",
      customer: "cus_ULBJ5jWJXL9hnJ", 
      amount_total: 100000, // $1000.00
      currency: "usd",
      metadata: {
        amount: "1000",
        ownerUserId: userId,
        purpose: "wallet_topup",
        userId: userId,
        userType: "brand"
      },
      payment_status: "paid"
    };

    console.log('\n🚀 Simulating checkout.session.completed...');
    
    // Check if a payment already exists for this session
    const existing = await Payment.findOne({ 'metadata.checkoutSessionId': mockSession.id });
    if (existing) {
      console.log('⚠️ A payment already exists for this session ID. Deleting it for the test...');
      await Payment.deleteOne({ _id: existing._id });
    }

    // Call the handler directly
    await stripeService.handleCheckoutSessionCompleted(mockSession);

    console.log('\n🧐 Verification:');
    const newPayment = await Payment.findOne({ 'metadata.checkoutSessionId': mockSession.id });
    
    if (newPayment) {
      console.log('✅ Success! Payment record created:');
      console.log(`   - ID: ${newPayment._id}`);
      console.log(`   - Amount: $${newPayment.amount}`);
      console.log(`   - Type: ${newPayment.type}`);
      console.log(`   - Kind: ${newPayment.metadata?.kind}`);
      console.log(`   - From: ${newPayment.from.userId}`);
      console.log(`   - To: ${newPayment.to.userId}`);
      
      // Verify if it will show up in balance
      console.log('\n💰 Balance Calculation Check:');
      console.log(`   - type === 'payment': ${newPayment.type === 'payment' ? '✅' : '❌'}`);
      console.log(`   - metadata.kind === 'deposit': ${newPayment.metadata?.kind === 'deposit' ? '✅' : '❌'}`);
      console.log(`   - status === 'completed': ${newPayment.status === 'completed' ? '✅' : '❌'}`);
    } else {
      console.error('❌ Failure! No payment record was created.');
      console.log('💡 This usually means "resolveUserFromStripeContext" failed to find the user.');
    }

    await mongoose.disconnect();
    console.log('\n👋 Done');
  } catch (error) {
    console.error('💥 Test Error:', error);
    process.exit(1);
  }
}

runTest();
