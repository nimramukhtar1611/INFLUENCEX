const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateSecretKey();
  }

  /**
   * Generate a secure secret key
   * @returns {string} - Hex encoded secret key
   */
  generateSecretKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text in format: iv:authTag:encrypted
   */
  encrypt(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid input for encryption');
      }

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);
      
      // Set additional authenticated data for additional security
      cipher.setAAD(Buffer.from('influencex-payment-gateway', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Text to decrypt in format: iv:authTag:encrypted
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedText) {
    try {
      if (!encryptedText || typeof encryptedText !== 'string') {
        throw new Error('Invalid input for decryption');
      }

      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      
      // Set the same additional authenticated data
      decipher.setAAD(Buffer.from('influencex-payment-gateway', 'utf8'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Mask sensitive data for display
   * @param {string} value - Value to mask
   * @param {number} visibleChars - Number of characters to show at start
   * @param {number} endChars - Number of characters to show at end
   * @returns {string} - Masked value
   */
  maskSensitiveData(value, visibleChars = 8, endChars = 4) {
    if (!value || value.length <= visibleChars + endChars) {
      return value;
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - endChars);
    const masked = '*'.repeat(value.length - visibleChars - endChars);
    
    return start + masked + end;
  }

  /**
   * Validate encryption key format
   * @param {string} key - Key to validate
   * @returns {boolean} - True if valid
   */
  validateKey(key) {
    return key && typeof key === 'string' && key.length === this.keyLength * 2;
  }

  /**
   * Generate a secure random string
   * @param {number} length - Length of the string
   * @returns {string} - Random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  /**
   * Hash a password or sensitive data
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} - Hashed data
   */
  hash(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', actualSalt).update(data).digest('hex');
    return actualSalt + ':' + hash;
  }

  /**
   * Verify a hash
   * @param {string} data - Original data
   * @param {string} hashedData - Hashed data
   * @returns {boolean} - True if valid
   */
  verifyHash(data, hashedData) {
    if (!hashedData || typeof hashedData !== 'string') {
      return false;
    }

    const parts = hashedData.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const hash = parts[1];
    const newHash = crypto.createHmac('sha256', salt).update(data).digest('hex');
    
    return hash === newHash;
  }

  /**
   * Encrypt object properties recursively
   * @param {Object} obj - Object to encrypt
   * @param {Array} sensitiveFields - Fields to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  encryptObject(obj, sensitiveFields = []) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    const encryptRecursive = (currentObj, path = '') => {
      for (const key in currentObj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (sensitiveFields.includes(currentPath)) {
          if (typeof currentObj[key] === 'string') {
            currentObj[key] = this.encrypt(currentObj[key]);
          }
        } else if (typeof currentObj[key] === 'object' && !Array.isArray(currentObj[key])) {
          encryptRecursive(currentObj[key], currentPath);
        }
      }
    };

    encryptRecursive(result);
    return result;
  }

  /**
   * Decrypt object properties recursively
   * @param {Object} obj - Object to decrypt
   * @param {Array} encryptedFields - Fields to decrypt
   * @returns {Object} - Object with decrypted fields
   */
  decryptObject(obj, encryptedFields = []) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    const decryptRecursive = (currentObj, path = '') => {
      for (const key in currentObj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (encryptedFields.includes(currentPath)) {
          if (typeof currentObj[key] === 'string') {
            try {
              currentObj[key] = this.decrypt(currentObj[key]);
            } catch (error) {
              console.error(`Failed to decrypt field ${currentPath}:`, error);
              // Keep original value if decryption fails
            }
          }
        } else if (typeof currentObj[key] === 'object' && !Array.isArray(currentObj[key])) {
          decryptRecursive(currentObj[key], currentPath);
        }
      }
    };

    decryptRecursive(result);
    return result;
  }

  /**
   * Generate API key with proper format
   * @param {string} prefix - API key prefix (e.g., 'sk', 'pk')
   * @param {string} environment - Environment (live, test)
   * @returns {string} - Generated API key
   */
  generateApiKey(prefix = 'api', environment = 'live') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${environment}_${timestamp}_${random}`;
  }

  /**
   * Validate Stripe API key format
   * @param {string} key - Stripe key to validate
   * @param {string} type - Key type (publishable, secret, webhook)
   * @returns {boolean} - True if valid
   */
  validateStripeKey(key, type) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const patterns = {
      publishable: /^pk_(live|test)_[a-zA-Z0-9]{24,}$/,
      secret: /^sk_(live|test)_[a-zA-Z0-9]{24,}$/,
      webhook: /^whsec_[a-zA-Z0-9]{32,}$/
    };

    return patterns[type] ? patterns[type].test(key) : false;
  }

  /**
   * Validate PayPal API key format
   * @param {string} key - PayPal key to validate
   * @param {string} type - Key type (client_id, client_secret)
   * @returns {boolean} - True if valid
   */
  validatePayPalKey(key, type) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const patterns = {
      client_id: /^[A-Za-z0-9-_]{20,}$/,
      client_secret: /^[A-Za-z0-9-_]{20,}$/
    };

    return patterns[type] ? patterns[type].test(key) : false;
  }

  /**
   * Securely compare two strings (timing attack resistant)
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} - True if equal
   */
  secureCompare(a, b) {
    if (!a || !b || typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate a secure webhook signature
   * @param {string} payload - Payload to sign
   * @param {string} secret - Secret key
   * @returns {string} - Signature
   */
  generateWebhookSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return 'sha256=' + hmac.digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Payload to verify
   * @param {string} signature - Signature to verify against
   * @param {string} secret - Secret key
   * @returns {boolean} - True if valid
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return this.secureCompare(signature, expectedSignature);
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;
