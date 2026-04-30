// test-usage-limits-system.js
// Comprehensive test for usage limits and file upload settings system

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@influencex.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Test data
const testUsageLimits = {
  maxCampaignsPerBrand: 25,
  maxActiveDealsPerCreator: 15,
  maxFileSize: 50,
  maxFilesPerUpload: 5,
  dailyUploadLimit: 50,
  storageQuotaPerUser: 500
};

const testFileUploadSettings = {
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf'],
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
  },
  storage: {
    provider: 'local'
  }
};

// Test utilities
let authToken = '';
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, message, details = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
  
  testResults.details.push({
    test: testName,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  });
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

// Test functions
async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Login...');
  
  const result = await makeRequest('POST', '/api/admin/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (result.success && result.data.token) {
    authToken = result.data.token;
    logTest('Admin Login', true, 'Successfully logged in as admin');
    return true;
  } else {
    logTest('Admin Login', false, 'Failed to login as admin', result.error);
    return false;
  }
}

async function testGetUsageLimits() {
  console.log('\n📊 Testing Get Usage Limits...');
  
  const result = await makeRequest('GET', '/api/admin/usage-limits');
  
  if (result.success && result.data.success) {
    const limits = result.data.data;
    logTest('Get Usage Limits', true, 'Successfully fetched usage limits', limits);
    
    // Verify structure
    const requiredFields = ['maxCampaignsPerBrand', 'maxActiveDealsPerCreator', 'maxFileSize', 'maxFilesPerUpload', 'dailyUploadLimit', 'storageQuotaPerUser'];
    const hasAllFields = requiredFields.every(field => limits.hasOwnProperty(field));
    
    if (hasAllFields) {
      logTest('Usage Limits Structure', true, 'All required fields present');
    } else {
      logTest('Usage Limits Structure', false, 'Missing required fields', { missing: requiredFields.filter(f => !limits.hasOwnProperty(f)) });
    }
    
    return true;
  } else {
    logTest('Get Usage Limits', false, 'Failed to fetch usage limits', result.error);
    return false;
  }
}

async function testUpdateUsageLimits() {
  console.log('\n📝 Testing Update Usage Limits...');
  
  const result = await makeRequest('PUT', '/api/admin/usage-limits', testUsageLimits);
  
  if (result.success && result.data.success) {
    logTest('Update Usage Limits', true, 'Successfully updated usage limits', result.data.data);
    
    // Verify the updated values
    const verifyResult = await makeRequest('GET', '/api/admin/usage-limits');
    if (verifyResult.success && verifyResult.data.success) {
      const updatedLimits = verifyResult.data.data;
      const allMatch = Object.keys(testUsageLimits).every(key => 
        updatedLimits[key] === testUsageLimits[key]
      );
      
      if (allMatch) {
        logTest('Verify Usage Limits Update', true, 'All values updated correctly');
      } else {
        logTest('Verify Usage Limits Update', false, 'Some values not updated correctly', {
          expected: testUsageLimits,
          actual: updatedLimits
        });
      }
    }
    
    return true;
  } else {
    logTest('Update Usage Limits', false, 'Failed to update usage limits', result.error);
    return false;
  }
}

async function testGetFileUploadSettings() {
  console.log('\n📁 Testing Get File Upload Settings...');
  
  const result = await makeRequest('GET', '/api/admin/file-upload-settings');
  
  if (result.success && result.data.success) {
    const settings = result.data.data;
    logTest('Get File Upload Settings', true, 'Successfully fetched file upload settings', settings);
    
    // Verify structure
    const requiredFields = ['allowedFileTypes', 'imageOptimization', 'videoOptimization', 'storage'];
    const hasAllFields = requiredFields.every(field => settings.hasOwnProperty(field));
    
    if (hasAllFields) {
      logTest('File Upload Settings Structure', true, 'All required fields present');
    } else {
      logTest('File Upload Settings Structure', false, 'Missing required fields', { missing: requiredFields.filter(f => !settings.hasOwnProperty(f)) });
    }
    
    return true;
  } else {
    logTest('Get File Upload Settings', false, 'Failed to fetch file upload settings', result.error);
    return false;
  }
}

async function testUpdateFileUploadSettings() {
  console.log('\n📝 Testing Update File Upload Settings...');
  
  const result = await makeRequest('PUT', '/api/admin/file-upload-settings', testFileUploadSettings);
  
  if (result.success && result.data.success) {
    logTest('Update File Upload Settings', true, 'Successfully updated file upload settings', result.data.data);
    
    // Verify the updated values
    const verifyResult = await makeRequest('GET', '/api/admin/file-upload-settings');
    if (verifyResult.success && verifyResult.data.success) {
      const updatedSettings = verifyResult.data.data;
      
      // Check allowed file types
      const typesMatch = JSON.stringify(updatedSettings.allowedFileTypes.sort()) === 
                         JSON.stringify(testFileUploadSettings.allowedFileTypes.sort());
      
      if (typesMatch) {
        logTest('Verify File Types Update', true, 'File types updated correctly');
      } else {
        logTest('Verify File Types Update', false, 'File types not updated correctly', {
          expected: testFileUploadSettings.allowedFileTypes,
          actual: updatedSettings.allowedFileTypes
        });
      }
    }
    
    return true;
  } else {
    logTest('Update File Upload Settings', false, 'Failed to update file upload settings', result.error);
    return false;
  }
}

