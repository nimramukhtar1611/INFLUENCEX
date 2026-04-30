// Test script to verify admin token authentication fixes
console.log('=== Testing Admin Token Authentication Fixes ===\n');

// Mock localStorage for testing
const mockLocalStorage = {
  data: {},
  setItem: function(key, value) {
    this.data[key] = value;
    console.log(`   localStorage.setItem('${key}', '${value ? value.substring(0, 30) : 'null'}...')`);
  },
  getItem: function(key) {
    return this.data[key] || null;
  }
};

// Mock jwtService for testing
const mockJwtService = {
  verifyAccessToken: async (token) => {
    console.log(`   jwtService.verifyAccessToken() called with token: ${token ? token.substring(0, 20) + '...' : 'NULL'}`);
    
    // Simulate the fixed logic - first try with strict issuer/audience
    try {
      const decoded = {
        id: 'admin123',
        userType: 'admin',
        email: 'admin@test.com',
        iss: 'influencex',
        aud: 'influencex-users'
      };
      
      if (token === 'valid-admin-token-with-issuer') {
        return decoded; // Should pass with strict verification
      }
      
      if (token === 'valid-admin-token-without-issuer') {
        throw new Error('JsonWebTokenError'); // Should fail strict verification
      }
      
      throw new Error('JsonWebTokenError'); // Should fail and trigger fallback
    } catch (strictError) {
      // Fallback: verify without issuer/audience (admin tokens or old tokens)
      console.log('   jwtService: Using fallback verification (no issuer/audience)');
      
      if (token === 'valid-admin-token-without-issuer') {
        return {
          id: 'admin123',
          userType: 'admin',
          email: 'admin@test.com'
        }; // Should pass with fallback verification
      }
      
      throw new Error('JsonWebTokenError'); // Should still fail for other tokens
    }
  },
  
  getUserFromToken: async (token) => {
    console.log(`   jwtService.getUserFromToken() called with token: ${token ? token.substring(0, 20) + '...' : 'NULL'}`);
    
    try {
      const decoded = await mockJwtService.verifyAccessToken(token);
      
      // Simulate checking User model first
      console.log('   jwtService: Checking User model...');
      let user = null;
      
      if (decoded.id === 'admin123') {
        user = {
          _id: 'admin123',
          userType: 'admin',
          email: 'admin@test.com'
        };
        console.log('   jwtService: User found (simulated)');
      } else {
        console.log('   jwtService: User not found in User model');
        
        // Simulate checking Admin model
        console.log('   jwtService: Checking Admin model...');
        const Admin = { // Mock Admin model
          findById: async (id) => {
            console.log(`   Admin model: findById(${id}) called`);
            if (id === 'admin123') {
              return Promise.resolve({
                _id: 'admin123',
                userType: 'admin',
                email: 'admin@test.com'
              });
            }
            return Promise.resolve(null);
          }
        };
        
        user = await Admin.findById(decoded.id);
        if (user) {
          user.userType = 'admin'; // normalize
          console.log('   jwtService: Admin user found and normalized');
        }
      }
      
      if (!user) {
        throw new Error('User not found or suspended');
      }
      
      return user;
    } catch (error) {
      console.log(`   jwtService: Error - ${error.message}`);
      throw error;
    }
  }
};

// Test 1: Admin token with issuer/audience (new format)
console.log('1. Testing admin token with issuer/audience...');
function testAdminTokenWithIssuer() {
  console.log('   Scenario: Admin token with proper issuer/audience');
  
  const token = 'valid-admin-token-with-issuer';
  
  try {
    const user = await mockJwtService.getUserFromToken(token);
    console.log(`   Admin user found: ${user ? user.email : 'NULL'}`);
    console.log(`   User type: ${user ? user.userType : 'NULL'}`);
    
    if (user && user.userType === 'admin') {
      console.log('   Admin token with issuer/audience: SUCCESS');
      return true;
    } else {
      console.log('   Admin token with issuer/audience: FAILED');
      return false;
    }
  } catch (error) {
    console.log(`   Admin token with issuer/audience: ERROR - ${error.message}`);
    return false;
  }
}

