// middleware/inputSanitization.js - COMPREHENSIVE INPUT SANITIZATION
const mongoSanitize = require('express-mongo-sanitize');
const Joi = require('joi');
const { createError } = require('../utils/AppError');

// Custom validation schemas for different endpoints
const validationSchemas = {
  // User registration/login validation
  auth: {
    register: Joi.object({
      email: Joi.string().email().required().max(255),
      password: Joi.string().min(8).max(128).required(),
      fullName: Joi.string().min(2).max(100).required(),
      userType: Joi.string().valid('brand', 'creator').required(),
      phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).max(20).optional(),
      age: Joi.number().min(13).max(100).optional()
    }),
    
    login: Joi.object({
      email: Joi.string().email().required().max(255),
      password: Joi.string().required().max(128)
    })
  },

  // Campaign validation
  campaign: {
    create: Joi.object({
      title: Joi.string().min(3).max(200).required(),
      description: Joi.string().min(10).max(2000).required(),
      category: Joi.string().valid('fashion', 'beauty', 'tech', 'food', 'travel', 'fitness', 'other').required(),
      budget: Joi.number().min(10).max(1000000).required(),
      deadline: Joi.date().iso().min('now').required(),
      requirements: Joi.array().items(Joi.string().max(500)).max(10).optional(),
      deliverables: Joi.array().items(Joi.string().max(200)).max(5).optional()
    })
  },

  // Deal validation
  deal: {
    create: Joi.object({
      campaignId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      creatorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      budget: Joi.number().min(10).max(1000000).required(),
      deadline: Joi.date().iso().min('now').required(),
      terms: Joi.string().min(10).max(1000).required()
    })
  },

  // Message validation
  message: {
    send: Joi.object({
      conversationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      content: Joi.string().min(1).max(1000).required(),
      contentType: Joi.string().valid('text', 'image', 'video', 'document').default('text'),
      attachments: Joi.array().items(Joi.object({
        url: Joi.string().uri().required(),
        type: Joi.string().required(),
        name: Joi.string().max(255).required()
      })).max(5).optional()
    })
  },

  // Profile update validation
  profile: {
    update: Joi.object({
      fullName: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).max(20).optional(),
      age: Joi.number().min(13).max(100).optional(),
      bio: Joi.string().max(500).optional(),
      niches: Joi.array().items(Joi.string().max(50)).max(5).optional()
    })
  },

  // Search validation
  search: {
    query: Joi.object({
      q: Joi.string().min(2).max(100).required(),
      type: Joi.string().valid('creators', 'brands', 'campaigns').default('creators'),
      page: Joi.number().min(1).max(100).default(1),
      limit: Joi.number().min(1).max(50).default(10),
      filters: Joi.object().optional()
    })
  }
};

/**
 * Middleware for MongoDB injection protection
 */
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  allowDots: false,
  onSanitize: (req, res, next) => {
    console.log('🔒 MongoDB injection attempt blocked:', {
      method: req.method,
      url: req.url,
      ip: req.ip
    });
    next();
  }
});

/**
 * Generic validation middleware factory
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      // Replace the original data with sanitized data
      req[source] = value;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'Validation error occurred',
        code: 'VALIDATION_MIDDLEWARE_ERROR'
      });
    }
  };
};

/**
 * Custom input sanitization for special cases
 */
const customSanitization = (req, res, next) => {
  try {
    // Sanitize string fields to prevent XSS
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
    };

    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const sanitized = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    };

    // Apply to request body, query, and params
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);

    next();
  } catch (error) {
    console.error('Custom sanitization error:', error);
    next();
  }
};

/**
 * Rate limiting for validation failures (prevent brute force attacks)
 */
const validationFailureLimiter = new Map();

const trackValidationFailure = (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const failures = validationFailureLimiter.get(key) || [];
  
  // Clean old failures (older than 15 minutes)
  const recentFailures = failures.filter(time => now - time < 15 * 60 * 1000);
  
  if (recentFailures.length >= 10) {
    return res.status(429).json({
      success: false,
      error: 'Too many validation failures. Please try again later.',
      code: 'VALIDATION_RATE_LIMIT',
      retryAfter: 900 // 15 minutes
    });
  }
  
  recentFailures.push(now);
  validationFailureLimiter.set(key, recentFailures);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [k, v] of validationFailureLimiter.entries()) {
      if (v.every(time => now - time > 15 * 60 * 1000)) {
        validationFailureLimiter.delete(k);
      }
    }
  }
  
  next();
};

/**
 * Comprehensive input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Apply MongoDB injection protection
  mongoSanitizeMiddleware(req, res, (err) => {
    if (err) return next(err);
    
    // Apply custom XSS protection
    customSanitization(req, res, next);
  });
};

module.exports = {
  sanitizeInput,
  validate,
  validationSchemas,
  trackValidationFailure,
  mongoSanitizeMiddleware
};
