// Get all team IDs for testing
const mongoose = require('mongoose');
const Team = require('./models/Team');

async function getTeamIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/capstoneDB');
    
    const teams = await Team.find().select('name _id leader members');
    console.log('\n✓ Available Teams:');
    teams.forEach(team => {
      console.log(`  - ${team.name}: ${team._id}`);
      console.log(`    Members: ${team.members.length}`);
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getTeamIds();