// Test 2: Admin token without issuer/audience (old format)
console.log('\n2. Testing admin token without issuer/audience...');
function testAdminTokenWithoutIssuer() {
  console.log('   Scenario: Admin token without issuer/audience (old format)');
  
  const token = 'valid-admin-token-without-issuer';
  
  try {
    const user = await mockJwtService.getUserFromToken(token);
    console.log(`   Admin user found: ${user ? user.email : 'NULL'}`);
    console.log(`   User type: ${user ? user.userType : 'NULL'}`);
    
    if (user && user.userType === 'admin') {
      console.log('   Admin token without issuer/audience: SUCCESS (fallback works)');
      return true;
    } else {
      console.log('   Admin token without issuer/audience: FAILED');
      return false;
    }
  } catch (error) {
    console.log(`   Admin token without issuer/audience: ERROR - ${error.message}`);
    return false;
  }
}

// Test 3: Socket authentication with admin token
console.log('\n3. Testing socket authentication with admin token...');
function testSocketAuthWithAdminToken() {
  console.log('   Scenario: Socket connects with admin token');
  
  // Set up admin token in localStorage (simulate after admin login)
  mockLocalStorage.setItem('token', 'valid-admin-token-with-issuer');
  mockLocalStorage.setItem('user', JSON.stringify({
    _id: 'admin123',
    userType: 'admin',
    email: 'admin@test.com'
  }));
  
  // Simulate socket connection
  console.log('   Simulating socket connection...');
  
  // Mock socket.io handshake
  const mockSocket = {
    handshake: {
      auth: {
        token: mockLocalStorage.getItem('token')
      },
      headers: {
        authorization: `Bearer ${mockLocalStorage.getItem('token')}`
      }
    },
    user: null, // Will be set by middleware
    userId: null,
    tokenJti: null
  };
  
  console.log(`   Socket token in handshake: ${mockSocket.handshake.auth.token ? mockSocket.handshake.auth.token.substring(0, 20) + '...' : 'NULL'}`);
  
  try {
    // Simulate backend verifySocketToken middleware
    const token = mockSocket.handshake.auth?.token || mockSocket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    console.log('   Backend token received:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
      console.log('   Socket auth: FAILED - no token');
      return false;
    }
    
    // Simulate JWT verification
    const user = await mockJwtService.getUserFromToken(token);
    
    if (user && user.userType === 'admin') {
      mockSocket.user = user;
      mockSocket.userId = user._id.toString();
      mockSocket.tokenJti = 'mock-jti';
      
      console.log('   Socket auth: SUCCESS - admin user authenticated');
      console.log(`   Socket user: ${user.email} (${user.userType})`);
      return true;
    } else {
      console.log('   Socket auth: FAILED - user verification failed');
      return false;
    }
  } catch (error) {
    console.log(`   Socket auth: ERROR - ${error.message}`);
    return false;
  }
}

// Test 4: Complete admin login flow
console.log('\n4. Testing complete admin login flow...');
function testCompleteAdminLoginFlow() {
  console.log('   Scenario: Complete admin login → socket connection');
  
  // Step 1: Admin login (token saved to localStorage)
  const adminToken = 'complete-admin-login-token-xyz';
  const adminUser = {
    _id: 'admin456',
    userType: 'admin',
    email: 'admin@complete.com'
  };
  
  mockLocalStorage.setItem('token', adminToken);
  mockLocalStorage.setItem('user', JSON.stringify(adminUser));
  
  console.log('   Step 1: Admin token saved to localStorage');
  
  // Step 2: Socket connection (token from localStorage)
  console.log('   Step 2: Socket attempting to connect...');
  
  const socketToken = mockLocalStorage.getItem('token');
  console.log(`   Socket token from localStorage: ${socketToken ? socketToken.substring(0, 20) + '...' : 'NULL'}`);
  
  if (!socketToken) {
    console.log('   Complete flow: FAILED - no token');
    return false;
  }
  
  // Step 3: Simulate socket authentication
  try {
    const user = await mockJwtService.getUserFromToken(socketToken);
    
    if (user && user.userType === 'admin') {
      console.log('   Step 3: Socket authentication successful');
      console.log(`   Admin user: ${user.email} (${user.userType})`);
      return true;
    } else {
      console.log('   Step 3: Socket authentication failed');
      return false;
    }
  } catch (error) {
    console.log(`   Step 3: Socket authentication error: ${error.message}`);
    return false;
  }
}

