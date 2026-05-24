const mongoose = require('mongoose');

const hazardZoneSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    unique: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  hazardTypes: {
    type: [String],
    enum: ['Flashflood', 'Landslide', 'Tornado', 'Typhoon', 'Whirlwind', 'Strong Wind'],
    required: true
  },
  incidentCount: {
    type: Number,
    default: 0
  },
  totalAffected: {
    type: Number,
    default: 0
  },
  totalDamages: {
    type: Number,
    default: 0
  },
  riskScore: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },
  events: [{
    type: {
      type: String,
      required: true
    },
    date: String,
    affected: Number,
    damages: Number
  }],
  radius: {
    type: Number,
    default: 2  // 2km radius for alert checks
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Geospatial index for nearby searches
hazardZoneSchema.index({ latitude: 1, longitude: 1 });
hazardZoneSchema.index({ riskLevel: 1 });
hazardZoneSchema.index({ location: 'text' });

module.exports = mongoose.model('HazardZone', hazardZoneSchema);
