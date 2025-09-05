const axios = require('axios');

const API_BASE = 'http://localhost:4001/api';

async function registerUser() {
  try {
    const userData = {
      name: 'Test User',
      email: `test@gmail.com`,
      password: 'TestPassword123',
    };
    const response = await axios.post(`${API_BASE}/users/register`, userData);
    console.log('User registered:', response.data);
  } catch (err) {
    console.error('Registration failed:', err.response ? err.response.data : err.message);
  }
}

registerUser();
