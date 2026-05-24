// Script to create an open report for testing dispatch
const mongoose = require('mongoose');
const Report = require('./models/Report');
const User = require('./models/User');

async function createOpenReport() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/capstoneDB');
    console.log('✓ Connected to MongoDB');

    // Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    
    // Create a pending report
    const openReport = await Report.create({
      userId: admin?._id || null,
      lat: 8.2500,
      lng: 124.8500,
      accuracy: 50,
      severity: 'critical',
      status: 'pending',
      disasterType: 'Test Disaster',
      locationName: 'Test Location',
      senderName: 'Test Sender',
      note: 'Test report for dispatch testing'
    });

    console.log('\n✓ Test Report Created:');
    console.log(`  - ID: ${openReport._id}`);
    console.log(`  - Status: ${openReport.status}`);
    console.log(`  - Severity: ${openReport.severity}`);
    console.log(`  - Location: (${openReport.lat}, ${openReport.lng})`);
    console.log('\nUse this report ID to test dispatch endpoint');

    await mongoose.connection.close();
    
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

createOpenReport();
