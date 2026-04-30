// Security Settings Structure Verification
// This script verifies the code structure and logic without requiring database connection

const fs = require('fs');
const path = require('path');

class SecuritySettingsVerifier {
  constructor() {
    this.verificationResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  logVerification(testName, passed, details = '') {
    this.verificationResults.total++;
    if (passed) {
      this.verificationResults.passed++;
      console.log(`✅ ${testName}: PASSED ${details ? '- ' + details : ''}`);
    } else {
      this.verificationResults.failed++;
      console.log(`❌ ${testName}: FAILED ${details ? '- ' + details : ''}`);
    }
    
    this.verificationResults.details.push({
      test: testName,
      passed,
      details
    });
  }

  // Verify Settings model has correct security fields
  verifySettingsModel() {
    console.log('\n🔍 Verifying Settings Model Structure...');
    
    try {
      const settingsModelPath = path.join(__dirname, 'backend/models/Settings.js');
      const settingsContent = fs.readFileSync(settingsModelPath, 'utf8');
      
      // Check for required security fields
      const requiredFields = [
        'maxLoginAttempts',
        'lockoutDuration',
        'sessionTimeout',
        'passwordMinLength',
        'passwordRequireUppercase',
        'passwordRequireLowercase',
        'passwordRequireNumbers',
        'passwordRequireSymbols',
        'passwordExpiryDays',
        'passwordHistoryCount',
        'jwtExpiry',
        'refreshTokenExpiry',
        'otpExpiryMinutes',
        'emailVerificationExpiryHours',
        'passwordResetExpiryHours',
        'twoFactorCodeExpiryMinutes'
      ];

      let allFieldsPresent = true;
      let missingFields = [];

      for (const field of requiredFields) {
        if (!settingsContent.includes(field)) {
          allFieldsPresent = false;
          missingFields.push(field);
        }
      }

      // Check that IP whitelist fields are removed from security section only
      // Look for the specific pattern in the security object
      const securitySectionMatch = settingsContent.match(/security:\s*\{[^}]*}/s);
      const securitySection = securitySectionMatch ? securitySectionMatch[0] : '';
      
      const ipFields = ['ipWhitelistEnabled', 'allowedIPs', 'blockedIPs'];
      let ipFieldsRemoved = true;
      let presentIpFields = [];

      for (const field of ipFields) {
        // Check specifically within the security section
        if (securitySection.includes(field)) {
          ipFieldsRemoved = false;
          presentIpFields.push(field);
        }
      }

      this.logVerification(
        'Settings Model Security Fields',
        allFieldsPresent && ipFieldsRemoved,
        `Missing: ${missingFields.join(', ') || 'none'} | IP fields removed: ${ipFieldsRemoved} | Present IP fields: ${presentIpFields.join(', ') || 'none'}`
      );

    } catch (error) {
      this.logVerification('Settings Model Security Fields', false, error.message);
    }
  }

  // Verify admin controller has correct security settings logic
  verifyAdminController() {
    console.log('\n🔍 Verifying Admin Controller Security Logic...');
    
    try {
      const adminControllerPath = path.join(__dirname, 'backend/controllers/admin/adminController.js');
      const adminControllerContent = fs.readFileSync(adminControllerPath, 'utf8');
      
      // Check for dynamic security settings in adminLogin
      const hasDynamicLoginAttempts = adminControllerContent.includes('securitySettings.maxLoginAttempts');
      const hasDynamicLockoutDuration = adminControllerContent.includes('securitySettings.lockoutDuration');
      const hasDynamicJWTExpiry = adminControllerContent.includes('securitySettings.jwtExpiry');
      const hasDynamicRefreshTokenExpiry = adminControllerContent.includes('securitySettings.refreshTokenExpiry');

      // Check for security settings in getSettings
      const hasGetSettingsSecurity = adminControllerContent.includes('maxLoginAttempts: settings.security?.maxLoginAttempts');
      const hasGetSettingsOTP = adminControllerContent.includes('otpExpiryMinutes: settings.security?.otpExpiryMinutes');

      // Check for security settings in updateSettings
      const hasUpdateSettingsSecurity = adminControllerContent.includes('maxLoginAttempts: updates.maxLoginAttempts');
      const hasUpdateSettingsOTP = adminControllerContent.includes('otpExpiryMinutes: updates.otpExpiryMinutes');

      // Check that IP whitelist is removed from getSettings
      const hasIPWhitelistRemoved = !adminControllerContent.includes('ipWhitelistEnabled: settings.security?.ipWhitelistEnabled');

      this.logVerification(
        'Admin Controller Dynamic Security',
        hasDynamicLoginAttempts && hasDynamicLockoutDuration && hasDynamicJWTExpiry && hasDynamicRefreshTokenExpiry,
        `Dynamic login attempts: ${hasDynamicLoginAttempts}, Dynamic lockout: ${hasDynamicLockoutDuration}, Dynamic JWT: ${hasDynamicJWTExpiry}, Dynamic refresh: ${hasDynamicRefreshTokenExpiry}`
      );

      this.logVerification(
        'Admin Controller GetSettings Security',
        hasGetSettingsSecurity && hasGetSettingsOTP && hasIPWhitelistRemoved,
        `GetSettings security: ${hasGetSettingsSecurity}, GetSettings OTP: ${hasGetSettingsOTP}, IP removed: ${hasIPWhitelistRemoved}`
      );

      this.logVerification(
        'Admin Controller UpdateSettings Security',
        hasUpdateSettingsSecurity && hasUpdateSettingsOTP,
        `UpdateSettings security: ${hasUpdateSettingsSecurity}, UpdateSettings OTP: ${hasUpdateSettingsOTP}`
      );

    } catch (error) {
      this.logVerification('Admin Controller Security Logic', false, error.message);
    }
  }

