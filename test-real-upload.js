// Test actual upload endpoint with real file
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testRealUpload() {
  console.log('🔍 Testing Real Upload Endpoint...\n');

  try {
    // Create a real test image
    const testImagePath = path.join(__dirname, 'test-image.png');
    const imageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, imageData);

    console.log('1. Created test image:', testImagePath);

    // Test upload without authentication first to see the error
    console.log('\n2. Testing upload endpoint (no auth)...');
    
    const formData = new FormData();
    formData.append('profilePicture', fs.createReadStream(testImagePath));

    try {
      const response = await axios.post(
        `${API_BASE}/upload/profile-picture`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          }
        }
      );
      console.log('Unexpected success:', response.data);
    } catch (error) {
      console.log('Expected auth error:', error.response?.data?.error || error.message);
    }

    // Clean up
    fs.unlinkSync(testImagePath);
    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealUpload();
