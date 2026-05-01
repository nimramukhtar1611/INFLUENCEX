const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const smsService = require('../services/SMSService');

async function verifyTwilio() {
  try {
    console.log('Connecting to MongoDB to fetch settings...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Initializing SMS Service...');
    await smsService.initialize();
    
    if (!smsService.isConfigured()) {
      console.error('❌ Twilio is NOT configured. Check your .env or Admin Settings.');
      console.log('Current Status:', smsService.getStatus());
      process.exit(1);
    }
    
    console.log('✅ Twilio Client Initialized.');
    console.log('Checking Account Balance...');
    
    const balanceInfo = await smsService.checkBalance();
    
    if (balanceInfo.success) {
      console.log('✅ Twilio is WORKING!');
      console.log(`Balance: ${balanceInfo.balance} ${balanceInfo.currency}`);
    } else {
      console.error('❌ Twilio Balance Check Failed:', balanceInfo.error);
      if (balanceInfo.error.includes('Authenticate')) {
        console.error('👉 Hint: Your Account SID or Auth Token is incorrect.');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyTwilio();
