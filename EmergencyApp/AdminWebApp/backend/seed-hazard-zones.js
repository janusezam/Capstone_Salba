const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import HazardZone model
const HazardZone = require('./models/HazardZone');

// Hazard zones data from Excel
const hazardZones = [
  {
    location: "Calacan Valley",
    latitude: 8.216,
    longitude: 125.134,
    riskLevel: "HIGH",
    hazardTypes: ["Flashflood"],
    incidentCount: 2,
    totalAffected: 500,
    totalDamages: 250000,
    riskScore: 8.5
  },
  {
    location: "Mount Kitanglad",
    latitude: 8.227,
    longitude: 125.213,
    riskLevel: "HIGH",
    hazardTypes: ["Strong Wind"],
    incidentCount: 2,
    totalAffected: 300,
    totalDamages: 150000,
    riskScore: 8.0
  },
  {
    location: "Sayre Highway",
    latitude: 8.203,
    longitude: 125.156,
    riskLevel: "HIGH",
    hazardTypes: ["Landslide"],
    incidentCount: 2,
    totalAffected: 200,
    totalDamages: 100000,
    riskScore: 8.2
  },
  {
    location: "Bugnay",
    latitude: 8.197,
    longitude: 125.167,
    riskLevel: "MEDIUM",
    hazardTypes: ["Flashflood"],
    incidentCount: 1,
    totalAffected: 150,
    totalDamages: 50000,
    riskScore: 5.5
  },
  {
    location: "Manolo Fortich",
    latitude: 8.234,
    longitude: 125.189,
    riskLevel: "MEDIUM",
    hazardTypes: ["Typhoon"],
    incidentCount: 2,
    totalAffected: 100,
    totalDamages: 30000,
    riskScore: 5.0
  },
  {
    location: "Sitio Makilala",
    latitude: 8.198,
    longitude: 125.145,
    riskLevel: "MEDIUM",
    hazardTypes: ["Tornado"],
    incidentCount: 1,
    totalAffected: 75,
    totalDamages: 20000,
    riskScore: 4.8
  },
  {
    location: "Tankulan",
    latitude: 8.211,
    longitude: 125.178,
    riskLevel: "MEDIUM",
    hazardTypes: ["Flashflood"],
    incidentCount: 2,
    totalAffected: 200,
    totalDamages: 60000,
    riskScore: 5.3
  },
  {
    location: "Melendez",
    latitude: 8.15915,
    longitude: 125.12774,
    riskLevel: "MEDIUM",
    hazardTypes: ["Flashflood", "Whirlwind"],
    incidentCount: 1,
    totalAffected: 100,
    totalDamages: 25000,
    riskScore: 5.2
  },
  {
    location: "Sersadon",
    latitude: 8.208,
    longitude: 125.182,
    riskLevel: "LOW",
    hazardTypes: ["Flashflood"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 2.0
  },
  {
    location: "Upper Bukidnon",
    latitude: 8.24,
    longitude: 125.20,
    riskLevel: "LOW",
    hazardTypes: ["Strong Wind"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.8
  },
  {
    location: "Kianggigan",
    latitude: 8.218,
    longitude: 125.177,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.5
  },
  {
    location: "Magsaysay Avenue",
    latitude: 8.2,
    longitude: 125.135,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.5
  },
  {
    location: "Bayabas",
    latitude: 8.212,
    longitude: 125.169,
    riskLevel: "LOW",
    hazardTypes: ["Flashflood"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.0
  },
  {
    location: "Purok 1",
    latitude: 8.205,
    longitude: 125.140,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.2
  },
  {
    location: "Purok 2",
    latitude: 8.210,
    longitude: 125.160,
    riskLevel: "LOW",
    hazardTypes: ["Flashflood"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.3
  },
  {
    location: "Purok 3",
    latitude: 8.215,
    longitude: 125.175,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.1
  },
  {
    location: "Purok 4",
    latitude: 8.220,
    longitude: 125.190,
    riskLevel: "LOW",
    hazardTypes: ["Flashflood"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.4
  },
  {
    location: "Purok 5",
    latitude: 8.225,
    longitude: 125.165,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.2
  },
  {
    location: "Purok 6",
    latitude: 8.200,
    longitude: 125.155,
    riskLevel: "LOW",
    hazardTypes: ["Flashflood"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.3
  },
  {
    location: "Purok 7",
    latitude: 8.210,
    longitude: 125.185,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.0
  },
  {
    location: "Purok 8",
    latitude: 8.235,
    longitude: 125.140,
    riskLevel: "LOW",
    hazardTypes: ["Flashflood"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.2
  },
  {
    location: "Purok 9",
    latitude: 8.208,
    longitude: 125.198,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.1
  },
  {
    location: "Commercial District",
    latitude: 8.215,
    longitude: 125.145,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 2.5
  },
  {
    location: "Hospital Zone",
    latitude: 8.219,
    longitude: 125.152,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.0
  },
  {
    location: "School District",
    latitude: 8.206,
    longitude: 125.173,
    riskLevel: "LOW",
    hazardTypes: ["Tornado"],
    incidentCount: 0,
    totalAffected: 0,
    totalDamages: 0,
    riskScore: 1.0
  }
];

async function seedHazardZones() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/capstoneDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB connected');

    // Clear existing hazard zones
    await HazardZone.deleteMany({});
    console.log('✓ Cleared existing hazard zones');

    // Insert new hazard zones
    const result = await HazardZone.insertMany(hazardZones);
    console.log(`✓ Seeded ${result.length} hazard zones`);

    // Count by risk level
    const stats = await HazardZone.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);
    console.log('\n📊 Hazard Zone Statistics:');
    stats.forEach(stat => {
      console.log(`  • ${stat._id}: ${stat.count} zones`);
    });

    console.log('\n✅ Hazard zone seeding complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding hazard zones:', error);
    process.exit(1);
  }
}

seedHazardZones();
