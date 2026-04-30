// Test Current Verification Flow Based on Existing Admin Settings
// This test reads current settings and verifies the conditional logic

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

class CurrentVerificationFlowTester {
  constructor() {
    this.results = [];
    this.currentSettings = null;
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    this.results.push({ timestamp, message, type });
  }

  async getCurrentSettings() {
    this.log('\n=== Fetching Current Security Settings ===');
    
    try {
      const response = await axios.get(`${API_BASE}/auth/settings/security`);
      
      if (response.data.success) {
        this.currentSettings = response.data.data;
        this.log('✅ Security settings fetched successfully', 'success');
        this.log(`Current settings: ${JSON.stringify(this.currentSettings, null, 2)}`, 'info');
        
        // Determine expected behavior
        this.log(`Expected behavior based on settings:`, 'info');
        this.log(`- Email verification required: ${this.currentSettings.emailVerification}`, 'info');
        this.log(`- Phone verification required: ${this.currentSettings.phoneVerification}`, 'info');
        
        if (this.currentSettings.emailVerification && !this.currentSettings.phoneVerification) {
          this.log('Expected flow: Email -> Dashboard', 'info');
        } else if (!this.currentSettings.emailVerification && this.currentSettings.phoneVerification) {
          this.log('Expected flow: Phone -> Dashboard', 'info');
        } else if (!this.currentSettings.emailVerification && !this.currentSettings.phoneVerification) {
          this.log('Expected flow: Direct Dashboard', 'info');
        } else {
          this.log('Expected flow: Email -> Phone -> Dashboard', 'info');
        }
        
        return true;
      } else {
        this.log('❌ Failed to fetch security settings', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Security settings fetch error: ${error.message}`, 'error');
      return false;
    }
  }

  async testEmailOTPEndpoint() {
    this.log('\n=== Testing Email OTP Endpoint ===');
    
    try {
      const response = await axios.post(`${API_BASE}/auth/send-email-otp`, {
        email: `test${Date.now()}@example.com`
      });

      if (response.data.success) {
        this.log('✅ Email OTP endpoint is accessible and working', 'success');
        return true;
      } else {
        this.log(`❌ Email OTP failed: ${response.data.error}`, 'error');
        return false;
      }
    } catch (error) {
      if (error.response?.status === 403) {
        this.log('✅ Email OTP properly blocked (admin toggle OFF)', 'success');
        return false;
      } else {
        this.log(`❌ Email OTP error: ${error.message}`, 'error');
        return false;
      }
    }
  }

  async testPhoneOTPEndpoint() {
    this.log('\n=== Testing Phone OTP Endpoint ===');
    
    try {
      const response = await axios.post(`${API_BASE}/auth/send-phone-otp`, {
        phone: '+1234567890'
      });

      if (response.data.success) {
        this.log('✅ Phone OTP endpoint is accessible and working', 'success');
        return true;
      } else {
        this.log(`❌ Phone OTP failed: ${response.data.error}`, 'error');
        return false;
      }
    } catch (error) {
      if (error.response?.status === 403) {
        this.log('✅ Phone OTP properly blocked (admin toggle OFF)', 'success');
        return false;
      } else {
        this.log(`❌ Phone OTP error: ${error.message}`, 'error');
        return false;
      }
    }
  }

  async testConditionalLogic() {
    this.log('\n=== Testing Conditional Logic ===');
    
    if (!this.currentSettings) {
      this.log('❌ No current settings available', 'error');
      return false;
    }

    const emailExpected = this.currentSettings.emailVerification;
    const phoneExpected = this.currentSettings.phoneVerification;

    // Test email OTP
    const emailOTPWorks = await this.testEmailOTPEndpoint();
    if (emailOTPWorks === emailExpected) {
      this.log('✅ Email OTP conditional logic working correctly', 'success');
    } else {
      this.log('❌ Email OTP conditional logic mismatch', 'error');
      this.log(`Expected: ${emailExpected}, Got: ${emailOTPWorks}`, 'error');
    }

    // Test phone OTP
    const phoneOTPWorks = await this.testPhoneOTPEndpoint();
    if (phoneOTPWorks === phoneExpected) {
      this.log('✅ Phone OTP conditional logic working correctly', 'success');
    } else {
      this.log('❌ Phone OTP conditional logic mismatch', 'error');
      this.log(`Expected: ${phoneExpected}, Got: ${phoneOTPWorks}`, 'error');
    }

    // Overall result
    const logicWorking = (emailOTPWorks === emailExpected) && (phoneOTPWorks === phoneExpected);
    
    if (logicWorking) {
      this.log('✅ All conditional logic working correctly', 'success');
    } else {
      this.log('❌ Conditional logic has issues', 'error');
    }

    return logicWorking;
  }

  async testFrontendSettingsFetch() {
    this.log('\n=== Testing Frontend Settings Fetch ===');
    
    try {
      // Test the same endpoint the frontend uses
      const response = await axios.get(`${API_BASE}/auth/settings/security`);
      
      if (response.data.success) {
        this.log('✅ Frontend settings endpoint working', 'success');
        
        const settings = response.data.data;
        
        // Verify required fields are present
        const requiredFields = ['emailVerification', 'phoneVerification', 'passwordMinLength'];
        const missingFields = requiredFields.filter(field => !(field in settings));
        
        if (missingFields.length === 0) {
          this.log('✅ All required security settings fields present', 'success');
          return true;
        } else {
          this.log(`❌ Missing fields: ${missingFields.join(', ')}`, 'error');
          return false;
        }
      } else {
        this.log('❌ Frontend settings endpoint failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Frontend settings fetch error: ${error.message}`, 'error');
      return false;
    }
  }

  async runTest() {
    this.log('🚀 Testing Current Verification Flow Implementation');
    this.log('===============================================');

    // Test 1: Get current settings
    const settingsFetched = await this.getCurrentSettings();
    if (!settingsFetched) {
      this.log('❌ Cannot proceed without settings', 'error');
      return false;
    }

    // Test 2: Test frontend settings fetch
    const frontendWorking = await this.testFrontendSettingsFetch();
    
    // Test 3: Test conditional logic
    const logicWorking = await this.testConditionalLogic();

    // Final summary
    this.log('\n=== Test Summary ===');
    this.log(`Settings Fetch: ${settingsFetched ? '✅' : '❌'}`);
    this.log(`Frontend Endpoint: ${frontendWorking ? '✅' : '❌'}`);
    this.log(`Conditional Logic: ${logicWorking ? '✅' : '❌'}`);
    
    const allTestsPassed = settingsFetched && frontendWorking && logicWorking;
    
    if (allTestsPassed) {
      this.log('🎉 All tests passed! Verification flow is working correctly.', 'success');
      this.log('\n📋 Current Configuration Summary:');
      this.log(`- Email Verification: ${this.currentSettings.emailVerification ? 'ENABLED' : 'DISABLED'}`);
      this.log(`- Phone Verification: ${this.currentSettings.phoneVerification ? 'ENABLED' : 'DISABLED'}`);
      this.log(`- Backend validation: ✅ Working`);
      this.log(`- Frontend integration: ✅ Working`);
    } else {
      this.log('⚠️  Some tests failed. Please review the logs above.', 'error');
    }

    // Save results
    const fs = require('fs');
    const reportPath = './current-verification-test-results-' + new Date().toISOString().split('T')[0] + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n📄 Detailed results saved to: ${reportPath}`);

    return allTestsPassed;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  const tester = new CurrentVerificationFlowTester();
  tester.runTest().catch(console.error);
}

module.exports = CurrentVerificationFlowTester;
