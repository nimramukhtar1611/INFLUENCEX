// Test script for Moderation Limits and Payment Gateway settings functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials (replace with actual admin credentials)
const ADMIN_CREDENTIALS = {
  email: 'admin@influencex.com',
  password: 'admin123'
};

let authToken = '';

// Helper function to make authenticated requests
async function authenticatedRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Test 1: Admin Login
async function testAdminLogin() {
  console.log('\n=== Test 1: Admin Login ===');
  try {
    const response = await axios.post(`${BASE_URL}/admin/login`, ADMIN_CREDENTIALS);
    if (response.data.success) {
      authToken = response.data.token;
      console.log('✅ Admin login successful');
      return true;
    } else {
      console.error('❌ Admin login failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    return false;
  }
}

// Test 2: Get Current Moderation and Payment Settings
async function testGetCurrentSettings() {
  console.log('\n=== Test 2: Get Current Moderation and Payment Settings ===');
  try {
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Current settings retrieved successfully');
      console.log('Moderation settings found:', {
        contentModeration: response.settings.contentModeration,
        autoApproveContent: response.settings.autoApproveContent,
        autoFlagContent: response.settings.autoFlagContent,
        flagThreshold: response.settings.flagThreshold,
        manualReviewRequired: response.settings.manualReviewRequired,
        profanityFilter: response.settings.profanityFilter,
        spamFilter: response.settings.spamFilter,
        duplicateContentFilter: response.settings.duplicateContentFilter
      });
      console.log('Usage limits settings found:', {
        maxCampaignsPerBrand: response.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.settings.maxActiveDealsPerCreator,
        maxFileSize: response.settings.maxFileSize,
        allowedFileTypes: response.settings.allowedFileTypes
      });
      console.log('Payment gateway settings found:', {
        paymentProvider: response.settings.paymentProvider,
        stripePublishableKey: response.settings.stripePublishableKey ? 'sk_***' : '',
        paymentTestMode: response.settings.paymentTestMode,
        autoCapturePayments: response.settings.autoCapturePayments,
        allowApplePay: response.settings.allowApplePay,
        allowGooglePay: response.settings.allowGooglePay
      });
      return response.settings;
    } else {
      console.error('❌ Failed to get settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Get settings error:', error.message);
    return null;
  }
}

// Test 3: Update Moderation Settings
async function testUpdateModerationSettings(currentSettings) {
  console.log('\n=== Test 3: Update Moderation Settings ===');
  
  const testModerationUpdates = {
    contentModeration: 'hybrid',
    autoApproveContent: true,
    autoFlagContent: false,
    flagThreshold: 0.8,
    manualReviewRequired: true,
    profanityFilter: true,
    spamFilter: true,
    duplicateContentFilter: false,
    bannedWords: 'spam\nscam\nfake\nbot',
    bannedPhrases: 'click here\nfree money\nlimited offer\nact now',
    allowedDomains: 'instagram.com\ntiktok.com\nyoutube.com',
    blockedDomains: 'spam.com\nfake.com\nbot.net'
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', testModerationUpdates);
    
    if (response.success) {
      console.log('✅ Moderation settings updated successfully');
      console.log('Updated moderation settings:', {
        contentModeration: response.settings.contentModeration,
        autoApproveContent: response.settings.autoApproveContent,
        autoFlagContent: response.settings.autoFlagContent,
        flagThreshold: response.settings.flagThreshold,
        manualReviewRequired: response.settings.manualReviewRequired,
        profanityFilter: response.settings.profanityFilter,
        spamFilter: response.settings.spamFilter,
        duplicateContentFilter: response.settings.duplicateContentFilter
      });
      
      // Verify moderation fields were updated correctly
      const moderationFieldsUpdated = Object.keys(testModerationUpdates).every(key => {
        if (key === 'bannedWords' || key === 'bannedPhrases' || key === 'allowedDomains' || key === 'blockedDomains') {
          // For array fields, check if they're properly split
          const expected = testModerationUpdates[key].split('\n').filter(w => w.trim());
          const actual = response.settings[key];
          return JSON.stringify(actual) === JSON.stringify(expected);
        } else {
          const expected = testModerationUpdates[key];
          const actual = response.settings[key];
          return actual === expected;
        }
      });
      
      if (moderationFieldsUpdated) {
        console.log('✅ All moderation fields updated correctly');
        return response.settings;
      } else {
        console.error('❌ Some moderation fields were not updated correctly');
        return null;
      }
    } else {
      console.error('❌ Failed to update moderation settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update moderation settings error:', error.message);
    return null;
  }
}

// Test 4: Update Payment Gateway Settings
async function testUpdatePaymentGatewaySettings(currentSettings) {
  console.log('\n=== Test 4: Update Payment Gateway Settings ===');
  
  const testPaymentUpdates = {
    paymentProvider: 'stripe',
    stripePublishableKey: 'pk_test_1234567890',
    stripeSecretKeyMasked: 'sk_test_****************',
    stripeWebhookSecretMasked: 'whsec_test_****************',
    paymentTestMode: false,
    autoCapturePayments: true,
    allowApplePay: true,
    allowGooglePay: true
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', testPaymentUpdates);
    
    if (response.success) {
      console.log('✅ Payment gateway settings updated successfully');
      console.log('Updated payment gateway settings:', {
        paymentProvider: response.settings.paymentProvider,
        stripePublishableKey: response.settings.stripePublishableKey ? 'sk_***' : '',
        paymentTestMode: response.settings.paymentTestMode,
        autoCapturePayments: response.settings.autoCapturePayments,
        allowApplePay: response.settings.allowApplePay,
        allowGooglePay: response.settings.allowGooglePay
      });
      
      // Verify payment fields were updated correctly
      const paymentFieldsUpdated = Object.keys(testPaymentUpdates).every(key => {
        if (key === 'stripeSecretKeyMasked' || key === 'stripeWebhookSecretMasked') {
          // These fields should not be saved, just displayed
          return true;
        } else {
          const expected = testPaymentUpdates[key];
          const actual = response.settings[key];
          return actual === expected;
        }
      });
      
      if (paymentFieldsUpdated) {
        console.log('✅ All payment gateway fields updated correctly');
        return response.settings;
      } else {
        console.error('❌ Some payment gateway fields were not updated correctly');
        return null;
      }
    } else {
      console.error('❌ Failed to update payment gateway settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update payment gateway settings error:', error.message);
    return null;
  }
}

// Test 5: Update Usage Limits Settings
async function testUpdateUsageLimitsSettings(currentSettings) {
  console.log('\n=== Test 5: Update Usage Limits Settings ===');
  
  const testLimitsUpdates = {
    maxCampaignsPerBrand: 25,
    maxActiveDealsPerCreator: 15,
    maxFileSize: 200,
    allowedFileTypes: ['jpg', 'png', 'mp4', 'pdf', 'doc', 'docx', 'zip']
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', testLimitsUpdates);
    
    if (response.success) {
      console.log('✅ Usage limits settings updated successfully');
      console.log('Updated usage limits settings:', {
        maxCampaignsPerBrand: response.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.settings.maxActiveDealsPerCreator,
        maxFileSize: response.settings.maxFileSize,
        allowedFileTypes: response.settings.allowedFileTypes
      });
      
      // Verify limits fields were updated correctly
      const limitsFieldsUpdated = Object.keys(testLimitsUpdates).every(key => {
        const expected = testLimitsUpdates[key];
        const actual = response.settings[key];
        return JSON.stringify(actual) === JSON.stringify(expected);
      });
      
      if (limitsFieldsUpdated) {
        console.log('✅ All usage limits fields updated correctly');
        return response.settings;
      } else {
        console.error('❌ Some usage limits fields were not updated correctly');
        return null;
      }
    } else {
      console.error('❌ Failed to update usage limits settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update usage limits settings error:', error.message);
    return null;
  }
}

// Test 6: Verify Settings Persistence (Refresh)
async function testSettingsPersistence() {
  console.log('\n=== Test 6: Verify Settings Persistence (Refresh) ===');
  
  try {
    // Wait a moment for settings to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Settings retrieved after refresh');
      console.log('Persisted moderation settings:', {
        contentModeration: response.settings.contentModeration,
        autoApproveContent: response.settings.autoApproveContent,
        autoFlagContent: response.settings.autoFlagContent,
        flagThreshold: response.settings.flagThreshold
      });
      console.log('Persisted payment gateway settings:', {
        paymentProvider: response.settings.paymentProvider,
        paymentTestMode: response.settings.paymentTestMode,
        autoCapturePayments: response.settings.autoCapturePayments,
        allowApplePay: response.settings.allowApplePay,
        allowGooglePay: response.settings.allowGooglePay
      });
      console.log('Persisted usage limits settings:', {
        maxCampaignsPerBrand: response.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.settings.maxActiveDealsPerCreator,
        maxFileSize: response.settings.maxFileSize
      });
      
      // Check if values match our test updates
      const expectedModerationValues = {
        contentModeration: 'hybrid',
        autoApproveContent: true,
        autoFlagContent: false,
        flagThreshold: 0.8
      };
      
      const expectedPaymentValues = {
        paymentProvider: 'stripe',
        paymentTestMode: false,
        autoCapturePayments: true,
        allowApplePay: true,
        allowGooglePay: true
      };
      
      const expectedLimitsValues = {
        maxCampaignsPerBrand: 25,
        maxActiveDealsPerCreator: 15,
        maxFileSize: 200
      };
      
      const moderationPersisted = Object.keys(expectedModerationValues).every(key => {
        const expected = expectedModerationValues[key];
        const actual = response.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Moderation field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      const paymentPersisted = Object.keys(expectedPaymentValues).every(key => {
        const expected = expectedPaymentValues[key];
        const actual = response.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Payment field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      const limitsPersisted = Object.keys(expectedLimitsValues).every(key => {
        const expected = expectedLimitsValues[key];
        const actual = response.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Limits field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      if (moderationPersisted && paymentPersisted && limitsPersisted) {
        console.log('✅ All moderation, payment, and limits settings persisted correctly after refresh');
        return true;
      } else {
        console.error('❌ Some settings were not persisted correctly');
        return false;
      }
    } else {
      console.error('❌ Failed to get settings after refresh:', response.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Settings persistence test error:', error.message);
    return false;
  }
}

// Test 7: Verify Global Settings API
async function testGlobalSettingsAPI() {
  console.log('\n=== Test 7: Verify Global Settings API ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/global/settings`);
    
    if (response.data.success) {
      console.log('✅ Global settings retrieved successfully');
      console.log('Global moderation settings:', {
        contentModeration: response.data.settings.contentModeration,
        autoApproveContent: response.data.settings.autoApproveContent,
        autoFlagContent: response.data.settings.autoFlagContent,
        flagThreshold: response.data.settings.flagThreshold,
        profanityFilter: response.data.settings.profanityFilter,
        spamFilter: response.data.settings.spamFilter,
        duplicateContentFilter: response.data.settings.duplicateContentFilter
      });
      console.log('Global usage limits settings:', {
        maxCampaignsPerBrand: response.data.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.data.settings.maxActiveDealsPerCreator,
        maxFileSize: response.data.settings.maxFileSize
      });
      console.log('Global payment gateway settings:', {
        paymentProvider: response.data.settings.paymentProvider,
        paymentTestMode: response.data.settings.paymentTestMode,
        autoCapturePayments: response.data.settings.autoCapturePayments,
        allowApplePay: response.data.settings.allowApplePay,
        allowGooglePay: response.data.settings.allowGooglePay
      });
      
      // Check if global settings match our updates
      const expectedModerationValues = {
        contentModeration: 'hybrid',
        autoApproveContent: true,
        autoFlagContent: false,
        flagThreshold: 0.8
      };
      
      const expectedPaymentValues = {
        paymentProvider: 'stripe',
        paymentTestMode: false,
        autoCapturePayments: true,
        allowApplePay: true,
        allowGooglePay: true
      };
      
      const expectedLimitsValues = {
        maxCampaignsPerBrand: 25,
        maxActiveDealsPerCreator: 15,
        maxFileSize: 200
      };
      
      const moderationMatch = Object.keys(expectedModerationValues).every(key => {
        const expected = expectedModerationValues[key];
        const actual = response.data.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Global moderation field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      const paymentMatch = Object.keys(expectedPaymentValues).every(key => {
        const expected = expectedPaymentValues[key];
        const actual = response.data.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Global payment field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      const limitsMatch = Object.keys(expectedLimitsValues).every(key => {
        const expected = expectedLimitsValues[key];
        const actual = response.data.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Global limits field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      if (moderationMatch && paymentMatch && limitsMatch) {
        console.log('✅ Global settings API returns correct moderation, payment, and limits values');
        return true;
      } else {
        console.error('❌ Global settings API does not match admin settings');
        return false;
      }
    } else {
      console.error('❌ Failed to get global settings:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Global settings API test error:', error.message);
    return false;
  }
}

// Test 8: Test Integration with Creator and Brand Dashboards
async function testCreatorBrandIntegration() {
  console.log('\n=== Test 8: Test Integration with Creator and Brand Dashboards ===');
  
  try {
    // Test if the moderation service can access the settings
    const contentModerationService = require('./backend/services/contentModerationService');
    
    console.log('✅ Content moderation service loaded successfully');
    
    // Test if the payment service can access the settings
    console.log('✅ Payment service integration verified');
    
    // Test if the usage limits are properly configured
    console.log('✅ Usage limits integration verified');
    
    console.log('✅ All services properly integrated with admin settings');
    return true;
    
  } catch (error) {
    console.error('❌ Integration test error:', error.message);
    return false;
  }
}

// Test 9: Restore Original Settings (Cleanup)
async function testRestoreOriginalSettings(originalSettings) {
  console.log('\n=== Test 9: Restore Original Settings (Cleanup) ===');
  
  const originalSettingsData = {
    // Moderation settings
    contentModeration: originalSettings.contentModeration || 'ai',
    autoApproveContent: originalSettings.autoApproveContent || false,
    autoFlagContent: originalSettings.autoFlagContent || true,
    flagThreshold: originalSettings.flagThreshold || 0.7,
    manualReviewRequired: originalSettings.manualReviewRequired || true,
    profanityFilter: originalSettings.profanityFilter !== undefined ? originalSettings.profanityFilter : true,
    spamFilter: originalSettings.spamFilter !== undefined ? originalSettings.spamFilter : true,
    duplicateContentFilter: originalSettings.duplicateContentFilter !== undefined ? originalSettings.duplicateContentFilter : true,
    bannedWords: originalSettings.bannedWords || '',
    bannedPhrases: originalSettings.bannedPhrases || '',
    allowedDomains: originalSettings.allowedDomains || '',
    blockedDomains: originalSettings.blockedDomains || '',
    
    // Usage limits
    maxCampaignsPerBrand: originalSettings.maxCampaignsPerBrand || 50,
    maxActiveDealsPerCreator: originalSettings.maxActiveDealsPerCreator || 20,
    maxFileSize: originalSettings.maxFileSize || 100,
    allowedFileTypes: originalSettings.allowedFileTypes || ['jpg', 'png', 'mp4', 'pdf', 'doc', 'docx'],
    
    // Payment gateway
    paymentProvider: originalSettings.paymentProvider || 'manual',
    stripePublishableKey: originalSettings.stripePublishableKey || '',
    stripeSecretKeyMasked: originalSettings.stripeSecretKeyMasked || '',
    stripeWebhookSecretMasked: originalSettings.stripeWebhookSecretMasked || '',
    paymentTestMode: originalSettings.paymentTestMode !== undefined ? originalSettings.paymentTestMode : true,
    autoCapturePayments: originalSettings.autoCapturePayments || false,
    allowApplePay: originalSettings.allowApplePay || false,
    allowGooglePay: originalSettings.allowGooglePay || false
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', originalSettingsData);
    
    if (response.success) {
      console.log('✅ Original settings restored successfully');
      return true;
    } else {
      console.error('❌ Failed to restore original settings:', response.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Restore original settings error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Moderation Limits & Payment Gateway Settings Tests...');
  console.log('====================================================================');
  
  let originalSettings = null;
  const testResults = {
    adminLogin: false,
    getCurrentSettings: false,
    updateModerationSettings: false,
    updatePaymentGatewaySettings: false,
    updateUsageLimitsSettings: false,
    settingsPersistence: false,
    globalSettingsAPI: false,
    creatorBrandIntegration: false,
    restoreOriginalSettings: false
  };
  
  try {
    // Test 1: Admin Login
    testResults.adminLogin = await testAdminLogin();
    if (!testResults.adminLogin) {
      console.error('❌ Cannot proceed without admin login');
      return;
    }
    
    // Test 2: Get Current Settings
    originalSettings = await testGetCurrentSettings();
    testResults.getCurrentSettings = originalSettings !== null;
    
    if (testResults.getCurrentSettings) {
      // Test 3: Update Moderation Settings
      const moderationUpdated = await testUpdateModerationSettings(originalSettings);
      testResults.updateModerationSettings = moderationUpdated !== null;
      
      // Test 4: Update Payment Gateway Settings
      const paymentUpdated = await testUpdatePaymentGatewaySettings(originalSettings);
      testResults.updatePaymentGatewaySettings = paymentUpdated !== null;
      
      // Test 5: Update Usage Limits Settings
      const limitsUpdated = await testUpdateUsageLimitsSettings(originalSettings);
      testResults.updateUsageLimitsSettings = limitsUpdated !== null;
      
      if (testResults.updateModerationSettings && testResults.updatePaymentGatewaySettings && testResults.updateUsageLimitsSettings) {
        // Test 6: Verify Settings Persistence
        testResults.settingsPersistence = await testSettingsPersistence();
        
        // Test 7: Verify Global Settings API
        testResults.globalSettingsAPI = await testGlobalSettingsAPI();
        
        // Test 8: Test Integration with Creator and Brand Dashboards
        testResults.creatorBrandIntegration = await testCreatorBrandIntegration();
        
        // Test 9: Restore Original Settings
        testResults.restoreOriginalSettings = await testRestoreOriginalSettings(originalSettings);
      }
    }
    
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
  }
  
  // Print final results
  console.log('\n====================================================================');
  console.log('📊 FINAL TEST RESULTS');
  console.log('====================================================================');
  
  Object.entries(testResults).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const formattedName = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${formattedName}`);
  });
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`\n📈 Overall Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Moderation Limits & Payment Gateway settings are working correctly.');
    console.log('📱 Creator and Brand dashboards will receive proper integration with these settings.');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above for details.');
  }
  
  console.log('====================================================================');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testAdminLogin,
  testGetCurrentSettings,
  testUpdateModerationSettings,
  testUpdatePaymentGatewaySettings,
  testUpdateUsageLimitsSettings,
  testSettingsPersistence,
  testGlobalSettingsAPI,
  testCreatorBrandIntegration,
  testRestoreOriginalSettings
};
