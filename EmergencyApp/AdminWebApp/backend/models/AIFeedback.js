// models/AIFeedback.js
const mongoose = require('mongoose');

const aiFeedbackSchema = new mongoose.Schema({
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Original AI Prediction
  aiPrediction: {
    isLegitimate: { type: Boolean, default: null },
    isCritical: { type: Boolean, default: null },
    severity: { type: String, default: null },
    disasterType: { type: String, default: null },
    confidence: { type: Number, default: null },
  },

  // Admin Correction
  adminCorrection: {
    isLegitimate: { type: Boolean, default: null },
    isCritical: { type: Boolean, default: null },
    severity: { type: String, enum: ['low', 'moderate', 'high', 'critical'], default: null },
    disasterType: { type: String, default: null },
    notes: { type: String, default: '' },
  },

  // Feedback Metadata
  feedbackType: { type: String, enum: ['correction', 'confirmation'], default: 'correction' },
  isAccurate: { type: Boolean, default: null }, // true if admin confirms AI was right
  confidenceAfterFeedback: { type: Number, default: null },
  
  // Learning Impact
  improvementPoints: { type: Number, default: 0 },
  categoryMisclassified: { type: String, default: '' }, // which category was wrong

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for quick lookups
aiFeedbackSchema.index({ reportId: 1, adminId: 1 });
aiFeedbackSchema.index({ createdAt: -1 });
aiFeedbackSchema.index({ isAccurate: 1 });

module.exports = mongoose.model('AIFeedback', aiFeedbackSchema);
