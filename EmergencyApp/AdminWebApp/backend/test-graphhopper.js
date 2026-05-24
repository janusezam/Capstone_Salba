// Test script for GraphHopper route endpoint
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const GRAPHHOPPER_URL = process.env.GRAPHHOPPER_URL || 'http://localhost:8989';

console.log('\n========== GRAPHHOPPER ROUTE TEST ==========');
console.log('GraphHopper URL:', GRAPHHOPPER_URL);

// Test coordinates: Malaybalay City area
const startLat = 8.1575;
const startLng = 125.1276;
const endLat = 8.1650;
const endLng = 125.1350;

const url = `${GRAPHHOPPER_URL}/route?point=${startLat},${startLng}&point=${endLat},${endLng}&vehicle=car&locale=en&points_encoded=false`;

console.log('\nTest Route:', `(${startLat}, ${startLng}) → (${endLat}, ${endLng})`);
console.log('URL:', url);

axios.get(url, { timeout: 10000 })
  .then(response => {
    console.log('\n✅ SUCCESS');
    console.log('Status:', response.status);
    
    if (response.data.paths && response.data.paths.length > 0) {
      const path = response.data.paths[0];
      console.log('Distance:', (path.distance / 1000).toFixed(2), 'km');
      console.log('Duration:', (path.time / 1000 / 60).toFixed(0), 'min');
      console.log('Waypoints:', path.points?.coordinates?.length || 0);
      
      if (path.points && path.points.coordinates) {
        console.log('First point:', path.points.coordinates[0]);
        console.log('Last point:', path.points.coordinates[path.points.coordinates.length - 1]);
      }
      console.log('\n✅ GraphHopper is working correctly!');
    }
  })
  .catch(error => {
    console.log('\n❌ ERROR');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ Connection refused - GraphHopper is not running');
      console.log('Start it with: docker-compose up -d');
      console.log('Or: docker run -p 8989:8989 graphhopper/graphhopper:latest');
    }
  });
