const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../../controllers/admin/paymentGatewayController');
const { adminProtect } = require('../../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for payment gateway operations
const paymentGatewayRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many payment gateway configuration attempts. Please try again later.'
});

// Rate limiting for connection tests (more restrictive)
const connectionTestRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 connection tests per windowMs
  message: 'Too many connection test attempts. Please try again later.'
});

// Apply admin authentication to all routes
router.use(adminProtect);

/**
 * @route   GET /api/admin/payment-gateway
 * @desc    Get payment gateway settings
 * @access  Admin
 */
router.get('/', paymentGatewayController.getPaymentGatewaySettings);

/**
 * @route   PUT /api/admin/payment-gateway
 * @desc    Update payment gateway settings
 * @access  Admin
 */
router.put('/', paymentGatewayRateLimit, paymentGatewayController.updatePaymentGatewaySettings);

/**
 * @route   POST /api/admin/payment-gateway/test
 * @desc    Test payment gateway connection
 * @access  Admin
 */
router.post('/test', connectionTestRateLimit, paymentGatewayController.testPaymentGatewayConnection);

/**
 * @route   GET /api/admin/payment-gateway/stats
 * @desc    Get payment gateway statistics
 * @access  Admin
 */
router.get('/stats', paymentGatewayController.getPaymentGatewayStats);

/**
 * @route   POST /api/admin/payment-gateway/reset
 * @desc    Reset payment gateway settings to defaults
 * @access  Admin
 */
router.post('/reset', paymentGatewayRateLimit, paymentGatewayController.resetPaymentGatewaySettings);

module.exports = router;
