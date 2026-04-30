// Test script to reproduce the login deactivation error
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User');

// Test user credentials from createTestData.js
const testCredentials = [
  {
    email: 'testbrand@influence.com',
    password: 'password123',
    userType: 'brand'
  },
  {
    email: 'testcreator@influence.com', 
    password: 'password123',
    userType: 'creator'
  }
];

async function testLoginIssue() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if users exist
    console.log('\n🔍 Checking for existing test users...');
    for (const creds of testCredentials) {
      const user = await User.findOne({ email: creds.email });
      if (user) {
        console.log(`✅ Found user: ${creds.email}`);
        console.log(`   - isActive: ${user.isActive}`);
        console.log(`   - status: ${user.status}`);
        console.log(`   - isVerified: ${user.isVerified}`);
        console.log(`   - userType: ${user.userType}`);
        console.log(`   - loginAttempts: ${user.loginAttempts || 0}`);
        console.log(`   - lockUntil: ${user.lockUntil || 'none'}`);
      } else {
        console.log(`❌ User not found: ${creds.email}`);
      }
    }

    // Test login process for each user
    console.log('\n🧪 Testing login process...');
    for (const creds of testCredentials) {
      console.log(`\n--- Testing login for: ${creds.email} ---`);
      
      // Find user and include password for comparison (mimicking authController.js)
      const user = await User.findOne({ email: creds.email }).select('+password');
      
      if (!user) {
        console.log('❌ User not found in database');
        continue;
      }

      console.log(`✅ User found, checking isActive: ${user.isActive}`);

      // Check if user is active (this is the check that causes "Account is deactivated")
      if (!user.isActive) {
        console.log('❌ ACCOUNT DEACTIVATED - This is the issue!');
        console.log(`   User isActive: ${user.isActive}`);
        console.log(`   User status: ${user.status}`);
        
        // Fix the issue by activating the user
        console.log('🔧 Fixing: Setting isActive to true...');
        user.isActive = true;
        await user.save();
        console.log('✅ User activated successfully');
      } else {
        console.log('✅ User is active');
      }

      // Test password
      const isPasswordValid = await user.matchPassword(creds.password);
      console.log(`🔐 Password valid: ${isPasswordValid}`);

      if (isPasswordValid) {
        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        console.log('✅ Login attempts reset');
      }
    }

    console.log('\n🎯 Final check - User status after fixes:');
    for (const creds of testCredentials) {
      const user = await User.findOne({ email: creds.email });
      if (user) {
        console.log(`${creds.email}: isActive=${user.isActive}, status=${user.status}`);
      }
    }

    console.log('\n📋 Test Credentials (for manual testing):');
    console.log('==========================================');
    console.log('Brand Login:');
    console.log('  Email: testbrand@influence.com');
    console.log('  Password: password123');
    console.log('');
    console.log('Creator Login:');
    console.log('  Email: testcreator@influence.com');
    console.log('  Password: password123');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testLoginIssue();
}

module.exports = testLoginIssue;
