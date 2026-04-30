const axios = require('axios');

// Test script for Email Sender Details and Twilio SMS Settings
const BASE_URL = 'http://localhost:5000';

async function testEmailAndSmsSettings() {
  console.log('🧪 Testing Email Sender Details and Twilio SMS Settings...\n');

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
      console.log('📧 Email Sender Details:');
      console.log(`   - Sender Name: "${settings.senderName}"`);
      console.log(`   - Email Footer: "${settings.emailFooter}"`);
      console.log(`   - Sender Email: "${settings.senderEmail}"`);
      
      console.log('📱 SMS Notifications:');
      console.log(`   - Enabled: ${settings.smsNotifications?.enabled}`);
      console.log(`   - Provider: ${settings.smsNotifications?.provider}`);
      console.log(`   - Account SID: "${settings.smsNotifications?.accountSid}"`);
      console.log(`   - Auth Token: "${settings.smsNotifications?.authToken ? '[REDACTED]' : ''}"`);
      console.log(`   - Phone Number: "${settings.smsNotifications?.phoneNumber}"`);
    } else {
      console.log('❌ GET Settings failed:', getResponse.data.error);
    }

    // Test 2: Update Email Sender Details
    console.log('\n📝 Test 2: Updating Email Sender Details...');
    const emailUpdateData = {
      senderName: 'InfluenceX Platform',
      emailFooter: '© 2024 InfluenceX Platform. All rights reserved.',
      senderEmail: 'noreply@influencex.com'
    };

    const emailUpdateResponse = await axios.put(`${BASE_URL}/api/admin/settings`, emailUpdateData, {
      headers: {
        'Authorization': 'Bearer admin-token-here', // You'll need to use a real admin token
        'Content-Type': 'application/json'
      }
    });

    if (emailUpdateResponse.data.success) {
      console.log('✅ Email Sender Details updated successfully');
      console.log('📧 Updated Email Settings:');
      console.log(`   - Sender Name: "${emailUpdateResponse.data.settings.senderName}"`);
      console.log(`   - Email Footer: "${emailUpdateResponse.data.settings.emailFooter}"`);
    } else {
      console.log('❌ Email Sender Details update failed:', emailUpdateResponse.data.error);
    }

    // Test 3: Update Twilio SMS Settings
    console.log('\n📝 Test 3: Updating Twilio SMS Settings...');
    const smsUpdateData = {
      smsNotifications: {
        enabled: true,
        provider: 'twilio',
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authToken: 'abcdefghijklmnopqrstuvwxyz1234567890',
        phoneNumber: '+1234567890'
      }
    };

    const smsUpdateResponse = await axios.put(`${BASE_URL}/api/admin/settings`, smsUpdateData, {
      headers: {
        'Authorization': 'Bearer admin-token-here', // You'll need to use a real admin token
        'Content-Type': 'application/json'
      }
    });

    if (smsUpdateResponse.data.success) {
      console.log('✅ Twilio SMS Settings updated successfully');
      console.log('📱 Updated SMS Settings:');
      console.log(`   - Enabled: ${smsUpdateResponse.data.settings.smsNotifications?.enabled}`);
      console.log(`   - Provider: ${smsUpdateResponse.data.settings.smsNotifications?.provider}`);
      console.log(`   - Account SID: "${smsUpdateResponse.data.settings.smsNotifications?.accountSid}"`);
      console.log(`   - Phone Number: "${smsUpdateResponse.data.settings.smsNotifications?.phoneNumber}"`);
    } else {
      console.log('❌ Twilio SMS Settings update failed:', smsUpdateResponse.data.error);
    }

    // Test 4: Verify settings persistence
    console.log('\n🔄 Test 4: Verifying settings persistence...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/admin/settings`, {
      headers: {
        'Authorization': 'Bearer admin-token-here', // You'll need to use a real admin token
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.data.success) {
      const settings = verifyResponse.data.settings;
      console.log('✅ Settings persistence verified');
      console.log('📧 Final Email Settings:');
      console.log(`   - Sender Name: "${settings.senderName}"`);
      console.log(`   - Email Footer: "${settings.emailFooter}"`);
      
      console.log('📱 Final SMS Settings:');
      console.log(`   - Enabled: ${settings.smsNotifications?.enabled}`);
      console.log(`   - Account SID: "${settings.smsNotifications?.accountSid}"`);
      console.log(`   - Phone Number: "${settings.smsNotifications?.phoneNumber}"`);
    } else {
      console.log('❌ Settings persistence verification failed:', verifyResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

console.log('🚀 Starting Email Sender Details and Twilio SMS Settings test...');
console.log('⚠️  Note: You need to replace "admin-token-here" with a real admin JWT token\n');

testEmailAndSmsSettings();
