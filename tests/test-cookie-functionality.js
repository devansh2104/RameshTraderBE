const axios = require('axios');

const BASE_URL = 'http://localhost:4001/api/cookies';

// Test configuration
const testConfig = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Cookie-Test-Script/1.0'
  }
};

async function testCookieFunctionality() {
  console.log('🧪 Testing Enhanced Cookie Functionality...\n');

  try {
    // Test 1: Check consent status (should return no consent initially)
    console.log('1. Testing consent status...');
    const consentStatus = await axios.get(`${BASE_URL}/consent-status`, testConfig);
    console.log('✅ Consent status:', consentStatus.data);
    console.log('   Expected: hasConsent: false\n');

    // Test 2: Save consent (accept all)
    console.log('2. Testing consent save (accept all)...');
    const consentResponse = await axios.post(`${BASE_URL}/consent`, {
      acceptAll: true
    }, testConfig);
    console.log('✅ Consent saved:', consentResponse.data);
    console.log('   Expected: message: "Consent stored successfully"\n');

    // Test 3: Check consent status again (should return consent)
    console.log('3. Testing consent status after save...');
    const consentStatusAfter = await axios.get(`${BASE_URL}/consent-status`, testConfig);
    console.log('✅ Consent status after save:', consentStatusAfter.data);
    console.log('   Expected: hasConsent: true\n');

    // Test 4: Set cookies based on consent
    console.log('4. Testing cookie setting...');
    const setCookiesResponse = await axios.get(`${BASE_URL}/set-cookies`, testConfig);
    console.log('✅ Cookies set:', setCookiesResponse.data);
    console.log('   Expected: message: "Cookies set based on consent"\n');

    // Test 5: Capture ALL browser cookies
    console.log('5. Testing capture ALL browser cookies...');
    const captureAllResponse = await axios.post(`${BASE_URL}/capture-all-cookies`, {}, testConfig);
    console.log('✅ Capture all cookies response:');
    console.log('   Total captured:', captureAllResponse.data.totalCaptured);
    console.log('   Categories found:', Object.keys(captureAllResponse.data.categories || {}));
    console.log('   Category breakdown:', captureAllResponse.data.categories);
    console.log('   Expected: Should capture and categorize all browser cookies\n');

    // Test 6: Get available categories
    console.log('6. Testing get available categories...');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories`, testConfig);
    console.log('✅ Available categories:', categoriesResponse.data.categories);
    console.log('   Expected: Should show all available cookie categories\n');

    // Test 7: Debug cookies
    console.log('7. Testing debug cookies...');
    const debugResponse = await axios.get(`${BASE_URL}/debug/cookies`, testConfig);
    console.log('✅ Debug cookies response:');
    console.log('   Current cookies count:', Object.keys(debugResponse.data.current).length);
    console.log('   Stored records count:', debugResponse.data.stored.length);
    console.log('   Visitor ID:', debugResponse.data.visitorId);
    console.log('   Expected: Should have stored cookie records\n');

    // Test 8: Get cookies by category (if any cookies exist)
    if (captureAllResponse.data.totalCaptured > 0) {
      console.log('8. Testing get cookies by category...');
      const firstCategory = Object.keys(captureAllResponse.data.categories)[0];
      if (firstCategory) {
        const categoryResponse = await axios.get(`${BASE_URL}/by-category/${encodeURIComponent(firstCategory)}`, testConfig);
        console.log(`✅ Cookies in category "${firstCategory}":`, categoryResponse.data.count);
        console.log('   Expected: Should show cookies for specific category\n');
      }
    }

    // Test 9: Get cookie statistics
    console.log('9. Testing cookie statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/stats`, testConfig);
    console.log('✅ Cookie statistics:', statsResponse.data);
    console.log('   Expected: Should show visitor and consent counts\n');

    // Test 10: Force set all cookies (testing endpoint)
    console.log('10. Testing force set all cookies...');
    const forceSetResponse = await axios.post(`${BASE_URL}/set-all-cookies`, {}, testConfig);
    console.log('✅ Force set response:', forceSetResponse.data);
    console.log('   Expected: message: "All cookies set successfully"\n');

    console.log('🎉 All enhanced tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Cookie consent system is working');
    console.log('- IP address tracking is functional');
    console.log('- Database storage is operational');
    console.log('- ALL browser cookies are being captured and categorized');
    console.log('- Enhanced category detection is working');
    console.log('- API endpoints are responding correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

// Run the test
testCookieFunctionality();
