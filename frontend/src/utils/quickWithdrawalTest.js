// Quick test to verify withdrawal fee fix
import adminService from '../services/adminService';

export const quickWithdrawalTest = async () => {
  console.log('🧪 Quick Withdrawal Fee Test');
  
  try {
    
    // Test 1: Set withdrawal fee to a specific value
    const testValue = 42.50;
    console.log(`📝 Setting withdrawal fee to: $${testValue}`);
    
    const updateResponse = await adminService.updateSettings({ withdrawalFee: testValue });
    console.log('✅ Update response:', updateResponse);
    
    // Test 2: Verify the value was saved
    console.log('🔍 Verifying saved value...');
    const getResponse = await adminService.getSettings();
    console.log('📊 Get response:', getResponse);
    
    const savedValue = getResponse?.settings?.withdrawalFee;
    const success = savedValue === testValue;
    
    console.log(`💰 Expected: $${testValue}, Got: $${savedValue}`);
    console.log(success ? '✅ SUCCESS: Withdrawal fee saved correctly!' : '❌ FAILED: Withdrawal fee not saved correctly');
    
    return {
      success,
      expected: testValue,
      actual: savedValue,
      updateResponse,
      getResponse
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default quickWithdrawalTest;
