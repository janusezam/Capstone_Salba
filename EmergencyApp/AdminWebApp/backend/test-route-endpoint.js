/**
 * Test script to verify the route endpoint works
 * Usage: node test-route-endpoint.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5001/api/route';

// Test coordinates for Malaybalay City area
const testCases = [
  {
    name: 'Test 1: Central Malaybalay to North',
    start: '125.1050,8.1575',
    end: '125.1200,8.1650'
  },
  {
    name: 'Test 2: Malaybalay Center to East',
    start: '125.1276,8.1575',
    end: '125.150,8.160'
  },
  {
    name: 'Test 3: Close by locations',
    start: '125.120,8.155',
    end: '125.135,8.165'
  }
];

async function testRoute(testCase) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Start: ${testCase.start}`);
    console.log(`End: ${testCase.end}`);
    
    const url = `${API_URL}?start=${testCase.start}&end=${testCase.end}`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`Geometry type: ${response.data.geometry?.type}`);
    
    const coordCount = response.data.geometry?.coordinates?.length || 0;
    console.log(`Route points: ${coordCount}`);
    
    if (coordCount > 0) {
      const first = response.data.geometry.coordinates[0];
      const last = response.data.geometry.coordinates[coordCount - 1];
      console.log(`First point: [${first[0].toFixed(6)}, ${first[1].toFixed(6)}]`);
      console.log(`Last point: [${last[0].toFixed(6)}, ${last[1].toFixed(6)}]`);
    }
    
    if (response.data.properties) {
      console.log(`Distance: ${response.data.properties.segments?.[0]?.distance || 'N/A'} meters`);
      console.log(`Duration: ${response.data.properties.segments?.[0]?.duration || 'N/A'} seconds`);
    }
    
    console.log('✅ SUCCESS');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

async function runAllTests() {
  console.log('\n🧪 ROUTE ENDPOINT TEST SUITE');
  console.log('Testing OpenRouteService integration...\n');
  
  for (const testCase of testCases) {
    await testRoute(testCase);
    await new Promise(r => setTimeout(r, 500)); // Add delay between requests
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Test suite completed');
  console.log(`${'='.repeat(60)}\n`);
}

runAllTests().catch(console.error);
