const axios = require('axios');

async function testBackendLocations() {
  try {
    console.log('Testing backend API: GET /api/alerts/locations/barangays\n');
    
    const response = await axios.get('http://localhost:5000/api/alerts/locations/barangays', {
      timeout: 5000
    });
    
    const data = response.data;
    console.log(`✓ Received ${data.length} locations from backend\n`);
    
    // Find Brgy 9 Purok 8
    const brgy9Purok8 = data.find(l => l.label === 'Brgy 9 - Purok 8');
    
    if (brgy9Purok8) {
      console.log('✅ Brgy 9 Purok 8 FOUND in backend:');
      console.log(JSON.stringify(brgy9Purok8, null, 2));
    } else {
      console.log('❌ Brgy 9 Purok 8 NOT FOUND in backend');
      
      // Show what Brgy 9 we have
      const brgy9All = data.filter(l => l.label.includes('Brgy 9'));
      console.log(`\nBrgy 9 locations in backend (${brgy9All.length} total):`);
      brgy9All.forEach(l => console.log(`  - ${l.label}`));
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    console.log('\nMake sure backend is running: npm run dev');
  }
}

testBackendLocations();
