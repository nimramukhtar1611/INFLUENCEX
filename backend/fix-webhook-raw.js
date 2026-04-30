// CRITICAL WEBHOOK RAW BODY FIX
// The issue is that express.json() is being called before the webhook route
// We need to ensure raw body reaches the webhook handler

const express = require('express');
const app = express();

// ⚠️ CRITICAL: Move webhook route BEFORE any JSON parsing middleware
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🚨 [WEBHOOK-RAW] Direct webhook route hit!');
  console.log('🚨 [WEBHOOK-RAW] Headers:', req.headers);
  console.log('🚨 [WEBHOOK-RAW] Body type:', Buffer.isBuffer(req.body) ? 'RAW BUFFER' : 'PARSED JSON');
  console.log('🚨 [WEBHOOK-RAW] Body length:', req.body ? req.body.length : 'NULL');
  
  // Simple success response
  res.json({ 
    received: true, 
    processed: true, 
    timestamp: new Date().toISOString()
  });
});

// All other routes with JSON parsing
app.use(express.json());

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`🧪 Test webhook at: http://localhost:${PORT}/api/payments/webhook`);
});
