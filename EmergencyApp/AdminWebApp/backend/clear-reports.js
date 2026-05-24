// Script to clear all reports from the database
const mongoose = require('mongoose');
const Report = require('./models/Report');
require('dotenv').config();

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/EmergencyAppDB';

async function clearReports() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DB_URI);
    console.log('✓ Connected to MongoDB');

    // Delete all reports
    const result = await Report.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} reports from database`);

    // Get count after deletion
    const remaining = await Report.countDocuments();
    console.log(`✓ Remaining reports: ${remaining}`);

    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing reports:', err.message);
    process.exit(1);
  }
}

clearReports();
