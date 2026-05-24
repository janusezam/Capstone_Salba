const xlsx = require('xlsx');

console.log('=== READING UPDATED COORDS FILE ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Emergency_Coordinates_FULL.xlsx');
console.log('Sheets:', wb.SheetNames);

// Try to find the right sheet
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

console.log(`Total entries: ${data.length}\n`);

if (data.length > 0) {
  console.log('Sample of first 5 entries:');
  data.slice(0, 5).forEach((row, idx) => {
    console.log(`\n${idx + 1}. Barangay: ${Object.keys(row)[0]}`);
    console.log(JSON.stringify(row, null, 2).substring(0, 200));
  });
}

// Look for Managok and Brgy 9
console.log('\n\n=== SEARCHING FOR SPECIFIC LOCATIONS ===');
const managok = data.find(r => JSON.stringify(r).toLowerCase().includes('managok'));
const brgy9 = data.find(r => JSON.stringify(r).toLowerCase().includes('brgy 9') || JSON.stringify(r).toLowerCase().includes('barangay 9'));

if (managok) {
  console.log('\nManagok found:');
  console.log(JSON.stringify(managok, null, 2));
}

if (brgy9) {
  console.log('\nBrgy 9 found:');
  console.log(JSON.stringify(brgy9, null, 2));
}
