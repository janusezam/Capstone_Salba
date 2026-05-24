const xlsx = require('xlsx');

console.log('=== CHECKING EXCEL SHEETS ===\n');

const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Barangays_FINAL.xlsx');
console.log('Sheet names:', wb.SheetNames);
console.log('');

// Check all sheets for purok data
wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws);
  console.log(`Sheet: "${sheetName}" - ${data.length} rows`);
  if (data.length > 0) {
    console.log('  Sample columns:', Object.keys(data[0]).slice(0, 5));
  }
  console.log('');
});
