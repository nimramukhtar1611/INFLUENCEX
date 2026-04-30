// Test upload service with real multer middleware
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });
const uploadService = require('./backend/services/uploadService');
const fs = require('fs');

async function testRealUploadService() {
  console.log('🔍 Testing Upload Service with Real Multer...\n');

  try {
    // Create a test file
    const testImagePath = path.join(__dirname, 'test-real-upload.png');
    const imageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, imageData);

    console.log('1. Created test image:', testImagePath);
    console.log('Storage type:', uploadService.storageType);

    // Simulate multer upload by using the upload middleware directly
    const mockReq = {
      body: { type: 'profile' },
      file: null
    };

    const mockRes = {};
    const next = () => {};

    // Create a mock file stream
    const fileStream = fs.createReadStream(testImagePath);
    
    // Use the upload middleware
    const upload = uploadService.single('profilePicture');
    
    // Simulate the middleware call
    upload(mockReq, mockRes, (err) => {
      if (err) {
        console.error('❌ Upload middleware error:', err);
        return;
      }

      console.log('\n2. Upload middleware completed. File object:');
      console.log('File properties:', Object.keys(mockReq.file || {}));
      console.log('File:', mockReq.file);

      if (mockReq.file) {
        // Now test processFiles with the real uploaded file
        uploadService.processFiles(mockReq.file, {
          type: 'profile',
          userId: 'test-user-id',
          entityId: 'test-user-id',
          entityType: 'admin'
        }).then(result => {
          console.log('\n3. Process files result:', JSON.stringify(result, null, 2));

          if (result.success && result.files.length > 0) {
            const fileUrl = result.files[0].url;
            console.log('\n4. Generated URL:', fileUrl);
            console.log('URL type:', typeof fileUrl);
            console.log('URL is valid string:', typeof fileUrl === 'string' && fileUrl.trim() !== '');
            console.log('Is Cloudinary URL:', fileUrl && fileUrl.includes('cloudinary'));
          }

          // Cleanup
          fs.unlinkSync(testImagePath);
          console.log('\n✅ Test completed');
        }).catch(error => {
          console.error('❌ Process files error:', error.message);
        });
      } else {
        console.log('❌ No file uploaded');
      }
    });

    // Simulate file upload by manually calling the storage
    // This is a workaround to test the actual storage behavior
    setTimeout(() => {
      const multer = require('multer');
      const memoryStorage = multer.memoryStorage();
      const uploadToMemory = multer({ storage: memoryStorage }).single('profilePicture');

      uploadToMemory(mockReq, mockRes, (err) => {
        if (err) {
          console.error('❌ Memory upload error:', err);
          return;
        }

        console.log('\n🔍 Memory upload completed for comparison:');
        console.log('File properties:', Object.keys(mockReq.file || {}));
        
        // Cleanup
        try {
          fs.unlinkSync(testImagePath);
        } catch (e) {}
      });
    }, 100);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealUploadService();
