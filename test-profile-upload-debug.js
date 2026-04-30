// Test script to debug profile picture upload issue
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testProfileUpload() {
  console.log('🔍 Testing Profile Picture Upload Flow...\n');

  try {
    // 1. Test admin login to get token
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@influencex.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.error);
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // 2. Test profile picture upload
    console.log('\n2. Testing profile picture upload...');
    
    // Create a test image file
    const testImagePath = path.join(__dirname, 'backend', 'test-profile.jpg');
    if (!fs.existsSync(testImagePath)) {
      // Create a simple test image if it doesn't exist
      const testImageData = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A', 'base64');
      fs.writeFileSync(testImagePath, testImageData);
    }
    
    const formData = new FormData();
    formData.append('profilePicture', fs.createReadStream(testImagePath));
    
    const uploadResponse = await axios.post(
      `${API_BASE}/upload/profile-picture`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log('Upload Response:', JSON.stringify(uploadResponse.data, null, 2));
    
    // 3. Check if URL is accessible
    if (uploadResponse.data.success && uploadResponse.data.profilePicture) {
      console.log('\n3. Testing URL accessibility...');
      const imageUrl = uploadResponse.data.profilePicture;
      console.log('Image URL:', imageUrl);
      
      try {
        const imageResponse = await axios.get(`http://localhost:5000${imageUrl}`, {
          responseType: 'arraybuffer'
        });
        console.log('✅ Image URL is accessible');
        console.log('Image size:', imageResponse.data.length, 'bytes');
      } catch (urlError) {
        console.log('❌ Image URL is NOT accessible:', urlError.message);
      }
    }
    
    // 4. Check database update
    console.log('\n4. Testing admin data retrieval...');
    const adminResponse = await axios.get(`${API_BASE}/admin/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Admin profile image:', adminResponse.data.user?.profileImage);
    console.log('Admin profile picture:', adminResponse.data.user?.profilePicture);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testProfileUpload();
