// Test the emergency Stripe sync endpoint
const http = require('http');

console.log('🧪 Testing Stripe sync endpoint...');

const testData = {
  email: 'testbrand@influence.com',
  password: 'password123'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('🧪 Login response:', data);
    try {
      const response = JSON.parse(data);
      if (response.success && response.token) {
        console.log('🧪 Got admin token, testing sync...');
        
        // Now test sync endpoint
        const syncOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/admin/stripe-sync/full-sync',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${response.token}`,
            'Content-Length': '0'
          }
        };
        
        const syncReq = http.request(syncOptions, (syncRes) => {
          let syncData = '';
          syncRes.on('data', (chunk) => {
            syncData += chunk;
          });
          
          syncRes.on('end', () => {
            console.log('🧪 Sync response:', syncData);
            try {
              const syncResponse = JSON.parse(syncData);
              console.log('🧪 Sync result:', syncResponse);
            } catch (e) {
              console.log('🧪 Raw sync response:', syncData);
            }
          });
        });
        
        syncReq.on('error', (e) => {
          console.error('🧪 Sync request error:', e.message);
        });
        
        syncReq.end();
      } else {
        console.log('🧪 Login failed:', response);
      }
    } catch (e) {
      console.log('🧪 Raw login response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('🧪 Login request error:', e.message);
});

req.write(postData);
req.end();