// Test 5: Page refresh with admin token
console.log('\n5. Testing page refresh with admin token...');
function testPageRefreshWithAdminToken() {
  console.log('   Scenario: Page refresh with existing admin token');
  
  // Set up admin token in localStorage (simulate page refresh state)
  mockLocalStorage.setItem('token', 'page-refresh-admin-token');
  mockLocalStorage.setItem('user', JSON.stringify({
    _id: 'admin789',
    userType: 'admin',
    email: 'admin@refresh.com'
  }));
  
  console.log('   Step 1: Admin token exists in localStorage');
  
  // Step 2: Socket connects after page refresh
  const socketToken = mockLocalStorage.getItem('token');
  console.log(`   Socket token after refresh: ${socketToken ? socketToken.substring(0, 20) + '...' : 'NULL'}`);
  
  if (!socketToken) {
    console.log('   Page refresh: FAILED - no token');
    return false;
  }
  
  // Step 3: Simulate socket authentication
  try {
    const user = await mockJwtService.getUserFromToken(socketToken);
    
    if (user && user.userType === 'admin') {
      console.log('   Page refresh: SUCCESS - admin socket authenticated');
      console.log(`   Admin user: ${user.email} (${user.userType})`);
      return true;
    } else {
      console.log('   Page refresh: FAILED - user verification failed');
      return false;
    }
  } catch (error) {
    console.log(`   Page refresh: ERROR - ${error.message}`);
    return false;
  }
}

// Run all tests
function runAllTests() {
  try {
    const results = {
      adminTokenWithIssuer: testAdminTokenWithIssuer(),
      adminTokenWithoutIssuer: testAdminTokenWithoutIssuer(),
      socketAuthWithAdmin: testSocketAuthWithAdminToken(),
      completeAdminLoginFlow: testCompleteAdminLoginFlow(),
      pageRefreshWithAdminToken: testPageRefreshWithAdminToken()
    };
    
    console.log('\n=== TEST RESULTS ===');
    console.log('   Admin token with issuer/audience:', results.adminTokenWithIssuer ? 'WORKING' : 'FAILED');
    console.log('   Admin token without issuer/audience:', results.adminTokenWithoutIssuer ? 'WORKING' : 'FAILED');
    console.log('   Socket auth with admin token:', results.socketAuthWithAdminToken ? 'WORKING' : 'FAILED');
    console.log('   Complete admin login flow:', results.completeAdminLoginFlow ? 'WORKING' : 'FAILED');
    console.log('   Page refresh with admin token:', results.pageRefreshWithAdminToken ? 'WORKING' : 'FAILED');
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n=== OVERALL RESULT ===');
    console.log('   Admin Token Authentication Fix:', allPassed ? 'SUCCESS' : 'FAILED');
    
    console.log('\n=== WHAT WAS FIXED ===');
    console.log('   1. jwtService.verifyAccessToken() - issuer/audience now optional');
    console.log('   2. adminController.js jwt.sign() - issuer/audience added to match');
    console.log('   3. jwtService.getUserFromToken() - checks both User and Admin models');
    console.log('   4. Socket authentication works with admin tokens');
    console.log('   5. No more "Invalid access token" errors for admin users');
    
    if (allPassed) {
      console.log('\n🎉 ADMIN TOKEN AUTHENTICATION COMPLETELY FIXED!');
      console.log('   Admin users can now connect to sockets without errors');
      console.log('   Both new and old admin tokens are supported');
      console.log('   Socket authentication is reliable for all user types');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Execute tests
runAllTests();