async function testAddFileType() {
  console.log('\n➕ Testing Add File Type...');
  
  const newFileType = 'docx';
  const result = await makeRequest('POST', '/api/admin/file-types', { fileType: newFileType });
  
  if (result.success && result.data.success) {
    logTest('Add File Type', true, `Successfully added file type: ${newFileType}`, result.data.data);
    
    // Verify the file type was added
    const verifyResult = await makeRequest('GET', '/api/admin/file-upload-settings');
    if (verifyResult.success && verifyResult.data.success) {
      const settings = verifyResult.data.data;
      const hasNewType = settings.allowedFileTypes.includes(newFileType);
      
      if (hasNewType) {
        logTest('Verify File Type Added', true, `File type ${newFileType} is now allowed`);
      } else {
        logTest('Verify File Type Added', false, `File type ${newFileType} not found in allowed types`);
      }
    }
    
    return true;
  } else {
    logTest('Add File Type', false, `Failed to add file type: ${newFileType}`, result.error);
    return false;
  }
}

async function testRemoveFileType() {
  console.log('\n➖ Testing Remove File Type...');
  
  const fileTypeToRemove = 'docx';
  const result = await makeRequest('DELETE', `/api/admin/file-types/${fileTypeToRemove}`);
  
  if (result.success && result.data.success) {
    logTest('Remove File Type', true, `Successfully removed file type: ${fileTypeToRemove}`, result.data.data);
    
    // Verify the file type was removed
    const verifyResult = await makeRequest('GET', '/api/admin/file-upload-settings');
    if (verifyResult.success && verifyResult.data.success) {
      const settings = verifyResult.data.data;
      const hasRemovedType = settings.allowedFileTypes.includes(fileTypeToRemove);
      
      if (!hasRemovedType) {
        logTest('Verify File Type Removed', true, `File type ${fileTypeToRemove} is no longer allowed`);
      } else {
        logTest('Verify File Type Removed', false, `File type ${fileTypeToRemove} still found in allowed types`);
      }
    }
    
    return true;
  } else {
    logTest('Remove File Type', false, `Failed to remove file type: ${fileTypeToRemove}`, result.error);
    return false;
  }
}

async function testInvalidFileType() {
  console.log('\n🚫 Testing Invalid File Type...');
  
  const invalidFileType = 'exe';
  const result = await makeRequest('POST', '/api/admin/file-types', { fileType: invalidFileType });
  
  if (!result.success) {
    logTest('Invalid File Type Rejection', true, `Correctly rejected invalid file type: ${invalidFileType}`, result.error);
    return true;
  } else {
    logTest('Invalid File Type Rejection', false, `Should have rejected invalid file type: ${invalidFileType}`);
    return false;
  }
}

async function testValidationErrors() {
  console.log('\n⚠️ Testing Validation Errors...');
  
  // Test invalid usage limits
  const invalidLimits = {
    maxCampaignsPerBrand: -1, // Invalid: negative number
    maxActiveDealsPerCreator: 1000, // Invalid: exceeds max
    maxFileSize: 1000 // Invalid: exceeds max
  };
  
  const result = await makeRequest('PUT', '/api/admin/usage-limits', invalidLimits);
  
  if (!result.success && result.status === 400) {
    logTest('Usage Limits Validation', true, 'Correctly validated usage limits input', result.error);
  } else {
    logTest('Usage Limits Validation', false, 'Should have validated usage limits input', result);
  }
  
  // Test invalid file upload settings
  const invalidSettings = {
    allowedFileTypes: ['invalid_type'], // Invalid: not in allowed enum
    imageOptimization: {
      maxWidth: -1 // Invalid: negative number
    }
  };
  
  const settingsResult = await makeRequest('PUT', '/api/admin/file-upload-settings', invalidSettings);
  
  if (!settingsResult.success && settingsResult.status === 400) {
    logTest('File Upload Settings Validation', true, 'Correctly validated file upload settings input', settingsResult.error);
  } else {
    logTest('File Upload Settings Validation', false, 'Should have validated file upload settings input', settingsResult);
  }
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Usage Limits System Tests...\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Admin email: ${ADMIN_EMAIL}\n`);
  
  const startTime = Date.now();
  
  try {
    // Run tests in sequence
    const tests = [
      testAdminLogin,
      testGetUsageLimits,
      testUpdateUsageLimits,
      testGetFileUploadSettings,
      testUpdateFileUploadSettings,
      testAddFileType,
      testRemoveFileType,
      testInvalidFileType,
      testValidationErrors
    ];
    
    for (const test of tests) {
      await test();
    }
    
  } catch (error) {
    console.error('Test suite error:', error);
    logTest('Test Suite', false, 'Unexpected error during test execution', error.message);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Print final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`Duration: ${duration}ms`);
  console.log('='.repeat(60));
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.test}: ${test.message}`);
      });
  }
  
  // Save results to file
  const fs = require('fs');
  const resultsFile = 'usage-limits-test-results.json';
  
  try {
    fs.writeFileSync(resultsFile, JSON.stringify({
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: ((testResults.passed / testResults.total) * 100).toFixed(1),
        duration,
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL
      },
      details: testResults.details
    }, null, 2));
    
    console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  } catch (writeError) {
    console.error('Failed to save results file:', writeError);
  }
  
  return testResults.failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testResults
};
