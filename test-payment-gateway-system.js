/**
 * Comprehensive Payment Gateway System Test
 * Tests all components of the payment gateway configuration system
 */

const mongoose = require('mongoose');
const GlobalSettings = require('./backend/models/GlobalSettings');
const encryptionService = require('./backend/services/encryptionService');
const paymentGatewayController = require('./backend/controllers/admin/paymentGatewayController');
const paymentGatewayService = require('./backend/services/paymentGatewayService');

// Test configuration
const TEST_CONFIG = {
  mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex-test',
  testStripeKey: 'sk_test_51234567890abcdef1234567890abcdef', // Valid format test key
  testPublishableKey: 'pk_test_51234567890abcdef1234567890abcdef',
  testWebhookSecret: 'whsec_1234567890abcdef1234567890abcdef12345678'
};

class PaymentGatewaySystemTest {
  constructor() {
    this.testResults = {
      encryption: { passed: 0, failed: 0, errors: [] },
      validation: { passed: 0, failed: 0, errors: [] },
      database: { passed: 0, failed: 0, errors: [] },
      api: { passed: 0, failed: 0, errors: [] },
      service: { passed: 0, failed: 0, errors: [] },
      security: { passed: 0, failed: 0, errors: [] }
    };
    this.startTime = Date.now();
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Payment Gateway System Tests...\n');

    try {
      // Connect to test database
      await this.connectToDatabase();

      // Run test suites
      await this.testEncryptionService();
      await this.testDatabaseOperations();
      await this.testValidation();
      await this.testAPIEndpoints();
      await this.testPaymentGatewayService();
      await this.testSecurityFeatures();
      await this.testIntegration();

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.general = { error: error.message };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Connect to test database
   */
  async connectToDatabase() {
    try {
      await mongoose.connect(TEST_CONFIG.mongodb);
      console.log('✅ Connected to test database');
      this.testResults.database.passed++;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.testResults.database.failed++;
      this.testResults.database.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Test encryption service
   */
  async testEncryptionService() {
    console.log('🔐 Testing Encryption Service...');

    const tests = [
      {
        name: 'Encrypt and decrypt text',
        test: async () => {
          const original = 'test-secret-key';
          const encrypted = encryptionService.encrypt(original);
          const decrypted = encryptionService.decrypt(encrypted);
          return original === decrypted;
        }
      },
      {
        name: 'Mask sensitive data',
        test: async () => {
          const key = 'sk_test_51234567890abcdef1234567890abcdef';
          const masked = encryptionService.maskSensitiveData(key, 8);
          return masked.startsWith('sk_test_') && masked.includes('*');
        }
      },
      {
        name: 'Validate Stripe key format',
        test: async () => {
          const validKey = 'sk_test_51234567890abcdef1234567890abcdef';
          const invalidKey = 'invalid-key';
          return encryptionService.validateStripeKey(validKey, 'secret') && 
                 !encryptionService.validateStripeKey(invalidKey, 'secret');
        }
      },
      {
        name: 'Generate webhook signature',
        test: async () => {
          const payload = 'test-payload';
          const secret = 'test-secret';
          const signature = encryptionService.generateWebhookSignature(payload, secret);
          const isValid = encryptionService.verifyWebhookSignature(payload, signature, secret);
          return isValid;
        }
      }
    ];

    await this.runTestSuite('encryption', tests);
  }

  /**
   * Test database operations
   */
  async testDatabaseOperations() {
    console.log('💾 Testing Database Operations...');

    const tests = [
      {
        name: 'Create GlobalSettings document',
        test: async () => {
          const settings = new GlobalSettings({
            paymentGateway: {
              provider: 'stripe',
              isEnabled: true,
              testMode: true,
              currency: 'USD',
              commissionFee: 10
            }
          });
          const saved = await settings.save();
          return saved._id && saved.paymentGateway.provider === 'stripe';
        }
      },
      {
        name: 'Update payment gateway settings',
        test: async () => {
          const settings = await GlobalSettings.findOne();
          const updates = {
            paymentGateway: {
              commissionFee: 15,
              autoCapturePayments: true
            }
          };
          await settings.updatePaymentGatewaySettings(updates, 'test-user-id');
          return settings.paymentGateway.commissionFee === 15;
        }
      },
      {
        name: 'Retrieve masked settings',
        test: async () => {
          const settings = await GlobalSettings.findOne();
          const maskedSettings = settings.getPaymentGatewaySettings();
          return maskedSettings.paymentGateway && 
                 !maskedSettings.paymentGateway.stripe?.encryptedSecretKey;
        }
      },
      {
        name: 'Audit trail functionality',
        test: async () => {
          const settings = await GlobalSettings.findOne();
          const initialVersion = settings.audit?.version || 0;
          await settings.updatePaymentGatewaySettings(
            { paymentGateway: { commissionFee: 20 } }, 
            'test-user-id'
          );
          const finalVersion = settings.audit?.version || 0;
          return finalVersion > initialVersion;
        }
      }
    ];

    await this.runTestSuite('database', tests);
  }

  /**
   * Test validation
   */
  async testValidation() {
    console.log('✅ Testing Validation...');

    const tests = [
      {
        name: 'Validate valid payment gateway settings',
        test: async () => {
          const validSettings = {
            provider: 'stripe',
            currency: 'USD',
            commissionFee: 10,
            testMode: true,
            stripe: {
              publishableKey: TEST_CONFIG.testPublishableKey,
              secretKey: TEST_CONFIG.testStripeKey,
              webhookSecret: TEST_CONFIG.testWebhookSecret
            }
          };
          const result = paymentGatewayController.validatePaymentGatewayUpdates(validSettings);
          return result.valid;
        }
      },
      {
        name: 'Reject invalid provider',
        test: async () => {
          const invalidSettings = { provider: 'invalid-provider' };
          const result = paymentGatewayController.validatePaymentGatewayUpdates(invalidSettings);
          return !result.valid && result.errors.includes('Invalid payment provider');
        }
      },
      {
        name: 'Reject invalid commission fee',
        test: async () => {
          const invalidSettings = { commissionFee: 150 };
          const result = paymentGatewayController.validatePaymentGatewayUpdates(invalidSettings);
          return !result.valid && result.errors.some(e => e.includes('Commission fee'));
        }
      },
      {
        name: 'Reject invalid Stripe key format',
        test: async () => {
          const invalidSettings = {
            stripe: { secretKey: 'invalid-key-format' }
          };
          const result = paymentGatewayController.validatePaymentGatewayUpdates(invalidSettings);
          return !result.valid && result.errors.some(e => e.includes('Stripe secret key'));
        }
      }
    ];

    await this.runTestSuite('validation', tests);
  }

  /**
   * Test API endpoints (mock)
   */
  async testAPIEndpoints() {
    console.log('🌐 Testing API Endpoints...');

    const tests = [
      {
        name: 'Get payment gateway settings',
        test: async () => {
          const mockReq = { user: { id: 'test-user' } };
          const mockRes = {
            json: (data) => {
              mockRes.data = data;
              return mockRes;
            },
            status: (code) => {
              mockRes.statusCode = code;
              return mockRes;
            }
          };

          await paymentGatewayController.getPaymentGatewaySettings(mockReq, mockRes);
          return mockRes.data.success;
        }
      },
      {
        name: 'Update payment gateway settings',
        test: async () => {
          const mockReq = {
            user: { id: 'test-user' },
            body: {
              provider: 'stripe',
              commissionFee: 12,
              testMode: true
            }
          };
          const mockRes = {
            json: (data) => {
              mockRes.data = data;
              return mockRes;
            },
            status: (code) => {
              mockRes.statusCode = code;
              return mockRes;
            }
          };

          await paymentGatewayController.updatePaymentGatewaySettings(mockReq, mockRes);
          return mockRes.data.success;
        }
      },
      {
        name: 'Test payment gateway connection',
        test: async () => {
          const mockReq = {
            body: {
              provider: 'stripe',
              stripe: { secretKey: TEST_CONFIG.testStripeKey }
            }
          };
          const mockRes = {
            json: (data) => {
              mockRes.data = data;
              return mockRes;
            },
            status: (code) => {
              mockRes.statusCode = code;
              return mockRes;
            }
          };

          await paymentGatewayController.testPaymentGatewayConnection(mockReq, mockRes);
          // Note: This will fail with test key, but we test the structure
          return mockRes.data && typeof mockRes.data.success === 'boolean';
        }
      },
      {
        name: 'Get payment gateway stats',
        test: async () => {
          const mockReq = {};
          const mockRes = {
            json: (data) => {
              mockRes.data = data;
              return mockRes;
            },
            status: (code) => {
              mockRes.statusCode = code;
              return mockRes;
            }
          };

          await paymentGatewayController.getPaymentGatewayStats(mockReq, mockRes);
          return mockRes.data.success && mockRes.data.data;
        }
      }
    ];

    await this.runTestSuite('api', tests);
  }

  /**
   * Test payment gateway service
   */
  async testPaymentGatewayService() {
    console.log('⚡ Testing Payment Gateway Service...');

    const tests = [
      {
        name: 'Initialize service',
        test: async () => {
          const health = paymentGatewayService.getHealthStatus();
          return health && typeof health.isInitialized === 'boolean';
        }
      },
      {
        name: 'Get frontend configuration',
        test: async () => {
          const config = paymentGatewayService.getFrontendConfig();
          return config && typeof config.provider === 'string';
        }
      },
      {
        name: 'Validate payment amount',
        test: async () => {
          const validAmount = paymentGatewayService.validateAmount(100);
          const invalidAmount = paymentGatewayService.validateAmount(-10);
          return validAmount && !invalidAmount;
        }
      },
      {
        name: 'Calculate platform fees',
        test: async () => {
          const fees = paymentGatewayService.calculateFees(100);
          return fees && typeof fees.platformFee === 'number' && 
                 typeof fees.totalFees === 'number' && 
                 typeof fees.netAmount === 'number';
        }
      }
    ];

    await this.runTestSuite('service', tests);
  }

  /**
   * Test security features
   */
  async testSecurityFeatures() {
    console.log('🔒 Testing Security Features...');

    const tests = [
      {
        name: 'Encryption key strength',
        test: async () => {
          const key = encryptionService.generateSecretKey();
          return key.length === 64; // 32 bytes = 64 hex chars
        }
      },
      {
        name: 'Secure string comparison',
        test: async () => {
          const str1 = 'test-string';
          const str2 = 'test-string';
          const str3 = 'different-string';
          return encryptionService.secureCompare(str1, str2) && 
                 !encryptionService.secureCompare(str1, str3);
        }
      },
      {
        name: 'Hash and verify',
        test: async () => {
          const data = 'test-data';
          const hashed = encryptionService.hash(data);
          return encryptionService.verifyHash(data, hashed);
        }
      },
      {
        name: 'Mask different lengths',
        test: async () => {
          const short = 'sk_test_123';
          const long = 'sk_test_1234567890abcdef1234567890abcdef';
          const maskedShort = encryptionService.maskSensitiveData(short, 4);
          const maskedLong = encryptionService.maskSensitiveData(long, 8);
          return maskedShort.length === short.length && 
                 maskedLong.length === long.length &&
                 maskedShort.includes('*') && 
                 maskedLong.includes('*');
        }
      }
    ];

    await this.runTestSuite('security', tests);
  }

  /**
   * Test integration scenarios
   */
  async testIntegration() {
    console.log('🔗 Testing Integration Scenarios...');

    const tests = [
      {
        name: 'Full settings update workflow',
        test: async () => {
          // Create settings
          const settings = new GlobalSettings({
            paymentGateway: {
              provider: 'stripe',
              isEnabled: false,
              testMode: true
            }
          });
          await settings.save();

          // Update with encrypted keys
          const updates = {
            paymentGateway: {
              isEnabled: true,
              commissionFee: 15,
              stripe: {
                publishableKey: TEST_CONFIG.testPublishableKey,
                secretKey: TEST_CONFIG.testStripeKey,
                webhookSecret: TEST_CONFIG.testWebhookSecret
              }
            }
          };

          await settings.updatePaymentGatewaySettings(updates, 'test-user-id', 'Integration test');

          // Verify update
          const updated = await GlobalSettings.findById(settings._id);
          return updated.paymentGateway.isEnabled && 
                 updated.paymentGateway.commissionFee === 15 &&
                 updated.audit.changeLog.length > 0;
        }
      },
      {
        name: 'Service responds to settings changes',
        test: async () => {
          const initialHealth = paymentGatewayService.getHealthStatus();
          
          // Trigger settings update
          await paymentGatewayService.handleSettingsUpdate({
            provider: 'stripe',
            isEnabled: true,
            testMode: true
          });

          const updatedHealth = paymentGatewayService.getHealthStatus();
          return updatedHealth.provider === 'stripe';
        }
      }
    ];

    await this.runTestSuite('integration', tests);
  }

  /**
   * Run a test suite
   */
  async runTestSuite(category, tests) {
    for (const test of tests) {
      try {
        const result = await test.test();
        if (result) {
          console.log(`  ✅ ${test.name}`);
          this.testResults[category].passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          this.testResults[category].failed++;
          this.testResults[category].errors.push(`${test.name}: Test returned false`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - ${error.message}`);
        this.testResults[category].failed++;
        this.testResults[category].errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  /**
   * Generate final report
   */
  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    console.log('📊 TEST REPORT\n');
    console.log('='.repeat(50));
    console.log(`Duration: ${duration}ms`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(this.testResults).forEach(([category, results]) => {
      if (results.passed !== undefined && results.failed !== undefined) {
        console.log(`${category.toUpperCase()}:`);
        console.log(`  Passed: ${results.passed}`);
        console.log(`  Failed: ${results.failed}`);
        
        if (results.errors.length > 0) {
          console.log('  Errors:');
          results.errors.forEach(error => console.log(`    - ${error}`));
        }
        console.log('');
        
        totalPassed += results.passed;
        totalFailed += results.failed;
      }
    });

    console.log('='.repeat(50));
    console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
    
    const successRate = totalPassed > 0 ? (totalPassed / (totalPassed + totalFailed) * 100).toFixed(1) : 0;
    console.log(`Success Rate: ${successRate}%\n`);

    if (totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! Payment Gateway System is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before deployment.');
    }

    // Save results to file
    this.saveTestResults({
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        totalPassed,
        totalFailed,
        successRate
      },
      details: this.testResults
    });
  }

  /**
   * Save test results to file
   */
  saveTestResults(results) {
    const fs = require('fs');
    const filename = `payment-gateway-test-results-${Date.now()}.json`;
    
    try {
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      console.log(`📁 Test results saved to: ${filename}`);
    } catch (error) {
      console.error('Failed to save test results:', error);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    try {
      await GlobalSettings.deleteMany({});
      await mongoose.connection.close();
      console.log('🧹 Test cleanup completed');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new PaymentGatewaySystemTest();
  tester.runAllTests().catch(console.error);
}

module.exports = PaymentGatewaySystemTest;
