// Script to create an active response for deployed Team Bravo
const mongoose = require('mongoose');
const Team = require('./models/Team');
const Report = require('./models/Report');
const User = require('./models/User');

async function createTeamBravoResponse() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/capstoneDB');
    console.log('✓ Connected to MongoDB');

    // Try to find Team Bravo
    let teamBravo = await Team.findOne({ name: 'Bravo' }).populate('members');
    
    if (!teamBravo) {
      console.log('⚠ Team Bravo not found. Looking for existing teams...');
      const allTeams = await Team.find().select('name _id');
      console.log('Available teams:', allTeams.map(t => t.name).join(', '));
      
      // If teams exist, use the first one
      if (allTeams.length > 0) {
        teamBravo = await Team.findById(allTeams[0]._id).populate('members');
        console.log(`ℹ Using team: ${teamBravo.name}`);
      } else {
        console.log('✗ No teams found in database');
        process.exit(1);
      }
    }

    console.log(`ℹ Team: ${teamBravo.name}`);
    console.log(`ℹ Members: ${teamBravo.members.map(m => m.name).join(', ')}`);

    // Create an active response in central Malaybalay location
    // Get first team member as assigned rescuer
    const assignedRescuer = teamBravo.members[0];
    
    const activeResponse = await Report.create({
      userId: assignedRescuer?._id || null,
      lat: 8.2465,  // Central Malaybalay (Incident location)
      lng: 124.8497,
      accuracy: 50,
      severity: 'high',
      status: 'ongoing',
      assignedTeam: teamBravo._id,
      assignedRescuer: assignedRescuer ? {
        rescuerId: assignedRescuer._id,
        rescuerName: assignedRescuer.name,
        rescuerLat: 8.2400,  // Near incident (0.006 degrees = ~670m away)
        rescuerLng: 124.8450,
        startedAt: new Date()
      } : null,
      disasterType: 'Active Response',
      locationName: 'Malaybalay City Center',
      senderName: 'System',
      note: `Team ${teamBravo.name} deployed for emergency response`
    });

    console.log('✓ Active Response Created:');
    console.log(`  - ID: ${activeResponse._id}`);
    console.log(`  - Status: ${activeResponse.status}`);
    console.log(`  - Location: ${activeResponse.locationName} (${activeResponse.lat}, ${activeResponse.lng})`);
    console.log(`  - Team: ${teamBravo.name}`);

    await mongoose.connection.close();
    console.log('\n✓ Done! Team Bravo is now showing in Active Responses');
    
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

createTeamBravoResponse();
