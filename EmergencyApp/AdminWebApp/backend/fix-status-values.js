const mongoose = require('mongoose');
const Report = require('./models/Report');
require('dotenv').config({ path: '.env' });

async function fixStatusValues() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔧 Connected to MongoDB\n');

    // Find all reports with non-lowercase statuses
    const reports = await Report.find({
      status: {
        $in: [
          'New', 'Pending', 'Acknowledged', 'In Progress',
          'On The Way', 'Ongoing', 'Resolved', 'Declined',
          'On_The_Way', 'In_Progress'
        ]
      }
    });

    console.log(`Found ${reports.length} reports with non-lowercase status values\n`);

    const updates = [];
    for (const report of reports) {
      const oldStatus = report.status;
      let newStatus = oldStatus.toLowerCase().replace(/_/g, '_');
      
      // Handle special case "On The Way"
      if (oldStatus === 'On The Way') {
        newStatus = 'on_the_way';
      } else if (oldStatus === 'In Progress') {
        newStatus = 'in_progress';
      }

      console.log(`  Updating: "${oldStatus}" → "${newStatus}"`);
      
      await Report.updateOne(
        { _id: report._id },
        { status: newStatus }
      );
      updates.push({ id: report._id, from: oldStatus, to: newStatus });
    }

    console.log(`\n✅ Updated ${updates.length} reports`);
    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.connection.close();
  }
}

fixStatusValues();
