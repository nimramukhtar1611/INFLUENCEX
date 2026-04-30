const feeService = require('../services/feeService');
const settingsService = require('../services/settingsService');

describe('Dynamic Fee System', () => {
  beforeAll(async () => {
    // Set up test fee configuration
    await settingsService.updateSettings({
      fees: {
        commissionRate: 15,
        escrowFee: 2.5,
        withdrawalFee: { amount: 5, type: 'fixed' },
        featuredListingFee: { base: 75 },
        taxRate: 8.5
      },
      payments: {
        minPayoutAmount: 25,
        minEscrowAmount: 50
      }
    }, 'test-admin');
  });

  describe('Fee Service', () => {
    test('should calculate commission correctly', async () => {
      const result = await feeService.calculateCommission(1000);
      
      expect(result.originalAmount).toBe(1000);
      expect(result.commissionRate).toBe(15);
      expect(result.commissionAmount).toBe(150);
      expect(result.netAmount).toBe(850);
    });

    test('should calculate escrow fee correctly', async () => {
      const result = await feeService.calculateEscrowFee(1000);
      
      expect(result.originalAmount).toBe(1000);
      expect(result.escrowFeeRate).toBe(2.5);
      expect(result.escrowFeeAmount).toBe(25);
      expect(result.totalWithEscrow).toBe(1025);
    });

    test('should calculate withdrawal fee correctly', async () => {
      const result = await feeService.calculateWithdrawalFee(100);
      
      expect(result.originalAmount).toBe(100);
      expect(result.withdrawalFeeType).toBe('fixed');
      expect(result.withdrawalFeeAmount).toBe(5);
      expect(result.netAmount).toBe(95);
    });

    test('should calculate total fees correctly', async () => {
      const result = await feeService.calculateTotalFees(1000, {
        includeCommission: true,
        includeEscrow: true,
        includeWithdrawal: false,
        includeTax: false
      });
      
      expect(result.originalAmount).toBe(1000);
      expect(result.totalFees).toBe(175); // 150 commission + 25 escrow
      expect(result.netAmount).toBe(825);
      expect(result.fees.commission.commissionAmount).toBe(150);
      expect(result.fees.escrow.escrowFeeAmount).toBe(25);
    });

    test('should validate minimum amounts correctly', async () => {
      const validPayout = await feeService.validateMinimumAmount(30, 'payout');
      expect(validPayout.isValid).toBe(true);
      
      const invalidPayout = await feeService.validateMinimumAmount(20, 'payout');
      expect(invalidPayout.isValid).toBe(false);
      expect(invalidPayout.minimumAmount).toBe(25);
    });

    test('should provide fee breakdown', async () => {
      const breakdown = await feeService.getFeeBreakdown(1000, {
        includeCommission: true,
        includeEscrow: true
      });
      
      expect(breakdown.feeStructure.commissionRate).toBe('15%');
      expect(breakdown.feeStructure.escrowFee).toBe('2.5%');
      expect(breakdown.feeStructure.minPayoutAmount).toBe('$25');
      expect(breakdown.feeStructure.minEscrowAmount).toBe('$50');
    });
  });

  describe('Cache Management', () => {
    test('should cache fees for performance', async () => {
      const start1 = Date.now();
      await feeService.getFees();
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await feeService.getFees();
      const time2 = Date.now() - start2;
      
      // Second call should be faster due to caching
      expect(time2).toBeLessThanOrEqual(time1);
    });

    test('should clear cache when settings updated', async () => {
      // Get initial fees
      const initialFees = await feeService.getFees();
      
      // Update settings (should clear cache)
      await settingsService.updateSettings({
        fees: { commissionRate: 20 }
      }, 'test-admin');
      
      // Get updated fees
      const updatedFees = await feeService.getFees();
      
      expect(updatedFees.commissionRate).toBe(20);
      expect(updatedFees.commissionRate).not.toBe(initialFees.commissionRate);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid amounts gracefully', async () => {
      const result = await feeService.calculateCommission(-100);
      expect(result.originalAmount).toBe(-100);
      expect(result.commissionAmount).toBe(-15);
    });

    test('should return default fees on service error', async () => {
      // Mock settingsService to throw error
      const originalGetSettings = settingsService.getSettings;
      settingsService.getSettings = jest.fn().mockRejectedValue(new Error('Service error'));
      
      const fees = await feeService.getFees();
      
      expect(fees.commissionRate).toBe(10); // Default fallback
      expect(fees.withdrawalFee).toBe(0);
      expect(fees.minPayoutAmount).toBe(50);
      
      // Restore original method
      settingsService.getSettings = originalGetSettings;
    });
  });
});

describe('Fee Integration Tests', () => {
  test('should apply fees to deal creation', async () => {
    const dealBudget = 5000;
    const feeBreakdown = await feeService.calculateTotalFees(dealBudget, {
      includeCommission: true,
      includeEscrow: true
    });
    
    // Simulate deal creation
    const deal = {
      budget: dealBudget,
      platformFee: feeBreakdown.fees.commission.commissionAmount,
      escrowFee: feeBreakdown.fees.escrow.escrowFeeAmount,
      totalFees: feeBreakdown.totalFees,
      netAmount: feeBreakdown.netAmount,
      commissionRate: feeBreakdown.fees.commission.commissionRate
    };
    
    expect(deal.platformFee).toBe(750); // 15% of 5000
    expect(deal.escrowFee).toBe(125); // 2.5% of 5000
    expect(deal.totalFees).toBe(875);
    expect(deal.netAmount).toBe(4125);
  });

  test('should validate withdrawal limits', async () => {
    const withdrawalAmount = 20; // Below minimum
    const validation = await feeService.validateMinimumAmount(withdrawalAmount, 'payout');
    
    expect(validation.isValid).toBe(false);
    expect(validation.minimumAmount).toBe(25);
    expect(validation.difference).toBe(5);
  });
});
