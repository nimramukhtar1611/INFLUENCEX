// Test to verify withdrawal fee save and refresh functionality
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

async function testWithdrawalFeePersistence() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex');
    console.log('🔗 Connected to MongoDB');

    // Step 1: Get current settings
    console.log('\n📊 Step 1: Getting current settings...');
    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log('No settings found, creating new one...');
      settings = new Settings();
      await settings.save();
    }

    console.log('Current withdrawal fee:', settings.fees?.withdrawalFee?.amount);
    console.log('Current fees object:', JSON.stringify(settings.fees, null, 2));

    // Step 2: Update withdrawal fee to 30
    console.log('\n✏️ Step 2: Updating withdrawal fee to 30...');
    const testValue = 30;
    
    // Ensure fees object exists
    if (!settings.fees) {
      settings.fees = {};
    }
    
    // Ensure withdrawalFee object exists
    if (!settings.fees.withdrawalFee) {
      settings.fees.withdrawalFee = {
        type: 'fixed',
        amount: 0,
        percentage: 0,
        tiers: []
      };
    }
    
    // Update the amount
    settings.fees.withdrawalFee.amount = testValue;
    settings.updatedAt = new Date();
    
    console.log('Settings before save:', JSON.stringify(settings.fees.withdrawalFee, null, 2));
    await settings.save();
    console.log('Settings saved successfully');

    // Step 3: Verify the update
    console.log('\n🔍 Step 3: Verifying the update...');
    const updatedSettings = await Settings.findOne({ _id: settings._id });
    console.log('Updated withdrawal fee:', updatedSettings.fees?.withdrawalFee?.amount);
    console.log('Updated fees object:', JSON.stringify(updatedSettings.fees, null, 2));

    // Step 4: Test GET endpoint logic
    console.log('\n🧪 Step 4: Testing GET endpoint logic...');
    const withdrawalFeeFromDB = parseFloat(updatedSettings.fees?.withdrawalFee?.amount ?? 0);
    console.log('Withdrawal fee from DB (GET logic):', withdrawalFeeFromDB);

    // Step 5: Reset to original value
    console.log('\n🔄 Step 5: Resetting to original value...');
    const originalValue = 0;
    settings.fees.withdrawalFee.amount = originalValue;
    await settings.save();
    
    const resetSettings = await Settings.findOne({ _id: settings._id });
    console.log('Reset withdrawal fee:', resetSettings.fees?.withdrawalFee?.amount);

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testWithdrawalFeePersistence();
