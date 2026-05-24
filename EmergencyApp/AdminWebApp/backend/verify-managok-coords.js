const xlsx = require('xlsx');

console.log('=== CHECKING MANAGOK AND DALWANGAN COORDINATES FROM EXCEL ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Barangays_FINAL.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

// Find Managok and Dalwangan
const managok = data.find(r => r.Barangay && r.Barangay.toLowerCase().includes('managok'));
const dalwangan = data.find(r => r.Barangay && r.Barangay.toLowerCase().includes('dalwangan'));

console.log('=== MANAGOK (Excel) ===');
if (managok) {
  console.log(`Name: ${managok.Barangay}`);
  console.log(`Center Coords: ${managok.Latitude}, ${managok.Longitude}`);
  console.log(`District: ${managok.District}`);
  console.log(`Puroks: ${managok['Puroks / Sub-zones / Sitios']}`);
} else {
  console.log('NOT FOUND');
}

console.log('\n=== DALWANGAN (Excel) ===');
if (dalwangan) {
  console.log(`Name: ${dalwangan.Barangay}`);
  console.log(`Center Coords: ${dalwangan.Latitude}, ${dalwangan.Longitude}`);
  console.log(`District: ${dalwangan.District}`);
  console.log(`Puroks: ${dalwangan['Puroks / Sub-zones / Sitios']}`);
} else {
  console.log('NOT FOUND');
}

console.log('\n=== DATABASE VALUES ===');
console.log('Managok - Purok 1 (DB): 8.163358, 125.071207');
console.log('Dalwangan - Purok 1 (DB): 8.168994, 125.137017');

console.log('\n=== COMPARISON ===');
console.log('Excel Managok center:', managok ? `${managok.Latitude}, ${managok.Longitude}` : 'N/A');
console.log('DB Managok Purok 1: 8.163358, 125.071207');
console.log('Match?', managok && Math.abs(managok.Latitude - 8.163358) < 0.01 ? '✅ YES' : '❌ NO - Possible issue');
