const settingsService = require('./settingsService');

class FeeService {
  constructor() {
    this.cache = null;
    this.lastCacheUpdate = 0;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get current fee structure with caching
   */
  async getFees() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache && (now - this.lastCacheUpdate) < this.cacheTTL) {
      return this.cache;
    }

    try {
      const settings = await settingsService.getSettings();
      
      const fees = {
        // Percentage fees (0-100)
        commissionRate: parseFloat(settings.fees?.commissionRate ?? 10),
        escrowFee: parseFloat(settings.fees?.escrowFee ?? 0),
        taxRate: parseFloat(settings.fees?.taxRate ?? 0),
        
        // Fixed fees (in USD)
        withdrawalFee: parseFloat(settings.fees?.withdrawalFee?.amount ?? 0),
        featuredListingFee: parseFloat(settings.fees?.featuredListingFee?.base ?? 50),
        
        // Limits
        minPayoutAmount: parseFloat(settings.payments?.minPayoutAmount ?? 50),
        minEscrowAmount: parseFloat(settings.fees?.escrowFee ?? 100),
        
        // Meta information
        taxInclusive: Boolean(settings.fees?.taxInclusive ?? false),
        withdrawalFeeType: String(settings.fees?.withdrawalFee?.type ?? 'fixed'),
        
        // Timestamp for cache invalidation
        lastUpdated: settings.updatedAt
      };

      // Update cache
      this.cache = fees;
      this.lastCacheUpdate = now;

      return fees;
    } catch (error) {
      console.error('FeeService: Error fetching fees:', error);
      
      // Return default fees on error
      return {
        commissionRate: 10,
        escrowFee: 0,
        taxRate: 0,
        withdrawalFee: 0,
        featuredListingFee: 50,
        minPayoutAmount: 50,
        minEscrowAmount: 100,
        taxInclusive: false,
        withdrawalFeeType: 'fixed',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Clear fee cache (call after settings update)
   */
  clearCache() {
    this.cache = null;
    this.lastCacheUpdate = 0;
  }

  /**
   * Calculate platform commission on a given amount
   */
  async calculateCommission(amount) {
    const fees = await this.getFees();
    const commissionAmount = (amount * fees.commissionRate) / 100;
    
    return {
      originalAmount: parseFloat(amount),
      commissionRate: fees.commissionRate,
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
      netAmount: parseFloat((amount - commissionAmount).toFixed(2))
    };
  }

  /**
   * Calculate escrow fee on a given amount
   */
  async calculateEscrowFee(amount) {
    const fees = await this.getFees();
    const escrowFeeAmount = (amount * fees.escrowFee) / 100;
    
    return {
      originalAmount: parseFloat(amount),
      escrowFeeRate: fees.escrowFee,
      escrowFeeAmount: parseFloat(escrowFeeAmount.toFixed(2)),
      totalWithEscrow: parseFloat((amount + escrowFeeAmount).toFixed(2))
    };
  }

  /**
   * Calculate withdrawal fee for a given amount
   */
  async calculateWithdrawalFee(amount) {
    const fees = await this.getFees();
    let withdrawalFeeAmount = 0;

    if (fees.withdrawalFeeType === 'fixed') {
      withdrawalFeeAmount = fees.withdrawalFee;
    } else if (fees.withdrawalFeeType === 'percentage') {
      withdrawalFeeAmount = (amount * fees.withdrawalFee) / 100;
    }

    return {
      originalAmount: parseFloat(amount),
      withdrawalFeeType: fees.withdrawalFeeType,
      withdrawalFeeAmount: parseFloat(withdrawalFeeAmount.toFixed(2)),
      netAmount: parseFloat((amount - withdrawalFeeAmount).toFixed(2))
    };
  }

  /**
   * Calculate tax on a given amount
   */
  async calculateTax(amount) {
    const fees = await this.getFees();
    const taxAmount = (amount * fees.taxRate) / 100;
    
    return {
      originalAmount: parseFloat(amount),
      taxRate: fees.taxRate,
      taxInclusive: fees.taxInclusive,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalWithTax: parseFloat((amount + taxAmount).toFixed(2))
    };
  }

  /**
   * Calculate total fees for a transaction
   */
  async calculateTotalFees(amount, options = {}) {
    const {
      includeCommission = true,
      includeEscrow = false,
      includeWithdrawal = false,
      includeTax = false
    } = options;

    const fees = await this.getFees();
    const results = {
      originalAmount: parseFloat(amount),
      fees: {},
      totalFees: 0,
      netAmount: parseFloat(amount)
    };

    // Calculate commission
    if (includeCommission) {
      const commission = await this.calculateCommission(amount);
      results.fees.commission = commission;
      results.totalFees += commission.commissionAmount;
      results.netAmount -= commission.commissionAmount;
    }

    // Calculate escrow fee
    if (includeEscrow) {
      const escrow = await this.calculateEscrowFee(amount);
      results.fees.escrow = escrow;
      results.totalFees += escrow.escrowFeeAmount;
      if (!fees.taxInclusive) {
        results.netAmount += escrow.escrowFeeAmount;
      }
    }

    // Calculate withdrawal fee
    if (includeWithdrawal) {
      const withdrawal = await this.calculateWithdrawalFee(results.netAmount);
      results.fees.withdrawal = withdrawal;
      results.totalFees += withdrawal.withdrawalFeeAmount;
      results.netAmount -= withdrawal.withdrawalFeeAmount;
    }

    // Calculate tax
    if (includeTax && !fees.taxInclusive) {
      const tax = await this.calculateTax(results.originalAmount);
      results.fees.tax = tax;
      results.totalFees += tax.taxAmount;
      results.netAmount -= tax.taxAmount;
    }

    // Round final values
    results.totalFees = parseFloat(results.totalFees.toFixed(2));
    results.netAmount = parseFloat(results.netAmount.toFixed(2));

    return results;
  }

  /**
   * Check if amount meets minimum requirements
   */
  async validateMinimumAmount(amount, type = 'payout') {
    const fees = await this.getFees();
    const minAmount = type === 'payout' ? fees.minPayoutAmount : fees.minEscrowAmount;
    
    return {
      isValid: parseFloat(amount) >= minAmount,
      minimumAmount: minAmount,
      actualAmount: parseFloat(amount),
      difference: parseFloat((minAmount - amount).toFixed(2))
    };
  }

  /**
   * Get fee breakdown for display
   */
  async getFeeBreakdown(amount, options = {}) {
    const fees = await this.getFees();
    const breakdown = await this.calculateTotalFees(amount, options);
    
    return {
      ...breakdown,
      feeStructure: {
        commissionRate: `${fees.commissionRate}%`,
        escrowFee: `${fees.escrowFee}%`,
        withdrawalFee: fees.withdrawalFeeType === 'fixed' ? `$${fees.withdrawalFee}` : `${fees.withdrawalFee}%`,
        taxRate: `${fees.taxRate}%`,
        featuredListingFee: `$${fees.featuredListingFee}`,
        minPayoutAmount: `$${fees.minPayoutAmount}`,
        minEscrowAmount: `$${fees.minEscrowAmount}`
      }
    };
  }
}

// Singleton instance
const feeService = new FeeService();

module.exports = feeService;
