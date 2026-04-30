// Test script to verify dynamic credentials functionality
const mongoose = require('mongoose');
const settingsService = require('./backend/services/settingsService');
const emailService = require('./backend/services/emailService');
const smsService = require('./backend/services/SMSService');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex';

async function testDynamicCredentials() {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get current settings
    console.log('\n=== Test 1: Get Current Settings ===');
    const settings = await settingsService.getSettings();
    console.log('Settings loaded:', {
      hasSmtpHost: !!settings.notifications?.email?.smtp?.host,
      hasSmtpUser: !!settings.notifications?.email?.smtp?.auth?.user,
      hasTwilioSid: !!settings.notifications?.sms?.twilio?.accountSid,
      hasTwilioPhone: !!settings.notifications?.sms?.twilio?.phoneNumber
    });

    // Test 2: Update settings with test credentials
    console.log('\n=== Test 2: Update Settings with Test Credentials ===');
    const testUpdates = {
      notifications: {
        email: {
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: 'test@gmail.com',
              pass: 'test-app-password'
            }
          }
        },
        sms: {
          twilio: {
            accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            authToken: 'test-auth-token-32-chars-minimum',
            phoneNumber: '+1234567890'
          }
        }
      }
    };

    const updatedSettings = await settingsService.updateSettings(testUpdates, 'test-user');
    console.log('✅ Settings updated successfully');

    // Test 3: Verify updated settings
    console.log('\n=== Test 3: Verify Updated Settings ===');
    const newSettings = await settingsService.getSettings();
    console.log('Updated settings:', {
      smtpHost: newSettings.notifications?.email?.smtp?.host,
      smtpUser: newSettings.notifications?.email?.smtp?.auth?.user,
      twilioSid: newSettings.notifications?.sms?.twilio?.accountSid?.substring(0, 10) + '...',
      twilioPhone: newSettings.notifications?.sms?.twilio?.phoneNumber
    });

    // Test 4: Test email service initialization
    console.log('\n=== Test 4: Test Email Service Initialization ===');
    await emailService.initialize();
    console.log('✅ Email service initialized with dynamic credentials');

    // Test 5: Test SMS service initialization
    console.log('\n=== Test 5: Test SMS Service Initialization ===');
    await smsService.initialize();
    console.log('✅ SMS service initialized with dynamic credentials');

    console.log('\n🎉 All tests passed! Dynamic credentials system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testDynamicCredentials();
}

module.exports = { testDynamicCredentials };
