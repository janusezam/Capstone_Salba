const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\DRRM-Plan-final.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets['Table 1']);

// Get all barangays from existing locations for reference
const malaybalayLocations = require('./utils/malaybalayLocations.js').locations || [];
const hazardRecords = [];

// Map of known hazard types
const HAZARD_TYPES = {
  'Flashflood': 'Flashflood',
  'Landslide': 'Landslide',
  'Tornado': 'Tornado',
  'Typhoon': 'Typhoon',
  'Whirlwind': 'Whirlwind',
  'Strong Winds': 'Strong Wind'
};

// Extract cleaner records
const barangayNames = [
  'Violeta', 'San Martin', 'Simaya', 'Sto. Niño', 'Panamucan', 'Sumpong', 
  'Magsaysay', 'Indalasa', 'Casisang', 'Linabo', 'Barangay 7', 'Barangay 9',
  'Bangcud', 'Manalog', 'San Jose', 'Cabangahan', 'Zamboanguita', 'Can-ayan'
];

let currentHazard = null;

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  
  // Detect hazard type changes (simple keywords)
  if (row['MALAYBALAY CITY DISASTER RISK REDUCTION AND MANAGEMENT PLAN 2015 –']) {
    const val = String(row['MALAYBALAY CITY DISASTER RISK REDUCTION AND MANAGEMENT PLAN 2015 –']).trim();
    for (const [key, type] of Object.entries(HAZARD_TYPES)) {
      if (val.includes(key) && val.length < 100) {
        currentHazard = type;
        break;
      }
    }
  }
  
  // Look for record rows: has location + numeric data
  if (currentHazard && row.__EMPTY) {
    const location = String(row.__EMPTY).trim();
    const familiesAffected = parseInt(row.__EMPTY_3) || 0;
    const individualsAffected = parseInt(row.__EMPTY_7) || 0;
    
    // Check if this looks like a valid record
    if (barangayNames.some(b => location.toLowerCase().includes(b.toLowerCase())) &&
        (familiesAffected > 0 || individualsAffected > 0)) {
      
      const dateNum = row['MALAYBALAY CITY DISASTER RISK REDUCTION AND MANAGEMENT PLAN 2015 –'];
      let dateStr = 'Unknown';
      
      if (typeof dateNum === 'number' && dateNum > 30000) {
        try {
          const excelDate = new Date((dateNum - 25569) * 86400 * 1000);
          dateStr = excelDate.toISOString().split('T')[0];
        } catch (e) {
          // keep dateStr as Unknown
        }
      }
      
      // Find coordinates
      const coords = malaybalayLocations.find(l => 
        (l.purok && l.purok.toLowerCase().includes(location.toLowerCase())) ||
        (l.barangay && l.barangay.toLowerCase().includes(location.toLowerCase()))
      );
      
      hazardRecords.push({
        hazardType: currentHazard,
        location: location,
        date: dateStr,
        familiesAffected: familiesAffected,
        individualsAffected: individualsAffected,
        farmersAffected: parseInt(row.__EMPTY_8) || 0,
        totalDamages: parseInt(row.__EMPTY_17) || 0,
        latitude: coords?.latitude || 8.15831,  // Default Malaybalay center
        longitude: coords?.longitude || 125.03631,
        barangay: location
      });
    }
  }
}

console.log(`Found ${hazardRecords.length} hazard records`);

// Create hazard zones (aggregated by location)
const hazardZonesByLocation = {};

hazardRecords.forEach(record => {
  const locKey = record.location.toLowerCase();
  if (!hazardZonesByLocation[locKey]) {
    hazardZonesByLocation[locKey] = {
      location: record.location,
      latitude: record.latitude,
      longitude: record.longitude,
      hazardTypes: new Set(),
      incidentCount: 0,
      totalAffected: 0,
      totalDamages: 0,
      riskScore: 0,
      events: []
    };
  }
  
  const zone = hazardZonesByLocation[locKey];
  zone.hazardTypes.add(record.hazardType);
  zone.incidentCount++;
  zone.totalAffected += record.individualsAffected;
  zone.totalDamages += record.totalDamages;
  zone.events.push({
    type: record.hazardType,
    date: record.date,
    affected: record.individualsAffected,
    damages: record.totalDamages
  });
});

// Calculate risk scores and levels
const hazardZones = Object.values(hazardZonesByLocation).map(zone => {
  zone.hazardTypes = Array.from(zone.hazardTypes);
  
  // Risk score: incidents * 10 + hazard types * 5 + (affected / 10) + (damages / 100000)
  zone.riskScore = (zone.incidentCount * 10) + 
                   (zone.hazardTypes.length * 5) + 
                   Math.min(zone.totalAffected / 10, 50) +
                   Math.min(zone.totalDamages / 100000, 50);
  
  // Risk level
  if (zone.riskScore >= 50 || zone.incidentCount >= 5) {
    zone.riskLevel = 'HIGH';
  } else if (zone.riskScore >= 25 || zone.incidentCount >= 3) {
    zone.riskLevel = 'MEDIUM';
  } else {
    zone.riskLevel = 'LOW';
  }
  
  return zone;
});

hazardZones.sort((a, b) => b.riskScore - a.riskScore);

console.log('\n=== Hazard Zone Summary ===');
console.log(`Total zones: ${hazardZones.length}`);
console.log(`Total incidents: ${hazardRecords.length}`);
console.log(`Total affected: ${hazardRecords.reduce((s, r) => s + r.individualsAffected, 0)}`);

console.log('\n=== Top 10 High Risk Zones ===');
hazardZones.filter(z => z.riskLevel === 'HIGH').slice(0, 10).forEach(z => {
  console.log(`${z.location}: ${z.hazardTypes.join('/')} (${z.incidentCount} incidents, ${z.totalAffected} affected, Score: ${z.riskScore.toFixed(1)})`);
});

// Save to files
fs.writeFileSync('hazard_records.json', JSON.stringify(hazardRecords, null, 2));
fs.writeFileSync('hazard_zones.json', JSON.stringify(hazardZones, null, 2));

console.log('\n✓ Data saved to hazard_records.json and hazard_zones.json');
