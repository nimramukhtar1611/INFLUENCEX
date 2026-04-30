// Test webhook endpoint directly to see if it's reachable
const http = require('http');

const webhookPayload = {
  type: 'checkout.session.completed',
  id: 'evt_test_' + Date.now(),
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_direct_123',
      mode: 'subscription',
      customer: 'cus_test_direct_123',
      subscription: 'sub_test_direct_123',
      amount_total: 14900,
      currency: 'usd',
      metadata: {
        userId: '507f1f77bcf86cd799439011',
        userType: 'brand',
        planId: 'professional',
        interval: 'month'
      }
    }
  }
};

const webhookSignature = 'test_signature_' + Date.now();

const postData = JSON.stringify(webhookPayload);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/payments/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'stripe-signature': webhookSignature
  }
};

console.log('🧪 Testing webhook endpoint directly...');
console.log('🧪 Sending to: http://localhost:5000/api/payments/webhook');
console.log('🧪 Payload:', JSON.stringify(webhookPayload, null, 2));

const req = http.request(options, (res) => {
  console.log('🧪 Response status:', res.statusCode);
  console.log('🧪 Response headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('🧪 Response body:', data);
    try {
      const response = JSON.parse(data);
      console.log('🧪 Parsed response:', response);
    } catch (e) {
      console.log('🧪 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('🧪 Request error:', e.message);
});

req.write(postData);
req.end();

console.log('🧪 Webhook test sent! Check terminal for emergency logging...');
