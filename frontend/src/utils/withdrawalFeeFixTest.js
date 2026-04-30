// Test to verify withdrawalFee persistence fix
import adminService from '../services/adminService';

export const testWithdrawalFeeFix = {
  /**
   * Test the complete withdrawal fee persistence flow
   */
  async testPersistenceFlow() {
    console.log('🧪 Testing Withdrawal Fee Persistence Fix...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      overallSuccess: false
    };

    try {

      // Test 1: Get current withdrawal fee
      console.log('📊 Step 1: Getting current withdrawal fee...');
      const currentResponse = await adminService.getSettings();
      const currentFee = currentResponse?.settings?.withdrawalFee || 0;
      results.tests.getCurrentFee = {
        success: currentResponse?.success === true,
        currentFee: currentFee,
        note: `Current fee: $${currentFee}`
      };

      // Test 2: Update withdrawal fee to test value
      console.log('✏️ Step 2: Updating withdrawal fee...');
      const testFee = 25.50;
      const updateResponse = await adminService.updateSettings({ withdrawalFee: testFee });
      
      results.tests.updateFee = {
        success: updateResponse?.success === true,
        requestValue: testFee,
        responseValue: updateResponse?.settings?.withdrawalFee,
        matchesExpected: updateResponse?.settings?.withdrawalFee === testFee,
        note: updateResponse?.settings?.withdrawalFee === testFee 
          ? '✅ Update successful and response matches'
          : '❌ Response mismatch detected'
      };

      // Test 3: Verify persistence by fetching again
      console.log('🔍 Step 3: Verifying persistence...');
      const verifyResponse = await adminService.getSettings();
      const persistedFee = verifyResponse?.settings?.withdrawalFee || 0;
      
      results.tests.verifyPersistence = {
        success: persistedFee === testFee,
        expectedValue: testFee,
        actualValue: persistedFee,
        note: persistedFee === testFee 
          ? '✅ Persistence verified'
          : '❌ Persistence failed'
      };

      // Test 4: Test multiple rapid updates
      console.log('⚡ Step 4: Testing rapid updates...');
      const rapidTests = [10.25, 15.75, 30.00];
      let rapidSuccess = true;
      
      for (const fee of rapidTests) {
        const rapidUpdate = await adminService.updateSettings({ withdrawalFee: fee });
        const rapidVerify = await adminService.getSettings();
        
        if (rapidVerify?.settings?.withdrawalFee !== fee) {
          rapidSuccess = false;
          break;
        }
      }
      
      results.tests.rapidUpdates = {
        success: rapidSuccess,
        testValues: rapidTests,
        note: rapidSuccess ? '✅ All rapid updates successful' : '❌ Rapid updates failed'
      };

      // Test 5: Reset to original value
      console.log('🔄 Step 5: Resetting to original value...');
      const resetResponse = await adminService.updateSettings({ withdrawalFee: currentFee });
      const resetVerify = await adminService.getSettings();
      
      results.tests.resetToOriginal = {
        success: resetVerify?.settings?.withdrawalFee === currentFee,
        originalValue: currentFee,
        finalValue: resetVerify?.settings?.withdrawalFee,
        note: resetVerify?.settings?.withdrawalFee === currentFee 
          ? '✅ Reset successful'
          : '❌ Reset failed'
      };

      // Calculate overall success
      const testResults = Object.values(results.tests);
      results.overallSuccess = testResults.every(test => test.success);

      results.summary = results.overallSuccess 
        ? '✅ Withdrawal Fee Persistence Fix SUCCESSFUL!'
        : '❌ Withdrawal Fee Persistence Fix has issues.';

    } catch (error) {
      results.error = error.message;
      results.summary = `❌ Test failed with error: ${error.message}`;
    }

    console.log('📊 Withdrawal Fee Fix Test Results:', results);
    return results;
  },

  /**
   * Test edge cases and boundary conditions
   */
  async testEdgeCases() {
    console.log('🎯 Testing Withdrawal Fee Edge Cases...');
    
    const results = {
      timestamp: new Date().toISOString(),
      edgeCases: {},
      overallSuccess: false
    };

    try {

      // Edge Case 1: Zero value
      console.log('0️⃣ Testing zero value...');
      const zeroResponse = await adminService.updateSettings({ withdrawalFee: 0 });
      const zeroVerify = await adminService.getSettings();
      
      results.edgeCases.zeroValue = {
        success: zeroVerify?.settings?.withdrawalFee === 0,
        expected: 0,
        actual: zeroVerify?.settings?.withdrawalFee
      };

      // Edge Case 2: Decimal values
      console.log('🔢 Testing decimal values...');
      const decimalResponse = await adminService.updateSettings({ withdrawalFee: 12.3456 });
      const decimalVerify = await adminService.getSettings();
      
      results.edgeCases.decimalValue = {
        success: Math.abs((decimalVerify?.settings?.withdrawalFee || 0) - 12.35) < 0.01,
        expected: 12.35,
        actual: decimalVerify?.settings?.withdrawalFee
      };

      // Edge Case 3: Large value
      console.log('💰 Testing large value...');
      const largeResponse = await adminService.updateSettings({ withdrawalFee: 999.99 });
      const largeVerify = await adminService.getSettings();
      
      results.edgeCases.largeValue = {
        success: largeVerify?.settings?.withdrawalFee === 999.99,
        expected: 999.99,
        actual: largeVerify?.settings?.withdrawalFee
      };

      // Reset to safe value
      await adminService.updateSettings({ withdrawalFee: 0 });

      const edgeCaseResults = Object.values(results.edgeCases);
      results.overallSuccess = edgeCaseResults.every(test => test.success);

      results.summary = results.overallSuccess 
        ? '✅ All edge cases passed!'
        : '❌ Some edge cases failed.';

    } catch (error) {
      results.error = error.message;
      results.summary = `❌ Edge case test failed: ${error.message}`;
    }

    console.log('🎯 Edge Case Test Results:', results);
    return results;
  }
};

export default testWithdrawalFeeFix;
