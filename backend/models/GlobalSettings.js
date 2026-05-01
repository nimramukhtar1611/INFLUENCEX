const mongoose = require('mongoose');
const crypto = require('crypto');

const globalSettingsSchema = new mongoose.Schema({
  // ==================== PAYMENT GATEWAY CONFIGURATION ====================
  // NOTE: Payment gateway configuration removed - now uses environment variables only
  // Stripe configuration is handled via STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, etc.
  
  // Basic payment settings that can still be configured
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

// Payment gateway methods removed - now uses environment variables only

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
