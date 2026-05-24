const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_City_Barangay_Purok_Dataset.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Format the data as a JavaScript array
let jsCode = '/**\n';
jsCode += ' * Complete list of Malaybalay City Barangays with all Puroks/Zones\n';
jsCode += ' * Total: ' + data.length + ' locations\n';
jsCode += ' * Data source: Malaybalay_City_Barangay_Purok_Dataset.xlsx\n';
jsCode += ' */\n\n';
jsCode += 'const malaybalayLocations = [\n';

data.forEach((row, idx) => {
  // Handle different barangay naming formats
  let barangayLabel = row.Barangay;
  if (row.Barangay.startsWith('Barangay ')) {
    barangayLabel = 'Brgy ' + row.Barangay.split(' ')[1];
  }
  
  // Clean up zone name for value field
  const zoneValue = row['Zone Name'].replace(/ /g, '').replace(/ó/g, 'o');
  
  jsCode += '  {\n';
  jsCode += `    barangay: "${row.Barangay}",\n`;
  jsCode += `    purok: "${row['Zone Name']}",\n`;
  jsCode += `    label: "${barangayLabel} - ${row['Zone Name']}",\n`;
  jsCode += `    value: "${barangayLabel.replace(/ /g, '')}-${zoneValue}",\n`;
  jsCode += `    latitude: ${row.Latitude},\n`;
  jsCode += `    longitude: ${row.Longitude},\n`;
  jsCode += `    district: "${row.District}",\n`;
  jsCode += `    classification: "${row.Classification}"\n`;
  jsCode += `  }${idx < data.length - 1 ? ',' : ''}\n`;
});

jsCode += '];\n\n';
jsCode += 'module.exports = malaybalayLocations;\n';

// Write to file
fs.writeFileSync('C:\\Users\\USER\\OneDrive\\Documents\\Capstone\\EmergencyApp\\AdminWebApp\\backend\\utils\\malaybalayLocations.js', jsCode);

console.log('✓ Generated malaybalayLocations.js with ' + data.length + ' locations');
console.log('✓ File saved to: backend/utils/malaybalayLocations.js');

// Count barangays
const barangays = new Set(data.map(row => row.Barangay));
console.log('✓ Total Barangays:', barangays.size);
console.log('✓ Barangays:', Array.from(barangays).sort());
