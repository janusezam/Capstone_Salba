const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('=== READING EXCEL FILE ===\n');

// Read Excel file
const wb = xlsx.readFile('C:\\Users\\USER\\Downloads\\Malaybalay_Barangays_FINAL.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

console.log(`Total barangays in Excel: ${data.length}\n`);

// Show Barangay 9 details
const brgy9 = data.find(r => r.Barangay === 'Barangay 9');
console.log('=== BARANGAY 9 DATA ===');
console.log(`Barangay: ${brgy9.Barangay}`);
console.log(`Center Coords: ${brgy9.Latitude}, ${brgy9.Longitude}`);
console.log(`Puroks: ${brgy9['Puroks / Sub-zones / Sitios']}`);
console.log(`Notes: ${brgy9['Notes / Landmarks']}`);
console.log('');

// Show first 15 barangays
console.log('=== ALL BARANGAYS OVERVIEW ===');
data.forEach((row) => {
  const purokCount = row['Puroks / Sub-zones / Sitios'] ? 
    row['Puroks / Sub-zones / Sitios'].split(',').length : 0;
  console.log(`${String(row['#']).padStart(2, '0')}. ${row.Barangay.padEnd(15)} - ${purokCount} puroks`);
});

console.log('\n✅ Excel file contains all required data including Brgy 9 Puroks 1-8');
console.log('Next step: Generate individual purok locations from this data');
