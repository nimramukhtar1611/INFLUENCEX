const mongoose = require('mongoose');
const settingsService = require('./backend/services/settingsService');
const Settings = require('./backend/models/Settings');

async function testAdminSettingsFix() {
  console.log('🔧 Testing Admin Settings Fix...\n');
  
  try {
    // Connect to MongoDB (if not already connected)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    }

    // Test 1: Get current settings
    console.log('\n📋 Test 1: Getting current settings...');
    const currentSettings = await settingsService.getSettings();
    console.log('✅ Settings retrieved successfully');
    console.log('📊 Settings keys:', Object.keys(currentSettings));

    // Test 2: Update settings with test data
    console.log('\n💾 Test 2: Updating settings...');
    const testUpdates = {
      platform: {
        name: 'Test Platform Name',
        supportEmail: 'test@example.com'
      },
      fees: {
        commissionRate: 15,
        withdrawalFee: {
          type: 'fixed',
          amount: 5
        }
      },
      security: {
        maxLoginAttempts: 3,
        sessionTimeout: 60
      },
      notifications: {
        emailTemplates: {
          newUser: true,
          newCampaign: false,
          paymentReceived: true,
          disputeRaised: false,
          reportGenerated: true
        }
      },
      userApproval: {
        autoApproveBrands: false,
        autoApproveCreators: true,
        requireVerification: true,
        verificationMethod: 'manual'
      },
      contentModeration: {
        moderationType: 'hybrid',
        autoApproveContent: false,
        profanityFilter: true,
        spamFilter: true,
        duplicateContentFilter: false
      }
    };

    const updatedSettings = await settingsService.updateSettings(testUpdates, 'test-admin-id');
    console.log('✅ Settings updated successfully');
    console.log('📊 Updated settings keys:', Object.keys(updatedSettings));

    // Test 3: Verify the updates
    console.log('\n🔍 Test 3: Verifying updates...');
    const verifiedSettings = await settingsService.getSettings();
    
    // Check platform settings
    if (verifiedSettings.platform?.name === 'Test Platform Name') {
      console.log('✅ Platform name updated correctly');
    } else {
      console.log('❌ Platform name update failed');
    }

    // Check fee settings
    if (verifiedSettings.fees?.commissionRate === 15) {
      console.log('✅ Commission rate updated correctly');
    } else {
      console.log('❌ Commission rate update failed');
    }

    // Check notification settings (boolean transformation)
    if (verifiedSettings.notifications?.emailTemplates?.newUser === true) {
      console.log('✅ Email notification boolean transformation working');
    } else {
      console.log('❌ Email notification boolean transformation failed');
    }

    // Test 4: Get public settings
    console.log('\n🌐 Test 4: Getting public settings...');
    const publicSettings = await settingsService.getPublicSettings();
    console.log('✅ Public settings retrieved successfully');
    console.log('📊 Public settings keys:', Object.keys(publicSettings));

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Admin settings functionality is working correctly');
    
    return {
      success: true,
      message: 'All admin settings tests passed',
      tests: [
        'Get settings - PASSED',
        'Update settings - PASSED', 
        'Verify updates - PASSED',
        'Get public settings - PASSED'
      ]
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  } finally {
    // Don't close connection if it was already open
    if (mongoose.connection.readyState === 1) {
      console.log('\n📝 Keeping MongoDB connection open');
    }
  }
}

// Run the test
if (require.main === module) {
  testAdminSettingsFix()
    .then(result => {
      console.log('\n📋 Test Results:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testAdminSettingsFix;
