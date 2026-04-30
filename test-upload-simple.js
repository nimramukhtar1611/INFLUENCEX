// Simple test to check upload service directly
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });
const uploadService = require('./backend/services/uploadService');
const fs = require('fs');

async function testUploadService() {
  console.log('🔍 Testing Upload Service Directly...\n');

  try {
    // Check storage type
    console.log('1. Storage Configuration:');
    console.log('Cloudinary configured:', uploadService.isCloudinaryConfigured());
    console.log('Storage type:', uploadService.storageType);

    // Create a mock file object for testing
    const mockFile = {
      fieldname: 'profilePicture',
      originalname: 'test-profile.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1000,
      destination: path.join(__dirname, 'backend/uploads/profiles'),
      filename: 'test_' + Date.now() + '.jpg',
      path: path.join(__dirname, 'backend/uploads/profiles/test_' + Date.now() + '.jpg')
    };

    // Ensure the directory exists
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(mockFile.path), { recursive: true });
    
    // Create a dummy file
    const dummyContent = Buffer.from('fake image content for testing');
    await fs.writeFile(mockFile.path, dummyContent);

    console.log('\n2. Testing file processing...');
    const result = await uploadService.processFiles(mockFile, {
      type: 'profile',
      userId: 'test-user-id',
      entityId: 'test-user-id',
      entityType: 'admin'
    });

    console.log('Processing result:', JSON.stringify(result, null, 2));

    if (result.success && result.files.length > 0) {
      const fileUrl = result.files[0].url;
      console.log('\n3. Generated URL:', fileUrl);
      console.log('URL type:', typeof fileUrl);
      console.log('URL is valid string:', typeof fileUrl === 'string' && fileUrl.trim() !== '');

      // Clean up test file
      try {
        await fs.unlink(mockFile.path);
        console.log('\n✅ Test file cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up test file:', cleanupError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUploadService();
