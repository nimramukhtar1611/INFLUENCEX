// Direct test of sync controller
require('dotenv').config();
const stripeSyncController = require('./controllers/admin/stripeSyncController');

async function testSync() {
  console.log('🧪 Testing sync controller directly...');
  
  try {
    // Mock admin user for testing
    const mockReq = {
      user: {
        _id: '507f1f77bcf86cd799439011',
        userType: 'admin'
      }
    };
    
    const mockRes = {
      json: (data) => {
        console.log('🧪 Sync response:', JSON.stringify(data, null, 2));
      },
      status: (code) => {
        console.log('🧪 Sync status:', code);
      }
    };
    
    console.log('🧪 Calling full sync...');
    await stripeSyncController.fullSync(mockReq, mockRes);
    
  } catch (error) {
    console.error('🧪 Sync test failed:', error.message);
  }
}

testSync();
