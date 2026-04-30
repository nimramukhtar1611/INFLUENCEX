const mongoose = require('mongoose');
const crypto = require('crypto');

const globalSettingsSchema = new mongoose.Schema({
  // ==================== PAYMENT GATEWAY CONFIGURATION ====================
  paymentGateway: {
    // Core Configuration
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'manual', 'offline'],
      default: 'stripe',
      required: true
    },
    isEnabled: {
      type: Boolean,
      default: false
    },
    testMode: {
      type: Boolean,
      default: true
    },
    
    // Platform Financial Settings
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY'],
      default: 'USD',
      required: true
    },
    commissionFee: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
      required: true
    },
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed', 'hybrid'],
      default: 'percentage'
    },
    fixedCommissionAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Invoice Configuration
    invoicePrefix: {
      type: String,
      default: 'INV',
      maxlength: 8,
      trim: true
    },
    invoiceSequence: {
      type: Number,
      default: 1000
    },
    
    // Payment Processing Options
    autoCapturePayments: {
      type: Boolean,
      default: false
    },
    allowApplePay: {
      type: Boolean,
      default: false
    },
    allowGooglePay: {
      type: Boolean,
      default: false
    },
    allowBankTransfers: {
      type: Boolean,
      default: true
    },
    
    // Fee Configuration
    transactionFee: {
      type: Number,
      default: 2.9,
      min: 0,
      max: 10
    },
    fixedFee: {
      type: Number,
      default: 0.30,
      min: 0
    },
    minimumAmount: {
      type: Number,
      default: 1,
      min: 0.50
    },
    maximumAmount: {
      type: Number,
      default: 10000,
      min: 100
    },

    // Stripe Configuration (Encrypted)
    stripe: {
      publishableKey: {
        type: String,
        required: function() { return this.provider === 'stripe'; }
      },
      encryptedSecretKey: {
        type: String,
        required: function() { return this.provider === 'stripe'; }
      },
      encryptedWebhookSecret: {
        type: String,
        required: function() { return this.provider === 'stripe'; }
      },
      webhookEndpoint: {
        type: String,
        default: '/api/webhooks/stripe'
      },
      connectAccountId: {
        type: String
      },
      supportedMethods: [{
        type: String,
        enum: ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'sepa_debit']
      }],
      successUrl: {
        type: String,
        default: '/payment/success'
      },
      cancelUrl: {
        type: String,
        default: '/payment/cancel'
      }
    },

    // PayPal Configuration (Encrypted)
    paypal: {
      clientId: {
        type: String,
        required: function() { return this.provider === 'paypal'; }
      },
      encryptedClientSecret: {
        type: String,
        required: function() { return this.provider === 'paypal'; }
      },
      webhookId: {
        type: String
      },
      webhookEndpoint: {
        type: String,
        default: '/api/webhooks/paypal'
      },
      sandboxMode: {
        type: Boolean,
        default: true
      }
    },

    // Security & Validation
    webhookTolerance: {
      type: Number,
      default: 300, // 5 minutes in seconds
      min: 60,
      max: 900
    },
    require3DSecure: {
      type: Boolean,
      default: false
    },
    minimumAmountFor3DS: {
      type: Number,
      default: 50,
      min: 0
    },

    // Payout Configuration
    payouts: {
      enabled: {
        type: Boolean,
        default: true
      },
      minimumPayoutAmount: {
        type: Number,
        default: 50,
        min: 1
      },
      payoutSchedule: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'manual'],
        default: 'weekly'
      },
      payoutDay: {
        type: Number,
        default: 1, // 1 = Monday, 7 = Sunday
        min: 1,
        max: 7
      },
      processingTime: {
        type: Number,
        default: 3, // business days
        min: 1,
        max: 7
      }
    },

    // Risk Management
    riskManagement: {
      enabled: {
        type: Boolean,
        default: true
      },
      fraudDetection: {
        enabled: {
          type: Boolean,
          default: true
        },
        strictMode: {
          type: Boolean,
          default: false
        },
        blockedCountries: [String],
        highRiskCountries: [String],
        velocityChecks: {
          enabled: {
            type: Boolean,
            default: true
          },
          maxAttemptsPerHour: {
            type: Number,
            default: 5
          },
          maxAttemptsPerDay: {
            type: Number,
            default: 20
          }
        }
      },
      amountLimits: {
        maxSingleTransaction: {
          type: Number,
          default: 5000
        },
        maxDailyVolume: {
          type: Number,
          default: 25000
        },
        maxWeeklyVolume: {
          type: Number,
          default: 100000
        }
      }
    },

    // Compliance & Reporting
    compliance: {
      pciCompliance: {
        enabled: {
          type: Boolean,
          default: true
        },
        level: {
          type: String,
          enum: ['saq_a', 'saq_a_ep', 'saq_b', 'saq_c', 'saq_d'],
          default: 'saq_a'
        }
      },
      kycRequired: {
        type: Boolean,
        default: false
      },
      kycLevel: {
        type: String,
        enum: ['basic', 'standard', 'enhanced'],
        default: 'basic'
      },
      taxReporting: {
        enabled: {
          type: Boolean,
          default: true
        },
        threshold1099: {
          type: Number,
          default: 600
        },
        threshold1099K: {
          type: Number,
          default: 20000
        }
      }
    }
  },

  // ==================== AUDIT & METADATA ====================
  audit: {
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    },
    changeLog: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      field: String,
      oldValue: String,
      newValue: String,
      reason: String
    }]
  },

  // ==================== SYSTEM METADATA ====================
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development'
    },
    version: {
      type: String,
      default: '1.0.0'
    }
  }
}, {
  timestamps: true,
  strict: false,
  collection: 'global_settings'
});

