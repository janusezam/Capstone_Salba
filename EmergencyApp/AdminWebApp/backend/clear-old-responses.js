// Clear old ongoing responses, keep only the latest Team Bravo one
const mongoose = require('mongoose');
const Report = require('./models/Report');
const Team = require('./models/Team');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/capstoneDB');
    
    // Get Team Bravo ID
    const bravoTeam = await Team.findOne({ name: 'Bravo' });
    
    // Get all ongoing reports
    const ongoingReports = await Report.find({
      status: { $in: ['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'] }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${ongoingReports.length} ongoing reports`);
    
    // Resolve all except the most recent Team Bravo one
    let keptOne = false;
    for (const report of ongoingReports) {
      const reportTeamId = report.assignedTeam?.toString();
      const bravoTeamId = bravoTeam._id.toString();
      
      // Keep only the latest Team Bravo response
      if (!keptOne && reportTeamId === bravoTeamId) {
        console.log(`✓ KEEPING: Team Bravo | ${report.locationName} | Created: ${report.createdAt}`);
        keptOne = true;
      } else {
        // Resolve all others
        report.status = 'resolved';
        report.resolvedAt = new Date();
        await report.save();
        const teamName = reportTeamId === bravoTeamId ? 'Bravo' : 'Other';
        console.log(`✓ RESOLVED: ${teamName} | ${report.locationName}`);
      }
    }
    
    // Show final count
    const finalOngoing = await Report.find({
      status: { $in: ['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'] }
    });
    
    console.log(`\n✓ Done! Active Responses remaining: ${finalOngoing.length}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
