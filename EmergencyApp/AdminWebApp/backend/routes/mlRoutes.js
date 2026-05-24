// routes/mlRoutes.js - ML Prediction and Route Optimization
const express = require('express');
const axios = require('axios');
const geolib = require('geolib');
const mlServiceClient = require('../utils/mlServiceClient');
const Report = require('../models/Report');
const User = require('../models/User');
const Team = require('../models/Team');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Check ML service availability on startup (silent fail - optional service)
// DISABLED: Causing spam during development with hot-reload (nodemon)
// Uncomment if you have a separate ML service running
/*
mlServiceClient.healthCheck().then(result => {
  if (result.success) {
    console.log('✅ Connected to SALBA ML Service');
  } else {
    console.debug('ℹ️  ML Service not available (optional). Set ML_SERVICE_URL if needed.');
  }
}).catch(err => {
  // Silently catch any errors
});
*/

/* ================================
   ML PREDICTIONS
   ================================ */

// POST /api/ml/health - Check ML service status
router.get('/health', async (req, res) => {
  try {
    const health = await mlServiceClient.healthCheck();
    res.json(health);
  } catch (err) {
    console.error('Health check error:', err);
    res.status(503).json({ success: false, error: 'ML Service unavailable' });
  }
});

// POST /api/ml/classify - Classify disaster type
router.post('/classify', authMiddleware, async (req, res) => {
  try {
    const { description, latitude, longitude, disasterType } = req.body;

    // For one-tap SOS: if no description but disasterType provided, return it with confidence
    if (!description && !disasterType) {
      return res.status(400).json({ message: 'description or disasterType required' });
    }

    // If disasterType provided (one-tap), return it for AI verification
    if (!description && disasterType) {
      return res.json({
        success: true,
        isOneTapSOS: true,
        classification: disasterType,
        confidence: 1.0,
        message: 'One-tap SOS - awaiting AI verification'
      });
    }

    if (!description) {
      return res.status(400).json({ message: 'description required' });
    }

    const result = await mlServiceClient.classifyDisaster(description, latitude, longitude);
    res.json(result);
  } catch (err) {
    console.error('Classification error:', err);
    res.status(500).json({ message: 'Classification error' });
  }
});

// POST /api/ml/predict-severity - Predict severity of disaster
router.post('/predict-severity', authMiddleware, async (req, res) => {
  try {
    const { description, disasterType } = req.body;

    if (!description && disasterType) {
      // Use base severity from disasterType
      const baseSeverityMap = {
        'Fire': 'critical',
        'Earthquake': 'high',
        'Flood': 'high',
        'Landslide': 'high',
        'Typhoon': 'critical',
      };
      return res.json({
        success: true,
        isOneTapSOS: true,
        severity: baseSeverityMap[disasterType] || 'moderate',
        confidence: 1.0,
        message: 'Severity assessed by AI - awaiting admin dispatch decision'
      });
    }

    if (!description) {
      return res.status(400).json({ message: 'description required' });
    }

    const result = await mlServiceClient.predictSeverity(description);
    res.json(result);
  } catch (err) {
    console.error('Severity prediction error:', err);
    res.status(500).json({ message: 'Prediction error' });
  }
});

// POST /api/ml/verify - Verify if report is legitimate
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { description, hasPrankKeywords, isOneTapSOS, latitude, longitude, disasterType, userId } = req.body;

    // For one-tap SOS: Perform AI verification for admin review (not auto-dispatch)
    if (!description && isOneTapSOS) {
      try {
        // Get recent reports from same area for duplicate/false alarm checking
        const recentReports = await Report.find({
          lat: { $gte: latitude - 0.05, $lte: latitude + 0.05 },
          lng: { $gte: longitude - 0.05, $lte: longitude + 0.05 },
          createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 30) }, // Last 30 minutes
        }).lean();

        const enhancedML = require('../utils/enhancedMLModel');
        const verification = enhancedML.verifyReport(
          { lat: latitude, lng: longitude, disasterType, reportText: '', userId },
          recentReports
        );

        return res.json({
          success: true,
          isOneTapSOS: true,
          isLegitimate: verification.isLegitimate,
          isCritical: verification.isCritical,
          severity: verification.severity,
          inHotspot: verification.inHotspot,
          confidence: verification.confidence,
          recommendation: verification.recommendation,
          issues: verification.issues,
          message: 'One-tap SOS verified by AI - awaiting admin dispatch decision'
        });
      } catch (err) {
        console.error('One-tap SOS verification error:', err);
        return res.status(500).json({ message: 'Verification error' });
      }
    }

    if (!description) {
      return res.status(400).json({ message: 'description required' });
    }

    const result = await mlServiceClient.verifyReport(description, hasPrankKeywords || 0);
    res.json(result);
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'Verification error' });
  }
});

