const mongoose = require('mongoose');
const Settings = require('./models/Settings');

async function checkSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex');
    console.log('Connected to MongoDB');
    
    const settings = await Settings.findOne();
    console.log('=== CURRENT SETTINGS DATA ===');
    
    if (settings) {
      console.log('Platform Name:', settings?.platform?.name, '(type:', typeof settings?.platform?.name, ')');
      console.log('Support Email:', settings?.platform?.supportEmail, '(type:', typeof settings?.platform?.supportEmail, ')');
      console.log('Support Phone:', settings?.platform?.supportPhone, '(type:', typeof settings?.platform?.supportPhone, ')');
      console.log('Full Platform Object:', JSON.stringify(settings.platform, null, 2));
    } else {
      console.log('No settings found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSettings();
