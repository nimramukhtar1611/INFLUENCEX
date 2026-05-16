const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from backend directory
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

async function fixIndex() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    console.log('Please ensure the backend/.env file exists and contains MONGODB_URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    try {
      await mongoose.connection.db.collection('ratings').dropIndex('deal_id_1');
      console.log('✅ Old index dropped successfully');
    } catch (e) {
      if (e.message.includes('Index not found')) {
        console.log('ℹ️ Index does not exist, skipping...');
      } else {
        console.log('⚠️ Error dropping index:', e.message);
      }
    }
  } catch (e) {
    console.error('❌ Database connection error:', e.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixIndex();
