// Test script for Session Management and Password Requirements settings functionality
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

// Test 2: Get Current Security Settings
async function testGetCurrentSecuritySettings() {
  console.log('\n=== Test 2: Get Current Security Settings ===');
  try {
    const response = await authenticatedRequest('GET', '/admin/settings');
    
    if (response.success) {
      console.log('✅ Current settings retrieved successfully');
      console.log('Security settings found:', {
        maxLoginAttempts: response.settings.maxLoginAttempts,
        sessionTimeout: response.settings.sessionTimeout,
        lockoutDuration: response.settings.lockoutDuration,
        passwordMinLength: response.settings.passwordMinLength,
        passwordRequireUppercase: response.settings.passwordRequireUppercase,
        passwordRequireLowercase: response.settings.passwordRequireLowercase,
        passwordRequireNumbers: response.settings.passwordRequireNumbers,
        passwordRequireSymbols: response.settings.passwordRequireSymbols,
        twoFactorRequired: response.settings.twoFactorRequired,
        emailVerification: response.settings.emailVerification
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

// Test 3: Update Security Settings
async function testUpdateSecuritySettings(currentSettings) {
  console.log('\n=== Test 3: Update Security Settings ===');
  
  const testSecurityUpdates = {
    maxLoginAttempts: 3,
    sessionTimeout: 60,
    lockoutDuration: 15,
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    twoFactorRequired: false,
    emailVerification: true
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', testSecurityUpdates);
    
    if (response.success) {
      console.log('✅ Security settings updated successfully');
      console.log('Updated security settings:', {
        maxLoginAttempts: response.settings.maxLoginAttempts,
        sessionTimeout: response.settings.sessionTimeout,
        lockoutDuration: response.settings.lockoutDuration,
        passwordMinLength: response.settings.passwordMinLength,
        passwordRequireUppercase: response.settings.passwordRequireUppercase,
        passwordRequireLowercase: response.settings.passwordRequireLowercase,
        passwordRequireNumbers: response.settings.passwordRequireNumbers,
        passwordRequireSymbols: response.settings.passwordRequireSymbols,
        twoFactorRequired: response.settings.twoFactorRequired,
        emailVerification: response.settings.emailVerification
      });
      
      // Verify all fields were updated correctly
      const allFieldsUpdated = Object.keys(testSecurityUpdates).every(key => {
        const expected = testSecurityUpdates[key];
        const actual = response.settings[key];
        return actual === expected;
      });
      
      if (allFieldsUpdated) {
        console.log('✅ All security fields updated correctly');
        return response.settings;
      } else {
        console.error('❌ Some security fields were not updated correctly');
        return null;
      }
    } else {
      console.error('❌ Failed to update security settings:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update security settings error:', error.message);
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
      console.log('Persisted security settings:', {
        maxLoginAttempts: response.settings.maxLoginAttempts,
        sessionTimeout: response.settings.sessionTimeout,
        lockoutDuration: response.settings.lockoutDuration,
        passwordMinLength: response.settings.passwordMinLength,
        passwordRequireUppercase: response.settings.passwordRequireUppercase,
        passwordRequireLowercase: response.settings.passwordRequireLowercase,
        passwordRequireNumbers: response.settings.passwordRequireNumbers,
        passwordRequireSymbols: response.settings.passwordRequireSymbols,
        twoFactorRequired: response.settings.twoFactorRequired,
        emailVerification: response.settings.emailVerification
      });
      
      // Check if values match our test updates
      const expectedValues = {
        maxLoginAttempts: 3,
        sessionTimeout: 60,
        lockoutDuration: 15,
        passwordMinLength: 12,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: true,
        twoFactorRequired: false,
        emailVerification: true
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
        console.log('✅ All security settings persisted correctly after refresh');
        return true;
      } else {
        console.error('❌ Some security settings were not persisted correctly');
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
      console.log('Global security settings:', {
        maxLoginAttempts: response.data.settings.maxLoginAttempts,
        sessionTimeout: response.data.settings.sessionTimeout,
        lockoutDuration: response.data.settings.lockoutDuration,
        passwordMinLength: response.data.settings.passwordMinLength,
        passwordRequireUppercase: response.data.settings.passwordRequireUppercase,
        passwordRequireLowercase: response.data.settings.passwordRequireLowercase,
        passwordRequireNumbers: response.data.settings.passwordRequireNumbers,
        passwordRequireSymbols: response.data.settings.passwordRequireSymbols,
        emailVerification: response.data.settings.emailVerification
      });
      
      // Check if global settings match our updates
      const expectedValues = {
        maxLoginAttempts: 3,
        sessionTimeout: 60,
        lockoutDuration: 15,
        passwordMinLength: 12,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: true,
        emailVerification: true
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
        console.log('✅ Global settings API returns correct security values');
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

// Test 6: Test Password Validation with New Requirements
async function testPasswordValidation() {
  console.log('\n=== Test 6: Test Password Validation with New Requirements ===');
  
  const testPasswords = [
    { password: 'weak', shouldFail: true, reason: 'too short' },
    { password: 'weakpass', shouldFail: true, reason: 'missing uppercase and numbers' },
    { password: 'Weakpass', shouldFail: true, reason: 'missing numbers and symbols' },
    { password: 'Weakpass123', shouldFail: true, reason: 'missing symbols' },
    { password: 'Weakpass123!', shouldPass: true, reason: 'meets all requirements' }
  ];
  
  let allTestsPassed = true;
  
  for (const test of testPasswords) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email: `test${Date.now()}@example.com`,
        password: test.password,
        fullName: 'Test User',
        userType: 'creator'
      });
      
      if (test.shouldPass) {
        console.log(`✅ Password "${test.password}" accepted as expected`);
      } else {
        console.error(`❌ Password "${test.password}" should have failed but was accepted`);
        allTestsPassed = false;
      }
    } catch (error) {
      if (test.shouldFail) {
        console.log(`✅ Password "${test.password}" rejected as expected (${test.reason})`);
      } else {
        console.error(`❌ Password "${test.password}" should have passed but was rejected:`, error.response?.data?.error);
        allTestsPassed = false;
      }
    }
  }
  
  return allTestsPassed;
}

// Test 7: Restore Original Settings (Cleanup)
async function testRestoreOriginalSettings(originalSettings) {
  console.log('\n=== Test 7: Restore Original Settings (Cleanup) ===');
  
  const originalSecuritySettings = {
    maxLoginAttempts: originalSettings.maxLoginAttempts || 5,
    sessionTimeout: originalSettings.sessionTimeout || 30,
    lockoutDuration: originalSettings.lockoutDuration || 30,
    passwordMinLength: originalSettings.passwordMinLength || 8,
    passwordRequireUppercase: originalSettings.passwordRequireUppercase || true,
    passwordRequireLowercase: originalSettings.passwordRequireLowercase || true,
    passwordRequireNumbers: originalSettings.passwordRequireNumbers || true,
    passwordRequireSymbols: originalSettings.passwordRequireSymbols || false,
    twoFactorRequired: originalSettings.twoFactorRequired || false,
    emailVerification: originalSettings.emailVerification || true
  };
  
  try {
    const response = await authenticatedRequest('PUT', '/admin/settings', originalSecuritySettings);
    
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
  console.log('🚀 Starting Session Management & Password Requirements Tests...');
  console.log('========================================================');
  
  let originalSettings = null;
  const testResults = {
    adminLogin: false,
    getCurrentSecuritySettings: false,
    updateSecuritySettings: false,
    settingsPersistence: false,
    globalSettingsAPI: false,
    passwordValidation: false,
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
    originalSettings = await testGetCurrentSecuritySettings();
    testResults.getCurrentSecuritySettings = originalSettings !== null;
    
    if (testResults.getCurrentSecuritySettings) {
      // Test 3: Update Security Settings
      const updatedSettings = await testUpdateSecuritySettings(originalSettings);
      testResults.updateSecuritySettings = updatedSettings !== null;
      
      if (testResults.updateSecuritySettings) {
        // Test 4: Verify Settings Persistence
        testResults.settingsPersistence = await testSettingsPersistence();
        
        // Test 5: Verify Global Settings API
        testResults.globalSettingsAPI = await testGlobalSettingsAPI();
        
        // Test 6: Test Password Validation
        testResults.passwordValidation = await testPasswordValidation();
        
        // Test 7: Restore Original Settings
        testResults.restoreOriginalSettings = await testRestoreOriginalSettings(originalSettings);
      }
    }
    
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
  }
  
  // Print final results
  console.log('\n========================================================');
  console.log('📊 FINAL TEST RESULTS');
  console.log('========================================================');
  
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
    console.log('🎉 All tests passed! Session Management & Password Requirements are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above for details.');
  }
  
  console.log('========================================================');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testAdminLogin,
  testGetCurrentSecuritySettings,
  testUpdateSecuritySettings,
  testSettingsPersistence,
  testGlobalSettingsAPI,
  testPasswordValidation,
  testRestoreOriginalSettings
};
