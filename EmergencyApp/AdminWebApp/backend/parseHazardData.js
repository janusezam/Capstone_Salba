const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\DRRM-Plan-final.xlsx');

console.log('Available sheets:', wb.SheetNames);

// Parse each sheet
const allData = {};
wb.SheetNames.forEach(sheet => {
  const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
  allData[sheet] = data;
  console.log(`\n=== ${sheet} ===`);
  console.log(`Total rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Sample row:');
    console.log(JSON.stringify(data[0], null, 2));
  }
});

// Save to JSON for reference
fs.writeFileSync('hazard_data_raw.json', JSON.stringify(allData, null, 2));
console.log('\nData saved to hazard_data_raw.json');
