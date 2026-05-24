const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== SYNCING COORDINATES FROM UPDATED EXCEL FILE ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Emergency_Coordinates_FULL.xlsx');
const ws = wb.Sheets['Purok Coordinates (GIS)'];
const data = xlsx.utils.sheet_to_json(ws);

console.log(`Total entries: ${data.length}`);
console.log('Filtering for PUROK/SITIO entries only...\n');

// Filter for actual purok/sitio entries (not centroids)
const puroks = data.filter(row => row.Type === 'PUROK/SITIO' || row.Type === 'Purok/Sitio');

console.log(`Purok entries: ${puroks.length}`);

// Generate backend format (malaybalayLocations.js)
const backendEntries = puroks
  .filter(row => row.Barangay && row['Sub-Zone / Purok']) // Only entries with both fields
  .map(row => ({
    barangay: row.Barangay,
    purok: row['Sub-Zone / Purok'],
    label: `${row.Barangay} - ${row['Sub-Zone / Purok']}`,
    value: `${row.Barangay.replace(/\s+/g, '')}-${row['Sub-Zone / Purok'].replace(/\s+/g, '')}`,
    latitude: parseFloat(row.Latitude),
    longitude: parseFloat(row.Longitude),
    district: row.District || 'Unknown',
    classification: row.Classification || 'Rural'
  }));

// Generate mobile format (locations.js)
const mobileEntries = puroks
  .filter(row => row.Barangay && row['Sub-Zone / Purok'])
  .map(row => ({
    label: `${row.Barangay} - ${row['Sub-Zone / Purok']}`,
    value: `${row.Barangay.replace(/\s+/g, '')}-${row['Sub-Zone / Purok'].replace(/\s+/g, '')}`,
    latitude: parseFloat(row.Latitude),
    longitude: parseFloat(row.Longitude)
  }));

console.log(`\nBackend format entries: ${backendEntries.length}`);
console.log(`Mobile format entries: ${mobileEntries.length}`);

// Sample entries
console.log('\n=== SAMPLE ENTRIES ===');
console.log('\nManagok entries:');
backendEntries.filter(e => e.barangay === 'Managok').forEach(e => {
  console.log(`  ${e.label}: ${e.latitude}, ${e.longitude}`);
});

console.log('\nBrgy 9 entries:');
backendEntries.filter(e => e.barangay === 'Barangay 9').forEach(e => {
  console.log(`  ${e.label}: ${e.latitude}, ${e.longitude}`);
});

// Save both formats for review
fs.writeFileSync('backend-locations-updated.json', JSON.stringify(backendEntries, null, 2));
fs.writeFileSync('mobile-locations-updated.json', JSON.stringify(mobileEntries, null, 2));

console.log('\n✅ Saved updated location files:');
console.log('   - backend-locations-updated.json');
console.log('   - mobile-locations-updated.json');
console.log('\nDo you want me to apply these updates to the actual files?');
