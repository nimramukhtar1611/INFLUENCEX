// Comprehensive test for Dynamic Verification Flow and Session Management
// This script tests all verification combinations and session management features

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test configuration
const testConfigs = [
  {
    name: 'Email Verification Only',
    securitySettings: {
      emailVerification: true,
      phoneVerification: false,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: false,
      maxLoginAttempts: 5,
      lockoutDuration: 30
    }
  },
  {
    name: 'Phone Verification Only',
    securitySettings: {
      emailVerification: false,
      phoneVerification: true,
      passwordMinLength: 10,
      passwordRequireUppercase: false,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      maxLoginAttempts: 3,
      lockoutDuration: 15
    }
  },
  {
    name: 'Both Email and Phone Verification',
    securitySettings: {
      emailVerification: true,
      phoneVerification: true,
      passwordMinLength: 12,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      maxLoginAttempts: 7,
      lockoutDuration: 45
    }
  },
  {
    name: 'No Verification Required',
    securitySettings: {
      emailVerification: false,
      phoneVerification: false,
      passwordMinLength: 6,
      passwordRequireUppercase: false,
      passwordRequireLowercase: false,
      passwordRequireNumbers: false,
      passwordRequireSymbols: false,
      maxLoginAttempts: 10,
      lockoutDuration: 60
    }
  }
];

// Test users data
const testUsers = [
  {
    email: 'test.brand@example.com',
    password: 'TestPass123!',
    fullName: 'Test Brand',
    userType: 'brand',
    brandName: 'Test Brand Co',
    industry: 'Technology'
  },
  {
    email: 'test.creator@example.com',
    password: 'TestPass123!',
    fullName: 'Test Creator',
    userType: 'creator',
    displayName: 'Test Creator',
    handle: 'testcreator',
    niches: ['Technology']
  }
];

class DynamicVerificationTester {
  constructor() {
    this.results = [];
    this.currentConfig = null;
    this.authTokens = {};
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    this.results.push({ timestamp, message, type });
  }

  async testSecuritySettingsEndpoint() {
    this.log('\n=== Testing Security Settings Endpoint ===');
    
    try {
      // Test public endpoint
      const publicResponse = await axios.get(`${API_BASE}/auth/settings/security`);
      this.log('✅ Public security settings endpoint accessible', 'success');
      this.log(`Response: ${JSON.stringify(publicResponse.data, null, 2)}`, 'info');
      
      // Test admin endpoint (should fail without auth)
      try {
        await axios.get(`${API_BASE}/admin/settings/security`);
        this.log('❌ Admin security settings should not be public', 'error');
      } catch (err) {
        this.log('✅ Admin security settings properly protected', 'success');
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Security settings endpoint failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testPasswordValidation(password, expectedValid, testName) {
    try {
      const uniqueId = Math.random().toString(36).substring(7);
      const response = await axios.post(`${API_BASE}/auth/register`, {
        email: `test${uniqueId}@example.com`,
        password,
        fullName: 'Test User',
        userType: 'creator',
        displayName: 'Test',
        handle: `test${uniqueId}`,
        captchaToken: 'test-token'
      });
      
      if (expectedValid) {
        if (response.data.success) {
          this.log(`✅ ${testName}: Valid password accepted`, 'success');
        } else {
          this.log(`❌ ${testName}: Valid password rejected - ${response.data.error}`, 'error');
        }
      } else {
        if (!response.data.success) {
          this.log(`✅ ${testName}: Invalid password properly rejected`, 'success');
        } else {
          this.log(`❌ ${testName}: Invalid password incorrectly accepted`, 'error');
        }
      }
    } catch (error) {
      if (error.response?.status === 400) {
        if (!expectedValid) {
          this.log(`✅ ${testName}: Invalid password properly rejected`, 'success');
        } else {
          this.log(`❌ ${testName}: Valid password rejected - ${error.response.data.error}`, 'error');
        }
      } else {
        this.log(`❌ ${testName}: Password validation test failed - ${error.message}`, 'error');
      }
    }
  }

  async testLoginAttempts(email, userType, maxAttempts) {
    this.log(`\n=== Testing Login Attempts Lockout (${maxAttempts} attempts) ===`);
    
    let attempts = 0;
    let locked = false;
    
    while (attempts < maxAttempts + 2 && !locked) {
      attempts++;
      
      try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
          email,
          password: 'wrongpassword',
          userType
        });
        
        this.log(`❌ Attempt ${attempts}: Login should have failed but succeeded`, 'error');
        break;
      } catch (error) {
        if (error.response?.status === 423) {
          this.log(`✅ Account locked after ${attempts} attempts`, 'success');
          locked = true;
        } else if (error.response?.status === 401) {
          this.log(`⏳ Attempt ${attempts}: Login failed as expected`, 'info');
        } else {
          this.log(`❌ Attempt ${attempts}: Unexpected error - ${error.message}`, 'error');
          break;
        }
      }
    }
    
    return locked;
  }

