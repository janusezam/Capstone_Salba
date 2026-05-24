const mongoose = require('mongoose');

const bilingualTermSchema = new mongoose.Schema({
  english: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  bisaya: {
    type: String,
    index: true
  },
  tagalog: {
    type: String,
    index: true
  },
  category: {
    type: String,
    enum: [
      'Death & Casualties',
      'Injuries',
      'Medical Emergency',
      'Fire/Explosion',
      'Structural Damage',
      'Missing Person',
      'Environmental Hazard',
      'Flooding',
      'Landslide',
      'Evacuation',
      'Property Damage',
      'Traffic Incident',
      'General Assistance'
    ],
    default: 'General Assistance'
  },
  urgencyScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 3
  },
  exampleSentence: String,
  keywords: [String],
  usage_count: {
    type: Number,
    default: 0
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

// Full-text search index
bilingualTermSchema.index({
  english: 'text',
  bisaya: 'text',
  tagalog: 'text',
  keywords: 'text'
});

module.exports = mongoose.model('BilingualTerm', bilingualTermSchema);
