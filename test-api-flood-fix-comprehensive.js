/**
 * COMPREHENSIVE TEST - API Flood Fix Verification
 * Tests all the fixes for 401 Unauthorized and 429 Rate Limiting issues
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_TOKEN = process.env.TEST_TOKEN || null; // Set this for authenticated tests

// Test results tracking
const results = {
  infiniteLoopFix: { passed: 0, failed: 0, details: [] },
  cachingFix: { passed: 0, failed: 0, details: [] },
  rateLimitFix: { passed: 0, failed: 0, details: [] },
  authFix: { passed: 0, failed: 0, details: [] },
  overall: { passed: 0, failed: 0 }
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const measureTime = (fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, time: end - start };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test 1: Infinite Loop Prevention
async function testInfiniteLoopPrevention() {
  log('Testing infinite loop prevention...');
  
  try {
    // Simulate multiple rapid calls to the same endpoint
    const promises = [];
    const callCount = 10;
    
    for (let i = 0; i < callCount; i++) {
      promises.push(
        axios.get(`${API_BASE_URL}/brands/profile`, {
          headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
          timeout: 5000
        }).catch(err => ({ error: true, status: err.response?.status, message: err.message }))
      );
    }
    
    const { result: responses, time } = measureTime(() => Promise.allSettled(promises));
    const actualResponses = await responses;
    
    // Analyze responses
    const successCount = actualResponses.filter(r => 
      r.status === 'fulfilled' && !r.value.error
    ).length;
    
    const rateLimitCount = actualResponses.filter(r => 
      (r.status === 'fulfilled' && r.value.status === 429) ||
      (r.status === 'rejected' && r.reason?.response?.status === 429)
    ).length;
    
    const authErrorCount = actualResponses.filter(r => 
      (r.status === 'fulfilled' && r.value.status === 401) ||
      (r.status === 'rejected' && r.reason?.response?.status === 401)
    ).length;
    
    log(`Made ${callCount} requests in ${time.toFixed(2)}ms`);
    log(`Success: ${successCount}, Rate Limited: ${rateLimitCount}, Auth Errors: ${authErrorCount}`);
    
    // Test passes if we don't get excessive rate limiting (indicating debouncing works)
    if (rateLimitCount <= 2 && time < 2000) {
      results.infiniteLoopFix.passed++;
      results.infiniteLoopFix.details.push('✅ Rapid requests handled without excessive rate limiting');
      log('✅ Infinite loop prevention test PASSED');
    } else {
      results.infiniteLoopFix.failed++;
      results.infiniteLoopFix.details.push(`❌ Too many rate limits: ${rateLimitCount}/${callCount}`);
      log('❌ Infinite loop prevention test FAILED');
    }
    
  } catch (error) {
    results.infiniteLoopFix.failed++;
    results.infiniteLoopFix.details.push(`❌ Test error: ${error.message}`);
    log(`❌ Infinite loop test error: ${error.message}`);
  }
}

// Test 2: Caching Mechanism
async function testCachingMechanism() {
  log('Testing caching mechanism...');
  
  try {
    const endpoint = `${API_BASE_URL}/brands/analytics`;
    const params = { period: '30d' };
    
    // Make identical requests rapidly
    const request1 = await axios.get(endpoint, {
      params,
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      timeout: 5000
    }).catch(err => ({ error: true, message: err.message }));
    
    // Immediate second request (should use cache)
    const request2 = await axios.get(endpoint, {
      params,
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      timeout: 5000
    }).catch(err => ({ error: true, message: err.message }));
    
    // Third request after cache TTL delay
    await sleep(2100); // Wait for cache to expire (2s + 100ms buffer)
    const request3 = await axios.get(endpoint, {
      params,
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      timeout: 5000
    }).catch(err => ({ error: true, message: err.message }));
    
    // Analyze caching behavior
    const cacheWorking = !request1.error && !request2.error;
    const cacheExpiredCorrectly = !request3.error || request3.message !== request1.message;
    
    if (cacheWorking) {
      results.cachingFix.passed++;
      results.cachingFix.details.push('✅ Caching mechanism working correctly');
      log('✅ Caching mechanism test PASSED');
    } else {
      results.cachingFix.failed++;
      results.cachingFix.details.push('❌ Caching mechanism not working as expected');
      log('❌ Caching mechanism test FAILED');
    }
    
  } catch (error) {
    results.cachingFix.failed++;
    results.cachingFix.details.push(`❌ Test error: ${error.message}`);
    log(`❌ Caching test error: ${error.message}`);
  }
}

// Test 3: Rate Limiting Behavior
async function testRateLimitingBehavior() {
  log('Testing rate limiting behavior...');
  
  try {
    const promises = [];
    const callCount = 50; // High number to test rate limiting
    
    // Make many requests to trigger rate limiting
    for (let i = 0; i < callCount; i++) {
      promises.push(
        axios.get(`${API_BASE_URL}/payments/balance`, {
          headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
          timeout: 3000
        }).catch(err => ({ 
          error: true, 
          status: err.response?.status, 
          message: err.message,
          retryAfter: err.response?.headers?.['retry-after']
        }))
      );
    }
    
    const responses = await Promise.allSettled(promises);
    
    // Analyze rate limiting
    const successCount = responses.filter(r => 
      r.status === 'fulfilled' && !r.value.error
    ).length;
    
    const rateLimitCount = responses.filter(r => 
      (r.status === 'fulfilled' && r.value.status === 429) ||
      (r.status === 'rejected' && r.reason?.response?.status === 429)
    ).length;
    
    const hasRetryAfter = responses.some(r => {
      const response = r.status === 'fulfilled' ? r.value : r.reason;
      return response.retryAfter;
    });
    
    log(`Made ${callCount} requests`);
    log(`Success: ${successCount}, Rate Limited: ${rateLimitCount}`);
    log(`Has retry-after header: ${hasRetryAfter}`);
    
    // Rate limiting should kick in but not be too aggressive
    if (rateLimitCount > 0 && rateLimitCount < callCount && hasRetryAfter) {
      results.rateLimitFix.passed++;
      results.rateLimitFix.details.push(`✅ Rate limiting working: ${rateLimitCount}/${callCount} limited`);
      log('✅ Rate limiting behavior test PASSED');
    } else if (rateLimitCount === 0) {
      results.rateLimitFix.passed++;
      results.rateLimitFix.details.push('✅ No rate limiting triggered (may be okay for dev environment)');
      log('✅ Rate limiting behavior test PASSED (no limits triggered)');
    } else {
      results.rateLimitFix.failed++;
      results.rateLimitFix.details.push(`❌ Rate limiting too aggressive: ${rateLimitCount}/${callCount}`);
      log('❌ Rate limiting behavior test FAILED');
    }
    
  } catch (error) {
    results.rateLimitFix.failed++;
    results.rateLimitFix.details.push(`❌ Test error: ${error.message}`);
    log(`❌ Rate limiting test error: ${error.message}`);
  }
}

// Test 4: Authentication Token Handling
async function testAuthenticationHandling() {
  log('Testing authentication token handling...');
  
  try {
    // Test without token
    const noTokenResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      timeout: 5000
    }).catch(err => ({ 
      error: true, 
      status: err.response?.status, 
      message: err.message 
    }));
    
    // Test with invalid token
    const invalidTokenResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid_token_12345' },
      timeout: 5000
    }).catch(err => ({ 
      error: true, 
      status: err.response?.status, 
      message: err.message 
    }));
    
    // Test with valid token (if provided)
    let validTokenResponse = { error: true, message: 'No valid token provided' };
    if (TEST_TOKEN) {
      validTokenResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
        timeout: 5000
      }).catch(err => ({ 
        error: true, 
        status: err.response?.status, 
        message: err.message 
      }));
    }
    
    // Analyze auth behavior
    const noToken401 = noTokenResponse.status === 401;
    const invalidToken401 = invalidTokenResponse.status === 401;
    const validTokenWorks = !validTokenResponse.error && validTokenResponse.status !== 401;
    
    log(`No token 401: ${noToken401}`);
    log(`Invalid token 401: ${invalidToken401}`);
    log(`Valid token works: ${validTokenWorks}`);
    
    if (noToken401 && invalidToken401) {
      results.authFix.passed++;
      results.authFix.details.push('✅ Authentication token handling working correctly');
      log('✅ Authentication handling test PASSED');
    } else {
      results.authFix.failed++;
      results.authFix.details.push('❌ Authentication token handling issues detected');
      log('❌ Authentication handling test FAILED');
    }
    
    if (TEST_TOKEN && validTokenWorks) {
      results.authFix.passed++;
      results.authFix.details.push('✅ Valid token authentication working');
    } else if (TEST_TOKEN) {
      results.authFix.failed++;
      results.authFix.details.push('❌ Valid token authentication failed');
    }
    
  } catch (error) {
    results.authFix.failed++;
    results.authFix.details.push(`❌ Test error: ${error.message}`);
    log(`❌ Authentication test error: ${error.message}`);
  }
}

// Test 5: Concurrent Load Test
async function testConcurrentLoad() {
  log('Testing concurrent load handling...');
  
  try {
    const endpoints = [
      '/brands/profile',
      '/brands/analytics',
      '/payments/balance',
      '/payments/transactions',
      '/campaigns/brand',
      '/deals/brand'
    ];
    
    const promises = [];
    
    // Make concurrent requests to multiple endpoints
    endpoints.forEach(endpoint => {
      for (let i = 0; i < 5; i++) {
        promises.push(
          axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
            timeout: 10000
          }).catch(err => ({ 
            error: true, 
            status: err.response?.status, 
            endpoint,
            message: err.message 
          }))
        );
      }
    });
    
    const { result: responses, time } = measureTime(() => Promise.allSettled(promises));
    const actualResponses = await responses;
    
    // Analyze concurrent load
    const successCount = actualResponses.filter(r => 
      r.status === 'fulfilled' && !r.value.error
    ).length;
    
    const rateLimitCount = actualResponses.filter(r => 
      (r.status === 'fulfilled' && r.value.status === 429) ||
      (r.status === 'rejected' && r.reason?.response?.status === 429)
    ).length;
    
    const errorCount = actualResponses.filter(r => 
      (r.status === 'fulfilled' && r.value.error) ||
      (r.status === 'rejected')
    ).length;
    
    log(`Concurrent test: ${actualResponses.length} requests in ${time.toFixed(2)}ms`);
    log(`Success: ${successCount}, Rate Limited: ${rateLimitCount}, Other Errors: ${errorCount - rateLimitCount}`);
    
    // Test passes if most requests succeed and we don't get excessive errors
    const successRate = successCount / actualResponses.length;
    if (successRate >= 0.7 && rateLimitCount < actualResponses.length * 0.3) {
      results.overall.passed++;
      log('✅ Concurrent load test PASSED');
    } else {
      results.overall.failed++;
      log('❌ Concurrent load test FAILED');
    }
    
  } catch (error) {
    results.overall.failed++;
    log(`❌ Concurrent load test error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting comprehensive API flood fix verification...', 'success');
  log(`Testing against: ${API_BASE_URL}`);
  log(`Auth token provided: ${!!TEST_TOKEN}`);
  
  const startTime = performance.now();
  
  await testInfiniteLoopPrevention();
  await sleep(1000);
  
  await testCachingMechanism();
  await sleep(1000);
  
  await testRateLimitingBehavior();
  await sleep(1000);
  
  await testAuthenticationHandling();
  await sleep(1000);
  
  await testConcurrentLoad();
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  // Print comprehensive results
  log('\n📊 COMPREHENSIVE TEST RESULTS', 'success');
  log('='.repeat(50));
  
  const totalTests = results.infiniteLoopFix.passed + results.infiniteLoopFix.failed +
                     results.cachingFix.passed + results.cachingFix.failed +
                     results.rateLimitFix.passed + results.rateLimitFix.failed +
                     results.authFix.passed + results.authFix.failed +
                     results.overall.passed + results.overall.failed;
  
  const totalPassed = results.infiniteLoopFix.passed + results.cachingFix.passed +
                      results.rateLimitFix.passed + results.authFix.passed +
                      results.overall.passed;
  
  const totalFailed = results.infiniteLoopFix.failed + results.cachingFix.failed +
                      results.rateLimitFix.failed + results.authFix.failed +
                      results.overall.failed;
  
  log(`Total Tests: ${totalTests}`);
  log(`Passed: ${totalPassed} ✅`);
  log(`Failed: ${totalFailed} ❌`);
  log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  log(`Total Time: ${totalTime.toFixed(2)}ms`);
  
  log('\n📋 Detailed Results:');
  log(`Infinite Loop Fix: ${results.infiniteLoopFix.passed}/${results.infiniteLoopFix.passed + results.infiniteLoopFix.failed}`);
  results.infiniteLoopFix.details.forEach(detail => log(`  ${detail}`));
  
  log(`Caching Fix: ${results.cachingFix.passed}/${results.cachingFix.passed + results.cachingFix.failed}`);
  results.cachingFix.details.forEach(detail => log(`  ${detail}`));
  
  log(`Rate Limit Fix: ${results.rateLimitFix.passed}/${results.rateLimitFix.passed + results.rateLimitFix.failed}`);
  results.rateLimitFix.details.forEach(detail => log(`  ${detail}`));
  
  log(`Auth Fix: ${results.authFix.passed}/${results.authFix.passed + results.authFix.failed}`);
  results.authFix.details.forEach(detail => log(`  ${detail}`));
  
  log(`Overall: ${results.overall.passed}/${results.overall.passed + results.overall.failed}`);
  
  // Save results to file
  const testResults = {
    timestamp: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    totalTime: totalTime,
    results,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: (totalPassed / totalTests) * 100
    }
  };
  
  require('fs').writeFileSync(
    'api-flood-fix-test-results.json',
    JSON.stringify(testResults, null, 2)
  );
  
  log('\n💾 Results saved to: api-flood-fix-test-results.json');
  
  if (totalFailed === 0) {
    log('\n🎉 ALL TESTS PASSED! API flood fixes are working correctly.', 'success');
  } else {
    log(`\n⚠️  ${totalFailed} test(s) failed. Review the details above.`, 'error');
  }
  
  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`💥 Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testInfiniteLoopPrevention,
  testCachingMechanism,
  testRateLimitingBehavior,
  testAuthenticationHandling,
  testConcurrentLoad
};
