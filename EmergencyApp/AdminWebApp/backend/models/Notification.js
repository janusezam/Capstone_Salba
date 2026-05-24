// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  type: { 
    type: String, 
    enum: ['dispatch', 'mission_complete', 'team_update', 'alert'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    lat: Number,
    lng: Number,
    address: String,
  },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
