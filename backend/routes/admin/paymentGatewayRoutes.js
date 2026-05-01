// Payment gateway routes removed - Stripe now uses environment variables only
// No admin configuration allowed for payment gateway settings

const express = require('express');
const router = express.Router();
const { adminProtect } = require('../../middleware/auth');

// Apply admin authentication to all routes
router.use(adminProtect);

/**
 * @route   GET /api/admin/payment-gateway
 * @desc    Get payment gateway info (read-only, uses environment variables)
 * @access  Admin
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      provider: 'stripe',
      configured: !!process.env.STRIPE_SECRET_KEY,
      testMode: process.env.NODE_ENV !== 'production',
      message: 'Payment gateway is configured via environment variables only'
    }
  });
});

module.exports = router;
