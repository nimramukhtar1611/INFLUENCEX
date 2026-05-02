// INFLUENCEX/backend/seed-users-custom.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('node:dns/promises').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Brand = require('./models/Brand');
const Creator = require('./models/Creator');

async function seed() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const password = await bcrypt.hash('Password123!', 12);

    const usersToSeed = [
      {
        email: 'brand1@test.com',
        fullName: 'Tech Brand One',
        userType: 'brand',
        brandName: 'Global Tech 1',
        industry: 'Technology'
      },
      {
        email: 'brand2@test.com',
        fullName: 'Fashion Brand Two',
        userType: 'brand',
        brandName: 'Style Fashion 2',
        industry: 'Fashion'
      },
      {
        email: 'creator1@test.com',
        fullName: 'Alex Creator',
        userType: 'creator',
        displayName: 'Alex Gadgets',
        handle: 'alex_gadgets'
      },
      {
        email: 'creator2@test.com',
        fullName: 'Maria Style',
        userType: 'creator',
        displayName: 'Maria Fashion',
        handle: 'maria_style'
      }
    ];

    for (const data of usersToSeed) {
      console.log(`\n🌱 Seeding ${data.email}...`);
      
      // Clean existing
      await User.deleteMany({ email: data.email });

      if (data.userType === 'brand') {
        await Brand.create({
          ...data,
          password,
          status: 'active',
          emailVerified: true,
          isVerified: true
        });
      } else {
        await Creator.create({
          ...data,
          password,
          status: 'active',
          emailVerified: true,
          isVerified: true
        });
      }
      console.log(`✅ Success`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 Seeding complete!');
    console.log('🔑 Password for all: Password123!');
  } catch (err) {
    console.error('💥 Seeding error:', err);
    process.exit(1);
  }
}

seed();
