// Load environment variables FIRST before any other imports
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// server.js - FULL FIXED VERSION
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

// Now load models after environment variables are available
require('./models');

console.log('🔍 DEBUG: Server starting...');
console.log('🔍 DEBUG: MONGODB_URI exists?', process.env.MONGODB_URI ? '✅ YES' : '❌ NO');

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

console.log('🔍 Loading routes...');

// Declare variables outside try-catch
let authRoutes, brandRoutes, creatorRoutes, campaignRoutes, dealRoutes, paymentRoutes, adminRoutes;
let notificationRoutes, messageRoutes, searchRoutes, uploadRoutes, disputeRoutes, reviewRoutes, contractRoutes;
let complianceRoutes, subscriptionRoutes, featuredRoutes, affiliateRoutes, socialOAuthRoutes;
let twoFARoutes, adminTwoFARoutes, globalRoutes;

try {
  console.log('🔍 Loading authRoutes...');
  authRoutes = require('./routes/authRoutes');
  console.log('✅ authRoutes loaded');
  
  console.log('🔍 Loading brandRoutes...');
  brandRoutes = require('./routes/brandRoutes');
  console.log('✅ brandRoutes loaded');
  
  console.log('🔍 Loading creatorRoutes...');
  creatorRoutes = require('./routes/creatorRoutes');
  console.log('✅ creatorRoutes loaded');
  
  console.log('🔍 Loading campaignRoutes...');
  campaignRoutes = require('./routes/campaignRoutes');
  console.log('✅ campaignRoutes loaded');
  
  console.log('🔍 Loading dealRoutes...');
  dealRoutes = require('./routes/dealRoutes');
  console.log('✅ dealRoutes loaded');
  
  console.log('🔍 Loading paymentRoutes...');
  paymentRoutes = require('./routes/paymentRoutes');
  console.log('✅ paymentRoutes loaded');
  
  console.log('🔍 Loading adminRoutes...');
  adminRoutes = require('./routes/adminRoutes');
  console.log('✅ adminRoutes loaded');
  
  console.log('🔍 Loading notificationRoutes...');
  notificationRoutes = require('./routes/notificationRoutes');
  console.log('✅ notificationRoutes loaded');
  
  console.log('🔍 Loading messageRoutes...');
  messageRoutes = require('./routes/messageRoutes');
  console.log('✅ messageRoutes loaded');
  
  console.log('🔍 Loading searchRoutes...');
  searchRoutes = require('./routes/searchRoutes');
  console.log('✅ searchRoutes loaded');
  
  console.log('🔍 Loading uploadRoutes...');
  uploadRoutes = require('./routes/uploadRoutes');
  console.log('✅ uploadRoutes loaded');
  
  console.log('🔍 Loading disputeRoutes...');
  disputeRoutes = require('./routes/disputeRoutes');
  console.log('✅ disputeRoutes loaded');
  
  console.log('🔍 Loading reviewRoutes...');
  reviewRoutes = require('./routes/reviewRoutes');
  console.log('✅ reviewRoutes loaded');
  
  console.log('🔍 Loading contractRoutes...');
  contractRoutes = require('./routes/contractRoutes');
  console.log('✅ contractRoutes loaded');
  
  console.log('🔍 Loading complianceRoutes...');
  complianceRoutes = require('./routes/complianceRoutes');
  console.log('✅ complianceRoutes loaded');
  
  console.log('🔍 Loading subscriptionRoutes...');
  subscriptionRoutes = require('./routes/subscriptionRoutes');
  console.log('✅ subscriptionRoutes loaded');
  
  console.log('🔍 Loading featuredRoutes...');
  featuredRoutes = require('./routes/featuredRoutes');
  console.log('✅ featuredRoutes loaded');
  
  console.log('🔍 Loading affiliateRoutes...');
  affiliateRoutes = require('./routes/affiliateRoutes');
  console.log('✅ affiliateRoutes loaded');
  
  console.log('🔍 Loading socialOAuthRoutes...');
  socialOAuthRoutes = require('./routes/socialOAuthRoutes');
  console.log('✅ socialOAuthRoutes loaded');
  
  console.log('🔍 Loading twoFARoutes...');
  twoFARoutes = require('./routes/twoFARoutes');
  console.log('✅ twoFARoutes loaded');
  
  console.log('🔍 Loading adminTwoFARoutes...');
  adminTwoFARoutes = require('./routes/adminTwoFARoutes');
  console.log('✅ adminTwoFARoutes loaded');
  
  console.log('🔍 Loading globalRoutes...');
  globalRoutes = require('./routes/globalRoutes');
  console.log('✅ globalRoutes loaded');
  
  console.log('✅ All routes loaded successfully!');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error('❌ Route loading stack:', error.stack);
  throw error;
}

