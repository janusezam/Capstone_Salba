const XLSX = require('xlsx');

// Read the Excel file
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_City_Barangay_Purok_Dataset.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Display all data in a formatted way
console.log('Total rows:', data.length);
console.log('\nFirst 20 rows:');
data.slice(0, 20).forEach((row, idx) => {
  console.log(`${idx + 1}:`, JSON.stringify(row));
});

console.log('\n\nColumn names:', Object.keys(data[0]));
console.log('\nTotal entries:', data.length);
