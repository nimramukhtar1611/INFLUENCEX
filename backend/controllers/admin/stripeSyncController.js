// EMERGENCY STRIPE SYNC CONTROLLER
// Pulls data directly from Stripe to fix database synchronization issues
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const Payment = require('../../models/Payment');
const Plan = require('../../models/Plan');

// Sync Stripe subscriptions to local database
exports.syncStripeSubscriptions = async (req, res) => {
  console.log('🔄 [SYNC] Starting Stripe subscription sync...');
  
  try {
    // Get all users with stripeCustomerId
    const users = await User.find({ stripeCustomerId: { $exists: true } });
    console.log(`🔄 [SYNC] Found ${users.length} users with Stripe customer IDs`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        console.log(`🔄 [SYNC] Syncing user: ${user.email} (${user.userType})`);
        
        // Get all subscriptions from Stripe for this customer
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          limit: 10,
          expand: ['items.data.price']
        });
        
        console.log(`🔄 [SYNC] Found ${stripeSubscriptions.data.length} Stripe subscriptions for ${user.email}`);
        
        for (const stripeSub of stripeSubscriptions.data) {
          // Get plan info from metadata or price lookup
          let planId = stripeSub.metadata?.planId;
          if (!planId) {
            // Try to get plan from price
            const priceId = stripeSub.items.data[0]?.price?.id;
            if (priceId) {
              const pricePlan = await Plan.findOne({ 'stripePrices.month': priceId });
              if (pricePlan) {
                planId = pricePlan.planId;
              }
            }
          }
          
          if (!planId) {
            planId = 'free'; // fallback
          }
          
          // Upsert subscription to local database
          const subscriptionData = {
            userId: user._id,
            planId: planId,
            status: stripeSub.status,
            stripeCustomerId: stripeSub.customer,
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: stripeSub.items.data[0]?.price?.id,
            billingPeriod: {
              start: new Date(stripeSub.current_period_start * 1000),
              end: new Date(stripeSub.current_period_end * 1000)
            },
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            planDetails: {
              name: planId.charAt(0).toUpperCase() + planId.slice(1),
              price: (stripeSub.items.data[0]?.price?.unit_amount || 0) / 100,
              currency: stripeSub.items.data[0]?.price?.currency || 'usd',
              interval: stripeSub.items.data[0]?.price?.recurring?.interval || 'month',
              intervalCount: stripeSub.items.data[0]?.price?.recurring?.interval_count || 1
            }
          };
          
          const subResult = await Subscription.findOneAndUpdate(
            { userId: user._id },
            subscriptionData,
            { upsert: true, new: true }
          );
          
          console.log('💾 [SYNC] Inserted subscription:', subResult._id, subResult.stripeSubscriptionId, subResult.planId);
          console.log('💾 [SYNC] Subscription details:', {
            userId: subResult.userId,
            status: subResult.status,
            planDetails: subResult.planDetails
          });
          syncedCount++;
        }
        
        // Update user's subscription status
        const activeSubscription = stripeSubscriptions.data.find(sub => ['active', 'trialing'].includes(sub.status));
        if (activeSubscription) {
          await User.findByIdAndUpdate(user._id, {
            'subscription.status': activeSubscription.status,
            'subscription.currentPeriodStart': new Date(activeSubscription.current_period_start * 1000),
            'subscription.currentPeriodEnd': new Date(activeSubscription.current_period_end * 1000),
            'subscription.planId': planId || 'free'
          });
          console.log(`✅ [SYNC] Updated user subscription status: ${activeSubscription.status}`);
        }
        
      } catch (error) {
        console.error(`❌ [SYNC] Error syncing user ${user.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 [SYNC] Stripe sync completed: ${syncedCount} subscriptions synced, ${errorCount} errors`);
    
    res.json({
      success: true,
      message: `Synced ${syncedCount} subscriptions for ${users.length} users`,
      stats: {
        usersProcessed: users.length,
        subscriptionsSynced: syncedCount,
        errors: errorCount
      }
    });
    
  } catch (error) {
    console.error('❌ [SYNC] Stripe sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Sync Stripe invoices and create payment records
exports.syncStripeInvoices = async (req, res) => {
  console.log('💳 [SYNC] Starting Stripe invoice sync...');
  
  try {
    // Get all users with stripeCustomerId
    const users = await User.find({ stripeCustomerId: { $exists: true } });
    console.log(`💳 [SYNC] Processing invoices for ${users.length} users`);
    
    let syncedInvoices = 0;
    let paymentRecords = 0;
    
    for (const user of users) {
      try {
        // Get all paid invoices from Stripe
        const stripeInvoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          status: 'paid',
          limit: 50
        });
        
        console.log(`💳 [SYNC] Found ${stripeInvoices.data.length} paid invoices for ${user.email}`);
        
        for (const invoice of stripeInvoices.data) {
          // Check if payment record already exists
          const existingPayment = await Payment.findOne({
            stripeInvoiceId: invoice.id
          });
          
          if (!existingPayment) {
            // Determine payment type from invoice lines
            let paymentType = 'payment';
            let amount = invoice.amount_paid / 100;
            
            // Check if this is a wallet top-up (no subscription lines)
            if (!invoice.lines.data || invoice.lines.data.length === 0) {
              paymentType = 'deposit';
              console.log(`💰 [SYNC] Detected wallet top-up: $${amount}`);
            }
            
            // Create payment record
            const paymentData = {
              transactionId: `INV-${invoice.id}`,
              type: paymentType,
              amount: amount,
              status: 'completed',
              paidAt: new Date(invoice.created * 1000),
              stripeInvoiceId: invoice.id,
              invoiceNumber: invoice.number,
              from: {
                userId: user._id, // Brand pays themselves for deposits
                accountType: user.userType || 'brand'
              },
              to: {
                userId: user._id,
                accountType: user.userType || 'brand'
              },
              metadata: {
                kind: paymentType === 'deposit' ? 'deposit' : 'payment',
                stripeCustomerId: user.stripeCustomerId,
                invoiceType: paymentType,
                syncedAt: new Date().toISOString()
              }
            };
            
            const insertResult = await Payment.create(paymentData);
            console.log('💾 [SYNC] Inserted payment:', insertResult._id, insertResult.transactionId, '$' + insertResult.amount);
            console.log('💾 [SYNC] Payment structure:', {
              from: insertResult.from,
              to: insertResult.to,
              metadata: insertResult.metadata
            });
            paymentRecords++;
          }
          
          syncedInvoices++;
        }
        
      } catch (error) {
        console.error(`❌ [SYNC] Error syncing invoices for ${user.email}:`, error.message);
      }
    }
    
    console.log(`🎉 [SYNC] Invoice sync completed: ${syncedInvoices} invoices processed, ${paymentRecords} payment records created`);
    
    res.json({
      success: true,
      message: `Processed ${syncedInvoices} invoices, created ${paymentRecords} payment records`,
      stats: {
        invoicesProcessed: syncedInvoices,
        paymentRecordsCreated: paymentRecords
      }
    });
    
  } catch (error) {
    console.error('❌ [SYNC] Invoice sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Full sync - both subscriptions and invoices
exports.fullSync = async (req, res) => {
  console.log('🔄 [SYNC] Starting full Stripe sync...');
  
  try {
    const subscriptionResult = await exports.syncStripeSubscriptions(req, res);
    const invoiceResult = await exports.syncStripeInvoices(req, res);
    
    res.json({
      success: true,
      message: 'Full Stripe sync completed',
      results: {
        subscriptions: subscriptionResult,
        invoices: invoiceResult
      }
    });
    
  } catch (error) {
    console.error('❌ [SYNC] Full sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
