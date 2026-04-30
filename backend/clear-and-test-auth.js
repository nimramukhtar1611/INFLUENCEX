/**
 * Clear Invalid Tokens and Test Fresh Authentication
 * This script helps diagnose and fix 401 errors by testing fresh tokens
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');

console.log('🔧 Clear and Test Authentication');
console.log('================================');

// Test API endpoint
const API_BASE_URL = 'http://localhost:5000/api';

async function testFreshAuth() {
  try {
    console.log('\n📋 Step 1: Test /health endpoint (no auth required)');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Health endpoint working:', healthResponse.data.status);

    console.log('\n📋 Step 2: Test /auth/me without token (should return 401)');
    try {
      await axios.get(`${API_BASE_URL}/auth/me`, { timeout: 5000 });
      console.log('❌ /auth/me should have returned 401');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ /auth/me correctly returns 401 without token');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n📋 Step 3: Test login with fresh credentials');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'test123456',
      userType: 'brand'
    }, { timeout: 10000 }).catch(err => {
      console.log('❌ Login failed (expected for test user):', err.response?.data?.error || err.message);
      return null;
    });

    if (loginResponse?.data?.success) {
      const { accessToken, refreshToken, user } = loginResponse.data;
      console.log('✅ Login successful');
      console.log('Token length:', accessToken.length);
      console.log('User type:', user.userType);

      console.log('\n📋 Step 4: Test /auth/me with fresh token');
      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000
      });

      if (meResponse.data?.success) {
        console.log('✅ /auth/me working with fresh token');
        console.log('User data:', meResponse.data.user.email);
      } else {
        console.log('❌ /auth/me failed even with fresh token');
      }
    }

    console.log('\n📋 Step 5: Instructions for fixing the issue');
    console.log('1. Clear browser localStorage: localStorage.clear()');
    console.log('2. Restart the backend server');
    console.log('3. Login again with fresh credentials');
    console.log('4. Check browser console for "Token being sent:" logs');
    console.log('5. Check backend console for "Auth middleware - verifying token:" logs');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 5000');
    }
  }
}

// Run the test
testFreshAuth();
