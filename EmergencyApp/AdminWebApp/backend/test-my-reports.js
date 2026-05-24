const axios = require('axios');

async function testMyReports() {
  try {
    // Test with admin user (or any valid user)
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGE1ZWI0MjFhYzhjMzc1ZjBhYmQ5YiIsImlhdCI6MTcxMzAwMDAwMH0.test'; // This is just for testing, update with real token
    
    const response = await axios.get('http://localhost:5000/api/alerts/my-reports', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n=== API RESPONSE ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.reports && response.data.reports.length > 0) {
      console.log('\n=== FIRST REPORT DETAILS ===');
      const firstReport = response.data.reports[0];
      console.log(`Status (internal): ${firstReport.status}`);
      console.log(`Status Display: ${firstReport.statusDisplay}`);
      console.log(`Rescuer Mission Status: ${firstReport.rescuerMissionStatus}`);
      console.log(`Report Status: ${firstReport.reportStatus}`);
      console.log(`Disaster Type: ${firstReport.type}`);
      console.log(`Date: ${firstReport.date}`);
      console.log(`Time: ${firstReport.time}`);
    }
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testMyReports();
