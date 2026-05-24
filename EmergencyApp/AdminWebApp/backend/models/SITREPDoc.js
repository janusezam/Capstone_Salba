// models/SITREPDoc.js
const mongoose = require('mongoose');

const sitrepDocSchema = new mongoose.Schema({
  // Template type
  templateType: {
    type: String,
    enum: ['SITREP1', 'SITREP2'],
    required: true,
    unique: true
  },
  
  // Documentation content (markdown or rich text)
  content: {
    type: String,
    default: ''
  },
  
  // Version tracking
  version: {
    type: Number,
    default: 1
  },
  
  // Last edited by admin
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-update version on save
sitrepDocSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.version += 1;
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SITREPDoc', sitrepDocSchema);
