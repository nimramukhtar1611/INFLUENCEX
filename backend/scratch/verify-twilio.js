const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const smsService = require('../services/SMSService');
const TempOTP = require('../models/TempOTP');

async function verifyTwilioAndOTP() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Initializing SMS Service...');
    await smsService.initialize();
    
    // 1. Basic Configuration Check
    if (!smsService.isConfigured()) {
      console.error('❌ Twilio is NOT configured. Check your .env or Admin Settings.');
      process.exit(1);
    }
    console.log('✅ Twilio Client Initialized.');

    // 2. Account Balance Check (Proof of credentials)
    const balanceInfo = await smsService.checkBalance();
    if (balanceInfo.success) {
      console.log(`✅ Twilio Account is Active. Balance: ${balanceInfo.balance} ${balanceInfo.currency}`);
    } else {
      console.error('❌ Twilio Balance Check Failed:', balanceInfo.error);
    }

    // 3. OTP Simulation Test
    console.log('\n--- Simulating OTP Flow ---');
    const testPhone = process.env.TEST_PHONE || '+1234567890'; // Use a real number in .env to test actual delivery
    const testOTP = '123456';

    console.log(`Generating OTP for: ${testPhone}`);
    
    // Test if we can save to TempOTP collection
    await TempOTP.deleteMany({ email: testPhone }); // Clear old tests
    await TempOTP.create({
      email: testPhone,
      otp: testOTP,
      expiry: new Date(Date.now() + 10 * 60 * 1000)
    });
    console.log('✅ OTP successfully saved to Database.');

    // Test the SMS sending logic
    console.log('Attempting to send OTP via Twilio...');
    const smsResult = await smsService.sendOTP(testPhone, testOTP);

    if (smsResult.success) {
      console.log('✅ Twilio accepted the OTP request!');
      if (smsResult.message === 'SMS logged (development mode)') {
        console.log('⚠️  Note: App is in DEVELOPMENT mode, so the SMS was only logged to console, not actually sent.');
      } else {
        console.log(`🚀 SMS SENT! SID: ${smsResult.messageId}`);
      }
    } else {
      console.error('❌ Twilio failed to send OTP:', smsResult.error);
    }

    await mongoose.disconnect();
    console.log('\nVerification complete.');
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyTwilioAndOTP();
