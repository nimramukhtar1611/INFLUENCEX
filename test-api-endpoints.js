// Test script to verify API endpoints are working
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing API Endpoints...\n');

  // Test health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const healthRes = await axios.get('http://localhost:5000/health');
    console.log('✅ Health check:', healthRes.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test auth endpoints
  try {
    console.log('\n2. Testing auth endpoints...');
    
    // Test login endpoint exists
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    }, { validateStatus: () => true });
    
    console.log('✅ Login endpoint responds (status:', loginRes.status, ')');
    if (loginRes.data.error) {
      console.log('   Expected error:', loginRes.data.error);
    }
  } catch (error) {
    console.log('❌ Login endpoint failed:', error.message);
  }

  // Test refresh endpoint
  try {
    console.log('\n3. Testing refresh endpoint...');
    const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: 'invalid-token'
    }, { validateStatus: () => true });
    
    console.log('✅ Refresh endpoint responds (status:', refreshRes.status, ')');
    if (refreshRes.data.error) {
      console.log('   Expected error:', refreshRes.data.error);
    }
  } catch (error) {
    console.log('❌ Refresh endpoint failed:', error.message);
  }

  // Test public settings endpoint
  try {
    console.log('\n4. Testing public settings endpoint...');
    const settingsRes = await axios.get(`${API_BASE_URL}/auth/settings/security`);
    console.log('✅ Settings endpoint:', settingsRes.data);
  } catch (error) {
    console.log('❌ Settings endpoint failed:', error.message);
  }

  console.log('\n🎯 API Test Complete!');
  console.log('\nIf all endpoints respond (even with errors), the server is working.');
  console.log('Next steps:');
  console.log('1. Start the frontend: npm run dev');
  console.log('2. Open browser to http://localhost:5173');
  console.log('3. Try login/signup functionality');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:5000/health');
    console.log('✅ Server is running on http://localhost:5000');
    await testAPI();
  } catch (error) {
    console.log('❌ Server is not running on http://localhost:5000');
    console.log('\nPlease start the server first:');
    console.log('cd backend');
    console.log('npm start');
    console.log('\nOr: npm run dev');
  }
}

checkServer();
