const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Define bilingual term schema
const bilingualTermSchema = new mongoose.Schema({
  english: { type: String, required: true, unique: true },
  bisaya: String,
  tagalog: String,
  category: String,
  urgencyScore: { type: Number, default: 1 }, // 1-10 scale
  exampleSentence: String,
  keywords: [String],
  createdAt: { type: Date, default: Date.now }
});

const BilingualTerm = mongoose.model('BilingualTerm', bilingualTermSchema);

// Read Excel file
function readBilingualDataset() {
  const filePath = path.join(process.env.USERPROFILE, 'Downloads', 'English_to_Bisaya_Disaster_Dataset.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}

// Assign urgency scores based on category
function getUrgencyScore(category) {
  const urgencyMap = {
    'Death & Casualties': 10,
    'Injuries': 9,
    'Medical Emergency': 9,
    'Fire/Explosion': 8,
    'Structural Damage': 8,
    'Missing Person': 8,
    'Environmental Hazard': 7,
    'Flooding': 7,
    'Landslide': 7,
    'Evacuation': 6,
    'Property Damage': 5,
    'Traffic Incident': 4,
    'General Assistance': 2
  };
  
  return urgencyMap[category] || 3;
}

// Extract keywords from English term
function extractKeywords(englishTerm) {
  return englishTerm.toLowerCase()
    .split('/')[0] // Take first term if multiple
    .split(' ')
    .filter(word => word.length > 3);
}

async function seedBilingualTerms() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/capstoneDB');
    console.log('✓ MongoDB connected');

    // Clear existing terms
    await BilingualTerm.deleteMany({});
    console.log('✓ Cleared existing bilingual terms');

    // Read dataset
    const dataset = readBilingualDataset();
    console.log(`\n✓ Loaded ${dataset.length} records from Excel`);

    // Prepare data
    const terms = dataset.map(record => ({
      english: record.English || '',
      bisaya: record['Bisaya (Cebuano)'] || record.Bisaya || '',
      tagalog: record.Tagalog || record['Tagalog (Filipino)'] || '',
      category: record.Category || 'General',
      urgencyScore: getUrgencyScore(record.Category),
      exampleSentence: record['Example Sentence'] || '',
      keywords: extractKeywords(record.English || '')
    })).filter(term => term.english); // Remove empty entries

    if (terms.length === 0) {
      console.error('❌ No valid terms found in dataset');
      process.exit(1);
    }

    // Insert into MongoDB
    const result = await BilingualTerm.insertMany(terms);
    console.log(`\n✅ Seeded ${result.length} bilingual terms`);

    // Show statistics
    const stats = await BilingualTerm.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, avgUrgency: { $avg: '$urgencyScore' } } },
      { $sort: { avgUrgency: -1 } }
    ]);

    console.log('\n📊 Category Statistics:');
    stats.forEach(stat => {
      console.log(`  • ${stat._id}: ${stat.count} terms (Avg Urgency: ${stat.avgUrgency.toFixed(1)}/10)`);
    });

    // Show urgency distribution
    const urgencyStats = await BilingualTerm.aggregate([
      { $group: { _id: '$urgencyScore', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    console.log('\n🎯 Urgency Distribution:');
    urgencyStats.forEach(stat => {
      console.log(`  • Level ${stat._id}: ${stat.count} terms`);
    });

    console.log('\n✅ Bilingual dataset seeding complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding bilingual terms:', error.message);
    process.exit(1);
  }
}

seedBilingualTerms();
