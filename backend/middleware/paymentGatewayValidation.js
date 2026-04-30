const encryptionService = require('../services/encryptionService');
const GlobalSettings = require('../models/GlobalSettings');

/**
 * Payment Gateway Validation Middleware
 * Comprehensive validation for all payment gateway operations
 */
class PaymentGatewayValidation {
  /**
   * Validate payment gateway settings update
   */
  static validateSettingsUpdate(req, res, next) {
    try {
      const errors = [];
      const warnings = [];
      const { body } = req;

      // Basic structure validation
      if (!body || typeof body !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: 'Request body must be a valid JSON object'
        });
      }

      // Provider validation
      if (body.provider && !this.validateProvider(body.provider)) {
        errors.push('Invalid payment provider. Must be one of: stripe, paypal, manual, offline');
      }

      // Currency validation
      if (body.currency && !this.validateCurrency(body.currency)) {
        errors.push('Invalid currency. Must be a valid ISO 4217 currency code');
      }

      // Commission fee validation
      if (body.commissionFee !== undefined) {
        const commissionValidation = this.validateCommissionFee(body.commissionFee, body.commissionType);
        if (!commissionValidation.valid) {
          errors.push(...commissionValidation.errors);
        }
        warnings.push(...commissionValidation.warnings);
      }

      // Amount validations
      const amountFields = [
        { name: 'transactionFee', min: 0, max: 10 },
        { name: 'fixedFee', min: 0 },
        { name: 'minimumAmount', min: 0.50 },
        { name: 'maximumAmount', min: 1 },
        { name: 'fixedCommissionAmount', min: 0 },
        { name: 'minimumAmountFor3DS', min: 0 }
      ];

      amountFields.forEach(field => {
        if (body[field.name] !== undefined) {
          const validation = this.validateAmount(body[field.name], field.name, field.min, field.max);
          if (!validation.valid) {
            errors.push(...validation.errors);
          }
        }
      });

      // Boolean field validation
      const booleanFields = [
        'isEnabled', 'testMode', 'autoCapturePayments', 'allowApplePay', 
        'allowGooglePay', 'allowBankTransfers', 'require3DSecure'
      ];

      booleanFields.forEach(field => {
        if (body[field] !== undefined && typeof body[field] !== 'boolean') {
          errors.push(`${field} must be a boolean value`);
        }
      });

      // Stripe configuration validation
      if (body.stripe) {
        const stripeValidation = this.validateStripeConfig(body.stripe);
        if (!stripeValidation.valid) {
          errors.push(...stripeValidation.errors);
        }
        warnings.push(...stripeValidation.warnings);
      }

      // PayPal configuration validation
      if (body.paypal) {
        const paypalValidation = this.validatePayPalConfig(body.paypal);
        if (!paypalValidation.valid) {
          errors.push(...paypalValidation.errors);
        }
        warnings.push(...paypalValidation.warnings);
      }

      // Webhook endpoint validation
      if (body.stripe?.webhookEndpoint) {
        const webhookValidation = this.validateWebhookEndpoint(body.stripe.webhookEndpoint);
        if (!webhookValidation.valid) {
          errors.push(...webhookValidation.errors);
        }
      }

      // Business logic validation
      const businessValidation = this.validateBusinessLogic(body);
      if (!businessValidation.valid) {
        errors.push(...businessValidation.errors);
        warnings.push(...businessValidation.warnings);
      }

      // Security validation
      const securityValidation = this.validateSecuritySettings(body);
      if (!securityValidation.valid) {
        errors.push(...securityValidation.errors);
        warnings.push(...securityValidation.warnings);
      }

