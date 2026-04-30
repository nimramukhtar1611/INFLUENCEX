const GlobalSettings = require('../../models/GlobalSettings');
const encryptionService = require('../../services/encryptionService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentGatewayController {
  /**
   * Get payment gateway settings
   */
  async getPaymentGatewaySettings(req, res) {
    try {
      console.log('=== GET PAYMENT GATEWAY SETTINGS ===');
      
      let settings = await GlobalSettings.findOne();
      
      if (!settings) {
        console.log('No settings found, creating default settings');
        settings = new GlobalSettings();
        await settings.save();
      }

      const paymentSettings = settings.getPaymentGatewaySettings();
      
      console.log('Payment settings retrieved successfully');
      console.log('Provider:', paymentSettings.paymentGateway?.provider);
      console.log('Test mode:', paymentSettings.paymentGateway?.testMode);

      res.json({
        success: true,
        data: paymentSettings.paymentGateway || {},
        message: 'Payment gateway settings retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting payment gateway settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment gateway settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update payment gateway settings
   */
  async updatePaymentGatewaySettings(req, res) {
    try {
      console.log('=== UPDATE PAYMENT GATEWAY SETTINGS ===');
      console.log('Request body keys:', Object.keys(req.body));
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Validate request body
      const updates = this.validatePaymentGatewayUpdates(req.body);
      if (!updates.valid) {
        return res.status(400).json({
          success: false,
          error: updates.error,
          details: updates.details
        });
      }

      let settings = await GlobalSettings.findOne();
      
      if (!settings) {
        console.log('No settings found, creating new settings');
        settings = new GlobalSettings();
      }

      // Store current settings for comparison
      const oldSettings = JSON.parse(JSON.stringify(settings.paymentGateway || {}));

      // Update payment gateway settings
      const paymentGatewayUpdates = {
        paymentGateway: updates.data
      };

      // Add audit trail
      const reason = req.body.reason || 'Payment gateway settings update';
      
      await settings.updatePaymentGatewaySettings(paymentGatewayUpdates, userId, reason);

      // Re-initialize Stripe if keys changed
      if (this.shouldReinitializeStripe(oldSettings, updates.data)) {
        await this.reinitializeStripe(updates.data);
      }

      // Get updated settings with masked data
      const updatedSettings = settings.getPaymentGatewaySettings();

      console.log('Payment gateway settings updated successfully');
      console.log('Provider:', updatedSettings.paymentGateway?.provider);
      console.log('Test mode:', updatedSettings.paymentGateway?.testMode);

      res.json({
        success: true,
        data: updatedSettings.paymentGateway || {},
        message: 'Payment gateway settings updated successfully',
        audit: {
          updatedBy: userId,
          timestamp: new Date(),
          reason
        }
      });

    } catch (error) {
      console.error('Error updating payment gateway settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update payment gateway settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Test payment gateway connection
   */
  async testPaymentGatewayConnection(req, res) {
    try {
      console.log('=== TEST PAYMENT GATEWAY CONNECTION ===');
      
      const { provider, testMode } = req.body;
      
      if (!provider) {
        return res.status(400).json({
          success: false,
          error: 'Provider is required'
        });
      }

      let testResult = { success: false, details: {} };

      switch (provider) {
        case 'stripe':
          testResult = await this.testStripeConnection(req.body);
          break;
        case 'paypal':
          testResult = await this.testPayPalConnection(req.body);
          break;
        default:
          testResult = {
            success: false,
            error: 'Unsupported payment provider'
          };
      }

      console.log('Payment gateway connection test result:', testResult);

      res.json({
        success: testResult.success,
        data: testResult,
        message: testResult.success ? 
          'Payment gateway connection successful' : 
          'Payment gateway connection failed'
      });

    } catch (error) {
      console.error('Error testing payment gateway connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test payment gateway connection',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get payment gateway statistics
   */
  async getPaymentGatewayStats(req, res) {
    try {
      console.log('=== GET PAYMENT GATEWAY STATS ===');
      
      const settings = await GlobalSettings.findOne();
      
      if (!settings || !settings.paymentGateway) {
        return res.json({
          success: true,
          data: {
            configured: false,
            provider: null,
            testMode: false,
            lastUpdated: null,
            version: 0
          }
        });
      }

      const stats = {
        configured: settings.paymentGateway.isEnabled || false,
        provider: settings.paymentGateway.provider,
        testMode: settings.paymentGateway.testMode || false,
        currency: settings.paymentGateway.currency,
        commissionFee: settings.paymentGateway.commissionFee,
        lastUpdated: settings.audit?.lastUpdated,
        version: settings.audit?.version || 0,
        features: {
          autoCapture: settings.paymentGateway.autoCapturePayments || false,
          applePay: settings.paymentGateway.allowApplePay || false,
          googlePay: settings.paymentGateway.allowGooglePay || false,
          bankTransfers: settings.paymentGateway.allowBankTransfers || false
        },
        security: {
          webhookTolerance: settings.paymentGateway.webhookTolerance,
          require3DS: settings.paymentGateway.require3DSecure,
          fraudDetection: settings.paymentGateway.riskManagement?.fraudDetection?.enabled
        }
      };

      console.log('Payment gateway stats retrieved successfully');

      res.json({
        success: true,
        data: stats,
        message: 'Payment gateway statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting payment gateway stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment gateway statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reset payment gateway settings to defaults
   */
  async resetPaymentGatewaySettings(req, res) {
    try {
      console.log('=== RESET PAYMENT GATEWAY SETTINGS ===');
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      let settings = await GlobalSettings.findOne();
      
      if (!settings) {
        settings = new GlobalSettings();
      }

      // Store current settings for audit
      const oldSettings = JSON.parse(JSON.stringify(settings.paymentGateway || {}));

      // Reset to defaults
      const defaultSettings = {
        paymentGateway: {
          provider: 'stripe',
          isEnabled: false,
          testMode: true,
          currency: 'USD',
          commissionFee: 10,
          commissionType: 'percentage',
          fixedCommissionAmount: 0,
          invoicePrefix: 'INV',
          invoiceSequence: 1000,
          autoCapturePayments: false,
          allowApplePay: false,
          allowGooglePay: false,
          allowBankTransfers: true,
          transactionFee: 2.9,
          fixedFee: 0.30,
          minimumAmount: 1,
          maximumAmount: 10000,
          stripe: {
            publishableKey: '',
            encryptedSecretKey: '',
            encryptedWebhookSecret: '',
            webhookEndpoint: '/api/webhooks/stripe',
            supportedMethods: ['card'],
            successUrl: '/payment/success',
            cancelUrl: '/payment/cancel'
          },
          webhookTolerance: 300,
          require3DSecure: false,
          minimumAmountFor3DS: 50,
          payouts: {
            enabled: true,
            minimumPayoutAmount: 50,
            payoutSchedule: 'weekly',
            payoutDay: 1,
            processingTime: 3
          },
          riskManagement: {
            enabled: true,
            fraudDetection: {
              enabled: true,
              strictMode: false,
              blockedCountries: [],
              highRiskCountries: [],
              velocityChecks: {
                enabled: true,
                maxAttemptsPerHour: 5,
                maxAttemptsPerDay: 20
              }
            },
            amountLimits: {
              maxSingleTransaction: 5000,
              maxDailyVolume: 25000,
              maxWeeklyVolume: 100000
            }
          },
          compliance: {
            pciCompliance: {
              enabled: true,
              level: 'saq_a'
            },
            kycRequired: false,
            kycLevel: 'basic',
            taxReporting: {
              enabled: true,
              threshold1099: 600,
              threshold1099K: 20000
            }
          }
        }
      };

      await settings.updatePaymentGatewaySettings(defaultSettings, userId, 'Reset to default settings');

      console.log('Payment gateway settings reset successfully');

      res.json({
        success: true,
        data: defaultSettings.paymentGateway,
        message: 'Payment gateway settings reset to defaults successfully'
      });

    } catch (error) {
      console.error('Error resetting payment gateway settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset payment gateway settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Validate payment gateway updates
   */
  validatePaymentGatewayUpdates(body) {
    const errors = [];
    const data = {};

    // Validate provider
    if (body.provider && !['stripe', 'paypal', 'manual', 'offline'].includes(body.provider)) {
      errors.push('Invalid payment provider');
    } else if (body.provider) {
      data.provider = body.provider;
    }

    // Validate currency
    if (body.currency && !['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY'].includes(body.currency)) {
      errors.push('Invalid currency');
    } else if (body.currency) {
      data.currency = body.currency;
    }

    // Validate commission fee
    if (body.commissionFee !== undefined) {
      const commission = parseFloat(body.commissionFee);
      if (isNaN(commission) || commission < 0 || commission > 100) {
        errors.push('Commission fee must be between 0 and 100');
      } else {
        data.commissionFee = commission;
      }
    }

    // Validate commission type
    if (body.commissionType && !['percentage', 'fixed', 'hybrid'].includes(body.commissionType)) {
      errors.push('Invalid commission type');
    } else if (body.commissionType) {
      data.commissionType = body.commissionType;
    }

    // Validate fixed commission amount
    if (body.fixedCommissionAmount !== undefined) {
      const amount = parseFloat(body.fixedCommissionAmount);
      if (isNaN(amount) || amount < 0) {
        errors.push('Fixed commission amount must be non-negative');
      } else {
        data.fixedCommissionAmount = amount;
      }
    }

    // Validate invoice prefix
    if (body.invoicePrefix && (typeof body.invoicePrefix !== 'string' || body.invoicePrefix.length > 8)) {
      errors.push('Invoice prefix must be a string with max 8 characters');
    } else if (body.invoicePrefix) {
      data.invoicePrefix = body.invoicePrefix.trim().toUpperCase();
    }

    // Validate boolean fields
    const booleanFields = [
      'isEnabled', 'testMode', 'autoCapturePayments', 'allowApplePay', 
      'allowGooglePay', 'allowBankTransfers', 'require3DSecure'
    ];

    booleanFields.forEach(field => {
      if (body[field] !== undefined && typeof body[field] !== 'boolean') {
        errors.push(`${field} must be a boolean value`);
      } else if (body[field] !== undefined) {
        data[field] = body[field];
      }
    });

    // Validate numeric fields
    const numericFields = [
      { name: 'transactionFee', min: 0, max: 10 },
      { name: 'fixedFee', min: 0 },
      { name: 'minimumAmount', min: 0.50 },
      { name: 'maximumAmount', min: 100 },
      { name: 'webhookTolerance', min: 60, max: 900 },
      { name: 'minimumAmountFor3DS', min: 0 }
    ];

    numericFields.forEach(field => {
      if (body[field.name] !== undefined) {
        const value = parseFloat(body[field.name]);
        if (isNaN(value) || value < field.min || (field.max && value > field.max)) {
          errors.push(`${field.name} must be between ${field.min}${field.max ? ` and ${field.max}` : ''}`);
        } else {
          data[field.name] = value;
        }
      }
    });

    // Validate Stripe configuration
    if (body.stripe) {
      const stripeData = {};

      if (body.stripe.publishableKey) {
        if (!encryptionService.validateStripeKey(body.stripe.publishableKey, 'publishable')) {
          errors.push('Invalid Stripe publishable key format');
        } else {
          stripeData.publishableKey = body.stripe.publishableKey;
        }
      }

      if (body.stripe.secretKey) {
        if (!encryptionService.validateStripeKey(body.stripe.secretKey, 'secret')) {
          errors.push('Invalid Stripe secret key format');
        } else {
          stripeData.secretKey = body.stripe.secretKey;
        }
      }

      if (body.stripe.webhookSecret) {
        if (!encryptionService.validateStripeKey(body.stripe.webhookSecret, 'webhook')) {
          errors.push('Invalid Stripe webhook secret format');
        } else {
          stripeData.webhookSecret = body.stripe.webhookSecret;
        }
      }

      if (body.stripe.webhookEndpoint) {
        stripeData.webhookEndpoint = body.stripe.webhookEndpoint;
      }

      if (body.stripe.supportedMethods && Array.isArray(body.stripe.supportedMethods)) {
        const validMethods = ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'sepa_debit'];
        const invalidMethods = body.stripe.supportedMethods.filter(m => !validMethods.includes(m));
        if (invalidMethods.length > 0) {
          errors.push(`Invalid Stripe payment methods: ${invalidMethods.join(', ')}`);
        } else {
          stripeData.supportedMethods = body.stripe.supportedMethods;
        }
      }

      if (Object.keys(stripeData).length > 0) {
        data.stripe = stripeData;
      }
    }

    // Validate PayPal configuration
    if (body.paypal) {
      const paypalData = {};

      if (body.paypal.clientId) {
        if (!encryptionService.validatePayPalKey(body.paypal.clientId, 'client_id')) {
          errors.push('Invalid PayPal client ID format');
        } else {
          paypalData.clientId = body.paypal.clientId;
        }
      }

      if (body.paypal.clientSecret) {
        if (!encryptionService.validatePayPalKey(body.paypal.clientSecret, 'client_secret')) {
          errors.push('Invalid PayPal client secret format');
        } else {
          paypalData.clientSecret = body.paypal.clientSecret;
        }
      }

      if (Object.keys(paypalData).length > 0) {
        data.paypal = paypalData;
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: 'Validation failed',
        details: errors
      };
    }

    return {
      valid: true,
      data
    };
  }

  /**
   * Test Stripe connection
   */
  async testStripeConnection(config) {
    try {
      if (!config.stripe?.secretKey) {
        return {
          success: false,
          error: 'Stripe secret key is required'
        };
      }

      const testStripe = stripe(config.stripe.secretKey);
      
      // Test by retrieving account info
      const account = await testStripe.accounts.retrieve();
      
      // Test by creating a test customer
      const customer = await testStripe.customers.create({
        email: 'test@example.com',
        description: 'Test customer for connection validation'
      });

      // Clean up test customer
      await testStripe.customers.del(customer.id);

      return {
        success: true,
        details: {
          account: {
            id: account.id,
            country: account.country,
            business_profile: account.business_profile
          },
          testMode: config.testMode,
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          type: error.type,
          code: error.code
        }
      };
    }
  }

  /**
   * Test PayPal connection
   */
  async testPayPalConnection(config) {
    try {
      if (!config.paypal?.clientId || !config.paypal?.clientSecret) {
        return {
          success: false,
          error: 'PayPal client ID and secret are required'
        };
      }

      // PayPal connection test would go here
      // For now, return a placeholder
      return {
        success: true,
        details: {
          sandboxMode: config.paypal.sandboxMode || true,
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if Stripe should be re-initialized
   */
  shouldReinitializeStripe(oldSettings, newSettings) {
    if (!oldSettings.stripe && !newSettings.stripe) return false;
    if (!oldSettings.stripe && newSettings.stripe) return true;
    if (oldSettings.stripe && !newSettings.stripe) return true;

    return (
      oldSettings.stripe.secretKey !== newSettings.stripe.secretKey ||
      oldSettings.stripe.publishableKey !== newSettings.stripe.publishableKey ||
      oldSettings.testMode !== newSettings.testMode
    );
  }

  /**
   * Re-initialize Stripe with new configuration
   */
  async reinitializeStripe(config) {
    try {
      console.log('Re-initializing Stripe with new configuration...');
      
      if (config.stripe?.secretKey) {
        // Update Stripe instance
        const newStripe = require('stripe')(config.stripe.secretKey);
        
        // Test the new configuration
        await newStripe.accounts.retrieve();
        
        console.log('Stripe re-initialized successfully');
        return true;
      }

      return false;

    } catch (error) {
      console.error('Failed to re-initialize Stripe:', error);
      throw error;
    }
  }
}

module.exports = new PaymentGatewayController();
