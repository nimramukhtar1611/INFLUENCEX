/**
 * Test JWT Secret Consistency
 * This test checks if the JWT_SECRET is the same for signing and verification
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const jwt = require('jsonwebtoken');

console.log('🔍 JWT Secret Consistency Test');
console.log('================================');

// Check if JWT_SECRET exists
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('JWT_SECRET first 10 chars:', process.env.JWT_SECRET?.substring(0, 10));

// Test token signing and verification
const testPayload = {
  id: 'test123',
  userType: 'brand',
  email: 'test@example.com'
};

try {
  // Sign a test token
  const testToken = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log('✅ Token signed successfully');
  console.log('Token length:', testToken.length);
  console.log('Token sample:', testToken.substring(0, 50) + '...');
  
  // Verify the token immediately
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log('✅ Token verified successfully');
  console.log('Decoded payload:', decoded);
  
  // Check if payload matches
  const payloadMatches = 
    decoded.id === testPayload.id &&
    decoded.userType === testPayload.userType &&
    decoded.email === testPayload.email;
  
  if (payloadMatches) {
    console.log('✅ Payload matches original');
  } else {
    console.log('❌ Payload does not match');
    console.log('Expected:', testPayload);
    console.log('Got:', decoded);
  }
  
  // Test with wrong secret
  try {
    jwt.verify(testToken, 'wrong_secret');
    console.log('❌ Token verification should have failed with wrong secret');
  } catch (error) {
    console.log('✅ Token verification correctly failed with wrong secret');
  }
  
  console.log('\n🎉 JWT Secret Consistency Test PASSED');
  
} catch (error) {
  console.log('❌ JWT Test failed:', error.message);
  console.log('Error details:', error);
}
