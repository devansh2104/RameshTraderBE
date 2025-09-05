// utils/ipFetcher.js
// Utility to fetch public/external IP

const fetch = require('node-fetch'); // ✅ node-fetch v2 for CJS

async function getPublicIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (err) {
    console.error('❌ Failed to fetch public IP', err);
    return null;
  }
}

module.exports = { getPublicIp };
