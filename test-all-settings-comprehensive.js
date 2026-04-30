// Comprehensive test script for all admin settings functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials (replace with actual admin credentials)
const ADMIN_CREDENTIALS = {
  email: 'InfluenceX102@gmail.com',
  password: 'chsyen382738jsi2'
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

// Test 2: Get Current All Settings
async function testGetCurrentSettings() {
  console.log('\n=== Test 2: Get Current All Settings ===');
  try {
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Current settings retrieved successfully');
      console.log('Stripe settings found:', {
        paymentProvider: response.settings.paymentProvider,
        stripePublishableKey: response.settings.stripePublishableKey ? 'sk_***' : '',
        stripeSecretKeyMasked: response.settings.stripeSecretKeyMasked ? 'sk_***' : '',
        stripeWebhookSecretMasked: response.settings.stripeWebhookSecretMasked ? 'whsec_***' : ''
      });
      console.log('Usage limits settings found:', {
        maxCampaignsPerBrand: response.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.settings.maxActiveDealsPerCreator,
        maxFileSize: response.settings.maxFileSize,
        allowedFileTypes: response.settings.allowedFileTypes
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

// Test 3: Update Stripe Settings
async function testUpdateStripeSettings(currentSettings) {
  console.log('\n=== Test 3: Update Stripe Settings ===');
  
  const testStripeUpdates = {
    paymentProvider: 'stripe',
    stripePublishableKey: 'pk_test_1234567890',
    stripeSecretKeyMasked: 'sk_test_1234567890abcd', // New key (not masked)
    stripeWebhookSecretMasked: 'whsec_test_1234567890abcd', // New key (not masked)
    paymentTestMode: false,
    autoCapturePayments: true,
    allowApplePay: true,
    allowGooglePay: true
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', testStripeUpdates);
    
    if (response.success) {
      console.log('✅ Stripe settings updated successfully');
      console.log('Updated stripe settings:', {
        paymentProvider: response.settings.paymentProvider,
        stripePublishableKey: response.settings.stripePublishableKey ? 'sk_***' : '',
        stripeSecretKeyMasked: response.settings.stripeSecretKeyMasked ? 'sk_***' : '',
        paymentTestMode: response.settings.paymentTestMode,
        autoCapturePayments: response.settings.autoCapturePayments,
        allowApplePay: response.settings.allowApplePay,
        allowGooglePay: response.settings.allowGooglePay
      });
      
      // Verify stripe fields were updated correctly
      const stripeFieldsUpdated = Object.keys(testStripeUpdates).every(key => {
        if (key === 'stripeSecretKeyMasked' || key === 'stripeWebhookSecretMasked') {
          // These should be masked in response
          const expected = testStripeUpdates[key].substring(0, 7) + '************************';
          const actual = response.settings[key];
          return actual.includes('************************');
        } else {
          const expected = testStripeUpdates[key];
          const actual = response.settings[key];
          return actual === expected;
        }
      });
      
      if (stripeFieldsUpdated) {
        console.log('✅ All stripe fields updated correctly');
        return response.settings;
      } else {
        console.error('❌ Some stripe fields were not updated correctly');
        return null;
      }
    } else {
      console.error('❌ Failed to update stripe settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update stripe settings error:', error.message);
    return null;
  }
}

// Test 4: Update Usage Limits Settings
async function testUpdateUsageLimitsSettings(currentSettings) {
  console.log('\n=== Test 4: Update Usage Limits Settings ===');
  
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

// Test 5: Test Usage Limits API
async function testUsageLimitsAPI() {
  console.log('\n=== Test 5: Test Usage Limits API ===');
  
  try {
    const response = await authenticatedRequest('GET', '/admin/usage-limits');
    
    if (response.success) {
      console.log('✅ Usage limits API working');
      console.log('Usage limits from API:', {
        maxCampaignsPerBrand: response.data.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.data.maxActiveDealsPerCreator,
        maxFileSize: response.data.maxFileSize,
        maxFilesPerUpload: response.data.maxFilesPerUpload,
        dailyUploadLimit: response.data.dailyUploadLimit,
        storageQuotaPerUser: response.data.storageQuotaPerUser
      });
      
      // Test update usage limits API
      const updateResponse = await authenticatedRequest('PUT', '/admin/usage-limits', {
        maxCampaignsPerBrand: 30,
        maxActiveDealsPerCreator: 25,
        maxFileSize: 150,
        maxFilesPerUpload: 5,
        dailyUploadLimit: 50,
        storageQuotaPerUser: 500
      });
      
      if (updateResponse.success) {
        console.log('✅ Usage limits update API working');
        return true;
      } else {
        console.error('❌ Failed to update usage limits via API:', updateResponse.error);
        return false;
      }
    } else {
      console.error('❌ Failed to get usage limits:', response.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Usage limits API error:', error.message);
    return false;
  }
}

// Test 6: Test File Upload Settings API
async function testFileUploadSettingsAPI() {
  console.log('\n=== Test 6: Test File Upload Settings API ===');
  
  try {
    const response = await authenticatedRequest('GET', '/admin/file-upload-settings');
    
    if (response.success) {
      console.log('✅ File upload settings API working');
      console.log('File upload settings from API:', {
        allowedFileTypes: response.data.allowedFileTypes,
        maxFileSize: response.data.maxFileSize,
        maxFilesPerUpload: response.data.maxFilesPerUpload,
        dailyUploadLimit: response.data.dailyUploadLimit,
        storageQuotaPerUser: response.data.storageQuotaPerUser
      });
      
      // Test update file upload settings API
      const updateResponse = await authenticatedRequest('PUT', '/admin/file-upload-settings', {
        allowedFileTypes: ['jpg', 'png', 'mp4', 'pdf'],
        maxFileSize: 100,
        maxFilesPerUpload: 10,
        dailyUploadLimit: 100,
        storageQuotaPerUser: 1000,
        imageOptimization: {
          enabled: true,
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 80
        },
        videoOptimization: {
          enabled: true,
          maxDuration: 300,
          maxBitrate: 5000
        }
      });
      
      if (updateResponse.success) {
        console.log('✅ File upload settings update API working');
        return true;
      } else {
        console.error('❌ Failed to update file upload settings via API:', updateResponse.error);
        return false;
      }
    } else {
      console.error('❌ Failed to get file upload settings:', response.error);
      return false;
    }
  } catch (error) {
    console.error('❌ File upload settings API error:', error.message);
    return false;
  }
}

// Test 7: Test File Types Management
async function testFileTypesManagement() {
  console.log('\n=== Test 7: Test File Types Management ===');
  
  try {
    // Test adding a file type
    const addResponse = await authenticatedRequest('POST', '/admin/file-types', {
      fileType: 'svg'
    });
    
    if (addResponse.success) {
      console.log('✅ File type addition working');
      console.log('Added file type:', addResponse.data.fileType);
      console.log('Updated allowed file types:', addResponse.data.allowedFileTypes);
      
      // Test removing a file type
      const removeResponse = await authenticatedRequest('DELETE', '/admin/file-types/svg');
      
      if (removeResponse.success) {
        console.log('✅ File type removal working');
        console.log('Removed file type:', removeResponse.data.fileType);
        console.log('Updated allowed file types:', removeResponse.data.allowedFileTypes);
        return true;
      } else {
        console.error('❌ Failed to remove file type:', removeResponse.error);
        return false;
      }
    } else {
      console.error('❌ Failed to add file type:', addResponse.error);
      return false;
    }
  } catch (error) {
    console.error('❌ File types management error:', error.message);
    return false;
  }
}

// Test 8: Verify Settings Persistence (Refresh)
async function testSettingsPersistence() {
  console.log('\n=== Test 8: Verify Settings Persistence (Refresh) ===');
  
  try {
    // Wait a moment for settings to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Settings retrieved after refresh');
      console.log('Persisted stripe settings:', {
        paymentProvider: response.settings.paymentProvider,
        stripeSecretKeyMasked: response.settings.stripeSecretKeyMasked ? 'sk_***' : '',
        paymentTestMode: response.settings.paymentTestMode,
        autoCapturePayments: response.settings.autoCapturePayments
      });
      console.log('Persisted usage limits settings:', {
        maxCampaignsPerBrand: response.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.settings.maxActiveDealsPerCreator,
        maxFileSize: response.settings.maxFileSize
      });
      
      // Check if values match our test updates
      const expectedStripeValues = {
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
      
      const stripePersisted = Object.keys(expectedStripeValues).every(key => {
        const expected = expectedStripeValues[key];
        const actual = response.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Stripe field ${key}: expected ${expected}, got ${actual}`);
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
      
      if (stripePersisted && limitsPersisted) {
        console.log('✅ All settings persisted correctly after refresh');
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

// Test 9: Verify Global Settings API
async function testGlobalSettingsAPI() {
  console.log('\n=== Test 9: Verify Global Settings API ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/global/settings`);
    
    if (response.data.success) {
      console.log('✅ Global settings retrieved successfully');
      console.log('Global stripe settings:', {
        paymentProvider: response.data.settings.paymentProvider,
        paymentTestMode: response.data.settings.paymentTestMode,
        autoCapturePayments: response.data.settings.autoCapturePayments,
        allowApplePay: response.data.settings.allowApplePay,
        allowGooglePay: response.data.settings.allowGooglePay
      });
      console.log('Global usage limits settings:', {
        maxCampaignsPerBrand: response.data.settings.maxCampaignsPerBrand,
        maxActiveDealsPerCreator: response.data.settings.maxActiveDealsPerCreator,
        maxFileSize: response.data.settings.maxFileSize,
        maxFilesPerUpload: response.data.settings.maxFilesPerUpload,
        dailyUploadLimit: response.data.settings.dailyUploadLimit,
        storageQuotaPerUser: response.data.settings.storageQuotaPerUser
      });
      
      // Check if global settings match our updates
      const expectedStripeValues = {
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
      
      const stripeMatch = Object.keys(expectedStripeValues).every(key => {
        const expected = expectedStripeValues[key];
        const actual = response.data.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Global stripe field ${key}: expected ${expected}, got ${actual}`);
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
      
      if (stripeMatch && limitsMatch) {
        console.log('✅ Global settings API returns correct values');
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

// Test 10: Restore Original Settings (Cleanup)
async function testRestoreOriginalSettings(originalSettings) {
  console.log('\n=== Test 10: Restore Original Settings (Cleanup) ===');
  
  const originalSettingsData = {
    // Stripe settings
    paymentProvider: originalSettings.paymentProvider || 'manual',
    stripePublishableKey: originalSettings.stripePublishableKey || '',
    stripeSecretKeyMasked: originalSettings.stripeSecretKeyMasked || '',
    stripeWebhookSecretMasked: originalSettings.stripeWebhookSecretMasked || '',
    paymentTestMode: originalSettings.paymentTestMode !== undefined ? originalSettings.paymentTestMode : true,
    autoCapturePayments: originalSettings.autoCapturePayments || false,
    allowApplePay: originalSettings.allowApplePay || false,
    allowGooglePay: originalSettings.allowGooglePay || false,
    
    // Usage limits
    maxCampaignsPerBrand: originalSettings.maxCampaignsPerBrand || 50,
    maxActiveDealsPerCreator: originalSettings.maxActiveDealsPerCreator || 20,
    maxFileSize: originalSettings.maxFileSize || 100,
    allowedFileTypes: originalSettings.allowedFileTypes || ['jpg', 'png', 'mp4', 'pdf', 'doc', 'docx']
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
  console.log('🚀 Starting Comprehensive Admin Settings Tests...');
  console.log('====================================================================');
  
  let originalSettings = null;
  const testResults = {
    adminLogin: false,
    getCurrentSettings: false,
    updateStripeSettings: false,
    updateUsageLimitsSettings: false,
    usageLimitsAPI: false,
    fileUploadSettingsAPI: false,
    fileTypesManagement: false,
    settingsPersistence: false,
    globalSettingsAPI: false,
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
      // Test 3: Update Stripe Settings
      const stripeUpdated = await testUpdateStripeSettings(originalSettings);
      testResults.updateStripeSettings = stripeUpdated !== null;
      
      // Test 4: Update Usage Limits Settings
      const limitsUpdated = await testUpdateUsageLimitsSettings(originalSettings);
      testResults.updateUsageLimitsSettings = limitsUpdated !== null;
      
      if (testResults.updateStripeSettings && testResults.updateUsageLimitsSettings) {
        // Test 5: Usage Limits API
        testResults.usageLimitsAPI = await testUsageLimitsAPI();
        
        // Test 6: File Upload Settings API
        testResults.fileUploadSettingsAPI = await testFileUploadSettingsAPI();
        
        // Test 7: File Types Management
        testResults.fileTypesManagement = await testFileTypesManagement();
        
        // Test 8: Verify Settings Persistence
        testResults.settingsPersistence = await testSettingsPersistence();
        
        // Test 9: Verify Global Settings API
        testResults.globalSettingsAPI = await testGlobalSettingsAPI();
        
        // Test 10: Restore Original Settings
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
    console.log('🎉 All tests passed! All admin settings are working correctly.');
    console.log('📱 Backend updates properly reflect in user panel.');
    console.log('💾 Database persistence is working correctly.');
    console.log('🔐 Stripe secrets are properly masked and persisted.');
    console.log('📊 Usage limits and file upload settings are fully functional.');
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
  testUpdateStripeSettings,
  testUpdateUsageLimitsSettings,
  testUsageLimitsAPI,
  testFileUploadSettingsAPI,
  testFileTypesManagement,
  testSettingsPersistence,
  testGlobalSettingsAPI,
  testRestoreOriginalSettings
};
