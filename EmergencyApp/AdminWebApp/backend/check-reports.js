const mongoose = require('mongoose');
const Report = require('./models/Report');
require('dotenv').config({ path: '.env' });

async function checkReports() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Connected to MongoDB\n');

    const reports = await Report.find()
      .select('disasterType status rescuerMissionStatus createdAt senderName note')
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`Found ${reports.length} reports:\n`);
    reports.forEach((r, i) => {
      console.log(`[${i+1}] Report Details:`);
      console.log(`  - _id: ${r._id}`);
      console.log(`  - Disaster Type: ${r.disasterType || 'EMPTY'}`);
      console.log(`  - Report Status: ${r.status}`);
      console.log(`  - Rescuer Mission Status: ${r.rescuerMissionStatus}`);
      console.log(`  - CreatedAt: ${r.createdAt || 'MISSING'}`);
      console.log(`  - Sender: ${r.senderName}`);
      console.log();
    });

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkReports();
