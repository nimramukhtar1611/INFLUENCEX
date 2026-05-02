// controllers/paymentController.js - COMPLETE PRODUCTION-READY VERSION
const Payment = require('../models/Payment');
const Deal = require('../models/Deal');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const PerformancePayment = require('../models/PerformancePayment');
const PaymentCalculator = require('../services/paymentCalculator');
const stripeService = require('../services/stripeService');
const stripe = require('../config/stripe');
const mongoose = require('mongoose');
const { catchAsync } = require('../utils/catchAsync');
const { isValidObjectId, isValidBudget } = require('../utils/validators');

const CREATOR_WITHDRAWAL_STATUSES = ['pending', 'processing', 'completed'];
const CREATOR_EXCLUDED_EARNING_TYPES = ['withdrawal', 'refund', 'fee', 'penalty'];

const getFrontendBaseUrl = () => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '');
  return 'http://13.61.13.2:5173'; // Fallback for EC2 production
};

const getEffectiveBrandId = (req) => req.brandId || req.user?._id;

const getPaymentsPathByUserType = (userType) => {
  if (userType === 'brand') return '/brand/payments';
  if (userType === 'creator') return '/creator/earnings';
  return '/';
};

const getCreatorWithdrawalsPath = () => '/creator/withdrawals';

const getStripeConnectStatus = (account) => {
  if (account?.payouts_enabled && account?.details_submitted) {
    return 'active';
  }
  if (account?.details_submitted || account?.charges_enabled) {
    return 'pending';
  }
  return 'inactive';
};