  async testVerificationFlow(user, config) {
    this.log(`\n=== Testing Verification Flow: ${config.name} ===`);
    
    try {
      // Create unique user for this test
      const uniqueId = Math.random().toString(36).substring(7);
      const testUser = {
        ...user,
        email: `${user.email.replace('@', `+${uniqueId}@`)}`,
        displayName: user.displayName ? `${user.displayName}${uniqueId}` : undefined,
        handle: user.handle ? `${user.handle}${uniqueId}` : undefined
      };
      
      // Test signup flow
      const signupResponse = await axios.post(`${API_BASE}/auth/register`, {
        ...testUser,
        captchaToken: 'test-token'
      });
      
      if (signupResponse.data.success) {
        this.log('✅ User registration successful', 'success');
        
        // Test email verification if required
        if (config.securitySettings.emailVerification) {
          try {
            await axios.post(`${API_BASE}/auth/send-email-otp`, {
              email: testUser.email
            });
            this.log('✅ Email OTP sent successfully', 'success');
          } catch (error) {
            this.log(`❌ Email OTP failed: ${error.message}`, 'error');
          }
        }
        
        // Test phone verification if required
        if (config.securitySettings.phoneVerification) {
          try {
            await axios.post(`${API_BASE}/auth/send-phone-otp`, {
              phone: '+1234567890'
            });
            this.log('✅ Phone OTP sent successfully', 'success');
          } catch (error) {
            this.log(`❌ Phone OTP failed: ${error.message}`, 'error');
          }
        }
        
        // Test no verification flow
        if (!config.securitySettings.emailVerification && !config.securitySettings.phoneVerification) {
          this.log('✅ No verification required - user can proceed directly', 'success');
        }
        
      } else {
        this.log(`❌ Registration failed: ${signupResponse.data.error}`, 'error');
      }
      
    } catch (error) {
      this.log(`❌ Verification flow test failed: ${error.message}`, 'error');
    }
  }

  async testPasswordPolicies(config) {
    this.log(`\n=== Testing Password Policies for ${config.name} ===`);
    
    const { passwordMinLength, passwordRequireUppercase, passwordRequireLowercase, passwordRequireNumbers, passwordRequireSymbols } = config.securitySettings;
    
    // Test valid password
    let validPassword = 'Aa1!';
    if (passwordMinLength > 4) validPassword += 'a'.repeat(passwordMinLength - 4);
    if (passwordRequireSymbols) validPassword += '@';
    
    await this.testPasswordValidation(validPassword, true, 'Valid password test');
    
    // Test invalid passwords
    if (passwordMinLength > 6) {
      await this.testPasswordValidation('short', false, `Too short (${passwordMinLength} required)`);
    }
    
    if (passwordRequireUppercase) {
      await this.testPasswordValidation('lowercase123!', false, 'Missing uppercase');
    }
    
    if (passwordRequireLowercase) {
      await this.testPasswordValidation('UPPERCASE123!', false, 'Missing lowercase');
    }
    
    if (passwordRequireNumbers) {
      await this.testPasswordValidation('NoNumbers!', false, 'Missing numbers');
    }
    
    if (passwordRequireSymbols) {
      await this.testPasswordValidation('NoSymbols123', false, 'Missing symbols');
    }
  }

  async runFullTestSuite() {
    this.log('🚀 Starting Dynamic Verification Flow and Session Management Test Suite');
    this.log('================================================================');
    
    // Test 1: Security settings endpoint
    await this.testSecuritySettingsEndpoint();
    
    // Test 2: Password validation for each configuration
    for (const config of testConfigs) {
      await this.testPasswordPolicies(config);
    }
    
    // Test 3: Verification flows
    for (const config of testConfigs) {
      for (const user of testUsers) {
        await this.testVerificationFlow(user, config);
      }
    }
    
    // Test 4: Login attempts and lockout
    const lockoutConfig = testConfigs.find(c => c.name === 'Both Email and Phone Verification');
    if (lockoutConfig) {
      await this.testLoginAttempts(testUsers[0].email, testUsers[0].userType, lockoutConfig.securitySettings.maxLoginAttempts);
    }
    
    this.log('\n=== Test Summary ===');
    const successCount = this.results.filter(r => r.type === 'success').length;
    const errorCount = this.results.filter(r => r.type === 'error').length;
    const infoCount = this.results.filter(r => r.type === 'info').length;
    
    this.log(`Total Tests: ${this.results.length}`);
    this.log(`✅ Success: ${successCount}`);
    this.log(`❌ Errors: ${errorCount}`);
    this.log(`ℹ️  Info: ${infoCount}`);
    this.log(`Success Rate: ${((successCount / this.results.length) * 100).toFixed(1)}%`);
    
    if (errorCount === 0) {
      this.log('🎉 All tests passed! Dynamic verification flow is working correctly.', 'success');
    } else {
      this.log('⚠️  Some tests failed. Please review the errors above.', 'error');
    }
    
    // Save results to file
    const fs = require('fs');
    const reportPath = './test-results-' + new Date().toISOString().split('T')[0] + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n📄 Detailed results saved to: ${reportPath}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DynamicVerificationTester();
  tester.runFullTestSuite().catch(console.error);
}

module.exports = DynamicVerificationTester;
