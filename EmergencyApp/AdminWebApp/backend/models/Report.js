// models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: Number,
  severity: { type: String, enum: ['low','moderate','high','critical'], default: 'low' },
  note: { type: String, default: '' },
  status: { type: String, enum: ['new','pending','acknowledged','in_progress','on_the_way','ongoing','resolved','declined'], default: 'new' },
  geofenceRadiusMeters: Number,
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  disasterType: { type: String, default: '' },
  locationName: { type: String, default: '' },
  senderName: { type: String, default: '' },
  senderPhone: { type: String, default: null },
  // Rescue assignment
  assignedRescuer: {
    rescuerId: { type: String, default: null },
    rescuerName: { type: String, default: null },
    rescuerLat: { type: Number, default: null },
    rescuerLng: { type: Number, default: null },
    startedAt: { type: Date, default: null }
  },
  // Rescuer-side progress updates (admin still verifies final resolution)
  rescuerMissionStatus: {
    type: String,
    enum: ['none', 'on_the_way', 'ongoing', 'resolved'],
    default: 'none'
  },
  rescuerMissionUpdatedAt: { type: Date, default: null },
  rescuerMissionUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rescuerMissionNote: { type: String, default: '' },
  // Admin action tracking
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  declinedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  declinedAt: { type: Date, default: null },
  actionNote: { type: String, default: '' },
  isReadByAdmin: { type: Boolean, default: false },
  // ML Predictions
  mlPredictions: {
    disasterType: { type: String, default: null },
    disasterTypeConfidence: { type: Number, default: null },
    severity: { type: String, default: null },
    severityConfidence: { type: Number, default: null },
    isLegitimate: { type: Boolean, default: true },
    legitimacyConfidence: { type: Number, default: null },
    overall: {
      confidence: { type: Number, default: null },
      recommendation: { type: String, default: null },
      reason: { type: String, default: null },
    }
  },
  mlProcessedAt: { type: Date, default: null },
  // Hazard zone information
  hazardZones: [{
    zone: { type: String },
    distance: { type: String }, // Distance in km as string (e.g., "0.5")
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    hazardTypes: [{ type: String }] // e.g., ['Flood', 'Landslide']
  }],
  // Photo evidence fields
  photoUrl: { type: String, default: null },              // Victim incident photo
  resolutionPhotoUrl: { type: String, default: null },    // Rescuer proof-of-resolution photo
  
  // Routing and response performance metrics
  onTheWayAt: { type: Date, default: null },              // When rescuer tapped 'on the way'
  arrivedAt: { type: Date, default: null },               // When rescuer tapped 'ongoing' (arrived at scene)
  rescuerResolvedAt: { type: Date, default: null },       // When rescuer tapped 'resolved'
  startLat: { type: Number, default: null },              // Starting latitude of rescuer
  startLng: { type: Number, default: null },              // Starting longitude of rescuer
  arrivalLat: { type: Number, default: null },            // Rescuer latitude at arrival
  arrivalLng: { type: Number, default: null },            // Rescuer longitude at arrival
  responseDurationMinutes: { type: Number, default: null }, // Elapsed time from start to arrival (mins)
  responseDistanceMeters: { type: Number, default: null }, // Distance from start to incident scene (meters)
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