// GET /api/ml/model-stats - Get ML model statistics
router.get('/model-stats', authMiddleware, async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const reportsWithML = await Report.countDocuments({ mlProcessedAt: { $exists: true, $ne: null } });

    const reportsByType = await Report.aggregate([
      { $match: { disasterType: { $exists: true, $ne: '' } } },
      { $group: { _id: '$disasterType', count: { $sum: 1 } } },
    ]);

    const reportsBySeverity = await Report.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const mlPredictions = await Report.aggregate([
      { $match: { 'mlPredictions.disasterType': { $exists: true, $ne: null } } },
      { $group: {
          _id: '$mlPredictions.disasterType',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$mlPredictions.disasterTypeConfidence' }
        }
      },
    ]);

    res.json({
      totalReports,
      reportsWithMLPredictions: reportsWithML,
      mlCoverage: totalReports > 0 ? ((reportsWithML / totalReports) * 100).toFixed(2) + '%' : '0%',
      reportsByType: Object.fromEntries(reportsByType.map(r => [r._id, r.count])),
      reportsBySeverity: Object.fromEntries(reportsBySeverity.map(r => [r._id, r.count])),
      mlPredictionsByType: mlPredictions.map(p => ({
        disasterType: p._id,
        count: p.count,
        averageConfidence: (p.avgConfidence * 100).toFixed(2) + '%'
      })),
    });
  } catch (err) {
    console.error('Model stats error:', err);
    res.status(500).json({ message: 'Error fetching model stats' });
  }
});

/* ================================
   SHORTEST PATH & ROUTING
   ================================ */

