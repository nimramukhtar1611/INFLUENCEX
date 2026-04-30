require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const { getBrandFinancials } = require('./controllers/paymentController');

async function testBalance() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const userId = '69de56b3bd8342bbb19ffe49';
  console.log(`Testing balance for user: ${userId}`);
  
  try {
    const result = await getBrandFinancials(userId);
    console.log('Balance result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Balance error:', error);
  }
  
  process.exit(0);
}

testBalance().catch(e => { console.error(e); process.exit(1); });
