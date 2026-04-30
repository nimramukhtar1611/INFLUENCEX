const axios = require('axios');

// Test script for Support Email functionality
const BASE_URL = 'http://localhost:5000';

async function testSupportEmail() {
  console.log('🧪 Testing Support Email Settings...\n');

  try {
    // Test 1: Get current settings
    console.log('📋 Test 1: Getting current admin settings...');
    const getResponse = await axios.get(`${BASE_URL}/api/admin/settings`, {
      headers: {
        'Authorization': 'Bearer admin-token-here', // You'll need to use a real admin token
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.data.success) {
      const settings = getResponse.data.settings;
      console.log('✅ GET Settings successful');
      console.log('📧 Support Email Details:');
      console.log(`   - Support Email: "${settings.supportEmail}"`);
      console.log(`   - Platform Name: "${settings.platformName}"`);
    } else {
      console.log('❌ GET Settings failed:', getResponse.data.error);
    }

    // Test 2: Update Support Email
    console.log('\n📝 Test 2: Updating Support Email...');
    const emailUpdateData = {
      supportEmail: 'snimramukhtar321@gmail.com'
    };

    const emailUpdateResponse = await axios.put(`${BASE_URL}/api/admin/settings`, emailUpdateData, {
      headers: {
        'Authorization': 'Bearer admin-token-here', // You'll need to use a real admin token
        'Content-Type': 'application/json'
      }
    });

    if (emailUpdateResponse.data.success) {
      console.log('✅ Support Email updated successfully');
      console.log('📧 Updated Support Email:');
      console.log(`   - Support Email: "${emailUpdateResponse.data.settings.supportEmail}"`);
    } else {
      console.log('❌ Support Email update failed:', emailUpdateResponse.data.error);
    }

    // Test 3: Verify settings persistence
    console.log('\n🔄 Test 3: Verifying Support Email persistence...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/admin/settings`, {
      headers: {
        'Authorization': 'Bearer admin-token-here', // You'll need to use a real admin token
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.data.success) {
      const settings = verifyResponse.data.settings;
      console.log('✅ Support Email persistence verified');
      console.log('📧 Final Support Email:');
      console.log(`   - Support Email: "${settings.supportEmail}"`);
    } else {
      console.log('❌ Support Email persistence verification failed:', verifyResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

console.log('🚀 Starting Support Email Settings test...');
console.log('⚠️  Note: You need to replace "admin-token-here" with a real admin JWT token\n');

testSupportEmail();
