// Script to activate all existing users (one-time fix)
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User');

async function activateAllUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all users with isActive: false or undefined
    const usersToActivate = await User.find({
      $or: [
        { isActive: false },
        { isActive: { $exists: false } },
        { isActive: null }
      ]
    });

    console.log(`Found ${usersToActivate.length} users to activate`);

    if (usersToActivate.length === 0) {
      console.log('✅ All users are already active!');
      return;
    }

    // Activate all users
    for (const user of usersToActivate) {
      const previousStatus = user.isActive;
      user.isActive = true;
      await user.save();
      
      console.log(`✅ Activated user: ${user.email} (was: ${previousStatus})`);
    }

    console.log('\n🎉 All users have been activated successfully!');
    console.log('The login deactivation issue should now be resolved.');

  } catch (error) {
    console.error('❌ Error activating users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  activateAllUsers();
}

module.exports = activateAllUsers;
