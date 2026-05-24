// models/PredictionCache.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const predictionCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  latitude: { type: Number },
  longitude: { type: Number },
  predictions: {
    disasterType: String,
    disasterTypeConfidence: Number,
    severity: String,
    severityConfidence: Number,
    isLegitimate: Boolean,
    legitimacyConfidence: Number,
    overall: {
      confidence: Number,
      recommendation: String
    }
  },
  hitCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 1800 }
});

predictionCacheSchema.statics.getCache = async function(description, latitude, longitude) {
  const cacheKey = this._generateKey(description, latitude, longitude);
  const cached = await this.findOneAndUpdate(
    { cacheKey },
    { $inc: { hitCount: 1 } },
    { new: true }
  );
  return cached ? cached.predictions : null;
};

predictionCacheSchema.statics.setCache = async function(description, latitude, longitude, predictions) {
  const cacheKey = this._generateKey(description, latitude, longitude);
  return await this.findOneAndUpdate(
    { cacheKey },
    { cacheKey, description, latitude, longitude, predictions, hitCount: 0 },
    { upsert: true, new: true }
  );
};

predictionCacheSchema.statics._generateKey = function(description, latitude, longitude) {
  const data = `${description || ''}|${latitude || 0}|${longitude || 0}`;
  return crypto.createHash('md5').update(data).digest('hex');
};

predictionCacheSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const totalHits = (await this.aggregate([
    { $group: { _id: null, totalHits: { $sum: '$hitCount' } } }
  ]))[0]?.totalHits || 0;
  return {
    cachedPredictions: total,
    totalCacheHits: totalHits,
    averageHitsPerCache: total > 0 ? (totalHits / total).toFixed(2) : 0
  };
};

module.exports = mongoose.model('PredictionCache', predictionCacheSchema);
