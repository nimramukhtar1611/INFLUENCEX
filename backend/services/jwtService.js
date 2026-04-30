// services/jwtService.js - SECURE JWT MANAGEMENT SERVICE
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Redis = require('ioredis');

// Redis client for token blacklisting
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  try {
    if (!redisClient && process.env.REDIS_DISABLED !== 'true') {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      redisClient.on('error', (err) => {
        console.error('JWT Service Redis error:', err.message);
      });

      redisClient.on('connect', () => {
        console.log('✅ JWT Service Redis connected');
      });

      await redisClient.connect();
    }
  } catch (error) {
    console.warn('⚠️ JWT Service Redis connection failed, using in-memory fallback');
  }
};

// In-memory fallback for blacklisted tokens
const blacklistedTokens = new Set();

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_EXPIRE || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || '7d';
    
    // Validate secrets on startup
    this.validateSecrets();
    
    // Initialize Redis
    initRedis();
  }

  validateSecrets() {
    if (!this.accessTokenSecret) {
      throw new Error('JWT_SECRET is required');
    }
    
    if (!this.refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }

    if (this.accessTokenSecret.length < 32) {
      console.warn('⚠️ JWT_SECRET should be at least 32 characters for better security');
    }
    
    if (this.refreshTokenSecret.length < 32) {
      console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters for better security');
    }

    console.log('✅ JWT secrets validated');
    console.log(`🔐 Access token secret length: ${this.accessTokenSecret.length}`);
    console.log(`🔐 Refresh token secret length: ${this.refreshTokenSecret.length}`);
  }

  /**
   * Generate access token with enhanced security
   */
  generateAccessToken(user) {
    const payload = {
      id: user._id,
      userId: user._id,
      email: user.email,
      userType: user.userType,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID for blacklisting
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256',
      issuer: 'influencex',
      audience: 'influencex-users'
    });
  }

  /**
   * Generate refresh token with enhanced security
   */
  generateRefreshToken(user) {
    const payload = {
      id: user._id,
      userId: user._id,
      tokenType: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256',
      issuer: 'influencex',
      audience: 'influencex-users'
    });
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token) {
    try {
      let decoded;
      
      // First try with strict issuer/audience (new tokens)
      try {
        decoded = jwt.verify(token, this.accessTokenSecret, {
          algorithms: ['HS256'],
          issuer: 'influencex',
          audience: 'influencex-users'
        });
      } catch (strictError) {
        // Fallback: verify without issuer/audience (admin tokens or old tokens)
        decoded = jwt.verify(token, this.accessTokenSecret, {
          algorithms: ['HS256']
        });
      }
      
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
        issuer: 'influencex',
        audience: 'influencex-users'
      });

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Blacklist token (for logout/security)
   */
  async blacklistToken(jti, expiresIn) {
    try {
      const key = `blacklist:${jti}`;
      
      if (redisClient) {
        await redisClient.setex(key, Math.ceil(expiresIn), '1');
      } else {
        // In-memory fallback
        blacklistedTokens.add(jti);
        setTimeout(() => blacklistedTokens.delete(jti), expiresIn * 1000);
      }
      
      console.log(`🔒 Token blacklisted: ${jti}`);
    } catch (error) {
      console.error('Error blacklisting token:', error.message);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(jti) {
    try {
      if (redisClient) {
        const result = await redisClient.get(`blacklist:${jti}`);
        return result === '1';
      } else {
        return blacklistedTokens.has(jti);
      }
    } catch (error) {
      console.error('Error checking token blacklist:', error.message);
      return false;
    }
  }

  /**
   * Generate token pair with rotation
   */
  async generateTokenPair(user, oldRefreshTokenJti = null) {
    // Blacklist old refresh token if provided (token rotation)
    if (oldRefreshTokenJti) {
      await this.blacklistToken(oldRefreshTokenJti, 7 * 24 * 60 * 60); // 7 days
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiry(this.accessTokenExpiry)
    };
  }

  /**
   * Decode token without verification (for getting jti)
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  parseExpiry(expiry) {
    const units = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes
    
    const [, value, unit] = match;
    return parseInt(value) * (units[unit] || 60);
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token) {
    try {
      const decoded = await this.verifyAccessToken(token);
      let user = await User.findById(decoded.id).select('-password -refreshToken');
      
      // If not found in User model, check Admin model (for admin users)
      if (!user) {
        const Admin = require('../models/Admin');
        user = await Admin.findById(decoded.id).select('-password -refreshToken');
        if (user) {
          user.userType = 'admin'; // normalize
        }
      }
      
      if (!user || user.status === 'suspended') {
        throw new Error('User not found or suspended');
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cleanup expired tokens from blacklist (maintenance)
   */
  async cleanupExpiredTokens() {
    try {
      if (redisClient) {
        // Redis handles TTL automatically
        console.log('🧹 Token cleanup handled by Redis TTL');
      } else {
        // In-memory cleanup would be handled by setTimeout
        console.log('🧹 In-memory token cleanup active');
      }
    } catch (error) {
      console.error('Token cleanup error:', error.message);
    }
  }
}

// Create singleton instance
const jwtService = new JWTService();

module.exports = jwtService;
