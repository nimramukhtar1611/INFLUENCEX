// Test database connectivity
const mongoose = require('mongoose');

async function testDatabase() {
  console.log('🔍 Testing Database Connectivity...\n');

  const MONGODB_URI = 'mongodb://localhost:27017/influencex';

  try {
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    console.log('✅ MongoDB connected successfully');

    // Test database operations
    console.log('\n2. Testing database operations...');
    const db = mongoose.connection.db;
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('✅ Collections found:', collections.map(c => c.name));

    // Test read operation
    const userCount = await db.collection('users').countDocuments();
    console.log('✅ Users in database:', userCount);

    // Test admin collection
    const adminCount = await db.collection('admins').countDocuments();
    console.log('✅ Admins in database:', adminCount);

    console.log('\n✅ Database is working correctly!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.name === 'MongoNetworkError') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Make sure MongoDB is installed and running');
      console.log('2. Check if MongoDB service is started:');
      console.log('   - Windows: services.msc -> MongoDB');
      console.log('   - Mac: brew services start mongodb-community');
      console.log('   - Linux: sudo systemctl start mongod');
      console.log('3. Verify MongoDB is running on localhost:27017');
      console.log('4. Check if firewall is blocking MongoDB connection');
    } else if (error.name === 'MongoServerSelectionError') {
      console.log('\n💡 MongoDB server selection failed:');
      console.log('1. MongoDB might not be running');
      console.log('2. Network connectivity issues');
      console.log('3. Wrong connection string');
    }
  } finally {
    await mongoose.disconnect();
  }
}

testDatabase();
