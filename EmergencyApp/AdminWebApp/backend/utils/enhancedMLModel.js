// utils/enhancedMLModel.js - Comprehensive AI System for SALBA

const Report = require('../models/Report');
const geolib = require('geolib');

class SALBAIntelligenceEngine {
  constructor() {
    this.trainingData = [];
    this.hotspots = [];
  }

  /* ================================
     1. EMERGENCY CLASSIFICATION
     ================================ */
  classifyEmergency(reportText, disasterType, severity) {
    // Keyword-based classification with ML confidence
    const keywords = {
      'Fire': ['fire', 'burn', 'blaze', 'smoke', 'flame', 'burning'],
      'Flood': ['flood', 'water', 'submerged', 'inundated', 'overflow', 'drowning'],
      'Earthquake': ['earthquake', 'quake', 'tremor', 'seismic', 'shaking'],
      'Landslide': ['landslide', 'mudslide', 'soil', 'ground failure', 'slope'],
      'Typhoon': ['typhoon', 'storm', 'wind', 'cyclone', 'hurricane', 'heavy rain'],
    };

    let classification = disasterType;
    let confidence = 0.5;

    // Enhanced confidence based on text keywords + reported type
    Object.entries(keywords).forEach(([type, words]) => {
      const matches = words.filter(word => reportText.toLowerCase().includes(word)).length;
      if (matches > 0) {
        const scoreIncrease = (matches / 5) * 0.5; // Match percentage
        if (type === disasterType) {
          confidence = Math.min(1, 0.5 + scoreIncrease);
        }
      }
    });

    // Final classification
    if (!disasterType && reportText) {
      // If no type provided, guess from keywords
      let bestMatch = 'Other';
      let bestScore = 0;
      Object.entries(keywords).forEach(([type, words]) => {
        const score = words.filter(w => reportText.toLowerCase().includes(w)).length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = type;
        }
      });
      classification = bestMatch;
      confidence = Math.min(1, 0.3 + (bestScore / 5) * 0.7);
    }

