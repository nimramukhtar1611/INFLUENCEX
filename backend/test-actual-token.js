/**
 * Test Actual Token from Frontend
 * This test checks if the token stored in localStorage is valid
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const jwt = require('jsonwebtoken');

console.log('🔍 Testing Actual Token from Frontend');
console.log('================================');

// Simulate checking a token that might be stored in localStorage
// This would be the actual token from the frontend

// Test cases for common token issues
const testCases = [
  {
    name: 'Valid token',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QxMjMiLCJ1c2VyVHlwZSI6ImJyYW5kIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzc3MzU4Nzg1LCJleHAiOjE3Nzc5NjM1ODV9.invalid'
  },
  {
    name: 'Token with wrong secret',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QxMjMiLCJ1c2VyVHlwZSI6ImJyYW5kIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzc3MzU4Nzg1LCJleHAiOjE3Nzc5NjM1ODV9.signature'
  },
  {
    name: 'Malformed token',
    token: 'invalid.token.format'
  },
  {
    name: 'Empty token',
    token: ''
  },
  {
    name: 'Null token',
    token: null
  }
];

// Test each case
testCases.forEach(testCase => {
  console.log(`\n📋 Testing: ${testCase.name}`);
  
  if (!testCase.token) {
    console.log('❌ No token provided');
    return;
  }
  
  try {
    // First try to decode (without verification)
    const decoded = jwt.decode(testCase.token);
    if (decoded) {
      console.log('✅ Token decoded successfully');
      console.log('Payload:', decoded);
    } else {
      console.log('❌ Token could not be decoded');
      return;
    }
    
    // Then try to verify
    const verified = jwt.verify(testCase.token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully');
    console.log('Verified payload:', verified);
    
  } catch (error) {
    console.log(`❌ Token verification failed: ${error.name}`);
    console.log(`Error message: ${error.message}`);
  }
});

console.log('\n🎯 Common Issues to Check:');
console.log('1. Is the token being sent from frontend?');
console.log('2. Is the token format correct (3 parts separated by dots)?');
console.log('3. Is the token expired?');
console.log('4. Is the token signed with the correct secret?');
console.log('5. Is the Authorization header formatted correctly?');

console.log('\n📝 Debugging Steps:');
console.log('1. Check browser console for "Token being sent:" logs');
console.log('2. Check backend console for "Auth middleware - verifying token:" logs');
console.log('3. Check if localStorage.getItem("token") returns a valid token');
console.log('4. Check if the token has the correct Bearer prefix');
