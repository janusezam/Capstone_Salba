// ML Model for Disaster Severity Prediction
// This model learns from historical disaster reports to predict severity

const Report = require('../models/Report');

class DisasterSeverityPredictor {
  constructor() {
    this.trainingData = [];
    this.typeWeights = {
      'Fire': { critical: 0.7, high: 0.2, moderate: 0.1 },
      'Earthquake': { critical: 0.2, high: 0.6, moderate: 0.2 },
      'Flood': { high: 0.6, moderate: 0.3, low: 0.1 },
      'Landslide': { high: 0.7, moderate: 0.2, low: 0.1 },
      'Typhoon': { critical: 0.6, high: 0.3, moderate: 0.1 },
    };
  }

  // Train model on historical data
  async trainModel() {
    try {
      const reports = await Report.find({ disasterType: { $exists: true, $ne: '' } }).lean();
      this.trainingData = reports;
      console.log(`ML Model trained on ${reports.length} historical reports`);
      return reports.length;
    } catch (err) {
      console.error('Error training ML model:', err);
      return 0;
    }
  }

  // Predict severity based on disaster type and location
  predictSeverity(disasterType, lat = null, lng = null) {
    const baseWeights = this.typeWeights[disasterType] || {
      critical: 0.3,
      high: 0.4,
      moderate: 0.2,
      low: 0.1,
    };

    // Add location-based analysis (if we have historical data for this area)
    if (lat && lng && this.trainingData.length > 0) {
      const nearbyReports = this.trainingData.filter(r => {
        const distance = Math.sqrt(Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2));
        return distance < 0.1; // Within ~11km
      });

      if (nearbyReports.length > 0) {
        const avgSeverity = nearbyReports.reduce((sum, r) => {
          const severityScore = { low: 1, moderate: 2, high: 3, critical: 4 }[r.severity] || 2;
          return sum + severityScore;
        }, 0) / nearbyReports.length;

        // Adjust weights based on historical severity in area
        if (avgSeverity > 3) {
          baseWeights.critical = Math.min(0.9, baseWeights.critical + 0.2);
        }
      }
    }

    // Select severity level based on weighted probability
    const random = Math.random();
    let cumulative = 0;

    for (const [severity, weight] of Object.entries(baseWeights).sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
      return severityOrder[b[0]] - severityOrder[a[0]];
    })) {
      cumulative += weight;
      if (random <= cumulative) {
        return severity;
      }
    }

    return 'moderate';
  }

  // Get confidence score for prediction
  getConfidenceScore(disasterType) {
    const trainingCount = this.trainingData.filter(r => r.disasterType === disasterType).length;
    // More training data = higher confidence
    return Math.min(1, 0.3 + (trainingCount / 100) * 0.7);
  }
}

module.exports = new DisasterSeverityPredictor();
