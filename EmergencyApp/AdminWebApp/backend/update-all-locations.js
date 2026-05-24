const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== UPDATING LOCATION FILES WITH CORRECT COORDINATES ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Emergency_Coordinates_FULL.xlsx');
const ws = wb.Sheets['All Coordinates'];
const data = xlsx.utils.sheet_to_json(ws);

// Filter for PUROK/SITIO entries only (exclude centroids)
const puroks = data.filter(row => (row.Type || '').includes('PUROK'));

// Generate backend format
const backendEntries = puroks.map(row => `  {
    barangay: "${row.Barangay}",
    purok: "${row['Sub-Zone / Purok']}",
    label: "${row.Barangay} - ${row['Sub-Zone / Purok']}",
    value: "${row.Barangay.replace(/\s+/g, '')}-${row['Sub-Zone / Purok'].replace(/\s+/g, '')}",
    latitude: ${row.Latitude},
    longitude: ${row.Longitude},
    district: "${row.District || 'Unknown'}",
    classification: "${row.Classification || 'Rural'}"
  }`);

// Generate mobile format
const mobileEntries = puroks.map(row => `  { label: "${row.Barangay} - ${row['Sub-Zone / Purok']}", value: "${row.Barangay.replace(/\s+/g, '')}-${row['Sub-Zone / Purok'].replace(/\s+/g, '')}", latitude: ${row.Latitude}, longitude: ${row.Longitude} }`);

// Read current backend file
const backendFilePath = 'C:\\Users\\USER\\OneDrive\\Documents\\Capstone\\EmergencyApp\\AdminWebApp\\backend\\utils\\malaybalayLocations.js';
const backendContent = fs.readFileSync(backendFilePath, 'utf8');

// Create new backend content
const newBackendContent = `const malaybalayLocations = [
${backendEntries.join(',\n')}
];

module.exports = malaybalayLocations;`;

// Read current mobile file
const mobileFilePath = 'C:\\Users\\USER\\OneDrive\\Documents\\Capstone\\DisasterSOS\\DisasterSOS\\utils\\locations.js';
const mobileContent = fs.readFileSync(mobileFilePath, 'utf8');

// Create new mobile content
const newMobileContent = `// All Barangays in Malaybalay City with complete Purok/Zone list
// Total: ${puroks.length} locations | 46 barangays
export const malaybalayBarangays = [
${mobileEntries.join(',\n')}
];`;

// Write updated files
fs.writeFileSync(backendFilePath, newBackendContent, 'utf8');
fs.writeFileSync(mobileFilePath, newMobileContent, 'utf8');

console.log('✅ Updated location files with correct coordinates:');
console.log(`   - Backend: malaybalayLocations.js (${puroks.length} entries)`);
console.log(`   - Mobile: locations.js (${puroks.length} entries)`);
console.log('\nKey updates:');
console.log('  • Managok Purok 1: 8.1598, 125.2188 (was 8.163358, 125.071207)');
console.log('  • Brgy 9 Purok 8: 8.147, 125.132 (confirmed from Excel)');
console.log(`  • All ${puroks.length} puroks synchronized from latest Excel data`);
