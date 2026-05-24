// Test the route proxy endpoint
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const ORS_KEY = process.env.ORS_KEY;

console.log('\n========== ROUTE PROXY TEST ==========');
console.log('ORS_KEY configured:', !!ORS_KEY);
console.log('ORS_KEY value:', ORS_KEY);

// Test coordinates: Malaybalay City (from the map in app)
const start = '125.1276,8.1575'; // lng,lat
const end = '125.1300,8.1600';   // slightly different location

const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${start}&end=${end}`;

console.log('\nTesting ORS API directly:');
console.log('URL (masked):', `https://api.openrouteservice.org/v2/directions/driving-car?api_key=***&start=${start}&end=${end}`);

axios.get(url, { timeout: 10000 })
  .then(response => {
    console.log('\n✅ SUCCESS');
    console.log('Status:', response.status);
    console.log('Features count:', response.data.features?.length || 0);
    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      console.log('First feature geometry type:', feature.geometry?.type);
      console.log('Coordinates count:', feature.geometry?.coordinates?.length || 0);
      console.log('Distance:', response.data.features[0].properties?.summary?.distance, 'meters');
      console.log('Duration:', response.data.features[0].properties?.summary?.duration, 'seconds');
    }
  })
  .catch(error => {
    console.log('\n❌ ERROR');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    if (error.code) {
      console.log('Code:', error.code);
    }
  });
