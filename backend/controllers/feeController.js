// controllers/feeController.js
const Fee = require('../models/Fee');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const feeService = require('../services/feeService');
const asyncHandler = require('express-async-handler');

// @desc    Calculate platform fees for a deal
// @route   POST /api/fees/calculate
// @access  Private
const calculateFees = asyncHandler(async (req, res) => {
  const { amount, userType, planId = 'free', options = {} } = req.body;

  try {
    // Calculate fees using dynamic fee service
    const feeBreakdown = await feeService.calculateTotalFees(amount, {
      includeCommission: true,
      includeEscrow: options.includeEscrow || false,
      includeWithdrawal: options.includeWithdrawal || false,
      includeTax: options.includeTax || false
    });

    // Add subscription plan adjustments if needed
    let adjustedBreakdown = { ...feeBreakdown };
    
    if (planId && planId !== 'free') {
      // Apply plan-based discounts (could be extended based on subscription plans)
      const planDiscounts = {
        professional: 0.9, // 10% discount
        enterprise: 0.8   // 20% discount
      };
      
      const discount = planDiscounts[planId] || 1;
      if (discount < 1) {
        adjustedBreakdown.fees.commission.commissionAmount *= discount;
        adjustedBreakdown.totalFees *= discount;
        adjustedBreakdown.netAmount = feeBreakdown.originalAmount - adjustedBreakdown.totalFees;
        adjustedBreakdown.planDiscount = (1 - discount) * 100;
      }
    }

    res.json({
      success: true,
      fees: adjustedBreakdown
    });
  } catch (error) {
    console.error('Fee calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fees'
    });
  }
});

// @desc    Apply platform fees to a deal
// @route   POST /api/fees/apply
// @access  Private/Admin
const applyFees = asyncHandler(async (req, res) => {
  const { dealId } = req.body;

  try {
    const deal = await Deal.findById(dealId)
      .populate('brandId')
      .populate('creatorId');

    if (!deal) {
      res.status(404);
      throw new Error('Deal not found');
    }

    // Get user plans for potential discounts
    const brandPlan = await Subscription.findOne({ userId: deal.brandId._id }) || { planId: 'free' };
    
    // Calculate fees using dynamic fee service
    const feeBreakdown = await feeService.calculateTotalFees(deal.budget, {
      includeCommission: true,
      includeEscrow: deal.paymentType === 'escrow',
      includeTax: false // Tax handled separately
    });

    // Apply plan-based discounts if applicable
    let finalFees = { ...feeBreakdown };
    let commissionRate = feeBreakdown.fees.commission.commissionRate;
    
    if (brandPlan.planId !== 'free') {
      const planDiscounts = {
        professional: 0.9,
        enterprise: 0.8
      };
      
      const discount = planDiscounts[brandPlan.planId] || 1;
      if (discount < 1) {
        finalFees.fees.commission.commissionAmount *= discount;
        finalFees.totalFees *= discount;
        finalFees.netAmount = deal.budget - finalFees.totalFees;
        commissionRate *= discount;
      }
    }

    // Update deal with fee information
    deal.platformFee = finalFees.fees.commission.commissionAmount;
    deal.totalFees = finalFees.totalFees;
    deal.netAmount = finalFees.netAmount;
    deal.commissionRate = commissionRate;
    
    if (deal.paymentType === 'escrow') {
      deal.escrowFee = finalFees.fees.escrow?.escrowFeeAmount || 0;
    }
    
    await deal.save();

    // Create fee records
    await Fee.create({
      type: 'platform_commission',
      calculationType: 'percentage',
      percentage: commissionRate,
      fixedAmount: finalFees.fees.commission.commissionAmount,
      payerType: 'brand',
      applicableTo: ['all_deals'],
      dealId: deal._id,
      isActive: true
    });

    // Create escrow fee record if applicable
    if (deal.paymentType === 'escrow' && finalFees.fees.escrow) {
      await Fee.create({
        type: 'escrow_fee',
        calculationType: 'percentage',
        percentage: finalFees.fees.escrow.escrowFeeRate,
        fixedAmount: finalFees.fees.escrow.escrowFeeAmount,
        payerType: 'brand',
        applicableTo: ['escrow_deals'],
        dealId: deal._id,
        isActive: true
      });
    }

    res.json({
      success: true,
      fees: {
        platformFee: finalFees.fees.commission.commissionAmount,
        escrowFee: finalFees.fees.escrow?.escrowFeeAmount || 0,
        totalFees: finalFees.totalFees,
        netAmount: finalFees.netAmount,
        commissionRate
      }
    });
  } catch (error) {
    console.error('Apply fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply fees'
    });
  }
});

// @desc    Get fee configuration
// @route   GET /api/fees/config
// @access  Private/Admin
const getFeeConfig = asyncHandler(async (req, res) => {
  try {
    const fees = await Fee.find({ isActive: true });
    const currentFees = await feeService.getFees();

    res.json({
      success: true,
      fees,
      currentFees,
      defaults: {
        commissionRate: currentFees.commissionRate,
        escrowFee: currentFees.escrowFee,
        withdrawalFee: currentFees.withdrawalFee,
        featuredListingFee: currentFees.featuredListingFee,
        taxRate: currentFees.taxRate,
        minPayoutAmount: currentFees.minPayoutAmount,
        minEscrowAmount: currentFees.minEscrowAmount
      }
    });
  } catch (error) {
    console.error('Get fee config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fee configuration'
    });
  }
});

// @desc    Update fee configuration
// @route   PUT /api/fees/config
// @access  Private/Admin
const updateFeeConfig = asyncHandler(async (req, res) => {
  const { type, ...feeData } = req.body;

  let fee = await Fee.findOne({ type });

  if (fee) {
    Object.assign(fee, feeData);
    fee.updatedBy = req.user._id;
    await fee.save();
  } else {
    fee = await Fee.create({
      ...feeData,
      type,
      createdBy: req.user._id
    });
  }

  res.json({
    success: true,
    message: 'Fee configuration updated',
    fee
  });
});

// @desc    Get revenue analytics
// @route   GET /api/fees/revenue
// @access  Private/Admin
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  let startDate = new Date();
  if (period === '30d') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === '90d') {
    startDate.setDate(startDate.getDate() - 90);
  } else if (period === '12m') {
    startDate.setMonth(startDate.getMonth() - 12);
  }

  // Revenue by source
  const revenueBySource = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Revenue by month
  const revenueByMonth = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$amount' },
        fees: { $sum: '$fee' },
        net: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Commission breakdown
  const commissionBreakdown = await Deal.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDeals: { $sum: 1 },
        totalBudget: { $sum: '$budget' },
        totalFees: { $sum: '$platformFee' }
      }
    }
  ]);

  res.json({
    success: true,
    analytics: {
      period,
      revenueBySource,
      revenueByMonth: revenueByMonth.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        ...item
      })),
      commissionBreakdown: commissionBreakdown[0] || {
        totalDeals: 0,
        totalBudget: 0,
        totalFees: 0
      }
    }
  });
});

module.exports = {
  calculateFees,
  applyFees,
  getFeeConfig,
  updateFeeConfig,
  getRevenueAnalytics
};