const { initializeSocket } = require('./socket/chatSocket');
const cronJobManager = require('./utils/cronJobs');
const { connectRedis, cache } = require('./config/redis');
const { initializeSentry, captureException } = require('./utils/sentry');

// ─── APP SETUP ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';

const parseOrigins = (value) => String(value || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.ALLOWED_ORIGINS),
  'http://13.61.13.2:5173', // Explicit fallback for EC2
  'http://localhost:5173',
  'http://127.0.0.1:5173'
])).map(origin => origin.replace(/\/$/, '')); // Remove trailing slashes

console.log('🔍 DEBUG: FRONTEND_URL value:', process.env.FRONTEND_URL || 'UNDEFINED');
console.log('🛡️  CORS: Allowed Origins:', ALLOWED_ORIGINS);

const validateCorsOrigin = (origin, callback) => {
  // Allow requests with no origin (like mobile apps or curl)
  if (!origin) {
    return callback(null, true);
  }

  // In non-production, allow all
  if (!isProductionEnv) {
    return callback(null, true);
  }

  // Normalize incoming origin for comparison
  const normalizedOrigin = origin.replace(/\/$/, '');

  if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
    return callback(null, true);
  }

  console.error(`❌ CORS Error: Origin "${origin}" not in allowed list:`, ALLOWED_ORIGINS);
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

const corsOptions = {
  origin: validateCorsOrigin,
  credentials: true
};

if (!isTestEnv) {
  initializeSentry();
}

// ─── PROCESS ERROR HANDLERS ───────────────────────────────────────────────────

// ✅ ENHANCED: Comprehensive unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🔥 === UNHANDLED REJECTION DETECTED ===');
  console.error('⏰ Timestamp:', new Date().toISOString());
  console.error('📍 Promise:', promise);
  console.error('💥 Reason:', reason);
  
  if (reason instanceof Error) {
    console.error('📋 Error Message:', reason.message);
    console.error('📋 Error Name:', reason.name);
    console.error('📋 Error Code:', reason.code);
    console.error('📋 Stack Trace:', reason.stack);
  } else {
    console.error('📋 Reason Type:', typeof reason);
    console.error('📋 Reason Value:', String(reason));
  }
  
  // Log memory usage for debugging
  const memUsage = process.memoryUsage();
  console.error('💾 Memory Usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
  });
  
  console.error('=== END UNHANDLED REJECTION ===\n');
  
  // ✅ STRATEGY: Log but don't exit for non-critical rejections
  // Only exit for critical system errors
  if (reason instanceof Error && (
    reason.code === 'MODULE_NOT_FOUND' ||
    reason.code === 'ENOENT' ||
    reason.message.includes('Cannot find module') ||
    reason.message.includes('spawn ENOENT')
  )) {
    console.error('💀 Critical system error detected, shutting down...');
    process.exit(1);
  }
});

