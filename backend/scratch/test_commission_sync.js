const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const feeService = require('../services/feeService');
const settingsService = require('../services/settingsService');
const Settings = require('../models/Settings');

async function testSync() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // 1. Initial fetch
    console.log('\n--- Round 1: Initial Fetch ---');
    let fees = await feeService.getFees();
    console.log('Current Commission Rate:', fees.commissionRate);

    // 2. Update via database directly (simulating what controller does)
    console.log('\n--- Round 2: Update Database ---');
    const newRate = (fees.commissionRate === 10) ? 15 : 10;
    console.log('Updating to new rate:', newRate);
    
    await Settings.updateOne({}, { $set: { 'fees.commissionRate': newRate } });
    console.log('Database updated.');

    // 3. Fetch again WITHOUT clearing cache (should be old value)
    console.log('\n--- Round 3: Fetch without clearing cache ---');
    fees = await feeService.getFees();
    console.log('Commission Rate (cached):', fees.commissionRate);
    if (fees.commissionRate !== newRate) {
      console.log('✅ Correct: Cache is still active.');
    } else {
      console.log('❌ Unexpected: Cache was not active.');
    }

    // 4. Clear caches and fetch again (should be new value)
    console.log('\n--- Round 4: Clear both caches and fetch ---');
    settingsService.clearCache();
    feeService.clearCache();
    fees = await feeService.getFees();
    console.log('Commission Rate (after clear):', fees.commissionRate);
    if (fees.commissionRate === newRate) {
      console.log('✅ Success: Cache invalidation works!');
    } else {
      console.log('❌ Failure: Cache invalidation did not work!');
    }

    // Reset to original (optional)
    // await Settings.updateOne({}, { $set: { 'fees.commissionRate': 10 } });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testSync();
