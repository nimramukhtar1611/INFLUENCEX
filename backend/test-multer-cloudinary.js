// Test actual multer upload with Cloudinary storage
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

console.log('🔍 Testing Actual Multer Cloudinary Upload...\n');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Create Express app for testing
const app = express();

// Configure Cloudinary storage with error handling
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'test-profiles',
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
  console.log('✅ CloudinaryStorage created successfully');
} catch (error) {
  console.error('❌ Failed to create CloudinaryStorage:', error.message);
  process.exit(1);
}

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

console.log('✅ Multer configured with Cloudinary storage');

// Test upload route
app.post('/test-upload', upload.single('testFile'), (req, res) => {
  console.log('\n🔍 Upload completed. File object:');
  console.log('File properties:', Object.keys(req.file || {}));
  console.log('File:', req.file);
  
  if (req.file) {
    console.log('\n🔍 Cloudinary properties:');
    console.log('secure_url:', req.file.secure_url);
    console.log('url:', req.file.url);
    console.log('public_id:', req.file.public_id);
    console.log('folder:', req.file.folder);
    
    res.json({
      success: true,
      file: req.file,
      hasCloudinaryProps: !!(req.file.secure_url || req.file.public_id)
    });
  } else {
    res.status(400).json({ success: false, error: 'No file uploaded' });
  }
});

// Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📝 You can test with: curl -X POST -F "testFile=@test-image.png" http://localhost:5001/test-upload');
});

// Test with a simple file
setTimeout(async () => {
  try {
    const FormData = require('form-data');
    const axios = require('axios');
    
    // Create test image
    const fs = require('fs');
    const testImagePath = path.join(__dirname, 'test-upload.png');
    const imageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, imageData);
    
    console.log('\n🔍 Testing upload...');
    
    const formData = new FormData();
    formData.append('testFile', fs.createReadStream(testImagePath));
    
    const response = await axios.post(`http://localhost:${PORT}/test-upload`, formData, {
      headers: formData.getHeaders()
    });
    
    console.log('\n✅ Upload response:', response.data);
    
    // Cleanup
    fs.unlinkSync(testImagePath);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    process.exit(1);
  }
}, 1000);
