const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== GENERATING UPDATED LOCATION FILES ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Emergency_Coordinates_FULL.xlsx');
const ws = wb.Sheets['All Coordinates'];
const data = xlsx.utils.sheet_to_json(ws);

// Filter for PUROK/SITIO entries only (exclude centroids)
const puroks = data.filter(row => (row.Type || '').includes('PUROK'));

console.log(`Total entries: ${data.length}`);
console.log(`PUROK/SITIO entries: ${puroks.length}\n`);

// Generate backend format (malaybalayLocations.js)
const backendEntries = puroks.map(row => ({
  barangay: row.Barangay,
  purok: row['Sub-Zone / Purok'],
  label: `${row.Barangay} - ${row['Sub-Zone / Purok']}`,
  value: `${row.Barangay.replace(/\s+/g, '')}-${row['Sub-Zone / Purok'].replace(/\s+/g, '')}`,
  latitude: row.Latitude,
  longitude: row.Longitude,
  district: row.District || 'Unknown',
  classification: row.Classification || 'Rural'
}));

// Generate mobile format (locations.js) - simpler structure
const mobileEntries = puroks.map(row => ({
  label: `${row.Barangay} - ${row['Sub-Zone / Purok']}`,
  value: `${row.Barangay.replace(/\s+/g, '')}-${row['Sub-Zone / Purok'].replace(/\s+/g, '')}`,
  latitude: row.Latitude,
  longitude: row.Longitude
}));

console.log('=== UPDATED COORDINATES SAMPLE ===\n');

console.log('Managok entries:');
backendEntries.filter(e => e.barangay === 'Managok').forEach(e => {
  console.log(`  ✓ ${e.label}: [${e.latitude}, ${e.longitude}]`);
});

console.log('\nBrgy 9 entries:');
backendEntries.filter(e => e.barangay === 'Barangay 9').forEach(e => {
  console.log(`  ✓ ${e.label}: [${e.latitude}, ${e.longitude}]`);
});

console.log('\nBrgy 1 entries (first 3):');
backendEntries.filter(e => e.barangay === 'Barangay 1').slice(0, 3).forEach(e => {
  console.log(`  ✓ ${e.label}: [${e.latitude}, ${e.longitude}]`);
});

// Save both formats
fs.writeFileSync('backend-locations-updated.json', JSON.stringify(backendEntries, null, 2));
fs.writeFileSync('mobile-locations-updated.json', JSON.stringify(mobileEntries, null, 2));

console.log(`\n✅ Generated ${backendEntries.length} location entries`);
console.log('Files saved:');
console.log('  - backend-locations-updated.json (for malaybalayLocations.js)');
console.log('  - mobile-locations-updated.json (for locations.js)');
