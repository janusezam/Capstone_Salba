// Test dispatch endpoint directly
const axios = require('axios');

async function testDispatch() {
  try {
    // Test with Team Alpha and test report
    const reportId = '69d4f72d9192d545fd6af704'; // The pending report we just created
    const teamId = '69a033b08455d77c6560bbfe'; // Team Alpha ID
    
    console.log('Testing dispatch endpoint...');
    console.log(`Report ID: ${reportId}`);
    console.log(`Team ID: ${teamId}`);
    
    const response = await axios.post(`http://localhost:5000/api/teams/${teamId}/dispatch`, {
      reportId,
      lat: 8.2465,
      lng: 124.8497,
      address: 'Test Location'
    });
    
    console.log('\n✓ Dispatch Success Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (err) {
    console.error('\n✗ Dispatch Error:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Message:', err.message);
    }
  }
}

testDispatch();
