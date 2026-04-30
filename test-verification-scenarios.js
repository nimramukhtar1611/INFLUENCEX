// Comprehensive Test for Verification Flow Scenarios
// Tests all four combinations of admin toggle settings

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

class VerificationFlowTester {
  constructor() {
    this.results = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    this.results.push({ timestamp, message, type });
  }

  async testSecuritySettingsEndpoint() {
    this.log('\n=== Testing Security Settings Endpoint ===');
    
    try {
      const response = await axios.get(`${API_BASE}/auth/settings/security`);
      
      if (response.data.success) {
        this.log('✅ Security settings endpoint working', 'success');
        this.log(`Current settings: ${JSON.stringify(response.data.data, null, 2)}`, 'info');
        return response.data.data;
      } else {
        this.log('❌ Security settings endpoint failed', 'error');
        return null;
      }
    } catch (error) {
      this.log(`❌ Security settings endpoint error: ${error.message}`, 'error');
      return null;
    }
  }

  async updateSecuritySettings(emailVerification, phoneVerification) {
    this.log(`\n=== Updating Security Settings: Email=${emailVerification}, Phone=${phoneVerification} ===`);
    
    try {
      // First get current settings to preserve other values
      const currentResponse = await axios.get(`${API_BASE}/admin/settings/security`);
      if (!currentResponse.data.success) {
        this.log('❌ Failed to get current settings', 'error');
        return false;
      }

      // Update only the verification toggles
      const updateResponse = await axios.put(`${API_BASE}/admin/settings`, {
        security: {
          ...currentResponse.data.data,
          emailVerification,
          phoneVerification
        }
      });

      if (updateResponse.data.success) {
        this.log('✅ Security settings updated successfully', 'success');
        return true;
      } else {
        this.log(`❌ Failed to update settings: ${updateResponse.data.error}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Settings update error: ${error.message}`, 'error');
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
        this.log('✅ Email OTP endpoint accessible', 'success');
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
        this.log('✅ Phone OTP endpoint accessible', 'success');
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

  async testScenario(scenarioName, emailVerification, phoneVerification) {
    this.log(`\n🧪 Testing Scenario: ${scenarioName}`);
    this.log(`Settings: Email=${emailVerification}, Phone=${phoneVerification}`);
    
    // Update settings
    const settingsUpdated = await this.updateSecuritySettings(emailVerification, phoneVerification);
    if (!settingsUpdated) {
      this.log('❌ Failed to update settings for scenario', 'error');
      return false;
    }

    // Wait a moment for settings to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test email OTP
    const emailOTPWorks = await this.testEmailOTPEndpoint();
    const expectedEmailOTP = emailVerification;
    
    if (emailOTPWorks === expectedEmailOTP) {
      this.log('✅ Email OTP behavior matches admin settings', 'success');
    } else {
      this.log('❌ Email OTP behavior does not match admin settings', 'error');
    }

    // Test phone OTP
    const phoneOTPWorks = await this.testPhoneOTPEndpoint();
    const expectedPhoneOTP = phoneVerification;
    
    if (phoneOTPWorks === expectedPhoneOTP) {
      this.log('✅ Phone OTP behavior matches admin settings', 'success');
    } else {
      this.log('❌ Phone OTP behavior does not match admin settings', 'error');
    }

    // Overall scenario result
    const scenarioPassed = (emailOTPWorks === expectedEmailOTP) && (phoneOTPWorks === expectedPhoneOTP);
    
    if (scenarioPassed) {
      this.log(`✅ Scenario "${scenarioName}" PASSED`, 'success');
    } else {
      this.log(`❌ Scenario "${scenarioName}" FAILED`, 'error');
    }

    return scenarioPassed;
  }

  async runAllTests() {
    this.log('🚀 Starting Verification Flow Scenario Tests');
    this.log('==========================================');

    const scenarios = [
      {
        name: 'Email ON, Phone OFF',
        emailVerification: true,
        phoneVerification: false
      },
      {
        name: 'Email OFF, Phone ON',
        emailVerification: false,
        phoneVerification: true
      },
      {
        name: 'Both OFF',
        emailVerification: false,
        phoneVerification: false
      },
      {
        name: 'Both ON',
        emailVerification: true,
        phoneVerification: true
      }
    ];

    let passedScenarios = 0;
    
    for (const scenario of scenarios) {
      const passed = await this.testScenario(scenario.name, scenario.emailVerification, scenario.phoneVerification);
      if (passed) passedScenarios++;
      
      // Wait between scenarios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Final summary
    this.log('\n=== Test Summary ===');
    this.log(`Total Scenarios: ${scenarios.length}`);
    this.log(`Passed: ${passedScenarios}`);
    this.log(`Failed: ${scenarios.length - passedScenarios}`);
    this.log(`Success Rate: ${((passedScenarios / scenarios.length) * 100).toFixed(1)}%`);

    if (passedScenarios === scenarios.length) {
      this.log('🎉 All verification flow scenarios working correctly!', 'success');
    } else {
      this.log('⚠️  Some scenarios failed. Please review the logs above.', 'error');
    }

    // Save results
    const fs = require('fs');
    const reportPath = './verification-test-results-' + new Date().toISOString().split('T')[0] + '.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n📄 Detailed results saved to: ${reportPath}`);

    return passedScenarios === scenarios.length;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new VerificationFlowTester();
  tester.runAllTests().catch(console.error);
}

module.exports = VerificationFlowTester;
