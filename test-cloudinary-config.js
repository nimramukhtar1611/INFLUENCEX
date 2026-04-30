// Test Cloudinary configuration
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('🔍 Testing Cloudinary Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

// Test Cloudinary configuration
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  console.log('\n✅ Cloudinary configured successfully');
  
  // Test connection
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error('❌ Cloudinary connection failed:', error.message);
    } else {
      console.log('✅ Cloudinary connection successful:', result);
    }
  });
  
} catch (error) {
  console.error('❌ Cloudinary configuration failed:', error.message);
}