      // Attach validation results to request
      req.validationResults = {
        valid: errors.length === 0,
        errors,
        warnings,
        sanitizedData: this.sanitizeInput(body)
      };

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      }

      next();

    } catch (error) {
      console.error('Payment gateway validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation service error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Validate payment provider
   */
  static validateProvider(provider) {
    const validProviders = ['stripe', 'paypal', 'manual', 'offline'];
    return validProviders.includes(provider);
  }

  /**
   * Validate currency code
   */
  static validateCurrency(currency) {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY'];
    return validCurrencies.includes(currency);
  }

  /**
   * Validate commission fee
   */
  static validateCommissionFee(fee, type = 'percentage') {
    const errors = [];
    const warnings = [];

    const commission = parseFloat(fee);
    
    if (isNaN(commission)) {
      errors.push('Commission fee must be a valid number');
      return { valid: false, errors, warnings };
    }

    if (commission < 0) {
      errors.push('Commission fee cannot be negative');
    }

    if (type === 'percentage') {
      if (commission > 100) {
        errors.push('Commission percentage cannot exceed 100%');
      } else if (commission > 50) {
        warnings.push('High commission rate may affect user adoption');
      }
    }

    if (type === 'fixed' && commission > 1000) {
      warnings.push('High fixed commission may be prohibitive for small transactions');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate amount
   */
  static validateAmount(amount, fieldName, min = 0, max = null) {
    const errors = [];
    
    const value = parseFloat(amount);
    
    if (isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
      return { valid: false, errors };
    }

    if (value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (max && value > max) {
      errors.push(`${fieldName} cannot exceed ${max}`);
    }

    // Additional business rules
    if (fieldName === 'transactionFee' && value > 5) {
      errors.push('Transaction fee should not exceed 5% for competitive pricing');
    }

    if (fieldName === 'fixedFee' && value > 5) {
      errors.push('Fixed fee should not exceed $5.00 for user experience');
    }

    if (fieldName === 'minimumAmount' && value < 0.50) {
      errors.push('Minimum amount cannot be less than $0.50 due to processing costs');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Stripe configuration
   */
  static validateStripeConfig(config) {
    const errors = [];
    const warnings = [];

    // Publishable key validation
    if (config.publishableKey) {
      if (!encryptionService.validateStripeKey(config.publishableKey, 'publishable')) {
        errors.push('Invalid Stripe publishable key format. Should start with pk_live_ or pk_test_');
      } else if (config.publishableKey.startsWith('pk_live_') && !config.testMode) {
        warnings.push('Using live keys in production environment');
      }
    }

    // Secret key validation
    if (config.secretKey) {
      if (!encryptionService.validateStripeKey(config.secretKey, 'secret')) {
        errors.push('Invalid Stripe secret key format. Should start with sk_live_ or sk_test_');
      } else if (config.secretKey.startsWith('sk_live_') && !config.testMode) {
        warnings.push('Using live secret keys - ensure proper security measures');
      }
    }

    // Webhook secret validation
    if (config.webhookSecret) {
      if (!encryptionService.validateStripeKey(config.webhookSecret, 'webhook')) {
        errors.push('Invalid Stripe webhook secret format. Should start with whsec_');
      }
    }

    // Supported methods validation
    if (config.supportedMethods && Array.isArray(config.supportedMethods)) {
      const validMethods = ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'sepa_debit'];
      const invalidMethods = config.supportedMethods.filter(m => !validMethods.includes(m));
      
      if (invalidMethods.length > 0) {
        errors.push(`Invalid payment methods: ${invalidMethods.join(', ')}`);
      }

      if (config.supportedMethods.includes('apple_pay') && !config.allowApplePay) {
        warnings.push('Apple Pay is in supported methods but not enabled');
      }

      if (config.supportedMethods.includes('google_pay') && !config.allowGooglePay) {
        warnings.push('Google Pay is in supported methods but not enabled');
      }
    }

    // Success/Cancel URL validation
    if (config.successUrl && !this.validateUrl(config.successUrl)) {
      errors.push('Invalid success URL format');
    }

    if (config.cancelUrl && !this.validateUrl(config.cancelUrl)) {
      errors.push('Invalid cancel URL format');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate PayPal configuration
   */
  static validatePayPalConfig(config) {
    const errors = [];
    const warnings = [];

    // Client ID validation
    if (config.clientId) {
      if (!encryptionService.validatePayPalKey(config.clientId, 'client_id')) {
        errors.push('Invalid PayPal client ID format');
      }
    }

    // Client secret validation
    if (config.clientSecret) {
      if (!encryptionService.validatePayPalKey(config.clientSecret, 'client_secret')) {
        errors.push('Invalid PayPal client secret format');
      }
    }

    // Sandbox mode validation
    if (config.sandboxMode !== undefined && typeof config.sandboxMode !== 'boolean') {
      errors.push('PayPal sandbox mode must be a boolean');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate webhook endpoint
   */
  static validateWebhookEndpoint(endpoint) {
    const errors = [];

    if (!endpoint || typeof endpoint !== 'string') {
      errors.push('Webhook endpoint must be a valid string');
      return { valid: false, errors };
    }

    if (!endpoint.startsWith('/')) {
      errors.push('Webhook endpoint must start with /');
    }

    if (endpoint.includes(' ')) {
      errors.push('Webhook endpoint cannot contain spaces');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate URL format
   */
  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate business logic
   */
  static validateBusinessLogic(body) {
    const errors = [];
    const warnings = [];

    // Commission logic validation
    if (body.commissionType === 'fixed' && !body.fixedCommissionAmount) {
      errors.push('Fixed commission amount is required when commission type is fixed');
    }

    if (body.commissionType === 'hybrid' && (!body.commissionFee || !body.fixedCommissionAmount)) {
      errors.push('Both percentage and fixed commission amounts are required for hybrid type');
    }

    // Amount relationship validation
    if (body.minimumAmount && body.maximumAmount && body.minimumAmount >= body.maximumAmount) {
      errors.push('Minimum amount must be less than maximum amount');
    }

    // 3D Secure validation
    if (body.require3DSecure && body.minimumAmountFor3DS && body.minimumAmountFor3DS < 1) {
      warnings.push('3D Secure threshold is very low - may affect user experience');
    }

    // Payout validation
    if (body.payouts) {
      if (body.payouts.minimumPayoutAmount && body.payouts.minimumPayoutAmount < 1) {
        errors.push('Minimum payout amount must be at least $1.00');
      }

      if (body.payouts.processingTime && (body.payouts.processingTime < 1 || body.payouts.processingTime > 14)) {
        errors.push('Payout processing time must be between 1 and 14 business days');
      }
    }

    // Risk management validation
    if (body.riskManagement) {
      const { amountLimits } = body.riskManagement;
      
      if (amountLimits) {
        if (amountLimits.maxSingleTransaction && amountLimits.maxDailyVolume && 
            amountLimits.maxSingleTransaction > amountLimits.maxDailyVolume) {
          errors.push('Single transaction limit cannot exceed daily volume limit');
        }

        if (amountLimits.maxDailyVolume && amountLimits.maxWeeklyVolume && 
            amountLimits.maxDailyVolume > amountLimits.maxWeeklyVolume) {
          errors.push('Daily volume limit cannot exceed weekly volume limit');
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate security settings
   */
  static validateSecuritySettings(body) {
    const errors = [];
    const warnings = [];

    // Webhook tolerance validation
    if (body.webhookTolerance) {
      if (body.webhookTolerance < 60 || body.webhookTolerance > 900) {
        errors.push('Webhook tolerance must be between 60 and 900 seconds');
      } else if (body.webhookTolerance > 300) {
        warnings.push('High webhook tolerance may increase replay attack risk');
      }
    }

    // Test mode validation
    if (body.testMode !== undefined && body.stripe) {
      if (body.testMode && body.stripe.secretKey && body.stripe.secretKey.startsWith('sk_live_')) {
        warnings.push('Using live keys in test mode - this may cause issues');
      }

      if (!body.testMode && body.stripe.secretKey && body.stripe.secretKey.startsWith('sk_test_')) {
        warnings.push('Using test keys in production mode - payments will fail');
      }
    }

    // PCI compliance validation
    if (body.compliance && body.compliance.pciCompliance) {
      const validLevels = ['saq_a', 'saq_a_ep', 'saq_b', 'saq_c', 'saq_d'];
      if (!validLevels.includes(body.compliance.pciCompliance.level)) {
        errors.push('Invalid PCI compliance level');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(data) {
    const sanitized = {};

    // Remove potentially dangerous fields
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];

    Object.keys(data).forEach(key => {
      if (!dangerousFields.includes(key)) {
        if (typeof data[key] === 'string') {
          // Trim string values
          sanitized[key] = data[key].trim();
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          // Recursively sanitize nested objects
          sanitized[key] = this.sanitizeInput(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
    });

    return sanitized;
  }

  /**
   * Validate payment amount before processing
   */
  static validatePaymentAmount(req, res, next) {
    try {
      const { amount } = req.body;

      if (!amount || typeof amount !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment amount',
          details: 'Amount must be a valid number'
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment amount',
          details: 'Amount must be greater than 0'
        });
      }

      // Get current settings to validate against limits
      GlobalSettings.findOne().then(settings => {
        if (settings && settings.paymentGateway) {
          const { minimumAmount, maximumAmount } = settings.paymentGateway;

          if (minimumAmount && amount < minimumAmount) {
            return res.status(400).json({
              success: false,
              error: 'Amount below minimum',
              details: `Minimum amount is $${minimumAmount}`
            });
          }

          if (maximumAmount && amount > maximumAmount) {
            return res.status(400).json({
              success: false,
              error: 'Amount exceeds maximum',
              details: `Maximum amount is $${maximumAmount}`
            });
          }
        }

        req.validatedAmount = amount;
        next();
      }).catch(error => {
        console.error('Error validating payment amount:', error);
        res.status(500).json({
          success: false,
          error: 'Validation service error'
        });
      });

    } catch (error) {
      console.error('Payment amount validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation service error'
      });
    }
  }

  /**
   * Validate webhook signature
   */
  static validateWebhookSignature(req, res, next) {
    try {
      const signature = req.get('stripe-signature');
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing webhook signature'
        });
      }

      req.webhookSignature = signature;
      next();

    } catch (error) {
      console.error('Webhook signature validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Webhook validation error'
      });
    }
  }

  /**
   * Rate limiting middleware for payment operations
   */
  static rateLimit(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // 100 requests per window
      message = 'Too many payment requests'
    } = options;

    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (requests.has(key)) {
        const userRequests = requests.get(key).filter(time => time > windowStart);
        requests.set(key, userRequests);
      } else {
        requests.set(key, []);
      }

      // Check limit
      const userRequests = requests.get(key);
      if (userRequests.length >= max) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      userRequests.push(now);
      next();
    };
  }
}

module.exports = PaymentGatewayValidation;
