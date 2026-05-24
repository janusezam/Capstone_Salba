// Check if active response was created
const mongoose = require('mongoose');
const Report = require('./models/Report');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/capstoneDB');
    
    // Check what statuses exist
    const reports = await Report.find({ assignedTeam: { $ne: null } });
    console.log('Reports with assigned teams:');
    reports.forEach(r => {
      console.log('  - Status:', r.status, '| Team:', r.assignedTeam, '| Location:', r.locationName);
    });
    
    // Check for Ongoing status
    const ongoingReports = await Report.find({
      status: { $in: ['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'] }
    });
    console.log('\nReports with Ongoing status:', ongoingReports.length);
    ongoingReports.forEach(r => {
      console.log('  - Status:', r.status, '| Team:', r.assignedTeam, '| Location:', r.locationName);
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
