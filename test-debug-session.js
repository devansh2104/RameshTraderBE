const axios = require('axios');

async function debugSession() {
  console.log('🔍 Debugging Session Issue...\n');
  
  const axiosInstance = axios.create({
    baseURL: 'http://localhost:4001/api/cookies',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Debug-Test/1.0'
    }
  });

  try {
    // Step 1: Check initial status
    console.log('1. Checking initial status...');
    const status1 = await axiosInstance.get('/consent-status');
    console.log('Status 1:', status1.data);
    console.log('Cookies in response:', status1.headers['set-cookie']);

    // Step 2: Save consent
    console.log('\n2. Saving consent...');
    const consent = await axiosInstance.post('/consent', { acceptAll: true });
    console.log('Consent response:', consent.data);
    console.log('Cookies in response:', consent.headers['set-cookie']);

    // Step 3: Check status again
    console.log('\n3. Checking status again...');
    const status2 = await axiosInstance.get('/consent-status');
    console.log('Status 2:', status2.data);

    // Step 4: Try to set cookies
    console.log('\n4. Trying to set cookies...');
    const setCookies = await axiosInstance.get('/set-cookies');
    console.log('Set cookies response:', setCookies.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

debugSession();
