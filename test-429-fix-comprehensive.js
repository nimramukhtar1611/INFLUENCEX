// test-429-fix-comprehensive.js - Comprehensive test for 429 rate limit fixes
const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const CONCURRENT_REQUESTS = 50;
const RAPID_REQUESTS = 20;
const TEST_DELAY = 100; // ms between requests

// Test results tracking
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  rateLimitedRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  duplicateRequestsPrevented: 0,
  responseTimes: []
};

// Utility to measure response time
const measureRequest = async (requestFn, label) => {
  const start = performance.now();
  try {
    const response = await requestFn();
    const end = performance.now();
    const responseTime = end - start;
    
    results.responseTimes.push(responseTime);
    results.totalRequests++;
    
    if (response.status === 200) {
      results.successfulRequests++;
      console.log(`✅ ${label}: Success (${responseTime.toFixed(2)}ms)`);
    } else if (response.status === 429) {
      results.rateLimitedRequests++;
      console.log(`⚠️ ${label}: Rate limited (${responseTime.toFixed(2)}ms) - Retry-After: ${response.headers['retry-after'] || 'N/A'}`);
    } else {
      results.failedRequests++;
      console.log(`❌ ${label}: Failed with status ${response.status} (${responseTime.toFixed(2)}ms)`);
    }
    
    return response;
  } catch (error) {
    const end = performance.now();
    const responseTime = end - start;
    results.responseTimes.push(responseTime);
    results.totalRequests++;
    results.failedRequests++;
    
    console.log(`❌ ${label}: Error - ${error.message} (${responseTime.toFixed(2)}ms)`);
    throw error;
  }
};

// Test 1: Login API stress test
const testLoginStress = async () => {
  console.log('\n🧪 Test 1: Login API Stress Test');
  console.log('Making rapid login requests to test rate limiting...');
  
  const loginPromises = [];
  const loginData = {
    email: 'test@example.com',
    password: 'testpassword123',
    userType: 'brand'
  };
  
  // Make concurrent login requests
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const promise = measureRequest(
      () => axios.post(`${API_BASE_URL}/auth/login`, loginData, { timeout: 10000 }),
      `Login-${i + 1}`
    );
    loginPromises.push(promise);
    
    // Add small delay between some requests to test debouncing
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
    }
  }
  
  try {
    await Promise.allSettled(loginPromises);
    console.log(`✅ Login stress test completed. Total requests: ${CONCURRENT_REQUESTS}`);
  } catch (error) {
    console.log('❌ Login stress test encountered errors:', error.message);
  }
};

// Test 2: Auth endpoint rate limiting
const testAuthRateLimit = async () => {
  console.log('\n🧪 Test 2: Auth Endpoint Rate Limiting');
  console.log('Testing various auth endpoints for rate limiting...');
  
  const endpoints = [
    '/auth/me',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/send-otp'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    const promises = [];
    
    for (let i = 0; i < RAPID_REQUESTS; i++) {
      const promise = measureRequest(
        () => axios.get(`${API_BASE_URL}${endpoint}`, { timeout: 5000 }),
        `${endpoint}-${i + 1}`
      );
      promises.push(promise);
    }
    
    await Promise.allSettled(promises);
  }
};

// Test 3: Duplicate request prevention
const testDuplicatePrevention = async () => {
  console.log('\n🧪 Test 3: Duplicate Request Prevention');
  console.log('Testing if duplicate requests are properly prevented...');
  
  const requestData = {
    email: 'duplicate@example.com',
    password: 'testpassword123',
    userType: 'creator'
  };
  
  // Make identical requests rapidly
  const duplicatePromises = [];
  for (let i = 0; i < 10; i++) {
    const promise = measureRequest(
      () => axios.post(`${API_BASE_URL}/auth/login`, requestData, { timeout: 5000 }),
      `Duplicate-${i + 1}`
    );
    duplicatePromises.push(promise);
    
    // Very small delay to trigger duplicate detection
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  await Promise.allSettled(duplicatePromises);
};

// Test 4: Token refresh handling
const testTokenRefresh = async () => {
  console.log('\n🧪 Test 4: Token Refresh Handling');
  console.log('Testing token refresh rate limiting...');
  
  const refreshPromises = [];
  for (let i = 0; i < 15; i++) {
    const promise = measureRequest(
      () => axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: 'invalid-token' }, { timeout: 5000 }),
      `Refresh-${i + 1}`
    );
    refreshPromises.push(promise);
  }
  
  await Promise.allSettled(refreshPromises);
};

// Test 5: General API rate limiting
const testGeneralRateLimit = async () => {
  console.log('\n🧪 Test 5: General API Rate Limiting');
  console.log('Testing general API endpoints...');
  
  const endpoints = [
    '/global/settings',
    '/campaigns',
    '/brands',
    '/creators'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      const promise = measureRequest(
        () => axios.get(`${API_BASE_URL}${endpoint}`, { timeout: 5000 }),
        `${endpoint}-${i + 1}`
      );
      promises.push(promise);
    }
    
    await Promise.allSettled(promises);
  }
};

// Calculate statistics
const calculateStats = () => {
  if (results.responseTimes.length === 0) return;
  
  results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  const minResponseTime = Math.min(...results.responseTimes);
  const maxResponseTime = Math.max(...results.responseTimes);
  
  console.log('\n📊 Test Results Summary:');
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Successful: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Rate Limited: ${results.rateLimitedRequests} (${((results.rateLimitedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Average Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
  console.log(`Min Response Time: ${minResponseTime.toFixed(2)}ms`);
  console.log(`Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
  
  // Rate limiting effectiveness
  if (results.rateLimitedRequests > 0) {
    console.log(`✅ Rate limiting is working - ${results.rateLimitedRequests} requests were throttled`);
  } else {
    console.log(`⚠️ No rate limiting detected - this might indicate limits are too high`);
  }
  
  // Performance assessment
  if (results.averageResponseTime < 1000) {
    console.log(`✅ Good performance - average response time under 1 second`);
  } else {
    console.log(`⚠️ Performance concern - average response time over 1 second`);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting 429 Rate Limit Fix Comprehensive Tests');
  console.log('==================================================');
  
  try {
    await testLoginStress();
    await testAuthRateLimit();
    await testDuplicatePrevention();
    await testTokenRefresh();
    await testGeneralRateLimit();
    
    calculateStats();
    
    console.log('\n✅ All tests completed!');
    
    // Save results to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(`429-test-results-${timestamp}.json`, JSON.stringify(results, null, 2));
    console.log(`📁 Results saved to: 429-test-results-${timestamp}.json`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testLoginStress,
  testAuthRateLimit,
  testDuplicatePrevention,
  testTokenRefresh,
  testGeneralRateLimit,
  results
};
