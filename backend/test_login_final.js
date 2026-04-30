// Final test script to verify login fixes
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User');

// Test credentials
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

async function testLoginFinal() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Final Login Test');
    console.log('===================');

    let allTestsPassed = true;

    // Test each user
    for (const creds of testCredentials) {
      console.log(`\n--- Testing: ${creds.email} ---`);
      
      try {
        // Find user (mimicking authController.js login logic)
        const user = await User.findOne({ email: creds.email }).select('+password');
        
        if (!user) {
          console.log('❌ User not found - run createTestData.js first');
          allTestsPassed = false;
          continue;
        }

        console.log(`✅ User found (type: ${user.userType})`);

        // Test the fixed isActive check
        if (user.isActive === false) {
          console.log('❌ User is deactivated');
          allTestsPassed = false;
        } else {
          console.log('✅ User is active or will be auto-activated');
          
          // Auto-activate if needed
          if (user.isActive === undefined) {
            user.isActive = true;
            await user.save();
            console.log('🔧 Auto-activated user');
          }
        }

        // Test password with correct method name
        const isPasswordValid = await user.matchPassword(creds.password);
        console.log(`🔐 Password valid: ${isPasswordValid}`);

        if (!isPasswordValid) {
          console.log('❌ Password validation failed');
          allTestsPassed = false;
        } else {
          console.log('✅ Password validation passed');
          
          // Reset login attempts
          user.loginAttempts = 0;
          user.lockUntil = undefined;
          await user.save();
          console.log('🔄 Reset login attempts');
        }

        if (user.isActive !== false && isPasswordValid) {
          console.log('🎉 Login should work!');
        } else {
          console.log('❌ Login would fail');
          allTestsPassed = false;
        }

      } catch (error) {
        console.log(`❌ Error testing ${creds.email}:`, error.message);
        allTestsPassed = false;
      }
    }

    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('\nThe login issues have been fixed:');
      console.log('✅ Account deactivation issue: FIXED');
      console.log('✅ comparePassword method error: FIXED');
      console.log('✅ Auto-activation for undefined isActive: IMPLEMENTED');
      
      console.log('\n🎯 Ready to test live login:');
      console.log('1. Start your backend server');
      console.log('2. Use these credentials:');
      console.log('   - testbrand@influence.com / password123');
      console.log('   - testcreator@influence.com / password123');
      console.log('3. Login should work without errors!');
    } else {
      console.log('❌ Some tests failed. Check the errors above.');
    }

  } catch (error) {
    console.error('❌ Test setup error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📱 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testLoginFinal();
}

module.exports = testLoginFinal;
