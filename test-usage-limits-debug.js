// test-usage-limits-debug.js
// Debug script to test usage limits save/fetch flow

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'InfluenceX102@gmail.com';
const ADMIN_PASSWORD = 'chsyen382738jsi2';

async function testUsageLimitsFlow() {
  console.log('🔍 Starting Usage Limits Debug Test...\n');
  
  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Get current usage limits
    console.log('\n2. Getting current usage limits...');
    const getCurrentLimits = await axios.get(`${BASE_URL}/api/admin/usage-limits`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Current limits:', getCurrentLimits.data.data);
    
    // Step 3: Update usage limits with test values
    console.log('\n3. Updating usage limits...');
    const testLimits = {
      maxCampaignsPerBrand: 75,
      maxActiveDealsPerCreator: 25,
      maxFileSize: 150,
      maxFilesPerUpload: 15,
      dailyUploadLimit: 150,
      storageQuotaPerUser: 1500
    };
    
    const updateResponse = await axios.put(`${BASE_URL}/api/admin/usage-limits`, testLimits, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Update response:', updateResponse.data);
    
    // Step 4: Get updated usage limits
    console.log('\n4. Getting updated usage limits...');
    const getUpdatedLimits = await axios.get(`${BASE_URL}/api/admin/usage-limits`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Updated limits:', getUpdatedLimits.data.data);
    
    // Step 5: Verify the values match
    console.log('\n5. Verifying values...');
    const updated = getUpdatedLimits.data.data;
    const allMatch = Object.keys(testLimits).every(key => 
      updated[key] === testLimits[key]
    );
    
    if (allMatch) {
      console.log('✅ SUCCESS: All values updated correctly!');
    } else {
      console.log('❌ FAILURE: Some values don\'t match');
      console.log('Expected:', testLimits);
      console.log('Actual:', updated);
    }
    
    // Step 6: Test with different values
    console.log('\n6. Testing with different values...');
    const newTestLimits = {
      maxCampaignsPerBrand: 100,
      maxActiveDealsPerCreator: 30,
      maxFileSize: 200,
      maxFilesPerUpload: 20,
      dailyUploadLimit: 200,
      storageQuotaPerUser: 2000
    };
    
    await axios.put(`${BASE_URL}/api/admin/usage-limits`, newTestLimits, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const finalCheck = await axios.get(`${BASE_URL}/api/admin/usage-limits`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Final check:', finalCheck.data.data);
    
    const finalMatch = Object.keys(newTestLimits).every(key => 
      finalCheck.data.data[key] === newTestLimits[key]
    );
    
    if (finalMatch) {
      console.log('✅ SUCCESS: Second update also works correctly!');
    } else {
      console.log('❌ FAILURE: Second update failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    if (error.request) {
      console.error('Request failed:', error.request);
    }
  }
};

// Run the test
testUsageLimitsFlow().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
