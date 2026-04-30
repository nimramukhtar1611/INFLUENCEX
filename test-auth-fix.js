// test-auth-fix.js - Test authentication fixes
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');
  
  try {
    // Test 1: Login with existing admin user (bypasses CAPTCHA)
    console.log('1️⃣ Testing Login...');
    const loginData = {
      email: 'admin@influencex.com',
      password: 'admin123'
    };
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    console.log('✅ Login successful:', {
      success: loginResponse.data.success,
      hasAccessToken: !!loginResponse.data.accessToken,
      hasRefreshToken: !!loginResponse.data.refreshToken,
      hasUser: !!loginResponse.data.user
    });
    
    const { accessToken, refreshToken, user } = loginResponse.data;
    
    // Test 2: Test protected route with access token
    console.log('\n2️⃣ Testing Protected Route...');
    try {
      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('✅ Protected route access successful:', {
        success: meResponse.data.success,
        userId: meResponse.data.user._id
      });
    } catch (error) {
      console.log('❌ Protected route access failed:', error.response?.data?.error);
    }
    
    // Test 3: Test token refresh
    console.log('\n3️⃣ Testing Token Refresh...');
    try {
      const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken
      });
      console.log('✅ Token refresh successful:', {
        success: refreshResponse.data.success,
        hasNewAccessToken: !!refreshResponse.data.accessToken,
        hasNewRefreshToken: !!refreshResponse.data.refreshToken
      });
      
      const newAccessToken = refreshResponse.data.accessToken;
      
      // Test new token
      const newMeResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${newAccessToken}` }
      });
      console.log('✅ New token works:', {
        success: newMeResponse.data.success
      });
      
    } catch (error) {
      console.log('❌ Token refresh failed:', error.response?.data?.error);
    }
    
    // Test 4: Test login
    console.log('\n4️⃣ Testing Login...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'testuser@example.com',
        password: 'TestPassword123!'
      });
      console.log('✅ Login successful:', {
        success: loginResponse.data.success,
        hasAccessToken: !!loginResponse.data.accessToken,
        hasRefreshToken: !!loginResponse.data.refreshToken
      });
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error);
    }
    
    console.log('\n🎉 Authentication flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAuthFlow();
