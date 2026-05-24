const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_City_Barangay_Purok_Dataset.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Format the data as JavaScript export for React Native
let jsCode = '// All Barangays in Malaybalay City with complete Purok/Zone list\n';
jsCode += '// Total: ' + data.length + ' locations | ' + new Set(data.map(r => r.Barangay)).size + ' barangays\n';
jsCode += 'export const malaybalayBarangays = [\n';

data.forEach((row, idx) => {
  // Handle different barangay naming formats
  let barangayLabel = row.Barangay;
  if (row.Barangay.startsWith('Barangay ')) {
    barangayLabel = 'Brgy ' + row.Barangay.split(' ')[1];
  }
  
  // Clean up zone name for value field
  const zoneValue = row['Zone Name'].replace(/ /g, '').replace(/ó/g, 'o');
  
  jsCode += '  { ';
  jsCode += `label: "${barangayLabel} - ${row['Zone Name']}", `;
  jsCode += `value: "${barangayLabel.replace(/ /g, '')}-${zoneValue}", `;
  jsCode += `latitude: ${row.Latitude}, `;
  jsCode += `longitude: ${row.Longitude} `;
  jsCode += `}${idx < data.length - 1 ? ',' : ''}\n`;
});

jsCode += '];\n';

// Write to file
fs.writeFileSync('C:\\Users\\USER\\OneDrive\\Documents\\Capstone\\DisasterSOS\\DisasterSOS\\utils\\locations.js', jsCode);

console.log('✓ Updated DisasterSOS locations.js with ' + data.length + ' barangay/purok entries');
console.log('✓ Now synced with backend data');
