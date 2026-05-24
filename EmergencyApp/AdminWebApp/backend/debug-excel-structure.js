const xlsx = require('xlsx');

console.log('=== DEBUGGING EXCEL STRUCTURE ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Emergency_Coordinates_FULL.xlsx');

// Check the "All Coordinates" sheet instead
const ws = wb.Sheets['All Coordinates'];
const data = xlsx.utils.sheet_to_json(ws);

console.log(`Total entries in "All Coordinates": ${data.length}`);
console.log('\nColumn names from first entry:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
  
  console.log('\nFirst 3 entries:');
  data.slice(0, 3).forEach((row, idx) => {
    console.log(`\nEntry ${idx + 1}:`);
    console.log(JSON.stringify(row, null, 2));
  });
}

// Count PUROK entries
const purokEntries = data.filter(row => (row.Type || '').includes('PUROK') || (row.Type || '').includes('Purok'));
console.log(`\nPUROK entries found: ${purokEntries.length}`);

if (purokEntries.length > 0) {
  console.log('\nFirst PUROK entry:');
  console.log(JSON.stringify(purokEntries[0], null, 2));
}
