// Script to update old "Current Location (Bypasser)" reports to exact barangay names
const mongoose = require('mongoose');
const Report = require('./models/Report');
const malaybalayBarangays = require('./utils/malaybalayLocations');
const geolib = require('geolib');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/EmergencyAppDB';

const getNearestBarangay = (latitude, longitude) => {
  let nearestLocation = null;
  let shortestDistance = Infinity;
  
  malaybalayBarangays.forEach((location) => {
    if (location.latitude && location.longitude) {
      const distance = geolib.getDistance(
        { latitude, longitude },
        { latitude: location.latitude, longitude: location.longitude }
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestLocation = location;
      }
    }
  });
  
  if (!nearestLocation) {
    return { fullName: 'Current Location (Bypasser)', distance: 0 };
  }

  // Extract barangay number (1-11) and purok from label
  const match = nearestLocation.label.match(/Brgy\s+(\d+)\s+Purok\s+(\d+)/);
  const brgy = match ? match[1] : '1';
  const purok = match ? match[2] : '1';
  
  return {
    label: nearestLocation.label,
    fullName: `Brgy ${brgy} Purok ${purok} (Bypasser)`,
    distance: shortestDistance,
  };
};

async function migrateReports() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DB_URI);
    console.log('✓ Connected to MongoDB');

    // Find all reports with old location
    const reports = await Report.find({ 
      locationName: 'Current Location (Bypasser)' 
    });
    
    console.log(`📍 Found ${reports.length} reports with "Current Location (Bypasser)"`);

    if (reports.length === 0) {
      console.log('✅ No reports to migrate!');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    // Update each report with exact location
    for (const report of reports) {
      try {
        const nearestLocation = getNearestBarangay(report.lat, report.lng);
        report.locationName = nearestLocation.fullName;
        await report.save();
        updated++;
        console.log(`  ✓ Updated ${report._id}: ${nearestLocation.fullName} (${nearestLocation.distance}m away)`);
      } catch (err) {
        failed++;
        console.error(`  ✗ Failed to update ${report._id}:`, err.message);
      }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`  ✓ Updated: ${updated}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log(`✅ Migration completed!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during migration:', err.message);
    process.exit(1);
  }
}

migrateReports();
