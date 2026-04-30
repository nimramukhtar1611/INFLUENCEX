require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  const db = mongoose.connection.db;
  const userId = new mongoose.Types.ObjectId('69de56b3bd8342bbb19ffe49');

  // Check what actually exists in payments collection for this user
  console.log('\n=== ALL PAYMENTS FOR THIS USER (any field) ===');
  const allPayments = await db.collection('payments').find({
    $or: [
      { 'from.userId': userId },
      { 'from.userId': '69de56b3bd8342bbb19ffe49' },
      { userId: userId },
      { userId: '69de56b3bd8342bbb19ffe49' },
      { user: userId }
    ]
  }).toArray();
  console.log('COUNT:', allPayments.length);
  console.log('DOCS:', JSON.stringify(allPayments, null, 2));

  // Show EXACT query the balance function uses
  console.log('\n=== EXACT BALANCE QUERY TEST ===');
  const balanceQuery = await db.collection('payments').find({
    'from.userId': userId,
    status: 'completed',
    type: 'payment',
    'metadata.kind': 'deposit'
  }).toArray();
  console.log('BALANCE QUERY RESULT COUNT:', balanceQuery.length);

  // Show ALL documents in payments (first 10)
  console.log('\n=== ALL PAYMENTS IN DB (first 10) ===');
  const allDocs = await db.collection('payments').find({}).limit(10).toArray();
  console.log('TOTAL IN COLLECTION:', await db.collection('payments').countDocuments());
  console.log('SAMPLE:', JSON.stringify(allDocs[0], null, 2));

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
