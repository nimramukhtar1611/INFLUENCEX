// INFLUENCEX/backend/test-balance-breakdown.js
const mongoose = require('mongoose');
const path = require('path');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Payment = require('./models/Payment');

async function checkBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const userId = '69de56b3bd8342bbb19ffe49';
    const normalizedUserId = new mongoose.Types.ObjectId(userId);

    console.log(`💰 Analyzing balance for User: ${userId}\n`);

    // 1. Check all completed deposits
    const deposits = await Payment.find({
      $or: [{ 'from.userId': normalizedUserId }, { 'from.userId': userId }],
      $or: [{ 'to.userId': normalizedUserId }, { 'to.userId': userId }],
      status: 'completed',
      type: 'payment',
      'metadata.kind': 'deposit'
    });

    console.log(`📥 Found ${deposits.length} Completed Deposits:`);
    let totalDeposits = 0;
    deposits.forEach(p => {
      console.log(`   - ${p.createdAt.toISOString()}: $${p.amount} (ID: ${p._id})`);
      totalDeposits += p.amount;
    });
    console.log(`   TOTAL DEPOSITS: $${totalDeposits}`);

    // 2. Check for "other" types that might be deposits but have wrong type/metadata
    const others = await Payment.find({
        $or: [{ 'from.userId': normalizedUserId }, { 'from.userId': userId }],
        $or: [{ 'to.userId': normalizedUserId }, { 'to.userId': userId }],
        status: 'completed',
        $or: [
            { type: 'deposit' },
            { 'metadata.purpose': 'wallet_topup' }
        ]
    });
    
    if (others.length > 0) {
        console.log(`\n⚠️ Found ${others.length} payments that might be missing from balance due to type mismatch:`);
        others.forEach(p => {
            if (!deposits.find(d => d._id.equals(p._id))) {
                console.log(`   - ${p.createdAt.toISOString()}: $${p.amount} (Type: ${p.type}, Kind: ${p.metadata?.kind}, ID: ${p._id})`);
            }
        });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkBalance();
