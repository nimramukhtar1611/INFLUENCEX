const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    
    // Find all users and their status
    const users = await User.find({}, { email: 1, fullName: 1, userType: 1, isActive: 1, status: 1, isVerified: 1 });
    
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`Email: ${user.email}, Name: ${user.fullName}, Type: ${user.userType}, Active: ${user.isActive}, Status: ${user.status}, Verified: ${user.isVerified}`);
    });
    
    if (users.length === 0) {
      console.log('No users found in database');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
