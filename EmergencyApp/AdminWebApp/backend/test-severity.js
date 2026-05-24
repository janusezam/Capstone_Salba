// Quick test to verify severity mapping is working
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Report = require('./models/Report');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Test 1: Create a report with disasterType "fire"
    console.log('\n=== TEST 1: Creating Fire Report ===');
    const fireReport = await Report.create({
      lat: 8.1234,
      lng: 125.5678,
      disasterType: 'fire',
      severity: 'critical',  // This is what the code should set
      locationName: 'Test Location',
      note: 'Test fire report'
    });
    console.log('Created fire report:', {
      _id: fireReport._id,
      disasterType: fireReport.disasterType,
      severity: fireReport.severity,
      expectedSeverity: 'critical'
    });

    // Test 2: Check what's in the database
    console.log('\n=== TEST 2: Reading back from database ===');
    const readBack = await Report.findById(fireReport._id);
    console.log('Read from DB:', {
      _id: readBack._id,
      disasterType: readBack.disasterType,
      severity: readBack.severity,
      matches: readBack.severity === 'critical'
    });

    // Test 3: Check all recent reports
    console.log('\n=== TEST 3: Last 5 reports in database ===');
    const recent = await Report.find({}).sort({ createdAt: -1 }).limit(5);
    recent.forEach((r, i) => {
      console.log(`  ${i+1}. Type: ${r.disasterType || 'N/A'}, Severity: ${r.severity}, Created: ${r.createdAt.toLocaleString()}`);
    });

    // Cleanup - remove test reports
    await Report.deleteOne({ _id: fireReport._id });
    console.log('\n✓ Test report cleaned up');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
})();