// ==================== INDEXES ====================
globalSettingsSchema.index({ 'paymentGateway.provider': 1 });
globalSettingsSchema.index({ 'paymentGateway.isEnabled': 1 });
globalSettingsSchema.index({ 'audit.version': 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
globalSettingsSchema.pre('save', function(next) {
  this.metadata.updatedAt = Date.now();
  
  // Ensure only one global settings document exists
  if (this.isNew) {
    this.constructor.countDocuments().then(count => {
      if (count > 0 && !this._id) {
        next(new Error('Only one global settings document can exist'));
      } else {
        next();
      }
    });
  } else {
    next();
  }
});

// ==================== ENCRYPTION/DECRYPTION METHODS ====================

/**
 * Encrypt sensitive data
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
globalSettingsSchema.statics.encrypt = function(text) {
  const algorithm = 'aes-256-gcm';
  const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, secretKey);
  cipher.setAAD(Buffer.from('payment-gateway', 'utf8'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Text to decrypt
 * @returns {string} - Decrypted text
 */
globalSettingsSchema.statics.decrypt = function(encryptedText) {
  const algorithm = 'aes-256-gcm';
  const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipher(algorithm, secretKey);
  decipher.setAAD(Buffer.from('payment-gateway', 'utf8'));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Mask sensitive data for display
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of characters to show at start
 * @returns {string} - Masked value
 */
globalSettingsSchema.statics.maskSensitiveData = function(value, visibleChars = 8) {
  if (!value || value.length <= visibleChars) {
    return value;
  }
  
  const visible = value.substring(0, visibleChars);
  const masked = '*'.repeat(value.length - visibleChars);
  return visible + masked;
};

// ==================== INSTANCE METHODS ====================

/**
 * Get payment gateway settings (with masked sensitive data)
 * @returns {Object} - Payment gateway settings
 */
globalSettingsSchema.methods.getPaymentGatewaySettings = function() {
  const settings = this.toObject();
  
  if (settings.paymentGateway) {
    // Mask sensitive fields
    if (settings.paymentGateway.stripe) {
      if (settings.paymentGateway.stripe.encryptedSecretKey) {
        settings.paymentGateway.stripe.secretKeyMasked = this.constructor.maskSensitiveData(
          this.constructor.decrypt(settings.paymentGateway.stripe.encryptedSecretKey)
        );
      }
      if (settings.paymentGateway.stripe.encryptedWebhookSecret) {
        settings.paymentGateway.stripe.webhookSecretMasked = this.constructor.maskSensitiveData(
          this.constructor.decrypt(settings.paymentGateway.stripe.encryptedWebhookSecret)
        );
      }
      // Remove encrypted fields from response
      delete settings.paymentGateway.stripe.encryptedSecretKey;
      delete settings.paymentGateway.stripe.encryptedWebhookSecret;
    }
    
    if (settings.paymentGateway.paypal) {
      if (settings.paymentGateway.paypal.encryptedClientSecret) {
        settings.paymentGateway.paypal.clientSecretMasked = this.constructor.maskSensitiveData(
          this.constructor.decrypt(settings.paymentGateway.paypal.encryptedClientSecret)
        );
      }
      delete settings.paymentGateway.paypal.encryptedClientSecret;
    }
  }
  
  return settings;
};

/**
 * Update payment gateway settings with audit trail
 * @param {Object} updates - Settings updates
 * @param {string} userId - User ID making the update
 * @param {string} reason - Reason for update
 */
globalSettingsSchema.methods.updatePaymentGatewaySettings = async function(updates, userId, reason = 'Settings update') {
  const oldSettings = JSON.parse(JSON.stringify(this.paymentGateway || {}));
  
  // Encrypt sensitive fields
  if (updates.paymentGateway) {
    if (updates.paymentGateway.stripe) {
      if (updates.paymentGateway.stripe.secretKey) {
        updates.paymentGateway.stripe.encryptedSecretKey = this.constructor.encrypt(updates.paymentGateway.stripe.secretKey);
        delete updates.paymentGateway.stripe.secretKey;
      }
      if (updates.paymentGateway.stripe.webhookSecret) {
        updates.paymentGateway.stripe.encryptedWebhookSecret = this.constructor.encrypt(updates.paymentGateway.stripe.webhookSecret);
        delete updates.paymentGateway.stripe.webhookSecret;
      }
    }
    
    if (updates.paymentGateway.paypal) {
      if (updates.paymentGateway.paypal.clientSecret) {
        updates.paymentGateway.paypal.encryptedClientSecret = this.constructor.encrypt(updates.paymentGateway.paypal.clientSecret);
        delete updates.paymentGateway.paypal.clientSecret;
      }
    }
  }
  
  // Deep merge updates
  const deepMerge = (target, source) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  };
  
  deepMerge(this, updates);
  
  // Add audit log entries
  if (!this.audit) this.audit = {};
  if (!this.audit.changeLog) this.audit.changeLog = [];
  
  const logChanges = (obj1, obj2, path = '') => {
    for (const key in obj2) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = obj1 && obj1[key];
      const newValue = obj2[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        this.audit.changeLog.push({
          timestamp: new Date(),
          changedBy: userId,
          field: currentPath,
          oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || ''),
          newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || ''),
          reason
        });
      }
      
      if (typeof newValue === 'object' && !Array.isArray(newValue)) {
        logChanges(oldValue, newValue, currentPath);
      }
    }
  };
  
  logChanges(oldSettings, updates.paymentGateway || {});
  
  this.audit.lastUpdatedBy = userId;
  this.audit.lastUpdated = new Date();
  this.audit.version = (this.audit.version || 0) + 1;
  
  return this.save();
};

/**
 * Validate Stripe keys format
 * @param {string} key - Stripe key to validate
 * @param {string} type - Key type (publishable, secret, webhook)
 * @returns {boolean} - True if valid
 */
globalSettingsSchema.statics.validateStripeKey = function(key, type) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  const patterns = {
    publishable: /^pk_(live|test)_[a-zA-Z0-9]{24,}$/,
    secret: /^sk_(live|test)_[a-zA-Z0-9]{24,}$/,
    webhook: /^whsec_[a-zA-Z0-9]{32,}$/
  };
  
  return patterns[type] ? patterns[type].test(key) : false;
};

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
