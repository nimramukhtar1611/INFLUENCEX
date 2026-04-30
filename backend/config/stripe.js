// config/stripe.js
const Stripe = require('stripe');

const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

if (!stripeSecretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY is not set in environment variables. Using test mode.');
  // Create a dummy stripe instance for development
  module.exports = {
    accounts: { retrieve: () => Promise.resolve({ id: 'test_account', country: 'US' }) },
    customers: { create: () => Promise.resolve({ id: 'test_customer' }) },
    paymentIntents: { 
      create: () => Promise.resolve({ id: 'test_intent' }),
      confirm: () => Promise.resolve({ id: 'test_intent' }),
      retrieve: () => Promise.resolve({ id: 'test_intent' }),
      cancel: () => Promise.resolve({ id: 'test_intent' })
    },
    subscriptions: { 
      create: () => Promise.resolve({ id: 'test_subscription' }),
      cancel: () => Promise.resolve({ id: 'test_subscription' }),
      retrieve: () => Promise.resolve({ id: 'test_subscription' })
    },
    webhooks: { constructEvent: () => ({ id: 'test_event', type: 'test' }) },
    balance: { retrieve: () => Promise.resolve({ available: [{ amount: 0, currency: 'usd' }] }) }
  };
  return;
}

if (stripeSecretKey === 'sk_test_placeholder' || stripeSecretKey.includes('placeholder')) {
  throw new Error('❌ STRIPE_SECRET_KEY is using a placeholder value. Set a real Stripe secret key.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-08-16',
  timeout: 10000, // 10 second timeout
  maxNetworkRetries: 2, // Auto retry on network failures
});

module.exports = stripe;