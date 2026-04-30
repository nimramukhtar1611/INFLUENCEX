// Test Cloudinary storage directly
require('dotenv').config();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

console.log('🔍 Testing Cloudinary Storage Directly...\n');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test Cloudinary storage configuration
try {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'profiles',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname).substring(1);
        return `test_${timestamp}_${randomString}.${ext}`;
      },
      resource_type: 'auto'
    }
  });

  console.log('✅ Cloudinary storage configured successfully');

  const upload = multer({ storage: storage });
  console.log('✅ Multer with Cloudinary storage created');

  // Create a mock request and response to test the storage
  const mockReq = {
    body: { type: 'profile' }
  };

  const mockFile = {
    fieldname: 'profilePicture',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1000,
    buffer: Buffer.from('fake image data')
  };

  console.log('\n🔍 Testing file processing...');
  
  // Test the storage directly
  storage.getDestination(mockReq, mockFile, (err, destination) => {
    if (err) {
      console.error('❌ Storage error:', err);
      return;
    }
    console.log('✅ Destination:', destination);
  });

} catch (error) {
  console.error('❌ Cloudinary storage test failed:', error.message);
  console.error('Stack:', error.stack);
}