  // Verify auth controller has correct security settings logic
  verifyAuthController() {
    console.log('\n🔍 Verifying Auth Controller Security Logic...');
    
    try {
      const authControllerPath = path.join(__dirname, 'backend/controllers/authController.js');
      const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');
      
      // Check for dynamic security settings in login
      const hasDynamicLoginAttempts = authControllerContent.includes('securitySettings.maxLoginAttempts');
      const hasDynamicLockoutDuration = authControllerContent.includes('securitySettings.lockoutDuration');
      const hasDynamicPasswordValidation = authControllerContent.includes('passwordMinLength = securitySettings.passwordMinLength');

      // Check for password requirements validation
      const hasPasswordUppercase = authControllerContent.includes('requireUppercase = securitySettings.passwordRequireUppercase');
      const hasPasswordLowercase = authControllerContent.includes('requireLowercase = securitySettings.passwordRequireLowercase');
      const hasPasswordNumbers = authControllerContent.includes('requireNumbers = securitySettings.passwordRequireNumbers');
      const hasPasswordSymbols = authControllerContent.includes('requireSymbols = securitySettings.passwordRequireSymbols');

      this.logVerification(
        'Auth Controller Dynamic Security',
        hasDynamicLoginAttempts && hasDynamicLockoutDuration && hasDynamicPasswordValidation,
        `Dynamic login attempts: ${hasDynamicLoginAttempts}, Dynamic lockout: ${hasDynamicLockoutDuration}, Dynamic password validation: ${hasDynamicPasswordValidation}`
      );

      this.logVerification(
        'Auth Controller Password Requirements',
        hasPasswordUppercase && hasPasswordLowercase && hasPasswordNumbers && hasPasswordSymbols,
        `Uppercase: ${hasPasswordUppercase}, Lowercase: ${hasPasswordLowercase}, Numbers: ${hasPasswordNumbers}, Symbols: ${hasPasswordSymbols}`
      );

    } catch (error) {
      this.logVerification('Auth Controller Security Logic', false, error.message);
    }
  }

  // Verify security enforcement middleware exists
  verifySecurityEnforcement() {
    console.log('\n🔍 Verifying Security Enforcement Middleware...');
    
    try {
      const securityMiddlewarePath = path.join(__dirname, 'backend/middleware/securityEnforcement.js');
      
      if (!fs.existsSync(securityMiddlewarePath)) {
        this.logVerification('Security Enforcement Middleware', false, 'Middleware file does not exist');
        return;
      }

      const middlewareContent = fs.readFileSync(securityMiddlewarePath, 'utf8');
      
      // Check for required enforcement methods
      const requiredMethods = [
        'enforceSessionTimeout',
        'validatePasswordRequirements',
        'enforceOTPExpiry',
        'enforceEmailVerificationExpiry',
        'enforcePasswordResetExpiry',
        'enforceTwoFactorCodeExpiry',
        'enforcePasswordExpiry',
        'applyAll'
      ];

      let allMethodsPresent = true;
      let missingMethods = [];

      for (const method of requiredMethods) {
        if (!middlewareContent.includes(method)) {
          allMethodsPresent = false;
          missingMethods.push(method);
        }
      }

      this.logVerification(
        'Security Enforcement Middleware',
        allMethodsPresent,
        `Missing methods: ${missingMethods.join(', ') || 'none'}`
      );

    } catch (error) {
      this.logVerification('Security Enforcement Middleware', false, error.message);
    }
  }

