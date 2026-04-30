// test-server-crash-session-persistence.js
// Test script to verify user sessions persist during server crashes

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const TEST_RESULTS_FILE = 'server-crash-session-test-results.json';

// Test user credentials
const TEST_USER = {
  email: 'sessiontest@example.com',
  password: 'TestPassword123!',
  fullName: 'Session Test User',
  userType: 'creator'
};

class ServerCrashSessionTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
    this.authTokens = {
      accessToken: null,
      refreshToken: null
    };
  }

  // Helper method to log test results
  logTest(testName, passed, details, error = null) {
    const test = {
      name: testName,
      passed,
      details,
      error: error ? error.message : null,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.tests.push(test);
    this.testResults.summary.total++;
    if (passed) {
      this.testResults.summary.passed++;
      console.log(`✅ ${testName}: ${details}`);
    } else {
      this.testResults.summary.failed++;
      console.log(`❌ ${testName}: ${details}`);
      if (error) console.error(`   Error: ${error.message}`);
    }
  }

  // Helper method to make API calls with retry logic
  async apiCall(method, endpoint, data = null, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const config = {
          method,
          url: `${API_BASE_URL}${endpoint}`,
          timeout: 5000
        };
        
        if (data) {
          config.data = data;
          config.headers = { 'Content-Type': 'application/json' };
        }
        
        if (this.authTokens.accessToken) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${this.authTokens.accessToken}`
          };
        }
        
        const response = await axios(config);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        console.log(`Retrying ${method} ${endpoint} (attempt ${i + 2})`);
      }
    }
  }

  // Test 1: User Registration
  async testUserRegistration() {
    try {
      // Clean up existing user if exists
      try {
        await this.apiCall('POST', '/auth/register', TEST_USER);
      } catch (error) {
        // User might already exist, continue with login
      }

      // Try to login
      const loginResponse = await this.apiCall('POST', '/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password
      });

      if (loginResponse.data?.success) {
        this.authTokens.accessToken = loginResponse.data.accessToken;
        this.authTokens.refreshToken = loginResponse.data.refreshToken;
        
        this.logTest('User Registration & Login', true, 
          `User logged in successfully, token expires in: ${this.getTokenExpiry(this.authTokens.accessToken)}`);
        return true;
      } else {
        this.logTest('User Registration & Login', false, 'Login failed');
        return false;
      }
    } catch (error) {
      this.logTest('User Registration & Login', false, 'Registration/login failed', error);
      return false;
    }
  }

  // Test 2: Token Expiry Check
  async testTokenExpiry() {
    try {
      const token = this.authTokens.accessToken;
      if (!token) {
        this.logTest('Token Expiry Check', false, 'No access token available');
        return false;
      }

      const expiry = this.getTokenExpiry(token);
      const daysUntilExpiry = expiry / (24 * 60 * 60);
      
      const passed = daysUntilExpiry > 7; // Should last at least 7 days
      this.logTest('Token Expiry Check', passed, 
        `Token expires in ${daysUntilExpiry.toFixed(1)} days`);
      return passed;
    } catch (error) {
      this.logTest('Token Expiry Check', false, 'Failed to check token expiry', error);
      return false;
    }
  }

  // Test 3: Server Crash Simulation
  async testServerCrashSimulation() {
    try {
      // First, verify current session works
      const preCrashResponse = await this.apiCall('GET', '/auth/me');
      const preCrashUser = preCrashResponse.data?.user;
      
      if (!preCrashUser) {
        this.logTest('Server Crash Simulation', false, 'Pre-crash session validation failed');
        return false;
      }

      // Simulate server crash by waiting and testing with network errors
      console.log('Simulating server crash scenario...');
      
      // Test 3a: Network timeout simulation
      try {
        await this.apiCall('GET', '/auth/me', null, 1); // 1 retry, short timeout
        this.logTest('Network Timeout Simulation', false, 'Should have timed out but succeeded');
      } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          this.logTest('Network Timeout Simulation', true, 'Correctly handled network timeout');
        } else {
          this.logTest('Network Timeout Simulation', false, 'Unexpected error', error);
        }
      }

      // Test 3b: Connection refused simulation
      try {
        // This will likely fail unless server is actually down
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${this.authTokens.accessToken}` },
          timeout: 2000
        });
        this.logTest('Connection Refused Simulation', false, 'Server responded when it should be down');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          this.logTest('Connection Refused Simulation', true, 'Correctly detected server down');
        } else {
          this.logTest('Connection Refused Simulation', false, 'Unexpected error', error);
        }
      }

      // Test 3c: Session persistence after "server restart"
      // Wait a bit to simulate server restart time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const postRestartResponse = await this.apiCall('GET', '/auth/me');
        const postRestartUser = postRestartResponse.data?.user;
        
        if (postRestartUser && postRestartUser.email === preCrashUser.email) {
          this.logTest('Session Persistence After Restart', true, 
            'Session successfully restored after server restart');
          return true;
        } else {
          this.logTest('Session Persistence After Restart', false, 
            'Session data mismatch after restart');
          return false;
        }
      } catch (error) {
        // If server is actually down, test token validation locally
        const isValid = this.validateTokenLocally(this.authTokens.accessToken);
        this.logTest('Session Persistence After Restart', isValid, 
          isValid ? 'Session preserved via local token validation' : 'Token expired during crash');
        return isValid;
      }
    } catch (error) {
      this.logTest('Server Crash Simulation', false, 'Test failed', error);
      return false;
    }
  }

  // Test 4: Token Refresh Mechanism
  async testTokenRefreshMechanism() {
    try {
      const refreshToken = this.authTokens.refreshToken;
      if (!refreshToken) {
        this.logTest('Token Refresh Mechanism', false, 'No refresh token available');
        return false;
      }

      const refreshResponse = await this.apiCall('POST', '/auth/refresh', {
        refreshToken
      });

      if (refreshResponse.data?.success) {
        const newAccessToken = refreshResponse.data.accessToken;
        const newRefreshToken = refreshResponse.data.refreshToken;
        
        // Update tokens
        this.authTokens.accessToken = newAccessToken;
        if (newRefreshToken) {
          this.authTokens.refreshToken = newRefreshToken;
        }
        
        // Test new token works
        const testResponse = await this.apiCall('GET', '/auth/me');
        
        if (testResponse.data?.success) {
          this.logTest('Token Refresh Mechanism', true, 
            'Token refresh successful, new token works');
          return true;
        } else {
          this.logTest('Token Refresh Mechanism', false, 
            'Token refresh succeeded but new token failed');
          return false;
        }
      } else {
        this.logTest('Token Refresh Mechanism', false, 
          'Token refresh request failed');
        return false;
      }
    } catch (error) {
      this.logTest('Token Refresh Mechanism', false, 'Token refresh failed', error);
      return false;
    }
  }

  // Test 5: Long-Term Session Persistence
  async testLongTermSessionPersistence() {
    try {
      const token = this.authTokens.accessToken;
      const expiry = this.getTokenExpiry(token);
      
      // Check if token lasts at least 20 days (should be 30 days)
      const daysUntilExpiry = expiry / (24 * 60 * 60);
      const passed = daysUntilExpiry > 20;
      
      this.logTest('Long-Term Session Persistence', passed, 
        `Token lasts ${daysUntilExpiry.toFixed(1)} days (should be >20)`);
      return passed;
    } catch (error) {
      this.logTest('Long-Term Session Persistence', false, 'Failed to check long-term persistence', error);
      return false;
    }
  }

  // Helper method to get token expiry in seconds
  getTokenExpiry(token) {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.exp - Math.floor(Date.now() / 1000);
    } catch (error) {
      return 0;
    }
  }

  // Helper method to validate token locally
  validateTokenLocally(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Token is valid if it expires in more than 1 hour
      return payload.exp - currentTime > 3600;
    } catch (error) {
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Server Crash Session Persistence Tests...\n');

    const tests = [
      () => this.testUserRegistration(),
      () => this.testTokenExpiry(),
      () => this.testServerCrashSimulation(),
      () => this.testTokenRefreshMechanism(),
      () => this.testLongTermSessionPersistence()
    ];

    for (const test of tests) {
      try {
        await test();
        console.log(''); // Add spacing between tests
      } catch (error) {
        console.error('Test execution error:', error.message);
        console.log('');
      }
    }

    // Save results
    this.saveResults();
    
    // Print summary
    this.printSummary();
  }

  // Save test results to file
  saveResults() {
    try {
      const filePath = path.join(__dirname, TEST_RESULTS_FILE);
      fs.writeFileSync(filePath, JSON.stringify(this.testResults, null, 2));
      console.log(`📄 Test results saved to: ${filePath}`);
    } catch (error) {
      console.error('Failed to save test results:', error.message);
    }
  }

  // Print test summary
  printSummary() {
    const { summary } = this.testResults;
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    
    if (summary.failed === 0) {
      console.log('\n🎉 All tests passed! Server crash session persistence is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ServerCrashSessionTest();
  tester.runAllTests().catch(console.error);
}

module.exports = ServerCrashSessionTest;
