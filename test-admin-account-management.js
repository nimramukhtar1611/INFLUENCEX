// Test script for admin email and password change functionality
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test data
let adminToken = null;
let testAdmin = {
  email: 'testadmin@example.com',
  password: 'TestAdmin123!'
};

async function loginAdmin() {
  try {
    console.log('🔐 Testing admin login...');
    const response = await axios.post(`${API_BASE}/admin/login`, testAdmin);
    
    if (response.data.success) {
      adminToken = response.data.token;
      console.log('✅ Admin login successful');
      console.log('📧 Admin email:', response.data.admin.email);
      return true;
    } else {
      console.log('❌ Admin login failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testEmailChange() {
  try {
    console.log('\n📧 Testing admin email change...');
    
    const newEmail = 'newadmin@example.com';
    const emailData = {
      newEmail: newEmail,
      confirmNewEmail: newEmail
    };

    const response = await axios.put(
      `${API_BASE}/admin/account/email`,
      emailData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✅ Email change request successful');
      console.log('📬 Verification email sent to:', newEmail);
      console.log('⚠️  Note: Email verification required to complete the change');
      return true;
    } else {
      console.log('❌ Email change failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Email change error:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testPasswordChange() {
  try {
    console.log('\n🔒 Testing admin password change...');
    
    const passwordData = {
      currentPassword: testAdmin.password,
      newPassword: 'NewTestAdmin456!',
      confirmNewPassword: 'NewTestAdmin456!'
    };

    const response = await axios.put(
      `${API_BASE}/admin/account/password`,
      passwordData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✅ Password change successful');
      console.log('📧 Notification email sent to:', testAdmin.email);
      
      // Update test password for future tests
      testAdmin.password = passwordData.newPassword;
      return true;
    } else {
      console.log('❌ Password change failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Password change error:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testInvalidEmailChange() {
  try {
    console.log('\n🚫 Testing invalid email change...');
    
    // Test with mismatched emails
    const emailData = {
      newEmail: 'invalid@example.com',
      confirmNewEmail: 'different@example.com'
    };

    const response = await axios.put(
      `${API_BASE}/admin/account/email`,
      emailData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('❌ Expected error but got success');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected mismatched emails:', error.response.data.error);
      return true;
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      return false;
    }
  }
}

async function testInvalidPasswordChange() {
  try {
    console.log('\n🚫 Testing invalid password change...');
    
    // Test with wrong current password
    const passwordData = {
      currentPassword: 'wrongpassword',
      newPassword: 'NewTestAdmin456!',
      confirmNewPassword: 'NewTestAdmin456!'
    };

    const response = await axios.put(
      `${API_BASE}/admin/account/password`,
      passwordData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('❌ Expected error but got success');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected wrong current password:', error.response.data.error);
      return true;
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      return false;
    }
  }
}

async function testUnauthorizedAccess() {
  try {
    console.log('\n🚫 Testing unauthorized access...');
    
    const response = await axios.put(
      `${API_BASE}/admin/account/email`,
      { newEmail: 'test@example.com', confirmNewEmail: 'test@example.com' },
      {
        headers: {
          'Authorization': 'Bearer invalidtoken',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('❌ Expected error but got success');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected unauthorized access');
      return true;
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.error || error.message);
      return false;
    }
  }
}

async function runTests() {
  console.log('🧪 Starting Admin Account Management Tests');
  console.log('=====================================');

  // Test login first
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed with tests - login failed');
    return;
  }

  // Run tests
  const results = [];
  
  results.push(await testEmailChange());
  results.push(await testPasswordChange());
  results.push(await testInvalidEmailChange());
  results.push(await testInvalidPasswordChange());
  results.push(await testUnauthorizedAccess());

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Admin account management is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }

  console.log('\n📝 Notes:');
  console.log('- Email change requires verification via email link');
  console.log('- Password change sends notification email');
  console.log('- All actions are logged in audit trail');
  console.log('- Proper validation and error handling implemented');
}

// Run tests
runTests().catch(console.error);
