// Debug script to investigate withdrawalFee persistence issue
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

async function debugWithdrawalFee() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex');
    console.log('🔗 Connected to MongoDB');

    // 1. Check if settings document exists
    const settings = await Settings.findOne();
    console.log('📄 Settings document exists:', !!settings);
    
    if (settings) {
      console.log('🆔 Settings ID:', settings._id);
      console.log('📅 Settings updatedAt:', settings.updatedAt);
      console.log('💰 Withdrawal Fee Structure:', JSON.stringify(settings.fees?.withdrawalFee, null, 2));
      console.log('💸 Withdrawal Fee Amount:', settings.fees?.withdrawalFee?.amount);
      console.log('🏷️ Withdrawal Fee Type:', settings.fees?.withdrawalFee?.type);
      
      // Check all fee-related fields
      console.log('\n📊 All Fee Fields:');
      console.log('Commission Rate:', settings.fees?.commissionRate);
      console.log('Escrow Fee:', settings.fees?.escrowFee);
      console.log('Withdrawal Fee Amount:', settings.fees?.withdrawalFee?.amount);
      console.log('Withdrawal Fee Type:', settings.fees?.withdrawalFee?.type);
      console.log('Featured Listing Fee Base:', settings.fees?.featuredListingFee?.base);
      console.log('Tax Rate:', settings.fees?.taxRate);
      console.log('Min Payout Amount:', settings.payments?.minPayoutAmount);
    }

    // 2. Check if there are multiple settings documents (shouldn't happen)
    const allSettings = await Settings.find({});
    console.log('\n🔢 Total settings documents:', allSettings.length);
    
    if (allSettings.length > 1) {
      console.log('⚠️ Multiple settings documents found:');
      allSettings.forEach((doc, index) => {
        console.log(`  ${index + 1}. ID: ${doc._id}, Withdrawal Fee: ${doc.fees?.withdrawalFee?.amount}`);
      });
    }

    // 3. Test a manual update
    console.log('\n🧪 Testing manual update...');
    if (settings) {
      const testValue = 15.75;
      settings.fees.withdrawalFee.amount = testValue;
      await settings.save();
      
      // Verify the update
      const updated = await Settings.findOne({ _id: settings._id });
      console.log('✅ Updated withdrawal fee to:', updated.fees?.withdrawalFee?.amount);
      
      // Reset to original value
      settings.fees.withdrawalFee.amount = 0;
      await settings.save();
      console.log('🔄 Reset withdrawal fee to:', settings.fees?.withdrawalFee?.amount);
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug function
debugWithdrawalFee();
