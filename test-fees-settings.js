// Test script for Fees & Payouts settings functionality
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

// Test 2: Get Current Admin Settings
async function testGetCurrentSettings() {
  console.log('\n=== Test 2: Get Current Admin Settings ===');
  try {
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Current settings retrieved successfully');
      console.log('Fee settings found:', {
        commissionRate: response.settings.commissionRate,
        creatorPayoutMin: response.settings.creatorPayoutMin,
        brandEscrowMin: response.settings.brandEscrowMin,
        escrowFee: response.settings.escrowFee,
        featuredListingFee: response.settings.featuredListingFee,
        taxRate: response.settings.taxRate,
        withdrawalFee: response.settings.withdrawalFee,
        withdrawalFeeType: response.settings.withdrawalFeeType
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

// Test 3: Update Fees & Payouts Settings
async function testUpdateFeesSettings(currentSettings) {
  console.log('\n=== Test 3: Update Fees & Payouts Settings ===');
  
  const testFeeUpdates = {
    commissionRate: 15,
    creatorPayoutMin: 75,
    brandEscrowMin: 150,
    escrowFee: 2.5,
    featuredListingFee: 75,
    taxRate: 5,
    withdrawalFee: 5,
    withdrawalFeeType: 'fixed',
    taxInclusive: false
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', testFeeUpdates);
    
    if (response.success) {
      console.log('✅ Fee settings updated successfully');
      console.log('Updated fee settings:', {
        commissionRate: response.settings.commissionRate,
        creatorPayoutMin: response.settings.creatorPayoutMin,
        brandEscrowMin: response.settings.brandEscrowMin,
        escrowFee: response.settings.escrowFee,
        featuredListingFee: response.settings.featuredListingFee,
        taxRate: response.settings.taxRate,
        withdrawalFee: response.settings.withdrawalFee,
        withdrawalFeeType: response.settings.withdrawalFeeType
      });
      
      // Verify all fields were updated correctly
      const allFieldsUpdated = Object.keys(testFeeUpdates).every(key => {
        const expected = testFeeUpdates[key];
        const actual = response.settings[key];
        return actual === expected;
      });
      
      if (allFieldsUpdated) {
        console.log('✅ All fee fields updated correctly');
        return response.settings;
      } else {
        console.error('❌ Some fee fields were not updated correctly');
        return null;
      }
    } else {
      console.error('❌ Failed to update fee settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update fee settings error:', error.message);
    return null;
  }
}

// Test 4: Verify Settings Persistence (Refresh)
async function testSettingsPersistence() {
  console.log('\n=== Test 4: Verify Settings Persistence (Refresh) ===');
  
  try {
    // Wait a moment for settings to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Settings retrieved after refresh');
      console.log('Persisted fee settings:', {
        commissionRate: response.settings.commissionRate,
        creatorPayoutMin: response.settings.creatorPayoutMin,
        brandEscrowMin: response.settings.brandEscrowMin,
        escrowFee: response.settings.escrowFee,
        featuredListingFee: response.settings.featuredListingFee,
        taxRate: response.settings.taxRate,
        withdrawalFee: response.settings.withdrawalFee,
        withdrawalFeeType: response.settings.withdrawalFeeType
      });
      
      // Check if values match our test updates
      const expectedValues = {
        commissionRate: 15,
        creatorPayoutMin: 75,
        brandEscrowMin: 150,
        escrowFee: 2.5,
        featuredListingFee: 75,
        taxRate: 5,
        withdrawalFee: 5,
        withdrawalFeeType: 'fixed'
      };
      
      const allFieldsPersisted = Object.keys(expectedValues).every(key => {
        const expected = expectedValues[key];
        const actual = response.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      if (allFieldsPersisted) {
        console.log('✅ All fee settings persisted correctly after refresh');
        return true;
      } else {
        console.error('❌ Some fee settings were not persisted correctly');
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

// Test 5: Verify Global Settings API
async function testGlobalSettingsAPI() {
  console.log('\n=== Test 5: Verify Global Settings API ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/global/settings`);
    
    if (response.data.success) {
      console.log('✅ Global settings retrieved successfully');
      console.log('Global fee settings:', {
        commissionRate: response.data.settings.commissionRate,
        creatorPayoutMin: response.data.settings.creatorPayoutMin,
        brandEscrowMin: response.data.settings.brandEscrowMin,
        escrowFee: response.data.settings.escrowFee,
        featuredListingFee: response.data.settings.featuredListingFee,
        taxRate: response.data.settings.taxRate,
        withdrawalFee: response.data.settings.withdrawalFee,
        withdrawalFeeType: response.data.settings.withdrawalFeeType
      });
      
      // Check if global settings match our updates
      const expectedValues = {
        commissionRate: 15,
        creatorPayoutMin: 75,
        brandEscrowMin: 150,
        escrowFee: 2.5,
        featuredListingFee: 75,
        taxRate: 5,
        withdrawalFee: 5,
        withdrawalFeeType: 'fixed'
      };
      
      const allFieldsMatch = Object.keys(expectedValues).every(key => {
        const expected = expectedValues[key];
        const actual = response.data.settings[key];
        const match = actual === expected;
        if (!match) {
          console.error(`❌ Global field ${key}: expected ${expected}, got ${actual}`);
        }
        return match;
      });
      
      if (allFieldsMatch) {
        console.log('✅ Global settings API returns correct fee values');
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

// Test 6: Restore Original Settings (Cleanup)
async function testRestoreOriginalSettings(originalSettings) {
  console.log('\n=== Test 6: Restore Original Settings (Cleanup) ===');
  
  const originalFeeSettings = {
    commissionRate: originalSettings.commissionRate || 10,
    creatorPayoutMin: originalSettings.creatorPayoutMin || 50,
    brandEscrowMin: originalSettings.brandEscrowMin || 100,
    escrowFee: originalSettings.escrowFee || 0,
    featuredListingFee: originalSettings.featuredListingFee || 50,
    taxRate: originalSettings.taxRate || 0,
    withdrawalFee: originalSettings.withdrawalFee || 0,
    withdrawalFeeType: originalSettings.withdrawalFeeType || 'fixed',
    taxInclusive: originalSettings.taxInclusive || false
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', originalFeeSettings);
    
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
  console.log('🚀 Starting Fees & Payouts Settings Tests...');
  console.log('==========================================');
  
  let originalSettings = null;
  const testResults = {
    adminLogin: false,
    getCurrentSettings: false,
    updateFeesSettings: false,
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
      // Test 3: Update Fee Settings
      const updatedSettings = await testUpdateFeesSettings(originalSettings);
      testResults.updateFeesSettings = updatedSettings !== null;
      
      if (testResults.updateFeesSettings) {
        // Test 4: Verify Settings Persistence
        testResults.settingsPersistence = await testSettingsPersistence();
        
        // Test 5: Verify Global Settings API
        testResults.globalSettingsAPI = await testGlobalSettingsAPI();
        
        // Test 6: Restore Original Settings
        testResults.restoreOriginalSettings = await testRestoreOriginalSettings(originalSettings);
      }
    }
    
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
  }
  
  // Print final results
  console.log('\n==========================================');
  console.log('📊 FINAL TEST RESULTS');
  console.log('==========================================');
  
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
    console.log('🎉 All tests passed! Fees & Payouts settings are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above for details.');
  }
  
  console.log('==========================================');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testAdminLogin,
  testGetCurrentSettings,
  testUpdateFeesSettings,
  testSettingsPersistence,
  testGlobalSettingsAPI,
  testRestoreOriginalSettings
};
