const xlsx = require('xlsx');

const filePath = 'C:\\Users\\USER\\Downloads\\Malaybalay_City_Disaster_Dataset_v3.xlsx';
const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets['All Disaster Records'];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log('[INFO] First 5 Records:');
data.slice(0, 5).forEach((row, idx) => {
  console.log(`\nRecord ${idx + 1}:`);
  console.log(`  Latitude: ${row.Latitude} (type: ${typeof row.Latitude})`);
  console.log(`  Longitude: ${row.Longitude} (type: ${typeof row.Longitude})`);
  console.log(`  Barangay: ${row.Barangay}`);
  console.log(`  Disaster Type: ${row['Disaster Type']}`);
  console.log(`  Severity: ${row['Severity Level']}`);
});

console.log('\n[STATS] Latitude/Longitude Stats:');
const lats = data.map(r => parseFloat(r.Latitude)).filter(v => !isNaN(v));
const lngs = data.map(r => parseFloat(r.Longitude)).filter(v => !isNaN(v));
console.log(`  Valid Lat values: ${lats.length}/${data.length}`);
console.log(`  Valid Lng values: ${lngs.length}/${data.length}`);
console.log(`  Lat range: ${Math.min(...lats)} to ${Math.max(...lats)}`);
console.log(`  Lng range: ${Math.min(...lngs)} to ${Math.max(...lngs)}`);
