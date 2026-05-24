// Test API response
const mongoose = require('mongoose');
const Report = require('./models/Report');
const Team = require('./models/Team');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/capstoneDB');
    
    // Simulate what the API endpoint does
    const ongoingReports = await Report.find({
      status: { $in: ['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'] }
    })
      .populate('userId', 'name email')
      .populate('assignedTeam', 'name leader members')
      .sort({ createdAt: -1 });
    
    console.log('✓ Ongoing reports found:', ongoingReports.length);
    ongoingReports.forEach(r => {
      console.log(`  - ${r.assignedTeam?.name || 'No Team'} | ${r.locationName} | Status: ${r.status}`);
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
