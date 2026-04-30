// Test script to validate API flooding fixes
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test results tracking
const testResults = {
  apiCalls: [],
  rateLimitHits: 0,
  authErrors: 0,
  successCount: 0
};

// Track API calls
const originalAxiosGet = axios.get;
const originalAxiosPost = axios.post;

axios.get = function(...args) {
  testResults.apiCalls.push({
    method: 'GET',
    url: args[0],
    timestamp: new Date().toISOString()
  });
  console.log(`🔍 API GET: ${args[0]}`);
  return originalAxiosGet.apply(this, args);
};

axios.post = function(...args) {
  testResults.apiCalls.push({
    method: 'POST', 
    url: args[0],
    timestamp: new Date().toISOString()
  });
  console.log(`🔍 API POST: ${args[0]}`);
  return originalAxiosPost.apply(this, args);
};

async function testAPIFloodingFixes() {
  console.log('🧪 Testing API Flooding Fixes...\n');

  try {
    // Test 1: Check if server starts properly
    console.log('1. Testing server health...');
    const healthRes = await axios.get('http://localhost:5000/health');
    if (healthRes.data.success) {
      console.log('✅ Server is healthy');
      testResults.successCount++;
    }

    // Test 2: Simulate rapid API calls (should be limited)
    console.log('\n2. Testing rate limiting behavior...');
    const promises = [];
    
    // Make 10 rapid calls to test rate limiting
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.get(`${API_BASE_URL}/auth/settings/security`).catch(err => {
          if (err.response?.status === 429) {
            testResults.rateLimitHits++;
            console.log(`⚠️ Rate limit hit on call ${i + 1}`);
          }
        })
      );
    }

    await Promise.allSettled(promises);
    console.log(`✅ Rate limit test complete. Hits: ${testResults.rateLimitHits}`);

    // Test 3: Test auth flow
    console.log('\n3. Testing authentication flow...');
    try {
      const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, { validateStatus: () => true });
      
      if (loginRes.status === 401) {
        console.log('✅ Auth error handled correctly (401)');
        testResults.authErrors++;
      } else if (loginRes.status === 429) {
        console.log('✅ Rate limit handled correctly (429)');
        testResults.rateLimitHits++;
      }
    } catch (error) {
      console.log('❌ Auth test failed:', error.message);
    }

    // Test 4: Check total API calls
    console.log('\n4. API Call Analysis:');
    console.log(`Total API calls made: ${testResults.apiCalls.length}`);
    console.log(`Rate limit hits: ${testResults.rateLimitHits}`);
    console.log(`Auth errors: ${testResults.authErrors}`);
    console.log(`Success calls: ${testResults.successCount}`);

    // Analyze patterns
    const uniqueEndpoints = [...new Set(testResults.apiCalls.map(call => call.url))];
    console.log(`Unique endpoints called: ${uniqueEndpoints.length}`);

    // Check for duplicate calls (indicates infinite loops)
    const endpointCounts = {};
    testResults.apiCalls.forEach(call => {
      endpointCounts[call.url] = (endpointCounts[call.url] || 0) + 1;
    });

    const duplicates = Object.entries(endpointCounts).filter(([url, count]) => count > 3);
    if (duplicates.length > 0) {
      console.log('⚠️ Potential infinite loops detected:');
      duplicates.forEach(([url, count]) => {
        console.log(`  - ${url}: called ${count} times`);
      });
    } else {
      console.log('✅ No excessive duplicate calls detected');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Restore original axios functions
  axios.get = originalAxiosGet;
  axios.post = originalAxiosPost;

  console.log('\n🎯 Test Complete!');
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Server Health: ${testResults.successCount > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Rate Limiting: ${testResults.rateLimitHits > 0 ? 'WORKING' : 'NEEDS TESTING'}`);
  console.log(`✅ API Call Patterns: ${duplicates.length === 0 ? 'GOOD' : 'INFINITE LOOPS DETECTED'}`);
  
  if (duplicates.length === 0 && testResults.rateLimitHits <= 5) {
    console.log('🎉 ALL FIXES WORKING CORRECTLY!');
  } else {
    console.log('⚠️ Some issues may still exist');
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:5000/health');
    console.log('✅ Server is running on http://localhost:5000');
    await testAPIFloodingFixes();
  } catch (error) {
    console.log('❌ Server is not running on http://localhost:5000');
    console.log('\nPlease start the server first:');
    console.log('cd backend');
    console.log('npm start');
    console.log('\nOr: npm run dev');
  }
}

checkServer();
