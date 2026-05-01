const axios = require('axios');

async function testRateLimit() {
  const url = 'http://127.0.0.1:5000/health';
  const requests = 2500; // Fire 2500 requests (which would have hit the old limit of 2000)
  
  console.log(`🚀 Firing ${requests} requests to ${url}...`);
  
  const results = {
    success: 0,
    failed: 0,
    tooManyRequests: 0
  };

  const promises = [];
  for (let i = 0; i < requests; i++) {
    promises.push(
      axios.get(url)
        .then(() => { results.success++; })
        .catch(err => {
          if (err.response && err.response.status === 429) {
            results.tooManyRequests++;
          } else {
            if (results.failed === 0) console.log('First error:', err.code || err.message || err);
            results.failed++;
          }
        })
    );
  }

  await Promise.all(promises);
  
  console.log('\n--- Results ---');
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed (other): ${results.failed}`);
  console.log(`🔥 429 Too Many Requests: ${results.tooManyRequests}`);
  
  if (results.tooManyRequests > 0) {
    console.log('❌ Test FAILED: Hit rate limit.');
  } else {
    console.log('✅ Test PASSED: No rate limit hit.');
  }
}

testRateLimit();
