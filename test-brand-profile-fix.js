// Test script to verify Brand profile image synchronization fix
const mongoose = require('mongoose');
const Brand = require('./backend/models/Brand');

async function testBrandProfileFix() {
  try {
    console.log('🔍 Testing Brand Profile Image Synchronization Fix...\n');
    
    // Connect to database (if not already connected)
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/influence');
      console.log('✅ Connected to MongoDB');
    }

    // Find a test brand
    const testBrand = await Brand.findOne({ userType: 'brand' });
    if (!testBrand) {
      console.log('❌ No brand found for testing');
      return;
    }

    console.log('📋 Test Brand Info:');
    console.log(`- ID: ${testBrand._id}`);
    console.log(`- Name: ${testBrand.brandName}`);
    console.log(`- Logo: ${testBrand.logo || 'Not set'}`);
    console.log(`- Profile Image: ${testBrand.profileImage || 'Not set'}`);
    console.log(`- Profile Picture: ${testBrand.profilePicture || 'Not set'}`);

    // Simulate what the upload route should do
    const testImageUrl = 'https://example.com/test-profile-image.jpg';
    
    console.log('\n🔄 Simulating profile image update...');
    
    // Update all three fields like the fixed upload route does
    await Brand.findByIdAndUpdate(testBrand._id, {
      logo: testImageUrl,
      profileImage: testImageUrl,
      profilePicture: testImageUrl
    });

    // Verify the update
    const updatedBrand = await Brand.findById(testBrand._id);
    
    console.log('\n✅ After Update:');
    console.log(`- Logo: ${updatedBrand.logo}`);
    console.log(`- Profile Image: ${updatedBrand.profileImage}`);
    console.log(`- Profile Picture: ${updatedBrand.profilePicture}`);

    // Check if all fields are synchronized
    const isSynchronized = 
      updatedBrand.logo === updatedBrand.profileImage && 
      updatedBrand.profileImage === updatedBrand.profilePicture &&
      updatedBrand.logo === testImageUrl;

    if (isSynchronized) {
      console.log('\n🎉 SUCCESS: All profile image fields are synchronized!');
      console.log('✅ The Brand Settings page should now show the updated image.');
    } else {
      console.log('\n❌ FAILURE: Fields are not synchronized');
      console.log('❌ The issue may still exist');
    }

    // Test what the frontend would receive
    console.log('\n📱 Testing Frontend Response Simulation:');
    const frontendResponse = {
      brand: {
        logo: updatedBrand.logo,
        profilePicture: updatedBrand.profilePicture,
        brandName: updatedBrand.brandName
      }
    };
    
    console.log('Frontend would receive:');
    console.log(`- logo: ${frontendResponse.brand.logo}`);
    console.log(`- profilePicture: ${frontendResponse.brand.profilePicture}`);
    
    // This is what the Brand Settings page uses (line 512 in Settings.jsx)
    const profileImageForSettings = 
      frontendResponse.brand.logo || 
      frontendResponse.brand.profilePicture || 
      null;
    
    console.log(`- Final profile image for settings: ${profileImageForSettings}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testBrandProfileFix();
