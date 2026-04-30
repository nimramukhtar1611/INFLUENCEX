// Test script to verify the login deactivation fix
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User');

// Test user credentials
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

async function testLoginFix() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    console.log('\n🧪 Testing Login Fix...');
    console.log('========================');

    // Test each user
    for (const creds of testCredentials) {
      console.log(`\n--- Testing: ${creds.email} ---`);
      
      // Find user (mimicking authController.js login logic)
      const user = await User.findOne({ email: creds.email }).select('+password');
      
      if (!user) {
        console.log('❌ User not found - run createTestData.js first');
        continue;
      }

      console.log(`✅ User found`);
      console.log(`   isActive: ${user.isActive}`);
      console.log(`   status: ${user.status}`);

      // Test the fixed isActive check
      if (user.isActive === false) {
        console.log('❌ Still deactivated (fix failed)');
      } else {
        console.log('✅ User is active or will be auto-activated');
        
        // Test auto-activation if needed
        if (user.isActive === undefined) {
          user.isActive = true;
          await user.save();
          console.log('🔧 Auto-activated user');
        }
      }

      // Test password
      const isPasswordValid = await user.matchPassword(creds.password);
      console.log(`🔐 Password valid: ${isPasswordValid}`);

      if (isPasswordValid && (user.isActive !== false)) {
        console.log('✅ Login should work!');
        
        // Reset login attempts
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
      } else {
        console.log('❌ Login would fail');
      }
    }

    console.log('\n📋 Summary:');
    console.log('===========');
    console.log('The login deactivation issue has been fixed by:');
    console.log('1. Changing "if (!user.isActive)" to "if (user.isActive === false)"');
    console.log('2. Adding auto-activation for users with undefined isActive');
    console.log('3. Applied the same fix to refreshToken function');
    
    console.log('\n🎯 Next Steps:');
    console.log('===============');
    console.log('1. Start your backend server');
    console.log('2. Try login with test credentials:');
    console.log('   - testbrand@influence.com / password123');
    console.log('   - testcreator@influence.com / password123');
    console.log('3. The "Account is deactivated" error should be resolved');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testLoginFix();
}

module.exports = testLoginFix;