const getBrandFinancials = async (userId) => {
  console.log(`[BALANCE] Calculating brand financials for user: ${userId}`);
  const normalizedUserId = new mongoose.Types.ObjectId(userId);
  const userIdString = userId.toString();

  // For brands: balance = wallet deposits (self-to-self) + refunds - deal payments - withdrawals - reserved
  const [walletDeposits, refunds, dealPayments, reservedOutflows] = await Promise.all([
    // Wallet top-ups (brand paying themselves — from.userId === to.userId, metadata.kind === 'deposit')
    Payment.aggregate([
      {
        $match: {
          $and: [
            { $or: [{ 'from.userId': normalizedUserId }, { 'from.userId': userIdString }] },
            { $or: [{ 'to.userId': normalizedUserId }, { 'to.userId': userIdString }] }
          ],
          status: 'completed',
          type: 'payment',
          'metadata.kind': 'deposit'
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    // Refunds and other inflows
    Payment.aggregate([
      {
        $match: {
          $or: [
            { 'to.userId': normalizedUserId },
            { 'to.userId': userIdString }
          ],
          status: 'completed',
          type: { $in: ['refund', 'payment'] }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    // Deal payments and other outflows
    Payment.aggregate([
      {
        $match: {
          $or: [
            { 'from.userId': normalizedUserId },
            { 'from.userId': userIdString }
          ],
          status: 'completed',
          type: { $nin: ['refund'] }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    // Reserved funds (escrow, pending withdrawals)
    Payment.aggregate([
      {
        $match: {
          $or: [
            { 'from.userId': normalizedUserId },
            { 'from.userId': userIdString }
          ],
          status: { $in: ['pending', 'processing', 'in-escrow'] },
          type: { $nin: ['refund'] }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const deposits = walletDeposits[0]?.total || 0;
  const inflows = refunds[0]?.total || 0;
  const outflows = dealPayments[0]?.total || 0;
  const reserved = reservedOutflows[0]?.total || 0;

  console.log(`💰 [BALANCE] Financial breakdown:`, {
    deposits,
    inflows: refunds,
    outflows: dealPayments,
    reserved
  });

  const totalCampaignBudgets = 0;
  const noDealCampaignBudgets = 0;
  const dealCommittedBudgets = 0;
  const remainingCommitment = 0;

  // Available balance = deposits + refunds - payments - reserved
  const available = Math.max(deposits + inflows - outflows - reserved, 0);

  console.log(`💰 [BALANCE] Final available balance: ${available}`);

  return {
    inflows: deposits + inflows,
    outflows,
    reserved,
    totalCampaignBudgets,
    noDealCampaignBudgets,
    dealCommittedBudgets,
    remainingCommitment,
    available,
    deposits
  };
};
exports.getBrandFinancials = getBrandFinancials;

const getCreatorFinancials = async (userId) => {
  const [completedEarnings, pendingEscrow, reservedWithdrawals, completedReleasedDeals] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          'to.userId': userId,
          status: { $in: ['completed', 'available'] },
          type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          'to.userId': userId,
          status: { $in: ['pending', 'in-escrow'] },
          type: { $nin: CREATOR_EXCLUDED_EARNING_TYPES }
        }
      },
      {
        $match: {
          $expr: { $ne: ['$from.userId', '$to.userId'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          'from.userId': userId,
          type: 'withdrawal',
          status: { $in: CREATOR_WITHDRAWAL_STATUSES }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Deal.aggregate([
      {
        $match: {
          creatorId: userId,
          status: 'completed',
          paymentStatus: 'released'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$netAmount', '$budget'] } }
        }
      }
    ])
  ]);

  const earningsFromPayments = completedEarnings[0]?.total || 0;
  const releasedDealTotal = completedReleasedDeals[0]?.total || 0;
  const earningsTotal = earningsFromPayments > 0 ? earningsFromPayments : releasedDealTotal;
  const pendingTotal = pendingEscrow[0]?.total || 0;
  const reservedTotal = reservedWithdrawals[0]?.total || 0;
  const withdrawable = Math.max(earningsTotal - reservedTotal, 0);

  return {
    earningsTotal,
    pendingTotal,
    reservedTotal,
    withdrawable,
  };
};
exports.getCreatorFinancials = getCreatorFinancials;

// ==================== GET BALANCE ====================
exports.getBalance = catchAsync(async (req, res) => {
  console.log(`💰 [API] Getting balance for user: ${req.user._id} (${req.user.userType})`);
  
  let balance = 0;
  let pending = 0;
  let available = 0;
  const brandId = getEffectiveBrandId(req);

  if (req.user.userType === 'brand') {
    console.log(`💰 [API] Calculating brand balance...`);
    const brandFinancials = await getBrandFinancials(brandId);
    balance = brandFinancials.available;
    pending = brandFinancials.reserved;
    available = brandFinancials.available;
    
    console.log(`💰 [API] Brand balance result:`, {
      balance,
      pending,
      available,
      deposits: brandFinancials.deposits,
      inflows: brandFinancials.inflows,
      outflows: brandFinancials.outflows
    });
  } else if (req.user.userType === 'creator') {
    console.log(`💰 [API] Calculating creator balance...`);
    // For creators: withdrawable = completed earnings - requested/completed withdrawals.
    const creatorFinancials = await getCreatorFinancials(req.user._id);
    balance = creatorFinancials.withdrawable;
    pending = creatorFinancials.pendingTotal;
    available = creatorFinancials.withdrawable;
    
    console.log(`💰 [API] Creator balance result:`, {
      balance,
      pending,
      available,
      withdrawable: creatorFinancials.withdrawable
    });
  }

  const response = { success: true, balance, pending, available };
  console.log(`💰 [API] Returning balance:`, response);
  res.json(response);
});

// ==================== GET TRANSACTIONS ====================
exports.getTransactions = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, type, status, startDate, endDate } = req.query;
  const brandId = getEffectiveBrandId(req);

  const query = req.user.userType === 'brand'
    ? { 'from.userId': brandId }
    : { 'to.userId': req.user._id };

  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total, summary] = await Promise.all([
    Payment.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('from.userId', 'fullName brandName email')
      .populate('to.userId', 'fullName displayName email')
      .populate('dealId', 'campaignId budget')
      .lean(),
    Payment.countDocuments(query),
    Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$fee' },
          totalNet: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    transactions,
    summary: summary[0] || { totalAmount: 0, totalFees: 0, totalNet: 0, count: 0 },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== GET PAYMENT METHODS ====================
exports.getPaymentMethods = catchAsync(async (req, res) => {
  let paymentMethods = [];
  const brandId = getEffectiveBrandId(req);

  if (req.user.userType === 'brand') {
    const brand = await Brand.findById(brandId).select('paymentMethods');
    paymentMethods = brand?.paymentMethods || [];
  } else if (req.user.userType === 'creator') {
    const creator = await Creator.findById(req.user._id).select('paymentMethods');
    paymentMethods = creator?.paymentMethods || [];
  }

  res.json({ success: true, paymentMethods });
});

// ==================== ADD PAYMENT METHOD ====================
exports.addPaymentMethod = catchAsync(async (req, res) => {
  const { type, ...details } = req.body;
  const brandId = getEffectiveBrandId(req);

  if (!type) {
    return res.status(400).json({ success: false, error: 'Payment method type is required' });
  }

  const newMethod = {
    _id: new mongoose.Types.ObjectId(),
    type,
    ...details,
    isDefault: false,
    createdAt: new Date(),
  };

  let updatedUser;
  if (req.user.userType === 'brand') {
    updatedUser = await Brand.findByIdAndUpdate(
      brandId,
      { $push: { paymentMethods: newMethod } },
      { new: true }
    ).select('paymentMethods');
  } else if (req.user.userType === 'creator') {
    updatedUser = await Creator.findByIdAndUpdate(
      req.user._id,
      { $push: { paymentMethods: newMethod } },
      { new: true }
    ).select('paymentMethods');
  }

  res.json({
    success: true,
    message: 'Payment method added',
    paymentMethods: updatedUser?.paymentMethods || [],
  });
});

// ==================== SET DEFAULT PAYMENT METHOD ====================
exports.setDefaultMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;
  const brandId = getEffectiveBrandId(req);

  // Reset default flag on all methods
  if (req.user.userType === 'brand') {
    await Brand.updateOne({ _id: brandId }, { $set: { 'paymentMethods.$[].isDefault': false } });
    await Brand.findOneAndUpdate(
      { _id: brandId, 'paymentMethods._id': methodId },
      { $set: { 'paymentMethods.$.isDefault': true } }
    );
  } else if (req.user.userType === 'creator') {
    await Creator.updateOne({ _id: req.user._id }, { $set: { 'paymentMethods.$[].isDefault': false } });
    await Creator.findOneAndUpdate(
      { _id: req.user._id, 'paymentMethods._id': methodId },
      { $set: { 'paymentMethods.$.isDefault': true } }
    );
  }

  res.json({ success: true, message: 'Default payment method updated' });
});

// ==================== DELETE PAYMENT METHOD ====================
exports.deletePaymentMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;
  const brandId = getEffectiveBrandId(req);

  if (req.user.userType === 'brand') {
    await Brand.findByIdAndUpdate(brandId, { $pull: { paymentMethods: { _id: methodId } } });
  } else if (req.user.userType === 'creator') {
    await Creator.findByIdAndUpdate(req.user._id, { $pull: { paymentMethods: { _id: methodId } } });
  }

  res.json({ success: true, message: 'Payment method deleted' });
});

// ==================== CREATE ESCROW ====================
exports.createEscrow = catchAsync(async (req, res) => {
  const { dealId } = req.body;

  if (!dealId || !isValidObjectId(dealId)) {
    return res.status(400).json({ success: false, error: 'Valid dealId is required' });
  }

  // 🔒 TRANSACTION: Start session for atomic operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deal = await Deal.findOne({ _id: dealId, brandId: req.user._id }).session(session);
    if (!deal) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: 'Deal not found or not owned by you' });
    }

    const existingPayment = await Payment.findOne({ dealId }).session(session);
    if (existingPayment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: 'Payment already exists for this deal' });
    }

    const fees = await PaymentCalculator.calculateFees(deal.budget, req.user.userType);

    const payment = new Payment({
      transactionId: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      type: 'escrow',
      status: 'pending',
      amount: deal.budget,
      fee: fees.total,
      netAmount: deal.budget - fees.total,
      from: { userId: req.user._id, accountType: 'brand' },
      to: { userId: deal.creatorId, accountType: 'creator' },
      dealId: deal._id,
      campaignId: deal.campaignId,
      description: `Escrow payment for deal ${deal._id}`,
      metadata: { fees },
    });

    await payment.save({ session });

    deal.paymentStatus = 'pending';
    deal.paymentId = payment._id;
    await deal.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Escrow created successfully with transaction:', {
      paymentId: payment._id,
      dealId: deal._id,
      amount: payment.amount
    });

    res.json({ success: true, message: 'Escrow created', payment });
  } catch (error) {
    // 🔒 TRANSACTION: Rollback on any error
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Escrow creation failed, transaction rolled back:', error);
    throw error;
  }
});

// ==================== CREATE ESCROW CHECKOUT INTENT ====================
exports.createEscrowCheckoutIntent = catchAsync(async (req, res) => {
  const { dealId, currency } = req.body;

  if (!dealId || !isValidObjectId(dealId)) {
    return res.status(400).json({ success: false, error: 'Valid dealId is required' });
  }

  const deal = await Deal.findOne({ _id: dealId, brandId: req.user._id });
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found or not owned by you' });
  }

  const existingPayment = await Payment.findOne({ dealId, type: 'escrow' });
  if (existingPayment) {
    return res.status(400).json({ success: false, error: 'Payment already exists for this deal' });
  }

  const feeService = require('../services/feeService');
  const feeBreakdown = await feeService.calculateTotalFees(deal.budget, {
    includeCommission: true,
    includeEscrow: deal.paymentType === 'escrow',
    includeTax: false
  });
  
  const normalizedCurrency = (currency || deal.currency || 'USD').toUpperCase();

  const payment = new Payment({
    transactionId: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'escrow',
    status: 'pending',
    amount: deal.budget,
    currency: normalizedCurrency,
    fee: feeBreakdown.totalFees,
    netAmount: feeBreakdown.netAmount,
    from: { userId: req.user._id, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    description: `Escrow payment for deal ${deal._id}`,
    metadata: { fees: feeBreakdown, gateway: 'stripe', checkoutStatus: 'created' }
  });

  let checkout = null;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(deal.budget * 100),
    currency: normalizedCurrency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    capture_method: 'manual',
    metadata: {
      dealId: deal._id.toString(),
      brandId: req.user._id.toString(),
      creatorId: deal.creatorId.toString()
    }
  });

  payment.stripePaymentIntentId = paymentIntent.id;
  checkout = {
    provider: 'stripe',
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status
  };

  await payment.save();
  deal.paymentStatus = 'pending';
  deal.paymentId = payment._id;
  await deal.save();

  res.status(201).json({
    success: true,
    message: 'Escrow checkout intent created',
    payment,
    checkout
  });
});

// ==================== CONFIRM ESCROW CHECKOUT ====================
exports.confirmEscrowCheckout = catchAsync(async (req, res) => {
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    return res.status(400).json({ success: false, error: 'Valid paymentId is required' });
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    type: 'escrow',
    'from.userId': req.user._id
  });

  if (!payment) {
    return res.status(404).json({ success: false, error: 'Escrow payment not found' });
  }

  if (payment.status === 'in-escrow' || payment.status === 'completed') {
    return res.json({ success: true, message: 'Payment already confirmed', payment });
  }

  if (!payment.stripePaymentIntentId) {
    return res.status(400).json({ success: false, error: 'Missing Stripe payment intent id' });
  }

  let intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
  if (intent.status === 'requires_capture') {
    intent = await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
  }

  if (!['succeeded', 'processing'].includes(intent.status)) {
    return res.status(400).json({
      success: false,
      error: `Stripe payment is not confirmable yet (status: ${intent.status})`
    });
  }

  payment.metadata = { ...payment.metadata, processorStatus: intent.status };

  payment.status = 'in-escrow';
  payment.paidAt = new Date();
  payment.metadata = { ...payment.metadata, checkoutStatus: 'confirmed' };
  await payment.save();

  await Deal.findByIdAndUpdate(payment.dealId, {
    paymentStatus: 'in-escrow',
    paymentId: payment._id
  });

  res.json({ success: true, message: 'Escrow payment confirmed', payment });
});

// ==================== CREATE PERFORMANCE PAYMENT ====================
exports.createPerformancePayment = catchAsync(async (req, res) => {
  const { dealId, paymentType, metrics } = req.body;

  if (!dealId || !paymentType || !metrics) {
    return res.status(400).json({ success: false, error: 'dealId, paymentType, and metrics are required' });
  }

  if (!['cpe', 'cpa', 'cpm'].includes(paymentType)) {
    return res.status(400).json({ success: false, error: 'paymentType must be cpe, cpa, or cpm' });
  }

  const deal = await Deal.findOne({ _id: dealId, brandId: req.user._id }).populate('creatorId');
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  const calculation = await PaymentCalculator.calculatePerformancePayment(deal, paymentType, metrics);

  const performancePayment = await PerformancePayment.create({
    dealId: deal._id,
    type: paymentType,
    metrics: calculation.metrics,
    baseRate: calculation.baseAmount,
    finalAmount: calculation.finalAmount,
    bonus: calculation.bonus,
    breakdown: calculation.breakdown,
    status: 'pending',
  });

  const payment = new Payment({
    transactionId: `PERF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: 'performance',
    status: 'in-escrow',
    amount: calculation.finalAmount,
    fee: calculation.fees.total,
    netAmount: calculation.finalAmount - calculation.fees.total,
    from: { userId: req.user._id, accountType: 'brand' },
    to: { userId: deal.creatorId, accountType: 'creator' },
    dealId: deal._id,
    campaignId: deal.campaignId,
    performancePaymentId: performancePayment._id,
    description: `${paymentType.toUpperCase()} payment for deal ${deal._id}`,
    metadata: { calculation, metrics },
  });

  await payment.save();

  deal.paymentStatus = 'in-escrow';
  deal.paymentId = payment._id;
  deal.performancePaymentId = performancePayment._id;
  await deal.save();

  res.json({ success: true, message: 'Performance payment created', payment, calculation });
});

// ==================== UPDATE PERFORMANCE METRICS ====================
exports.updatePerformanceMetrics = catchAsync(async (req, res) => {
  const { dealId } = req.params;
  const { metrics, finalize = false } = req.body;

  if (!metrics) {
    return res.status(400).json({ success: false, error: 'metrics are required' });
  }

  const deal = await Deal.findById(dealId).populate('performancePaymentId');
  if (!deal) {
    return res.status(404).json({ success: false, error: 'Deal not found' });
  }

  if (!deal.performancePaymentId) {
    return res.status(400).json({ success: false, error: 'Not a performance-based deal' });
  }

  const calculation = await PaymentCalculator.calculatePerformancePayment(
    deal,
    deal.paymentType,
    metrics,
    finalize
  );

  await PerformancePayment.findByIdAndUpdate(deal.performancePaymentId, {
    $set: {
      metrics,
      finalAmount: calculation.finalAmount,
      bonus: calculation.bonus,
      breakdown: calculation.breakdown,
      tracking: { date: new Date(), metrics, calculation },
    },
  });

  await Payment.findByIdAndUpdate(deal.paymentId, {
    $set: {
      amount: calculation.finalAmount,
      netAmount: calculation.finalAmount - calculation.fees.total,
      metadata: { ...calculation, updatedAt: new Date() },
    },
  });

  if (finalize) {
    deal.paymentStatus = 'in-escrow';
    await deal.save();
  }

  res.json({ success: true, message: 'Performance metrics updated', calculation });
});

// ==================== RELEASE PAYMENT ====================
exports.releasePayment = catchAsync(async (req, res) => {
  const { dealId } = req.params;

  // 🔒 TRANSACTION: Start session for atomic operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ dealId, status: 'in-escrow' }).session(session);
    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: 'Payment not found or not in escrow' });
    }

    // Final calculation for performance payments
    if (payment.type === 'performance') {
      const deal = await Deal.findById(dealId).session(session);
      const performancePayment = await PerformancePayment.findById(payment.performancePaymentId).session(session);
      const finalCalculation = await PaymentCalculator.calculatePerformancePayment(
        deal,
        performancePayment.type,
        performancePayment.metrics,
        true
      );

      payment.amount = finalCalculation.finalAmount;
      payment.netAmount = finalCalculation.finalAmount - finalCalculation.fees.total;
    }

    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save({ session });

    await Deal.findByIdAndUpdate(dealId, { paymentStatus: 'released' }, { session });

    await Creator.findByIdAndUpdate(payment.to.userId, {
      $inc: { 'stats.totalEarnings': payment.netAmount },
    }, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Payment released successfully with transaction:', {
      paymentId: payment._id,
      dealId: dealId,
      amount: payment.amount,
      netAmount: payment.netAmount
    });

    // Notify admins about payment received (async - doesn't affect transaction)
    setImmediate(async () => {
      try {
        const adminNotificationService = require('../services/adminNotificationService');
        const fromUser = await User.findById(payment.from.userId).select('fullName userType');
        const toUser = await User.findById(payment.to.userId).select('fullName userType');
        
        await adminNotificationService.notifyPaymentReceived({
          amount: payment.amount,
          from: fromUser?.fullName || 'Unknown',
          to: toUser?.fullName || 'Unknown',
          transactionId: payment._id.toString(),
          dealId: dealId
        });
      } catch (notificationError) {
        console.warn('Admin notification failed:', notificationError.message);
      }
    });

    res.json({ success: true, message: 'Payment released' });
  } catch (error) {
    // 🔒 TRANSACTION: Rollback on any error
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Payment release failed, transaction rolled back:', error);
    throw error;
  }
});

// ==================== REQUEST WITHDRAWAL ====================
exports.getPayoutAccountStatus = catchAsync(async (req, res) => {
  if (req.user.userType !== 'creator') {
    return res.status(403).json({ success: false, error: 'Only creators can access payout account status' });
  }

  const creatorUser = await User.findById(req.user._id).select('stripeAccountId stripeAccountStatus');
  if (!creatorUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (!creatorUser.stripeAccountId) {
    return res.json({
      success: true,
      connected: false,
      status: 'not_connected',
      stripeAccountId: null,
      payoutsEnabled: false,
      detailsSubmitted: false,
      currentlyDue: []
    });
  }

  let account;
  try {
    account = await stripe.accounts.retrieve(creatorUser.stripeAccountId);
  } catch (error) {
    if (error?.code === 'resource_missing') {
      creatorUser.stripeAccountId = undefined;
      creatorUser.stripeAccountStatus = 'pending';
      await creatorUser.save();

      return res.json({
        success: true,
        connected: false,
        status: 'not_connected',
        stripeAccountId: null,
        payoutsEnabled: false,
        detailsSubmitted: false,
        currentlyDue: []
      });
    }

    throw error;
  }

  const derivedStatus = getStripeConnectStatus(account);
  if (creatorUser.stripeAccountStatus !== derivedStatus) {
    creatorUser.stripeAccountStatus = derivedStatus;
    await creatorUser.save();
  }

  res.json({
    success: true,
    connected: Boolean(account.payouts_enabled && account.details_submitted),
    status: derivedStatus,
    stripeAccountId: creatorUser.stripeAccountId,
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    currentlyDue: account.requirements?.currently_due || []
  });
});

exports.createPayoutOnboardingLink = catchAsync(async (req, res) => {
  if (req.user.userType !== 'creator') {
    return res.status(403).json({ success: false, error: 'Only creators can connect a payout account' });
  }

  const creatorUser = await User.findById(req.user._id).select('email fullName stripeAccountId stripeAccountStatus userType');
  if (!creatorUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  let stripeAccountId = creatorUser.stripeAccountId;
  if (stripeAccountId) {
    try {
      await stripe.accounts.retrieve(stripeAccountId);
    } catch (error) {
      if (error?.code === 'resource_missing') {
        stripeAccountId = null;
      } else {
        throw error;
      }
    }
  }

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: (process.env.STRIPE_CONNECT_COUNTRY || 'US').toUpperCase(),
      email: creatorUser.email,
      business_type: 'individual',
      metadata: {
        userId: creatorUser._id.toString(),
        userType: creatorUser.userType
      }
    });

    stripeAccountId = account.id;
    creatorUser.stripeAccountId = stripeAccountId;
    creatorUser.stripeAccountStatus = 'pending';
    await creatorUser.save();
  }

  const requestedReturnPath = typeof req.body?.returnPath === 'string' ? req.body.returnPath.trim() : '';
  const allowedReturnPaths = new Set(['/creator/withdrawals', '/creator/earnings']);
  const returnPath = allowedReturnPaths.has(requestedReturnPath)
    ? requestedReturnPath
    : getCreatorWithdrawalsPath();

  const frontendBaseUrl = getFrontendBaseUrl();
  const returnUrl = `${frontendBaseUrl}${returnPath}?stripe_connect=return`;
  const refreshUrl = `${frontendBaseUrl}${returnPath}?stripe_connect=refresh`;

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  res.json({
    success: true,
    url: accountLink.url,
    stripeAccountId
  });
});

exports.requestWithdrawal = catchAsync(async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ success: false, error: 'Amount is required' });
  }

  if (req.user.userType !== 'creator') {
    return res.status(403).json({ success: false, error: 'Only creators can request withdrawals' });
  }

  // 🔒 TRANSACTION: Start session for atomic operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Use dynamic minimum payout amount instead of hardcoded $50
    const feeService = require('../services/feeService');
    const minPayoutValidation = await feeService.validateMinimumAmount(amount, 'payout');
    
    if (!isValidBudget(amount) || !minPayoutValidation.isValid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        error: `Minimum withdrawal amount is $${minPayoutValidation.minimumAmount}` 
      });
    }

    const creatorFinancials = await getCreatorFinancials(req.user._id);
    const availableBalance = creatorFinancials.withdrawable;
    if (amount > availableBalance) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
      });
    }

    const creatorUser = await User.findById(req.user._id).select('stripeAccountId stripeAccountStatus').session(session);
    const destinationAccount = creatorUser?.stripeAccountId || null;

    // Use dynamic fee service for withdrawal fees
    const withdrawalFeeBreakdown = await feeService.calculateWithdrawalFee(amount);

    const withdrawal = new Payment({
      transactionId: `WTH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      type: 'withdrawal',
      status: 'pending',
      amount,
      fee: withdrawalFeeBreakdown.withdrawalFeeAmount,
      netAmount: withdrawalFeeBreakdown.netAmount,
      from: { userId: req.user._id, accountType: req.user.userType },
      to: { userId: req.user._id, accountType: req.user.userType },
      paymentMethod: {
        type: 'stripe',
        details: {
          destinationAccount
        },
      },
      description: 'Stripe withdrawal request (pending admin approval)',
      metadata: {
        fees: withdrawalFeeBreakdown,
        requestedAt: new Date(),
        approvalRequired: true,
        destinationAccount,
        payoutAccountConnected: Boolean(destinationAccount)
      },
    });

    await withdrawal.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Withdrawal request created successfully with transaction:', {
      withdrawalId: withdrawal._id,
      amount: withdrawal.amount,
      netAmount: withdrawal.netAmount
    });

    res.json({
      success: true,
      message: destinationAccount
        ? 'Withdrawal request submitted for admin approval'
        : 'Withdrawal request submitted. Connect Stripe payout account before admin approval.',
      withdrawal
    });
  } catch (error) {
    // 🔒 TRANSACTION: Rollback on any error
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Withdrawal request failed, transaction rolled back:', error);
    throw error;
  }
});

