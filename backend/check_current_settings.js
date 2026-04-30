const mongoose = require('mongoose');
const Settings = require('./models/Settings');

async function checkCurrentSettings() {
  try {
    await mongoose.connect('mongodb://localhost:27017/influencex');
    console.log('Connected to MongoDB');
    
    const settings = await Settings.findOne();
    if (settings) {
      console.log('=== CURRENT SETTINGS IN DATABASE ===');
      console.log('Commission Rate (%):', settings.fees?.commissionRate || 'Not set');
      console.log('Withdrawal Fee ($):', settings.fees?.withdrawalFee?.amount || 'Not set');
      console.log('Escrow Fee (%):', settings.fees?.escrowFee || 'Not set');
      console.log('Featured Listing Fee ($):', settings.fees?.featuredListingFee?.base || 'Not set');
      console.log('Tax Rate (%):', settings.fees?.taxRate || 'Not set');
      console.log('Min Payout Amount ($):', settings.payments?.minPayoutAmount || 'Not set');
      console.log('Min Creator Payout ($):', settings.payments?.minPayoutAmount || 'Not set');
      console.log('Min Brand Escrow ($):', settings.fees?.escrowFee || 'Not set');
      console.log('=====================================');
    } else {
      console.log('No settings found in database');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCurrentSettings();
