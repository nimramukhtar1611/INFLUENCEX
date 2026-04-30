// test-simple-auth.js - Simple authentication test
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testTokenRefresh() {
  console.log('🧪 Testing Token Refresh Mechanism...\n');
  
  try {
    // Test with admin login endpoint
    console.log('1️⃣ Testing Admin Login...');
    const adminLoginData = {
      email: 'admin@influencex.com',
      password: 'admin123'
    };
    
    try {
      const adminLoginResponse = await axios.post(`${API_BASE_URL}/admin/login`, adminLoginData);
      console.log('✅ Admin Login successful:', {
        success: adminLoginResponse.data.success,
        hasAccessToken: !!adminLoginResponse.data.token,
        hasRefreshToken: !!adminLoginResponse.data.refreshToken,
        userType: adminLoginResponse.data.admin?.userType
      });
      
      const { token: accessToken, refreshToken } = adminLoginResponse.data;
      
      // Test 2: Test protected route with access token
      console.log('\n2️⃣ Testing Protected Route...');
      try {
        const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log('✅ Protected route access successful:', {
          success: meResponse.data.success,
          userId: meResponse.data.user?._id
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
      
      console.log('\n🎉 Token refresh test completed!');
      
    } catch (adminError) {
      console.log('❌ Admin login failed, trying regular user login...');
      
      // Try with a test user
      const testLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      try {
        const testLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, testLoginData);
        console.log('✅ Test Login successful:', {
          success: testLoginResponse.data.success,
          hasAccessToken: !!testLoginResponse.data.accessToken,
          hasRefreshToken: !!testLoginResponse.data.refreshToken
        });
        
        const { accessToken, refreshToken } = testLoginResponse.data;
        
        // Test token refresh with test user
        console.log('\n3️⃣ Testing Token Refresh with Test User...');
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });
        console.log('✅ Token refresh successful:', {
          success: refreshResponse.data.success,
          hasNewAccessToken: !!refreshResponse.data.accessToken
        });
        
      } catch (testError) {
        console.log('❌ Test login also failed:', testError.response?.data?.error);
        console.log('💡 No valid test users found. Please create a test user first.');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testTokenRefresh();