// ==================== GET WITHDRAWALS ====================
exports.getWithdrawals = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const query = { 'to.userId': req.user._id, type: 'withdrawal' };
  const withdrawals = await Payment.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();
  const total = await Payment.countDocuments(query);
  res.json({ success: true, withdrawals, pagination: { page, limit, total } });
});

// ==================== GET INVOICES ====================
exports.getInvoices = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const brandId = getEffectiveBrandId(req);

  const query = {
    'from.userId': req.user.userType === 'brand' ? brandId : req.user._id,
    status: 'completed',
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [invoices, total] = await Promise.all([
    Payment.find(query)
      .select('transactionId amount status createdAt invoiceNumber invoiceUrl')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(query),
  ]);

  res.json({
    success: true,
    invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== DOWNLOAD INVOICE ====================
exports.downloadInvoice = catchAsync(async (req, res) => {
  const { invoiceId } = req.params;
  const brandId = getEffectiveBrandId(req);

  // Find the payment record (since getInvoices returns Payment records)
  const payment = await Payment.findOne({
    _id: invoiceId,
    'from.userId': req.user.userType === 'brand' ? brandId : req.user._id,
    status: 'completed'
  }).populate('from.userId', 'fullName email phone');

  if (!payment) {
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }

  // Generate PDF content
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();

  // Set headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${payment.invoiceNumber || payment.transactionId.slice(-6)}.pdf"`);

  // Pipe PDF to response
  doc.pipe(res);

  // PDF Content
  const fontSize = 12;
  const lineHeight = 20;
  let yPosition = 50;

  // Header
  doc.fontSize(24).text('INVOICE', 50, yPosition);
  yPosition += 40;

  // Invoice details
  doc.fontSize(fontSize).text(`Invoice Number: ${payment.invoiceNumber || payment.transactionId.slice(-6).toUpperCase()}`, 50, yPosition);
  yPosition += lineHeight;
  doc.text(`Date: ${payment.createdAt.toLocaleDateString()}`, 50, yPosition);
  yPosition += lineHeight;
  doc.text(`Status: ${payment.status.toUpperCase()}`, 50, yPosition);
  yPosition += lineHeight * 2;

  // Customer info
  const customer = payment.from.userId;
  doc.fontSize(16).text('Bill To:', 50, yPosition);
  yPosition += lineHeight;
  doc.fontSize(fontSize).text(customer?.fullName || 'Unknown', 50, yPosition);
  yPosition += lineHeight;
  doc.text(customer?.email || 'No email', 50, yPosition);
  yPosition += lineHeight * 2;

  // Transaction details
  doc.fontSize(16).text('Transaction Details:', 50, yPosition);
  yPosition += lineHeight;
  doc.fontSize(fontSize).text(`Description: ${payment.description || 'Payment Transaction'}`, 50, yPosition);
  yPosition += lineHeight;
  doc.text(`Amount: $${(payment.amount / 100).toFixed(2)}`, 50, yPosition);
  yPosition += lineHeight;
  doc.text(`Transaction ID: ${payment.transactionId}`, 50, yPosition);
  yPosition += lineHeight * 2;

  // Footer
  doc.fontSize(10).text('Thank you for your business!', 50, yPosition);

  // Finalize PDF
  doc.end();
});

// ==================== CREATE DEPOSIT CHECKOUT SESSION ====================
exports.createDepositCheckoutSession = catchAsync(async (req, res) => {
  const { amount, currency = 'usd' } = req.body;
  const brandId = getEffectiveBrandId(req);

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 10) {
    return res.status(400).json({ success: false, error: 'Minimum deposit amount is $10' });
  }

  if (!['brand', 'creator'].includes(req.user.userType)) {
    return res.status(403).json({ success: false, error: 'Only brand and creator accounts can add funds' });
  }

  let stripeCustomerId = req.user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.fullName,
      metadata: {
        userId: brandId.toString(),
        userType: req.user.userType,
        ownerUserId: req.user._id.toString()
      }
    });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(req.user._id, { stripeCustomerId });
  }

  const frontendBaseUrl = getFrontendBaseUrl();
  const paymentsPath = getPaymentsPathByUserType(req.user.userType);
  const successUrl = `${frontendBaseUrl}${paymentsPath}?deposit=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendBaseUrl}${paymentsPath}?deposit=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: String(currency).toLowerCase(),
          product_data: {
            name: 'Wallet Top-up',
            description: 'Add funds via Stripe Checkout'
          },
          unit_amount: Math.round(normalizedAmount * 100)
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: req.user._id.toString(),
    metadata: {
      purpose: 'wallet_topup',
      userId: brandId.toString(),
      userType: req.user.userType,
      ownerUserId: req.user._id.toString(),
      amount: String(normalizedAmount)
    }
  });

  res.json({ success: true, url: session.url, sessionId: session.id });
});

// ==================== GET PERFORMANCE SUMMARY ====================
exports.getPerformanceSummary = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { period = '30d' } = req.query;

  const startDate = new Date();
  switch (period) {
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    case '90d': startDate.setDate(startDate.getDate() - 90); break;
    default: startDate.setDate(startDate.getDate() - 30);
  }

  const performance = await PerformancePayment.aggregate([
    {
      $lookup: {
        from: 'deals',
        localField: 'dealId',
        foreignField: '_id',
        as: 'deal',
      },
    },
    { $unwind: '$deal' },
    {
      $match: {
        $or: [{ 'deal.brandId': userId }, { 'deal.creatorId': userId }],
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' },
        avgAmount: { $avg: '$finalAmount' },
        totalBonus: { $sum: '$bonus' },
      },
    },
  ]);

  res.json({ success: true, performance });
});

// ==================== STRIPE WEBHOOK HANDLER (SECURED) ====================
exports.handleStripeWebhook = async (req, res) => {
  // 🚨 EMERGENCY LOGGING - Detect if webhook reaches server
  console.log('🚨 [WEBHOOK] Request received at:', new Date().toISOString());
  console.log('🚨 [WEBHOOK] Headers:', req.headers['stripe-signature'] ? 'HAS STRIPE SIG' : 'NO STRIPE SIG');
  console.log('🚨 [WEBHOOK] Body type:', Buffer.isBuffer(req.body) ? 'RAW BUFFER' : 'PARSED JSON');
  console.log('🚨 [WEBHOOK] Body length:', req.body ? req.body.length : 'NULL');
  
  try {
    // 🔒 SECURITY: Validate signature header exists
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      console.error('🚨 Webhook Security: Missing stripe-signature header');
      return res.status(400).json({ 
        error: 'Invalid webhook request',
        code: 'MISSING_SIGNATURE'
      });
    }

    // 🔒 SECURITY: Validate webhook secret is configured
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('🚨 Webhook Security: STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        code: 'MISSING_SECRET'
      });
    }

    // 🔒 SECURITY: Validate request body is buffer (from raw middleware)
    if (!Buffer.isBuffer(req.body)) {
      console.error('🚨 Webhook Security: Request body is not raw buffer');
      return res.status(400).json({ 
        error: 'Invalid request format',
        code: 'INVALID_BODY_FORMAT'
      });
    }

    // 🔒 SECURITY: Validate signature format
    if (!sig.startsWith('t=') || sig.split(',').length < 2) {
      console.error('🚨 Webhook Security: Invalid signature format');
      return res.status(400).json({ 
        error: 'Invalid signature format',
        code: 'INVALID_SIGNATURE_FORMAT'
      });
    }

    let event;
    try {
      // 🔒 SECURITY: Construct event with signature verification
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log(`✅ Webhook Security: Signature verified for event ${event.type}`);
    } catch (err) {
      console.error(`🚨 Webhook Security: Signature verification failed: ${err.message}`);
      // Log attempt for security monitoring
      console.error(`🔍 Security Log - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
      return res.status(400).json({ 
        error: 'Webhook signature verification failed',
        code: 'SIGNATURE_VERIFICATION_FAILED'
      });
    }

    // 🔒 SECURITY: Validate event structure
    if (!event || !event.type || !event.id) {
      console.error('🚨 Webhook Security: Invalid event structure');
      return res.status(400).json({ 
        error: 'Invalid event structure',
        code: 'INVALID_EVENT'
      });
    }

    // 🔒 SECURITY: Validate event type is allowed
    const allowedEventTypes = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'checkout.session.completed',
      'charge.refunded'
    ];

    if (!allowedEventTypes.includes(event.type)) {
      console.warn(`⚠️ Webhook Security: Unexpected event type: ${event.type}`);
      // Don't process unknown events but acknowledge receipt
      return res.json({ received: true, processed: false, reason: 'Unknown event type' });
    }

    // 🚀 PROCESS: Handle the validated event
    try {
      console.log(`📥 Processing webhook event: ${event.type} (ID: ${event.id})`);
      await stripeService.handleWebhookEvent(event);
      
      console.log(`✅ Webhook processed successfully: ${event.type}`);
      return res.json({ 
        received: true, 
        processed: true, 
        eventId: event.id,
        eventType: event.type
      });
      
    } catch (processingError) {
      console.error(`❌ Webhook Processing Error for ${event.type}:`, processingError.message);
      console.error('🔍 Processing Error Stack:', processingError.stack);
      
      // Don't expose internal errors but acknowledge receipt
      return res.status(500).json({ 
        error: 'Webhook processing failed',
        code: 'PROCESSING_ERROR',
        eventId: event.id
      });
    }

  } catch (criticalError) {
    console.error('🚨 Critical Webhook Error:', criticalError.message);
    console.error('🔍 Critical Error Stack:', criticalError.stack);
    
    // Always respond to prevent webhook retries on critical errors
    return res.status(500).json({ 
      error: 'Critical webhook error',
      code: 'CRITICAL_ERROR'
    });
  }
};