  // Verify server.js includes security enforcement
  verifyServerSecurityIntegration() {
    console.log('\n🔍 Verifying Server Security Integration...');
    
    try {
      const serverPath = path.join(__dirname, 'backend/server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      // Check for security enforcement middleware integration
      const hasSecurityEnforcement = serverContent.includes('SecurityEnforcement = require');
      const hasSecurityMiddleware = serverContent.includes('SecurityEnforcement.applyAll()');

      this.logVerification(
        'Server Security Integration',
        hasSecurityEnforcement && hasSecurityMiddleware,
        `Security enforcement imported: ${hasSecurityEnforcement}, Security middleware applied: ${hasSecurityMiddleware}`
      );

    } catch (error) {
      this.logVerification('Server Security Integration', false, error.message);
    }
  }

  // Verify frontend settings component has correct structure
  verifyFrontendSettings() {
    console.log('\n🔍 Verifying Frontend Settings Component...');
    
    try {
      const settingsComponentPath = path.join(__dirname, 'frontend/src/pages/Admin/Settings.jsx');
      const settingsContent = fs.readFileSync(settingsComponentPath, 'utf8');
      
      // Check for security settings fields
      const securityFields = [
        'maxLoginAttempts',
        'lockoutDuration',
        'sessionTimeout',
        'passwordMinLength',
        'passwordRequireUppercase',
        'passwordRequireLowercase',
        'passwordRequireNumbers',
        'passwordRequireSymbols',
        'passwordExpiryDays',
        'passwordHistoryCount',
        'jwtExpiry',
        'refreshTokenExpiry',
        'otpExpiryMinutes',
        'emailVerificationExpiryHours',
        'passwordResetExpiryHours',
        'twoFactorCodeExpiryMinutes'
      ];

      let allFieldsPresent = true;
      let missingFields = [];

      for (const field of securityFields) {
        if (!settingsContent.includes(field)) {
          allFieldsPresent = false;
          missingFields.push(field);
        }
      }

      // Check that IP whitelist fields are removed
      const ipFieldsRemoved = !settingsContent.includes('ipWhitelistEnabled') && 
                             !settingsContent.includes('allowedIPs') && 
                             !settingsContent.includes('IP Whitelist');

      this.logVerification(
        'Frontend Settings Security Fields',
        allFieldsPresent && ipFieldsRemoved,
        `Missing: ${missingFields.join(', ') || 'none'} | IP fields removed: ${ipFieldsRemoved}`
      );

    } catch (error) {
      this.logVerification('Frontend Settings Component', false, error.message);
    }
  }

  // Verify admin routes have correct security settings endpoints
  verifyAdminRoutes() {
    console.log('\n🔍 Verifying Admin Routes Security Endpoints...');
    
    try {
      const adminRoutesPath = path.join(__dirname, 'backend/routes/adminRoutes.js');
      const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');
      
      // Check for security settings endpoint
      const hasSecuritySettingsEndpoint = adminRoutesContent.includes('/settings/security');
      const hasSecuritySettingsFields = adminRoutesContent.includes('maxLoginAttempts: settings.security?.maxLoginAttempts');

      // Check that IP fields are removed from security endpoint
      const hasIPFieldsRemoved = !adminRoutesContent.includes('ipWhitelistEnabled: settings.security?.ipWhitelistEnabled');

      this.logVerification(
        'Admin Routes Security Endpoints',
        hasSecuritySettingsEndpoint && hasSecuritySettingsFields && hasIPFieldsRemoved,
        `Security endpoint: ${hasSecuritySettingsEndpoint}, Security fields: ${hasSecuritySettingsFields}, IP removed: ${hasIPFieldsRemoved}`
      );

    } catch (error) {
      this.logVerification('Admin Routes Security Endpoints', false, error.message);
    }
  }

  // Run all verifications
  runAllVerifications() {
    console.log('🚀 Starting Security Settings Structure Verification...\n');
    
    this.verifySettingsModel();
    this.verifyAdminController();
    this.verifyAuthController();
    this.verifySecurityEnforcement();
    this.verifyServerSecurityIntegration();
    this.verifyFrontendSettings();
    this.verifyAdminRoutes();
    
    console.log('\n📊 Verification Results Summary:');
    console.log(`Total Verifications: ${this.verificationResults.total}`);
    console.log(`Passed: ${this.verificationResults.passed}`);
    console.log(`Failed: ${this.verificationResults.failed}`);
    console.log(`Success Rate: ${((this.verificationResults.passed / this.verificationResults.total) * 100).toFixed(2)}%`);
    
    if (this.verificationResults.failed > 0) {
      console.log('\n❌ Failed Verifications:');
      this.verificationResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`  - ${test.test}: ${test.details}`));
    }
    
    if (this.verificationResults.failed === 0) {
      console.log('\n🎉 All verifications passed! Security settings structure is correct.');
    } else {
      console.log('\n⚠️  Some verifications failed. Please review the issues above.');
    }
  }
}

// Run verifications if this file is executed directly
if (require.main === module) {
  const verifier = new SecuritySettingsVerifier();
  verifier.runAllVerifications();
}

module.exports = SecuritySettingsVerifier;
