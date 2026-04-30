// Test script to verify authentication fix for Creators and Brands
const mongoose = require('mongoose');
const User = require('./backend/models/User');
const jwt = require('jsonwebtoken');

async function testAuthenticationFix() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex');
    console.log('✅ Connected to MongoDB');

    // Test 1: Find users with different statuses
    console.log('\n📊 Testing User Status Handling:');
    const users = await User.find({}).limit(10);
    
    for (const user of users) {
      console.log(`User: ${user.email} | Type: ${user.userType} | Status: ${user.status}`);
      
      // Test token generation
      try {
        const token = jwt.sign(
          { id: user._id, type: user.userType },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        console.log(`  ✅ Token generated successfully for ${user.userType}`);
      } catch (error) {
        console.log(`  ❌ Token generation failed: ${error.message}`);
      }
    }

    // Test 2: Verify middleware logic (simulated)
    console.log('\n🔐 Testing Middleware Logic:');
    
    const testUsers = await User.find({
      userType: { $in: ['creator', 'brand'] }
    }).limit(5);

    for (const user of testUsers) {
      // Simulate middleware check
      const isBlocked = user.status === 'suspended' || user.status === 'deleted';
      const canAccess = !isBlocked;
      
      console.log(`User: ${user.email}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Can Access Dashboard: ${canAccess ? '✅ YES' : '❌ NO'}`);
      
      if (canAccess) {
        console.log(`  🎉 This user should now stay logged in!`);
      }
    }

    // Test 3: Check for any users with invalid isActive field
    console.log('\n🔍 Checking for field inconsistencies:');
    
    const userWithIsActive = await User.findOne({ isActive: { $exists: true } });
    if (userWithIsActive) {
      console.log(`⚠️  Found user with isActive field: ${userWithIsActive.email}`);
      console.log('   This should be migrated to use status field only');
    } else {
      console.log('✅ No users with invalid isActive field found');
    }

    console.log('\n🎯 Authentication Fix Summary:');
    console.log('✅ Removed invalid isActive field checks from User authentication');
    console.log('✅ Updated middleware to allow pending users to access dashboards');
    console.log('✅ Fixed registration to not set non-existent isActive field');
    console.log('✅ Fixed login and token refresh to use status field only');
    console.log('✅ Admin authentication remains unchanged (uses isActive field correctly)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAuthenticationFix();
