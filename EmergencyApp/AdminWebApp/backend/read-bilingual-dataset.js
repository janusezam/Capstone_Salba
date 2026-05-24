const XLSX = require('xlsx');
const path = require('path');

// Read the bilingual dataset
const filePath = path.join(process.env.USERPROFILE, 'Downloads', 'English_to_Bisaya_Disaster_Dataset.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('\n📊 ===== BILINGUAL DISASTER DATASET =====');
console.log(`\n✓ Total Records: ${data.length}`);
console.log(`✓ Columns: ${Object.keys(data[0] || {}).join(', ')}`);
console.log(`\n📝 Sample Records (First 5):`);

data.slice(0, 5).forEach((record, i) => {
  console.log(`\n${i + 1}. ${JSON.stringify(record, null, 2)}`);
});

console.log(`\n\n📈 Data Structure:`);
console.log(JSON.stringify(data[0], null, 2));
