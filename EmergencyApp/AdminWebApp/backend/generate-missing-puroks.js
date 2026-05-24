const fs = require('fs');

// Existing Brgy 9 Purok coordinates from database
const brgy9Existing = [
  { purok: "Purok 1", latitude: 8.151805, longitude: 125.131422 },
  { purok: "Purok 2", latitude: 8.151412, longitude: 125.133766 },
  { purok: "Purok 3", latitude: 8.151666, longitude: 125.131891 },
  { purok: "Purok 4", latitude: 8.152607, longitude: 125.134137 },
  { purok: "Purok 5", latitude: 8.15149, longitude: 125.132617 },
  { purok: "Purok 6", latitude: 8.153178, longitude: 125.13418 },
];

// User's provided GPS at southern boundary
const userGPS = { latitude: 8.143116, longitude: 125.130237 };

// Barangay 9 center from Excel
const brgy9Center = { latitude: 8.1505, longitude: 125.1315 };

console.log('=== EXISTING BRGY 9 PUROKS ===');
brgy9Existing.forEach(p => {
  console.log(`${p.purok}: ${p.latitude}, ${p.longitude}`);
});

console.log('\n=== BARANGAY 9 BOUNDS ===');
console.log(`Center (Excel): ${brgy9Center.latitude}, ${brgy9Center.longitude}`);
console.log(`User GPS (S boundary): ${userGPS.latitude}, ${userGPS.longitude}`);

// Calculate average center of existing puroks
const avgLat = brgy9Existing.reduce((sum, p) => sum + p.latitude, 0) / brgy9Existing.length;
const avgLon = brgy9Existing.reduce((sum, p) => sum + p.longitude, 0) / brgy9Existing.length;

console.log(`Existing puroks average: ${avgLat.toFixed(6)}, ${avgLon.toFixed(6)}`);

// Generate Purok 7 and 8 coordinates
// Purok 7: Between center and south boundary (lower latitude)
// Purok 8: Between center and south, slightly offset
const purok7Lat = (avgLat + userGPS.latitude) / 2 - 0.001;
const purok7Lon = avgLon - 0.0005;

const purok8Lat = (avgLat + userGPS.latitude) / 2;
const purok8Lon = avgLon + 0.0008;

console.log('\n=== ESTIMATED MISSING PUROKS ===');
console.log(`Purok 7: ${purok7Lat.toFixed(6)}, ${purok7Lon.toFixed(6)}`);
console.log(`Purok 8: ${purok8Lat.toFixed(6)}, ${purok8Lon.toFixed(6)}`);

// Create the complete Brgy 9 data
const completeBrgy9 = [
  ...brgy9Existing,
  { 
    purok: "Purok 7", 
    latitude: parseFloat(purok7Lat.toFixed(6)), 
    longitude: parseFloat(purok7Lon.toFixed(6)) 
  },
  { 
    purok: "Purok 8", 
    latitude: parseFloat(purok8Lat.toFixed(6)), 
    longitude: parseFloat(purok8Lon.toFixed(6)) 
  }
];

console.log('\n=== COMPLETE BARANGAY 9 DATA ===');
console.log(JSON.stringify(completeBrgy9.map(p => ({
  label: `Brgy 9 - ${p.purok}`,
  value: `Brgy9-${p.purok.replace(' ', '')}`,
  latitude: p.latitude,
  longitude: p.longitude
})), null, 2));

// Save for reference
fs.writeFileSync('brgy9-complete.json', JSON.stringify(completeBrgy9, null, 2));
console.log('\n✅ Saved complete Brgy 9 data to brgy9-complete.json');
