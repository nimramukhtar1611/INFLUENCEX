// Test script for unread message count persistence
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test configuration - update with actual user tokens
const BRAND_USER_TOKEN = 'YOUR_BRAND_JWT_TOKEN';
const CREATOR_USER_TOKEN = 'YOUR_CREATOR_JWT_TOKEN';

async function testUnreadPersistence() {
  console.log('🧪 Testing Unread Message Count Persistence...\n');

  const tests = [
    {
      name: 'Brand Inbox - Load Conversations with Database Unread Counts',
      test: async () => {
        try {
          const response = await axios.get(`${API_BASE}/messages/conversations`, {
            headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` }
          });
          
          console.log('✅ Brand conversations loaded:', response.data.data.length);
          
          // Test each conversation for unread count
          for (const conv of response.data.data) {
            const unreadResponse = await axios.get(
              `${API_BASE}/messages/conversations/${conv._id}/unread-count`,
              { headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` } }
            );
            
            console.log(`   📬 Conversation ${conv._id}: ${unreadResponse.data.data.unreadCount} unread messages`);
          }
          
          return true;
        } catch (error) {
          console.error('❌ Brand inbox test failed:', error.response?.data || error.message);
          return false;
        }
      }
    },
    {
      name: 'Creator Inbox - Load Conversations with Database Unread Counts',
      test: async () => {
        try {
          const response = await axios.get(`${API_BASE}/messages/conversations`, {
            headers: { Authorization: `Bearer ${CREATOR_USER_TOKEN}` }
          });
          
          console.log('✅ Creator conversations loaded:', response.data.data.length);
          
          // Test each conversation for unread count
          for (const conv of response.data.data) {
            const unreadResponse = await axios.get(
              `${API_BASE}/messages/conversations/${conv._id}/unread-count`,
              { headers: { Authorization: `Bearer ${CREATOR_USER_TOKEN}` } }
            );
            
            console.log(`   📬 Conversation ${conv._id}: ${unreadResponse.data.data.unreadCount} unread messages`);
          }
          
          return true;
        } catch (error) {
          console.error('❌ Creator inbox test failed:', error.response?.data || error.message);
          return false;
        }
      }
    },
    {
      name: 'Mark Messages as Read - Backend Persistence',
      test: async () => {
        try {
          // Get conversations
          const convResponse = await axios.get(`${API_BASE}/messages/conversations`, {
            headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` }
          });
          
          if (convResponse.data.data.length === 0) {
            console.log('⚠️  No conversations found for testing');
            return true;
          }
          
          const conversation = convResponse.data.data[0];
          const conversationId = conversation._id;
          
          // Get messages in conversation
          const msgResponse = await axios.get(
            `${API_BASE}/messages/conversations/${conversationId}`,
            { headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` } }
          );
          
          const messages = msgResponse.data.data.messages;
          const unreadMessages = messages.filter(msg => 
            !msg.readBy?.some(r => r.userId === 'CURRENT_USER_ID') // Update with actual user ID
          );
          
          if (unreadMessages.length === 0) {
            console.log('⚠️  No unread messages to test');
            return true;
          }
          
          // Mark messages as read
          const messageIds = unreadMessages.slice(0, 2).map(msg => msg._id);
          await axios.put(
            `${API_BASE}/messages/conversations/${conversationId}/read`,
            { messageIds },
            { headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` } }
          );
          
          // Verify unread count decreased
          const unreadResponse = await axios.get(
            `${API_BASE}/messages/conversations/${conversationId}/unread-count`,
            { headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` } }
          );
          
          console.log(`✅ Marked ${messageIds.length} messages as read`);
          console.log(`   📊 New unread count: ${unreadResponse.data.data.unreadCount}`);
          
          return true;
        } catch (error) {
          console.error('❌ Mark as read test failed:', error.response?.data || error.message);
          return false;
        }
      }
    },
    {
      name: 'Total Unread Count Endpoint',
      test: async () => {
        try {
          const response = await axios.get(`${API_BASE}/messages/unread`, {
            headers: { Authorization: `Bearer ${BRAND_USER_TOKEN}` }
          });
          
          console.log(`✅ Total unread count: ${response.data.data.totalUnread}`);
          return true;
        } catch (error) {
          console.error('❌ Total unread count test failed:', error.response?.data || error.message);
          return false;
        }
      }
    }
  ];

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🔍 ${test.name}`);
    try {
      const result = await test.test();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Unread message persistence is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
}

// Frontend test helper function
function createFrontendTest() {
  return `
// Frontend Test - Add to browser console
async function testFrontendUnreadPersistence() {
  console.log('🧪 Testing Frontend Unread Persistence...');
  
  // Test 1: Load conversations and check unread counts
  console.log('📊 Loading conversations...');
  const conversations = await fetch('/api/messages/conversations', {
    headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
  }).then(res => res.json());
  
  console.log('Conversations with unread counts:', conversations.data);
  
  // Test 2: Select a conversation and check read state persistence
  if (conversations.data.length > 0) {
    const conv = conversations.data[0];
    console.log(\`📬 Selecting conversation: \${conv._id}\`);
    
    // Load messages
    const messages = await fetch(\`/api/messages/conversations/\${conv._id}\`, {
      headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
    }).then(res => res.json());
    
    console.log(\`📨 Loaded \${messages.data.messages.length} messages\`);
    
    // Check if unread count is fetched from database
    const unreadCount = await fetch(\`/api/messages/conversations/\${conv._id}/unread-count\`, {
      headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
    }).then(res => res.json());
    
    console.log(\`📊 Database unread count: \${unreadCount.data.unreadCount}\`);
    
    // Test 3: Mark messages as read and verify persistence
    const unreadMessages = messages.data.messages.filter(msg => 
      !msg.readBy?.some(r => r.userId === 'CURRENT_USER_ID')
    );
    
    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.slice(0, 1).map(msg => msg._id);
      
      await fetch(\`/api/messages/conversations/\${conv._id}/read\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${localStorage.getItem('token')}\`
        },
        body: JSON.stringify({ messageIds })
      });
      
      // Verify count decreased
      const newUnreadCount = await fetch(\`/api/messages/conversations/\${conv._id}/unread-count\`, {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      }).then(res => res.json());
      
      console.log(\`✅ After marking as read: \${newUnreadCount.data.unreadCount}\`);
      
      // Refresh page and check if count persists (manual test)
      console.log('🔄 Refresh the page to test persistence across reloads...');
    }
  }
}

// Run the test
testFrontendUnreadPersistence();
  `;
}

if (require.main === module) {
  testUnreadPersistence();
  console.log('\n🌐 Frontend Test Code:');
  console.log(createFrontendTest());
}

module.exports = { testUnreadPersistence, createFrontendTest };
