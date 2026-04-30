// Test script to verify auto-detection login flow works for both brands and creators
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data - replace with actual test user credentials
const testUsers = [
  {
    email: 'brand@test.com',
    password: 'password123',
    expectedType: 'brand'
  },
  {
    email: 'creator@test.com', 
    password: 'password123',
    expectedType: 'creator'
  }
];

async function testAutoLogin() {
  console.log('Testing auto-detection login flow...\n');
  
  for (const testUser of testUsers) {
    try {
      console.log(`Testing login for: ${testUser.email} (expected: ${testUser.expectedType})`);
      
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      
      if (response.data.success) {
        const actualType = response.data.user.userType || response.data.user.role;
        console.log(`  Success! User type detected: ${actualType}`);
        
        if (actualType === testUser.expectedType) {
          console.log(`  Correctly identified as ${actualType}!`);
        } else {
          console.log(`  Warning: Expected ${testUser.expectedType}, got ${actualType}`);
        }
        
        // Test redirection logic
        let expectedRedirect = '';
        if (actualType === 'brand') {
          expectedRedirect = '/brand/dashboard';
        } else if (actualType === 'creator') {
          expectedRedirect = '/creator/dashboard';
        } else if (actualType === 'admin') {
          expectedRedirect = '/admin/dashboard';
        }
        
        console.log(`  Expected redirect: ${expectedRedirect}`);
      } else {
        console.log(`  Login failed: ${response.data.error}`);
      }
    } catch (error) {
      console.log(`  Error: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('---');
  }
}

async function testInvalidCredentials() {
  console.log('\nTesting invalid credentials...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    });
    
    console.log('  Unexpected success with invalid credentials');
  } catch (error) {
    console.log(`  Correctly rejected: ${error.response?.data?.error || error.message}`);
  }
}

async function main() {
  try {
    await testAutoLogin();
    await testInvalidCredentials();
    console.log('\nAuto-detection login flow test completed!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

main();