// ✅ ENHANCED: Comprehensive uncaught exception handling
process.on('uncaughtException', (err) => {
  console.error('\n💀 === UNCAUGHT EXCEPTION DETECTED ===');
  console.error('⏰ Timestamp:', new Date().toISOString());
  console.error('📋 Error Message:', err.message);
  console.error('📋 Error Name:', err.name);
  console.error('📋 Error Code:', err.code);
  console.error('📋 Error Type:', typeof err);
  console.error('📋 Stack Trace:', err.stack);
  
  // Log additional context
  console.error('🔧 Process ID:', process.pid);
  console.error('🔧 Node Version:', process.version);
  console.error('🔧 Platform:', process.platform);
  console.error('🔧 Environment:', process.env.NODE_ENV || 'development');
  
  // Log memory usage
  const memUsage = process.memoryUsage();
  console.error('💾 Memory Usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
  });
  
  console.error('=== END UNCAUGHT EXCEPTION ===\n');
  
  // ✅ STRATEGY: Graceful shutdown on uncaught exceptions
  console.error('🔄 Attempting graceful shutdown...');
  
  if (server && server.listening) {
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(1);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('💀 Forced exit after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    if (cache && typeof cache.flush === 'function') await cache.flush();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

if (!isTestEnv) {
  try {
    console.log('🔍 STEP 0: Initializing Socket.io...');
    
    // ✅ ENHANCED: Socket.io with comprehensive error handling
    const io = new Server(server, {
      cors: {
        origin: validateCorsOrigin,
        credentials: true,
      },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8, // 100 MB
    });

    // Handle socket.io server errors
    io.on('error', (err) => {
      console.error('❌ Socket.io server error:', err.message);
      console.error('📋 Error Code:', err.code);
      console.error('📋 Stack Trace:', err.stack);
    });

    // Handle connection errors
    io.engine.on('connection_error', (err) => {
      console.error('❌ Socket.io connection error:', err.req?.url);
      console.error('📋 Error Code:', err.code);
      console.error('📋 Error Message:', err.message);
    });

    // Initialize socket handlers with error protection
    try {
      initializeSocket(io);
      app.set('io', io);
      console.log('✅ Socket.io initialized successfully');
    } catch (socketInitError) {
      console.error('❌ Socket initialization error:', socketInitError.message);
      console.error('📋 Stack Trace:', socketInitError.stack);
      // Continue without socket functionality
      console.log('⚠️ Continuing without Socket.io functionality');
    }
    
  } catch (err) {
    console.error('❌ Socket.io setup error:', err.message);
    console.error('📋 Error Code:', err.code);
    console.error('📋 Stack Trace:', err.stack);
    console.log('⚠️ Continuing without Socket.io functionality');
  }
} else {
  console.log('🧪 Test mode: Skipping Socket.io initialization');
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors(corsOptions));

// ✅ CRITICAL FIX: Move webhook route BEFORE any JSON parsing middleware
// Webhook MUST receive raw body for Stripe signature verification
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// Cookie parsing middleware
app.use(cookieParser());

// Normal JSON parsing for all other routes (skip Stripe webhook raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  return express.json({ limit: '50mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  return express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
});

app.use(morgan(isTestEnv ? 'silent' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Redis attach to request
app.use((req, res, next) => {
  req.redis = cache;
  req.cache = cache;
  next();
});

// Rate limiting to prevent infinite loops and server crashes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000, // Production: 2000, Dev: 10000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.headers['user-agent'] || '').slice(0, 50);
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 5000, // Production: 1000, Dev: 5000 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Very strict rate limiting for login specifically
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: process.env.NODE_ENV === 'production' ? 30 : 150, // Production: 30, Dev: 150 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

// Rate limiting for token refresh (prevent infinite refresh loops)
const refreshLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 10 : 30, // Production: 10, Dev: 30 refresh requests per minute
  message: {
    error: 'Too many refresh attempts, please login again.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Very strict rate limiting for AI endpoints (prevent API abuse)
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // Production: 20, Dev: 100 AI requests per minute
  message: {
    success: false,
    error: 'Too many AI requests, please try again later.',
    code: 'AI_RATE_LIMIT',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Rate limiting for file uploads (prevent storage abuse)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 200, // Production: 50, Dev: 200 uploads per 15 minutes
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Rate limiting for email/SMS services (prevent spam)
const communicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 10 : 50, // Production: 10, Dev: 50 communications per hour
  message: {
    success: false,
    error: 'Too many communication requests, please try again later.',
    code: 'COMMUNICATION_RATE_LIMIT',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter);
app.use('/api/admin', authLimiter);

// Apply very strict rate limiting to login endpoints specifically
app.post('/api/auth/login', loginLimiter);
app.post('/api/admin/login', loginLimiter);

// Apply refresh limiter to refresh endpoint
app.post('/api/auth/refresh', refreshLimiter);

// Apply AI rate limiting to AI endpoints
app.use('/api/creators/growth-os', aiLimiter);
app.use('/api/creators/content-ideas', aiLimiter);
app.post('/api/admin/ai-moderation', aiLimiter);

// Apply upload rate limiting
app.use('/api/upload', uploadLimiter);

// Apply communication rate limiting
app.use('/api/auth/forgot-password', communicationLimiter);
app.use('/api/auth/reset-password', communicationLimiter);
app.use('/api/auth/send-verification', communicationLimiter);
app.use('/api/auth/verify-phone', communicationLimiter);

// Input Sanitization Middleware (skip Stripe webhook raw body)
const { sanitizeInput } = require('./middleware/inputSanitization');
app.use('/api', (req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  return sanitizeInput(req, res, next);
});

// Security Enforcement Middleware (skip Stripe webhook raw body)
const SecurityEnforcement = require('./middleware/securityEnforcement');
const securityMiddleware = SecurityEnforcement.applyAll();
app.use('/api', (req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }

  let index = 0;
  const run = (err) => {
    if (err) {
      return next(err);
    }
    const middleware = securityMiddleware[index++];
    if (!middleware) {
      return next();
    }
    return middleware(req, res, run);
  };

  return run();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// ✅ FIX: Routes registered BEFORE DB connect — Express queues requests,
//    controllers handle DB errors individually if DB is not ready yet.

app.use('/api/auth/2fa', twoFARoutes);
app.use('/api/auth', authRoutes);

app.use('/api/admin/2fa', adminTwoFARoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/brands', brandRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/featured', featuredRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/social-oauth', socialOAuthRoutes);
app.use('/api/global', globalRoutes);

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────

// ✅ Must have 4 params for Express to treat it as error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  captureException(err, {
    tags: {
      method: req.method,
      path: req.path
    },
    extra: {
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?._id
    }
  });

  console.error('🔥 Error:', err.message);
  console.error(err.stack);

  // Return validation errors as 4xx instead of generic 500
  if (err?.name === 'ValidationError' && err?.errors) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = process.env.NODE_ENV === 'development'
    ? err.message
    : (statusCode >= 500 ? 'Internal server error' : err.message);

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
});

// ─── DATABASE CONNECTION & BOOTSTRAP ─────────────────────────────────────────

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing from environment variables');
  process.exit(1);
}

const mongoUri = isTestEnv
  ? (process.env.MONGODB_TEST_URI || process.env.MONGODB_URI + '_test')
  : process.env.MONGODB_URI;

console.log('🔍 Connecting to MongoDB...');

async function startServer() {
  try {
    console.log('🔍 STEP 1: Connecting to MongoDB...');
    
    // ✅ ENHANCED: Comprehensive MongoDB connection with detailed error handling
    let mongoConnected = false;
    let mongoRetries = 0;
    const maxMongoRetries = 5; // Increased retries
    const retryDelay = 3000; // 3 seconds
    
    while (!mongoConnected && mongoRetries < maxMongoRetries) {
      try {
        console.log(`🔍 MongoDB connection attempt ${mongoRetries + 1}/${maxMongoRetries}...`);
        console.log('🔍 Connection URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
        
        await mongoose.connect(mongoUri, {
          // Connection Pooling Configuration (Mongoose 6/7+ compatible)
          maxPoolSize: 10, // Maximum number of connections in pool
          minPoolSize: 2,  // Minimum number of connections to maintain
          maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
          
          // Timeout Configuration
          serverSelectionTimeoutMS: 5000, // Server selection timeout
          connectTimeoutMS: 10000, // Initial connection timeout
          socketTimeoutMS: 45000, // Socket timeout
          
          // Retry Configuration (built-in in Mongoose 6+)
          retryWrites: true,
          retryReads: true,
        });
        
        mongoConnected = true;
        console.log(`✅ MongoDB connected${isTestEnv ? ' (test database)' : ''}`);
        
        // Verify connection is actually working
        const db = mongoose.connection.db;
        await db.admin().ping();
        console.log('✅ MongoDB connection verified (ping successful)');
        
      } catch (mongoError) {
        mongoRetries++;
        console.error(`❌ MongoDB connection attempt ${mongoRetries} failed:`, mongoError.message);
        console.error('📋 Error Code:', mongoError.code);
        console.error('📋 Error Name:', mongoError.name);
        
        // Specific error handling
        if (mongoError.code === 'ECONNREFUSED') {
          console.error('💡 MongoDB server is not running or not accessible');
        } else if (mongoError.code === 'ENOTFOUND') {
          console.error('💡 MongoDB hostname could not be resolved');
        } else if (mongoError.code === 'ETIMEDOUT') {
          console.error('💡 MongoDB connection timed out');
        } else if (mongoError.name === 'MongoServerSelectionError') {
          console.error('💡 MongoDB server selection failed');
        }
        
        if (mongoRetries < maxMongoRetries) {
          console.log(`🔄 Retrying MongoDB connection in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error(`💀 Failed to connect to MongoDB after ${maxMongoRetries} attempts`);
          console.error('🔧 Please check:');
          console.error('   - MongoDB server is running');
          console.error('   - Connection URI is correct');
          console.error('   - Network connectivity');
          console.error('   - Authentication credentials');
          throw new Error(`MongoDB connection failed after ${maxMongoRetries} attempts: ${mongoError.message}`);
        }
      }
    }

    // Redis
    if (!isTestEnv) {
      console.log('🔍 STEP 2: Connecting to Redis...');
      try {
        await connectRedis();
        console.log('✅ Redis connected');
      } catch (err) {
        console.warn('⚠️ Redis connection failed:', err.message);
        console.log('🔄 Continuing without Redis (caching and sessions will be limited)');
      }
    }

    // Initialize/sync subscription plan documents with Stripe price IDs from .env
    console.log('🔍 STEP 2b: Syncing subscription plans...');
    try {
      const Plan = require('./models/Plan');
      await Plan.initializeDefaults();
      console.log('✅ Subscription plans synced');
    } catch (err) {
      console.warn('⚠️ Plan sync error (non-fatal):', err.message);
    }

    // Email
    console.log('🔍 STEP 3: Initializing Email service...');
    try {
      const emailService = require('./services/emailService');
      console.log('🔍 Email service loaded, checking initialization...');
      if (!emailService.isInitialized()) {
        console.log('🔍 Email service not initialized, initializing now...');
        emailService.initialize();
      }
      console.log('✅ Email service ready');
    } catch (error) {
      console.error('❌ Email service error:', error.message);
      console.error('❌ Email service stack:', error.stack);
    }

    // Cron jobs
    if (!isTestEnv) {
      console.log('🔍 STEP 4: Initializing Cron jobs...');
      try {
        if (cronJobManager?.initializeAll) {
          cronJobManager.initializeAll();
          console.log('✅ Cron jobs initialized');
        }
      } catch (err) {
        console.error('❌ Cron job error:', err.message);
        console.error('❌ Cron job stack:', err.stack);
      }
    }

    // Server start
    console.log('🔍 STEP 5: Starting server...');
    if (!isTestEnv) {
      const PORT = process.env.PORT || 5000;
      
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log('🎉 Server startup complete!');
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use. Please kill the process using that port and try again.`);
          console.error(`💡 To find the process: netstat -ano | findstr :${PORT}`);
          console.error(`💡 To kill the process: taskkill /F /PID [PID]`);
          process.exit(1);
        } else {
          console.error('❌ Server error:', err);
          process.exit(1);
        }
      });
    }

  } catch (err) {
    console.error('❌ STARTUP ERROR:', err.message);
    console.error('❌ FULL STACK TRACE:', err.stack);
    console.error('❌ Error details:', {
      name: err.name,
      code: err.code,
      path: err.path,
      errno: err.errno,
      syscall: err.syscall
    });
    
    // Check if this is a critical error that should not be retried
    if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
      console.error('❌ Critical startup error - not retrying');
      process.exit(1);
    }
    
    console.log('🔄 Retrying server startup in 5 seconds...');
    setTimeout(startServer, 5000); // retry
  }
}

startServer();

module.exports = { app, server };