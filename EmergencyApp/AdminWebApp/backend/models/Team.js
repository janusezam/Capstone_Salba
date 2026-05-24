// models/Team.js
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    enum: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
    unique: true 
  },
  leader: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  status: { 
    type: String, 
    enum: ['available', 'deployed', 'standby'], 
    default: 'available' 
  },
  currentMission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null
  },
  color: {
    type: String,
    default: '#10B981'
  }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
