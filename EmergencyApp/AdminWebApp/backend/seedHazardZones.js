const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const HazardZone = require('./models/HazardZone.js');
const db = require('./config/db.js');

async function seedHazardZones() {
  try {
    console.log('[*] Connecting to MongoDB...');
    await mongoose.connect(process.env.MongoDB_URI || 'mongodb://localhost:27017/emergencyapp');
    console.log('[✓] Connected to MongoDB');

    // Read hazard zones from JSON
    const hazardZonesData = JSON.parse(fs.readFileSync('./hazard_zones.json', 'utf8'));
    
    console.log(`[*] Seeding ${hazardZonesData.length} hazard zones...`);

    // Clear existing hazard zones
    await HazardZone.deleteMany({});
    console.log('[✓] Cleared existing hazard zones');

    // Insert new hazard zones
    const result = await HazardZone.insertMany(hazardZonesData);
    console.log(`[✓] Successfully seeded ${result.length} hazard zones`);

    // Display summary
    const highRiskCount = await HazardZone.countDocuments({ riskLevel: 'HIGH' });
    const mediumRiskCount = await HazardZone.countDocuments({ riskLevel: 'MEDIUM' });
    const lowRiskCount = await HazardZone.countDocuments({ riskLevel: 'LOW' });

    console.log('\n=== Hazard Zone Distribution ===');
    console.log(`HIGH Risk Zones: ${highRiskCount}`);
    console.log(`MEDIUM Risk Zones: ${mediumRiskCount}`);
    console.log(`LOW Risk Zones: ${lowRiskCount}`);

    // Show top zones
    console.log('\n=== Top 5 Highest Risk Zones ===');
    const topZones = await HazardZone.find()
      .sort({ riskScore: -1 })
      .limit(5);
    
    topZones.forEach((zone, idx) => {
      console.log(`${idx + 1}. ${zone.location} (Risk: ${zone.riskLevel}, Score: ${zone.riskScore.toFixed(1)})`);
    });

    console.log('\n[✓] Hazard zone seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('[✗] Error seeding hazard zones:', error.message);
    process.exit(1);
  }
}

seedHazardZones();
