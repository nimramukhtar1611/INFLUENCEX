const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

/**
 * Seed Brand User and Profile
 */
const seedBrandUser = async () => {
  const password = await hashPassword('SecureBrand2024!');
  
  // 1. Create Base User
  const user = new User({
    email: 'sarah.chen@techcorp.io',
    password: password,
    userType: 'brand',
    fullName: 'Sarah Chen',
    status: 'active',
    emailVerified: true,
    isVerified: true
  });

  // 2. Create Brand Profile (Discriminator)
  const brand = new Brand({
    ...user.toObject(),
    brandName: 'TechCorp Solutions',
    industry: 'Technology',
    website: 'https://techcorp.io',
    description: 'Leading provider of enterprise AI and cloud solutions.',
    employees: '201-500',
    businessType: 'corporation',
    address: {
      city: 'San Francisco',
      country: 'USA'
    }
  });

  await brand.save();
  return { user, brand };
};

/**
 * Seed Creator User and Profile
 */
const seedCreatorUser = async () => {
  const password = await hashPassword('CreativePass2024!');
  
  // 1. Create Base User
  const user = new User({
    email: 'alex.rivera@creator.com',
    password: password,
    userType: 'creator',
    fullName: 'Alex Rivera',
    status: 'active',
    emailVerified: true,
    isVerified: true
  });

  // 2. Create Creator Profile (Discriminator)
  const creator = new Creator({
    ...user.toObject(),
    displayName: 'Alex Rivera',
    handle: 'alexrivera_tech',
    bio: 'Tech enthusiast and digital creator sharing the latest in gadgetry and software.',
    niches: ['Tech', 'Lifestyle', 'Gaming'],
    primaryPlatform: 'instagram',
    totalFollowers: 125000,
    averageEngagement: 4.5,
    socialMedia: {
      instagram: {
        handle: 'alexrivera_tech',
        followers: 125000,
        engagement: 4.5
      }
    }
  });

  await creator.save();
  return { user, creator };
};

/**
 * Master Seed Function
 */
const seedAll = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/influencex';
    await mongoose.connect(uri);
    
    console.log('Cleaning existing users...');
    await User.deleteMany({ email: { $in: ['sarah.chen@techcorp.io', 'alex.rivera@creator.com'] } });

    console.log('Seeding Brand...');
    const brandData = await seedBrandUser();
    console.log(`✅ Seeded Brand: ${brandData.brand.brandName}`);

    console.log('Seeding Creator...');
    const creatorData = await seedCreatorUser();
    console.log(`✅ Seeded Creator: ${creatorData.creator.displayName}`);

    await mongoose.disconnect();
    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

module.exports = {
  seedAll,
  seedBrandUser,
  seedCreatorUser,
  // Add stubs for other functions expected by run-seed.js
  seedCampaigns: async () => [],
  seedDeals: async () => [],
  seedPayments: async () => [],
  seedNotifications: async () => [],
  seedActivityLogs: async () => [],
  seedAnalytics: async () => [],
  seedSocialAccounts: async () => [],
  seedConversations: async () => []
};