    return {
      classifiedType: classification,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /* ================================
     2. SEVERITY ASSESSMENT
     ================================ */
  assessSeverity(disasterType, lat, lng, reportText = '') {
    const baseSeverity = {
      'Fire': 'high',
      'Earthquake': 'high',
      'Flood': 'high',
      'Landslide': 'high',
      'Typhoon': 'critical',
    };

    const severity = baseSeverity[disasterType] || 'moderate';

    // Check if in historical hotspot
    const inHotspot = this.hotspots.some(hotspot =>
      geolib.getDistance(
        { latitude: hotspot.lat, longitude: hotspot.lng },
        { latitude: lat, longitude: lng }
      ) < hotspot.radiusMeters
    );

    // Escalate severity if in hotspot
    const escalatedSeverity = inHotspot && severity === 'high' ? 'critical' : severity;

    // Text analysis for urgency keywords
    const urgencyKeywords = ['immediate', 'urgent', 'critical', 'emergency', 'life threat'];
    const urgencyScore = urgencyKeywords.filter(k => reportText.toLowerCase().includes(k)).length;

    const finalSeverity = urgencyScore > 2 ? 'critical' : escalatedSeverity;

    return {
      severity: finalSeverity,
      inHotspot,
      urgencyIndicators: urgencyScore,
      recommendation: this.getSeverityAction(finalSeverity),
    };
  }

  /* ================================
     3. REPORT VERIFICATION (Duplicate & False Alarm Detection)
     ================================ */
  verifyReport(newReport, existingReports) {
    const { lat, lng, disasterType, reportText, userId } = newReport;

    // DETECTION: One-tap SOS (no reportText but valid disasterType)
    const isOneTapSOS = !reportText || reportText.trim().length === 0;

    let duplicateScore = 0;
    let falseAlarmRisk = 0;
    let issues = [];

    // For one-tap SOS: Verify legitimacy and assess criticality - AI identifies what admin should do
    if (isOneTapSOS) {
      // Check for obvious duplicates even in one-tap
      existingReports.forEach(existing => {
        const distance = geolib.getDistance(
          { latitude: existing.lat, longitude: existing.lng },
          { latitude: lat, longitude: lng }
        );

        const timeDiff = (new Date() - new Date(existing.createdAt)) / 1000 / 60; // minutes

        // Flag if EXACT same location, same type, within 5 minutes = likely duplicate tap
        if (distance < 50 && existing.disasterType === disasterType && timeDiff < 5) {
          duplicateScore += 0.6;
          issues.push('Similar one-tap alert from same location moments ago');
        }

        // Same user, multiple taps in short time = potential false alarm
        if (existing.userId?.toString() === userId?.toString() && timeDiff < 3) {
          falseAlarmRisk += 0.4;
          issues.push('Multiple alerts from same user in very short time');
        }
      });

      // Assess criticality based on disaster type and location hotspot
      const isInHotspot = this.hotspots.some(hotspot =>
        geolib.getDistance(
          { latitude: hotspot.lat, longitude: hotspot.lng },
          { latitude: lat, longitude: lng }
        ) < hotspot.radiusMeters
      );

      const baseSeverity = {
        'Fire': 'critical',
        'Earthquake': 'high',
        'Flood': 'high',
        'Landslide': 'high',
        'Typhoon': 'critical',
      };

      const assessedSeverity = (baseSeverity[disasterType] || 'moderate');
      const isCritical = assessedSeverity === 'critical' || (assessedSeverity === 'high' && isInHotspot);

      // Verify legitimacy
      const isLegitimate = duplicateScore < 0.5 && falseAlarmRisk < 0.5;
      const overallConfidence = Math.max(0, 1 - (duplicateScore + falseAlarmRisk) / 2);

      return {
        isValid: isLegitimate,
        isOneTapSOS: true,
        isLegitimate,
        isCritical,
        severity: assessedSeverity,
        inHotspot: isInHotspot,
        confidence: Math.round(overallConfidence * 100) / 100,
        duplicateRisk: Math.round(duplicateScore * 100) / 100,
        falseAlarmRisk: Math.round(falseAlarmRisk * 100) / 100,
        issues,
        recommendation: isLegitimate && isCritical ? 'admin_can_dispatch' : (isLegitimate ? 'admin_review' : 'flag_false_alarm'),
      };
    }

    // TEXT-BASED REPORTS: Apply full verification logic
    existingReports.forEach(existing => {
      const distance = geolib.getDistance(
        { latitude: existing.lat, longitude: existing.lng },
        { latitude: lat, longitude: lng }
      );

      const timeDiff = (new Date() - new Date(existing.createdAt)) / 1000 / 60; // minutes

      // Same location, same type, within 10 minutes = high duplicate probability
      if (distance < 200 && existing.disasterType === disasterType && timeDiff < 10) {
        duplicateScore += 0.7;
        issues.push('Possible duplicate report from same area');
      }

      // Same user, multiple reports in short time = potential spam
      if (existing.userId?.toString() === userId?.toString() && timeDiff < 5) {
        falseAlarmRisk += 0.3;
        issues.push('Multiple reports from same user in short time');
      }
    });

    // False alarm risk factors for text-based reports
    if (reportText && reportText.toLowerCase().includes('prank') || reportText.toLowerCase().includes('test')) {
      falseAlarmRisk += 0.8;
      issues.push('Report contains prank/test keywords');
    }

    // Low confidence in report type
    const classification = this.classifyEmergency(reportText || '', disasterType, 'moderate');
    if (classification.confidence < 0.4) {
      falseAlarmRisk += 0.2;
      issues.push('Low confidence in disaster classification');
    }

    // Calculate overall confidence
    const overallConfidence = Math.max(0, Math.min(1, 1 - (duplicateScore + falseAlarmRisk) / 2));

    return {
      isValid: overallConfidence > 0.5,
      isOneTapSOS: false,
      confidence: Math.round(overallConfidence * 100) / 100,
      duplicateRisk: Math.round(duplicateScore * 100) / 100,
      falseAlarmRisk: Math.round(falseAlarmRisk * 100) / 100,
      issues,
      recommendation: overallConfidence > 0.8 ? 'auto-dispatch' : (overallConfidence > 0.5 ? 'review' : 'flag-false-alarm'),
    };
  }

  /* ================================
     4. HOTSPOT DETECTION (Risk Mapping)
     ================================ */
  async detectHotspots() {
    try {
      const reports = await Report.find({ lat: { $exists: true }, lng: { $exists: true } }).lean();

      if (reports.length < 5) {
        return { message: 'Insufficient data for hotspot analysis', hotspots: [] };
      }

      // Grid-based clustering (divide city into 1km x 1km cells)
      const grid = {};
      const cellSize = 0.01; // ~1km at equator

      reports.forEach(report => {
        const cellLat = Math.floor(report.lat / cellSize) * cellSize;
        const cellLng = Math.floor(report.lng / cellSize) * cellSize;
        const key = `${cellLat},${cellLng}`;

        if (!grid[key]) {
          grid[key] = { lat: cellLat, lng: cellLng, reports: [], risk: 0 };
        }
        grid[key].reports.push(report);
      });

      // Calculate risk score for each cell
      const hotspots = Object.values(grid)
        .map(cell => {
          const criticalCount = cell.reports.filter(r => r.severity === 'critical').length;
          const highCount = cell.reports.filter(r => r.severity === 'high').length;

          // Risk = (critical * 2 + high * 1) / total reports in cell
          const riskScore = (criticalCount * 2 + highCount * 1) / cell.reports.length;

          return {
            lat: cell.lat,
            lng: cell.lng,
            reportCount: cell.reports.length,
            riskScore: Math.round(riskScore * 100) / 100,
            riskLevel: riskScore >= 1.5 ? 'critical' : (riskScore >= 0.7 ? 'high' : 'moderate'),
            radiusMeters: 1000, // 1km radius
            disasterTypes: [...new Set(cell.reports.map(r => r.disasterType))],
          };
        })
        .filter(h => h.riskScore > 0.5) // Only include significant hotspots
        .sort((a, b) => b.riskScore - a.riskScore);

      this.hotspots = hotspots;
      return { hotspots, totalAnalyzed: reports.length };
    } catch (err) {
      console.error('Hotspot detection error:', err);
      return { error: err.message, hotspots: [] };
    }
  }

  /* ================================
     5. ROUTE OPTIMIZATION (Already implemented but adding context)
     ================================ */
  getRouteOptimizationContext(disasterType, lat, lng) {
    // Identify which hotspot this report is in
    const inHotspot = this.hotspots.find(
      h => geolib.getDistance(
        { latitude: h.lat, longitude: h.lng },
        { latitude: lat, longitude: lng }
      ) < h.radiusMeters
    );

    // Priority based on hotspot and type
    let priority = 'normal';
    if (inHotspot?.riskLevel === 'critical') priority = 'critical';
    else if (inHotspot?.riskLevel === 'high') priority = 'high';

    return {
      inHotspot: !!inHotspot,
      hotspotDetails: inHotspot,
      dispatchPriority: priority,
    };
  }

  // Helper function
  getSeverityAction(severity) {
    const actions = {
      critical: 'Immediate multi-team dispatch. Activate emergency protocol.',
      high: 'Urgent dispatch. Multiple teams recommended.',
      moderate: 'Standard response. Single team sufficient.',
      low: 'Monitor. Dispatch only if escalation occurs.',
    };
    return actions[severity] || 'Standard protocols apply.';
  }
}

module.exports = new SALBAIntelligenceEngine();
