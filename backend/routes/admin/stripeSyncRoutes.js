// Emergency Stripe sync routes
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../../middleware/auth');
const stripeSyncController = require('../../controllers/admin/stripeSyncController');

// All sync routes require admin access
router.use(protect);
router.use(adminOnly);

// Sync subscriptions from Stripe
router.post('/sync-subscriptions', stripeSyncController.syncStripeSubscriptions);

// Sync invoices from Stripe  
router.post('/sync-invoices', stripeSyncController.syncStripeInvoices);

// Full sync (both subscriptions and invoices)
router.post('/full-sync', stripeSyncController.fullSync);

module.exports = router;
