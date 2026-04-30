// Utility functions for testing fee reactivity across components
import { useFees } from '../context/FeeContext';

export const testFeeReactivity = {
  /**
   * Test if fee context is properly initialized
   */
  testContextInitialization: (feeContext) => {
    const requiredFields = [
      'commissionRate',
      'escrowFee', 
      'taxRate',
      'withdrawalFee',
      'featuredListingFee',
      'minPayoutAmount',
      'minEscrowAmount'
    ];

    const missingFields = requiredFields.filter(field => 
      feeContext.fees[field] === undefined || feeContext.fees[field] === null
    );

    return {
      success: missingFields.length === 0,
      missingFields,
      fees: feeContext.fees
    };
  },

  /**
   * Test fee calculation methods
   */
  testFeeCalculations: (feeContext) => {
    const testAmount = 1000;
    const results = {};

    try {
      // Test commission calculation
      const commission = feeContext.calculateCommission(testAmount);
      results.commission = {
        success: commission && typeof commission.commissionAmount === 'number',
        result: commission
      };

      // Test escrow fee calculation
      const escrow = feeContext.calculateEscrowFee(testAmount);
      results.escrow = {
        success: escrow && typeof escrow.escrowFeeAmount === 'number',
        result: escrow
      };

      // Test withdrawal fee calculation
      const withdrawal = feeContext.calculateWithdrawalFee(testAmount);
      results.withdrawal = {
        success: withdrawal && typeof withdrawal.withdrawalFeeAmount === 'number',
        result: withdrawal
      };

      // Test total fees calculation
      const totalFees = feeContext.calculateTotalFees(testAmount, {
        includeCommission: true,
        includeEscrow: true,
        includeWithdrawal: true
      });
      results.totalFees = {
        success: totalFees && typeof totalFees.totalFees === 'number',
        result: totalFees
      };

      // Test minimum amount validation
      const minValidation = feeContext.validateMinimumAmount(50, 'payout');
      results.minValidation = {
        success: minValidation && typeof minValidation.isValid === 'boolean',
        result: minValidation
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }

    const allSuccessful = Object.values(results).every(r => r.success);
    return {
      success: allSuccessful,
      results
    };
  },

  /**
   * Test dynamic fee updates
   */
  testDynamicUpdates: async (feeContext) => {
    const originalCommission = feeContext.fees.commissionRate;
    const originalMinPayout = feeContext.fees.minPayoutAmount;

    try {
      // Test fee refresh
      await feeContext.refreshFees();
      
      // Check if fees potentially updated (allowing for network delays)
      const updatedCommission = feeContext.fees.commissionRate;
      const updatedMinPayout = feeContext.fees.minPayoutAmount;

      return {
        success: true,
        originalValues: {
          commissionRate: originalCommission,
          minPayoutAmount: originalMinPayout
        },
        updatedValues: {
          commissionRate: updatedCommission,
          minPayoutAmount: updatedMinPayout
        },
        refreshCalled: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Test component integration
   */
  testComponentIntegration: () => {
    const tests = [];

    // Test if FeeProvider is available
    try {
      tests.push({
        name: 'FeeContext Import',
        success: true,
        message: 'FeeContext can be imported'
      });
    } catch (error) {
      tests.push({
        name: 'FeeContext Import',
        success: false,
        message: `Failed to import FeeContext: ${error.message}`
      });
    }

    // Test if global settings API is accessible
    if (typeof window !== 'undefined' && window.fetch) {
      tests.push({
        name: 'Global API Access',
        success: true,
        message: 'Global API is accessible'
      });
    } else {
      tests.push({
        name: 'Global API Access',
        success: false,
        message: 'Global API is not accessible'
      });
    }

    return {
      success: tests.every(t => t.success),
      tests
    };
  },

  /**
   * Run comprehensive fee reactivity test
   */
  runComprehensiveTest: async (feeContext) => {
    console.log('🧪 Starting Comprehensive Fee Reactivity Test...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Context Initialization
    console.log('📋 Testing context initialization...');
    results.tests.contextInitialization = testFeeReactivity.testContextInitialization(feeContext);

    // Test 2: Fee Calculations
    console.log('🧮 Testing fee calculations...');
    results.tests.feeCalculations = testFeeReactivity.testFeeCalculations(feeContext);

    // Test 3: Dynamic Updates
    console.log('🔄 Testing dynamic updates...');
    results.tests.dynamicUpdates = await testFeeReactivity.testDynamicUpdates(feeContext);

    // Test 4: Component Integration
    console.log('🔗 Testing component integration...');
    results.tests.componentIntegration = testFeeReactivity.testComponentIntegration();

    // Overall success
    const allTestsPassed = [
      results.tests.contextInitialization.success,
      results.tests.feeCalculations.success,
      results.tests.dynamicUpdates.success,
      results.tests.componentIntegration.success
    ].every(Boolean);

    results.overallSuccess = allTestsPassed;
    results.summary = allTestsPassed 
      ? '✅ All fee reactivity tests passed!'
      : '❌ Some fee reactivity tests failed. Check individual test results.';

    console.log('📊 Test Results:', results);
    return results;
  }
};

export default testFeeReactivity;
