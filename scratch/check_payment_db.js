const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Payment = require('../backend/models/Payment');
const User = require('../backend/models/User');

async function checkPayment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const sessionId = 'cs_test_a1oPfz1O5YuX25nlmqtydW97ftnlQ7QQVaF6W8WLla9GYxXUrigNzi0Tbc';
    const payment = await Payment.findOne({ 'metadata.checkoutSessionId': sessionId });

    if (payment) {
      console.log('✅ Payment record FOUND:');
      console.log(JSON.stringify(payment, null, 2));
      
      const user = await User.findById(payment.from.userId);
      console.log('👤 Linked User:', user ? user.email : 'NOT FOUND');
    } else {
      console.log('❌ Payment record NOT FOUND for session:', sessionId);
      
      // Check if any payments exist
      const count = await Payment.countDocuments();
      console.log('📊 Total payment records in DB:', count);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkPayment();
