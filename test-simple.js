const axios = require('axios');

async function testSimple() {
  try {
    console.log('🧪 Simple Cookie Test...\n');
    
    const response = await axios.get('http://localhost:4001/api/cookies/consent-status', {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    });
    
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testSimple();