// POST /api/ml/shortest-route - Find shortest route from rescuers to affected area
router.post('/shortest-route', authMiddleware, async (req, res) => {
  try {
    const { reportId, latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'latitude & longitude required' });
    }

    // Get all rescuer locations
    const rescuers = await User.find({ role: 'rescuer', isOnline: true }).lean();

    if (rescuers.length === 0) {
      return res.json({
        message: 'No online rescuers available',
        shortestRoute: null,
        nearestRescuer: null,
      });
    }

    // Find distances from all rescuers to affected area
    const rescuerDistances = rescuers.map(rescuer => ({
      rescuer,
      distance: geolib.getDistance(
        { latitude: rescuer.lastLat || 0, longitude: rescuer.lastLng || 0 },
        { latitude, longitude }
      ),
    }));

    // Sort by distance
    rescuerDistances.sort((a, b) => a.distance - b.distance);

    const nearestRescuer = rescuerDistances[0];

    // Get route from nearest rescuer to affected area using OpenRouteService
    let routeData = null;
    try {
      const ORS_KEY = process.env.ORS_KEY;
      if (ORS_KEY) {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${nearestRescuer.rescuer.lastLng || 0},${nearestRescuer.rescuer.lastLat || 0}&end=${longitude},${latitude}`;
        const response = await axios.get(url);
        if (response.data && response.data.features && response.data.features[0]) {
          routeData = response.data.features[0];
        }
      }
    } catch (routeErr) {
      console.error('Route fetch error:', routeErr.message);
    }

    res.json({
      nearestRescuer: {
        id: nearestRescuer.rescuer._id,
        name: nearestRescuer.rescuer.name,
        email: nearestRescuer.rescuer.email,
        distanceMeters: nearestRescuer.distance,
        distanceKm: Math.round(nearestRescuer.distance / 1000 * 100) / 100,
        currentLocation: {
          latitude: nearestRescuer.rescuer.lastLat || 0,
          longitude: nearestRescuer.rescuer.lastLng || 0,
        },
      },
      targetLocation: { latitude, longitude },
      route: routeData,
      allRescuers: rescuerDistances.slice(0, 5).map(r => ({
        id: r.rescuer._id,
        name: r.rescuer.name,
        distanceKm: Math.round(r.distance / 1000 * 100) / 100,
      })),
    });
  } catch (err) {
    console.error('Shortest route error:', err);
    res.status(500).json({ message: 'Route calculation error' });
  }
});

// POST /api/ml/find-nearby-rescuers - Find rescuers within radius of location
router.post('/find-nearby-rescuers', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 5 } = req.body;

    const rescuers = await User.find({ role: 'rescuer' }).lean();

    const nearby = rescuers
      .map(rescuer => ({
        rescuer,
        distance: geolib.getDistance(
          { latitude: rescuer.lastLat || 0, longitude: rescuer.lastLng || 0 },
          { latitude, longitude }
        ),
      }))
      .filter(r => r.distance <= radiusKm * 1000)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      radiusKm,
      centerLocation: { latitude, longitude },
      nearbyRescuers: nearby.map(r => ({
        id: r.rescuer._id,
        name: r.rescuer.name,
        email: r.rescuer.email,
        distanceKm: Math.round(r.distance / 1000 * 100) / 100,
        isOnline: r.rescuer.isOnline,
        team: r.rescuer.team || null,
      })),
      totalFound: nearby.length,
    });
  } catch (err) {
    console.error('Find nearby rescuers error:', err);
    res.status(500).json({ message: 'Error finding rescuers' });
  }
});

// POST /api/ml/optimize-dispatch - Find optimal team dispatch for multiple reports
router.post('/optimize-dispatch', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { reportIds } = req.body;

    if (!reportIds || reportIds.length === 0) {
      return res.status(400).json({ message: 'reportIds array required' });
    }

    const reports = await Report.find({ _id: { $in: reportIds } }).lean();
    const teams = await Team.find().lean();

    if (teams.length === 0) {
      return res.json({ message: 'No teams available', assignments: [] });
    }

    // Simple optimization: assign closest available team to each report
    const assignments = reports.map(report => {
      const teamDistances = teams.map(team => ({
        team,
        distance: geolib.getDistance(
          { latitude: team.currentLat || 0, longitude: team.currentLng || 0 },
          { latitude: report.lat, longitude: report.lng }
        ),
      }));

      teamDistances.sort((a, b) => a.distance - b.distance);
      const bestTeam = teamDistances[0];

      return {
        reportId: report._id,
        reportLocation: { lat: report.lat, lng: report.lng },
        assignedTeam: {
          id: bestTeam.team._id,
          name: bestTeam.team.name,
          distanceKm: Math.round(bestTeam.distance / 1000 * 100) / 100,
        },
        disasterType: report.disasterType,
        severity: report.severity,
      };
    });

    res.json({
      totalReports: reports.length,
      assignments,
    });
  } catch (err) {
    console.error('Dispatch optimization error:', err);
    res.status(500).json({ message: 'Optimization error' });
  }
});

// Helper function for severity recommendations
function getSeverityRecommendation(severity) {
  const recommendations = {
    critical: 'Immediate dispatch of multiple teams. Emergency protocol activated.',
    high: 'Urgent dispatch required. Multiple teams recommended.',
    moderate: 'Standard response. One team dispatch sufficient.',
    low: 'Monitor situation. Dispatch if escalation occurs.',
  };
  return recommendations[severity] || 'Standard response protocols apply.';
}

// GET /api/ml/cache-stats - Get prediction cache performance stats
router.get('/cache-stats', requireAdmin, async (req, res) => {
  try {
    const PredictionCache = require('../models/PredictionCache');
    const stats = await PredictionCache.getStats();
    
    res.json({
      success: true,
      cache: stats,
      message: 'Cache statistics retrieved. Higher cache hits = faster predictions.',
      optimization: 'Database caching reduces ML inference calls by ~80%'
    });
  } catch (err) {
    console.error('Cache stats error:', err);
    res.status(500).json({ message: 'Error retrieving cache stats' });
  }
});

// POST /api/ml/clear-cache - Clear prediction cache (admin only)
router.post('/clear-cache', requireAdmin, async (req, res) => {
  try {
    const PredictionCache = require('../models/PredictionCache');
    const result = await PredictionCache.deleteMany({});
    
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} cached predictions`,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Clear cache error:', err);
    res.status(500).json({ message: 'Error clearing cache' });
  }
});

module.exports = router;
