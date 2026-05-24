// Test dispatch endpoint with authentication
const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api'
});

async function testDispatchWithAuth() {
  try {
    // First, login as admin
    console.log('1. Logging in as admin...');
    const loginRes = await apiClient.post('/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('✓ Login successful, got token');
    
    // Set the token for subsequent requests (with Bearer prefix)
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Now test dispatch
    const reportId = '69d4f72d9192d545fd6af704';
    const teamId = '69a033b08455d77c6560bbfe';
    
    console.log('\n2. Testing dispatch endpoint...');
    console.log(`   Report ID: ${reportId}`);
    console.log(`   Team ID: 69a033b08455d77c6560bc06`); // Team Charlie
    
    const response = await apiClient.post(`/teams/69a033b08455d77c6560bc06/dispatch`, {
      reportId,
      lat: 8.2465,
      lng: 124.8497,
      address: 'Test Location'
    });
    
    console.log('\n✓ Dispatch Response:');
    console.log('Status:', response.status);
    console.log('Success field:', response.data.success);
    console.log('Message:', response.data.message);
    
  } catch (err) {
    console.error('\n✗ Error:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Message:', err.message);
    }
  }
}

testDispatchWithAuth();
