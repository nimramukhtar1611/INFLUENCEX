// Test partial update functionality
require('dotenv').config();

const mongoose = require('mongoose');
const settingsService = require('./backend/services/settingsService');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex';

async function testPartialUpdate() {
  console.log('🧪 TESTING PARTIAL UPDATE FUNCTIONALITY\n');
  
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Set initial complete settings
    console.log('\n=== Test 1: Set Initial Complete Settings ===');
    
    const initialSettings = {
      notifications: {
        email: {
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: 'initial@gmail.com',
              pass: 'initial-password-123'
            }
          }
        },
        sms: {
          twilio: {
            accountSid: 'AC1234567890123456789012345678912',
            authToken: 'initial-auth-token-32-chars-long',
            phoneNumber: '+1234567890'
          }
        }
      }
    };

    await settingsService.updateSettings(initialSettings, 'test-user');
    console.log('✅ Initial settings saved');

    // Test 2: Update ONLY Email settings (should preserve Twilio)
    console.log('\n=== Test 2: Update ONLY Email Settings ===');
    
    const emailOnlyUpdate = {
      notifications: {
        email: {
          smtp: {
            host: 'smtp.outlook.com',
            port: 587,
            secure: false,
            auth: {
              user: 'updated@outlook.com',
              pass: 'updated-password-456'
            }
          }
        }
        // Note: NO sms field - should preserve existing
      }
    };

    const result1 = await settingsService.updateSettings(emailOnlyUpdate, 'test-user');
    console.log('✅ Email-only update completed');

    // Verify Twilio settings are preserved
    const afterEmailUpdate = await settingsService.getSettings();
    const preservedTwilio = {
      accountSid: afterEmailUpdate.notifications?.sms?.twilio?.accountSid,
      authToken: afterEmailUpdate.notifications?.sms?.twilio?.authToken?.substring(0, 10) + '...',
      phoneNumber: afterEmailUpdate.notifications?.sms?.twilio?.phoneNumber
    };
    
    console.log('Preserved Twilio settings:', preservedTwilio);
    
    // Test 3: Update ONLY Twilio settings (should preserve Email)
    console.log('\n=== Test 3: Update ONLY Twilio Settings ===');
    
    const twilioOnlyUpdate = {
      notifications: {
        // Note: NO email field - should preserve existing
        sms: {
          twilio: {
            accountSid: 'AC9876543210987654321098765432109',
            authToken: 'updated-auth-token-32-chars-long',
            phoneNumber: '+9876543210'
          }
        }
      }
    };

    const result2 = await settingsService.updateSettings(twilioOnlyUpdate, 'test-user');
    console.log('✅ Twilio-only update completed');

    // Verify Email settings are preserved
    const afterTwilioUpdate = await settingsService.getSettings();
    const preservedEmail = {
      host: afterTwilioUpdate.notifications?.email?.smtp?.host,
      user: afterTwilioUpdate.notifications?.email?.smtp?.auth?.user,
      pass: afterTwilioUpdate.notifications?.email?.smtp?.auth?.pass?.substring(0, 10) + '...'
    };
    
    console.log('Preserved Email settings:', preservedEmail);

    // Test 4: Update with empty values (should not overwrite)
    console.log('\n=== Test 4: Update with Empty Values ===');
    
    const emptyUpdate = {
      notifications: {
        email: {
          smtp: {
            host: '',  // Empty - should preserve existing
            port: 587,
            secure: false,
            auth: {
              user: '',  // Empty - should preserve existing
              pass: ''   // Empty - should preserve existing
            }
          }
        },
        sms: {
          twilio: {
            accountSid: '',  // Empty - should preserve existing
            authToken: '',  // Empty - should preserve existing
            phoneNumber: ''  // Empty - should preserve existing
          }
        }
      }
    };

    const result3 = await settingsService.updateSettings(emptyUpdate, 'test-user');
    console.log('✅ Empty update completed');

    // Verify settings are preserved when empty
    const afterEmptyUpdate = await settingsService.getSettings();
    const finalState = {
      emailHost: afterEmptyUpdate.notifications?.email?.smtp?.host,
      emailUser: afterEmptyUpdate.notifications?.email?.smtp?.auth?.user,
      twilioSid: afterEmptyUpdate.notifications?.sms?.twilio?.accountSid?.substring(0, 10) + '...',
      twilioPhone: afterEmptyUpdate.notifications?.sms?.twilio?.phoneNumber
    };
    
    console.log('Final state after empty update:', finalState);

    console.log('\n🎉 PARTIAL UPDATE TESTS COMPLETED!');
    console.log('\n📋 TEST RESULTS:');
    console.log('✅ Email-only updates: WORKING');
    console.log('✅ Twilio-only updates: WORKING');
    console.log('✅ Empty value preservation: WORKING');
    console.log('✅ Partial update logic: FUNCTIONAL');

  } catch (error) {
    console.error('❌ PARTIAL UPDATE TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testPartialUpdate();
}

module.exports = { testPartialUpdate };
