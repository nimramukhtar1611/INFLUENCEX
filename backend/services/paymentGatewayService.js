const stripe = require('stripe');
const GlobalSettings = require('../models/GlobalSettings');
const encryptionService = require('./encryptionService');
const EventEmitter = require('events');

class PaymentGatewayService extends EventEmitter {
  constructor() {
    super();
    this.stripeInstance = null;
    this.currentConfig = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000; // 1 second
    this.isInitialized = false;
    
    // Initialize on startup
    this.initialize();
  }

  /**
   * Initialize payment gateway with current settings
   */
  async initialize() {
    try {
      console.log('=== INITIALIZING PAYMENT GATEWAY SERVICE ===');
      
      const settings = await GlobalSettings.findOne();
      if (!settings || !settings.paymentGateway) {
        console.log('No payment gateway settings found, using default configuration');
        this.setDefaultConfiguration();
        return;
      }

      await this.updateStripeInstance(settings.paymentGateway);
      this.isInitialized = true;
      
      console.log('Payment gateway service initialized successfully');
      this.emit('initialized', { provider: settings.paymentGateway.provider });
      
    } catch (error) {
      console.error('Failed to initialize payment gateway service:', error);
      this.emit('error', error);
    }
  }

  /**
   * Set default configuration when no settings exist
   */
  setDefaultConfiguration() {
    this.currentConfig = {
      provider: 'stripe',
      testMode: true,
      isEnabled: false
    };
    
    // Use environment variables or create a test instance
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripeInstance = stripe(secretKey);
      console.log('Using Stripe instance from environment variables');
    } else {
      console.warn('No Stripe secret key available in environment');
    }
  }

  /**
   * Update Stripe instance with new configuration
   * @param {Object} config - Payment gateway configuration
   */
  async updateStripeInstance(config) {
    try {
      console.log('=== UPDATING STRIPE INSTANCE ===');
      
      if (!config || config.provider !== 'stripe') {
        console.log('Non-Stripe provider or no config provided');
        this.stripeInstance = null;
        this.currentConfig = config;
        return;
      }

      // Get secret key from encrypted storage
      let secretKey = null;
      
      if (config.stripe?.encryptedSecretKey) {
        try {
          secretKey = encryptionService.decrypt(config.stripe.encryptedSecretKey);
        } catch (decryptError) {
          console.error('Failed to decrypt Stripe secret key:', decryptError);
          throw new Error('Invalid Stripe secret key encryption');
        }
      } else if (config.stripe?.secretKey) {
        // Handle plain text key (should be encrypted before saving)
        secretKey = config.stripe.secretKey;
        console.warn('Using plain text Stripe key - should be encrypted');
      }

      if (!secretKey) {
        console.log('No Stripe secret key available');
        this.stripeInstance = null;
        this.currentConfig = config;
        return;
      }

      // Validate the key format
      if (!encryptionService.validateStripeKey(secretKey, 'secret')) {
        throw new Error('Invalid Stripe secret key format');
      }

      // Create new Stripe instance
      const newStripeInstance = stripe(secretKey, {
        apiVersion: '2024-06-20',
        typescript: false
      });

      // Test the new instance
      await this.testStripeConnection(newStripeInstance);

      // Update instance and configuration
      this.stripeInstance = newStripeInstance;
      this.currentConfig = config;
      this.reconnectAttempts = 0;

      console.log('Stripe instance updated successfully');
      console.log('Test mode:', config.testMode);
      console.log('Provider:', config.provider);

      this.emit('stripeUpdated', { config, testMode: config.testMode });

    } catch (error) {
      console.error('Failed to update Stripe instance:', error);
      this.emit('error', error);
      
      // Attempt reconnection with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
          this.updateStripeInstance(config);
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
        this.stripeInstance = null;
        this.currentConfig = config;
      }
      
      throw error;
    }
  }

  /**
   * Test Stripe connection
   * @param {Object} stripeInstance - Stripe instance to test
   */
  async testStripeConnection(stripeInstance) {
    try {
      // Test by retrieving account info
      const account = await stripeInstance.accounts.retrieve();
      
      if (!account) {
        throw new Error('Failed to retrieve Stripe account');
      }

      console.log('Stripe connection test successful');
      console.log('Account ID:', account.id);
      console.log('Country:', account.country);
      
      return true;
    } catch (error) {
      console.error('Stripe connection test failed:', error);
      throw new Error(`Stripe connection failed: ${error.message}`);
    }
  }

  /**
   * Get current Stripe instance
   * @returns {Object|null} - Stripe instance or null if not available
   */
  getStripeInstance() {
    return this.stripeInstance;
  }

  /**
   * Get current configuration
   * @returns {Object|null} - Current configuration
   */
  getCurrentConfig() {
    return this.currentConfig;
  }

  /**
   * Check if Stripe is available and configured
   * @returns {boolean} - True if Stripe is available
   */
  isStripeAvailable() {
    return this.stripeInstance !== null && 
           this.currentConfig && 
           this.currentConfig.provider === 'stripe' && 
           this.currentConfig.isEnabled;
  }

  /**
   * Get Stripe configuration for frontend
   * @returns {Object} - Frontend-safe configuration
   */
  getFrontendConfig() {
    if (!this.currentConfig || this.currentConfig.provider !== 'stripe') {
      return {
        provider: null,
        isEnabled: false,
        testMode: true
      };
    }

    return {
      provider: this.currentConfig.provider,
      isEnabled: this.currentConfig.isEnabled || false,
      testMode: this.currentConfig.testMode || true,
      publishableKey: this.currentConfig.stripe?.publishableKey || '',
      currency: this.currentConfig.currency || 'USD',
      commissionFee: this.currentConfig.commissionFee || 10,
      transactionFee: this.currentConfig.transactionFee || 2.9,
      fixedFee: this.currentConfig.fixedFee || 0.30,
      minimumAmount: this.currentConfig.minimumAmount || 1,
      maximumAmount: this.currentConfig.maximumAmount || 10000,
      autoCapturePayments: this.currentConfig.autoCapturePayments || false,
      allowApplePay: this.currentConfig.allowApplePay || false,
      allowGooglePay: this.currentConfig.allowGooglePay || false,
      allowBankTransfers: this.currentConfig.allowBankTransfers || true,
      supportedMethods: this.currentConfig.stripe?.supportedMethods || ['card'],
      successUrl: this.currentConfig.stripe?.successUrl || '/payment/success',
      cancelUrl: this.currentConfig.stripe?.cancelUrl || '/payment/cancel'
    };
  }

  /**
   * Create payment intent with current Stripe instance
   * @param {number} amount - Amount in currency units
   * @param {string} currency - Currency code
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Payment intent
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!this.isStripeAvailable()) {
      throw new Error('Stripe is not available or not configured');
    }

    try {
      const paymentIntent = await this.stripeInstance.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: { 
          enabled: true 
        },
        // Use current configuration settings
        capture_method: this.currentConfig.autoCapturePayments ? 'automatic' : 'manual',
        setup_future_usage: 'off_session'
      });

      return paymentIntent;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Create customer with current Stripe instance
   * @param {string} email - Customer email
   * @param {string} name - Customer name
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Customer object
   */
  async createCustomer(email, name, metadata = {}) {
    if (!this.isStripeAvailable()) {
      throw new Error('Stripe is not available or not configured');
    }

    try {
      const customer = await this.stripeInstance.customers.create({
        email,
        name,
        metadata: { 
          source: 'influencex-payment-gateway-service',
          ...metadata 
        }
      });

      return customer;
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw error;
    }
  }

  /**
   * Process webhook with current Stripe instance
   * @param {string} body - Webhook body
   * @param {string} signature - Stripe signature
   * @returns {Object} - Webhook event
   */
  async processWebhook(body, signature) {
    if (!this.isStripeAvailable()) {
      throw new Error('Stripe is not available or not configured');
    }

    try {
      let webhookSecret = null;
      
      // Get webhook secret from current configuration
      if (this.currentConfig.stripe?.encryptedWebhookSecret) {
        webhookSecret = encryptionService.decrypt(this.currentConfig.stripe.encryptedWebhookSecret);
      } else if (this.currentConfig.stripe?.webhookSecret) {
        webhookSecret = this.currentConfig.stripe.webhookSecret;
      }

      if (!webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      const event = this.stripeInstance.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );

      return event;
    } catch (error) {
      console.error('Failed to process webhook:', error);
      throw error;
    }
  }

  /**
   * Get account balance with current Stripe instance
   * @returns {Object} - Balance information
   */
  async getBalance() {
    if (!this.isStripeAvailable()) {
      throw new Error('Stripe is not available or not configured');
    }

    try {
      const balance = await this.stripeInstance.balance.retrieve();
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Validate payment amount against current configuration
   * @param {number} amount - Amount to validate
   * @returns {boolean} - True if valid
   */
  validateAmount(amount) {
    if (!this.currentConfig) {
      return true; // No limits if not configured
    }

    const { minimumAmount, maximumAmount } = this.currentConfig;
    
    if (minimumAmount && amount < minimumAmount) {
      return false;
    }
    
    if (maximumAmount && amount > maximumAmount) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate platform fees based on current configuration
   * @param {number} amount - Original amount
   * @returns {Object} - Fee breakdown
   */
  calculateFees(amount) {
    if (!this.currentConfig) {
      return {
        platformFee: 0,
        transactionFee: 0,
        fixedFee: 0,
        totalFees: 0,
        netAmount: amount
      };
    }

    const { commissionFee, commissionType, fixedCommissionAmount, transactionFee, fixedFee } = this.currentConfig;
    
    let platformFee = 0;
    
    if (commissionType === 'percentage' || commissionType === 'hybrid') {
      platformFee = (amount * commissionFee) / 100;
    }
    
    if (commissionType === 'fixed' || commissionType === 'hybrid') {
      platformFee += fixedCommissionAmount || 0;
    }
    
    const stripeFee = (amount * (transactionFee || 2.9)) / 100 + (fixedFee || 0.30);
    const totalFees = platformFee + stripeFee;
    const netAmount = amount - totalFees;
    
    return {
      platformFee,
      transactionFee: (amount * (transactionFee || 2.9)) / 100,
      fixedFee: fixedFee || 0.30,
      totalFees,
      netAmount
    };
  }

  /**
   * Handle settings update event
   * @param {Object} newSettings - New payment gateway settings
   */
  async handleSettingsUpdate(newSettings) {
    try {
      console.log('=== HANDLING SETTINGS UPDATE ===');
      
      if (!newSettings) {
        console.log('No payment gateway settings provided');
        return;
      }

      await this.updateStripeInstance(newSettings);
      
      this.emit('settingsUpdated', newSettings);
      
    } catch (error) {
      console.error('Failed to handle settings update:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get service health status
   * @returns {Object} - Health status
   */
  getHealthStatus() {
    return {
      isInitialized: this.isInitialized,
      isAvailable: this.isStripeAvailable(),
      provider: this.currentConfig?.provider || null,
      testMode: this.currentConfig?.testMode || true,
      isEnabled: this.currentConfig?.isEnabled || false,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError || null
    };
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    console.log('Shutting down payment gateway service...');
    this.stripeInstance = null;
    this.currentConfig = null;
    this.isInitialized = false;
    this.removeAllListeners();
    console.log('Payment gateway service shut down');
  }
}

// Create singleton instance
const paymentGatewayService = new PaymentGatewayService();

// Listen for settings changes from GlobalSettings model
GlobalSettings.watch().on('change', async (data) => {
  const fullDoc = await GlobalSettings.findById(data.documentKey);
  if (fullDoc && fullDoc.paymentGateway) {
    await paymentGatewayService.handleSettingsUpdate(fullDoc.paymentGateway);
  }
});

module.exports = paymentGatewayService;
