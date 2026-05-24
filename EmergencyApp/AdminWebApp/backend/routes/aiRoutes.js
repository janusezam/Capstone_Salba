// routes/aiRoutes.js - Complete SALBA AI Implementation

const express = require('express');
const enhancedML = require('../utils/enhancedMLModel');
const Report = require('../models/Report');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Initialize hotspot detection on startup
enhancedML.detectHotspots().catch(console.error);

/* ================================
   1. EMERGENCY CLASSIFICATION
   ================================ */

// POST /api/ai/classify - Classify incoming emergency report
router.post('/classify', authMiddleware, async (req, res) => {
  try {
    const { reportText, disasterType } = req.body;

    if (!reportText && !disasterType) {
      return res.status(400).json({ message: 'reportText or disasterType required' });
    }

    const classification = enhancedML.classifyEmergency(reportText || '', disasterType || '', 'moderate');

    res.json({
      originalInput: disasterType || 'Not provided',
      classification: classification.classifiedType,
      confidence: classification.confidence,
      interpretation: `${classification.classifiedType} (${Math.round(classification.confidence * 100)}% confidence)`,
    });
  } catch (err) {
    console.error('Classification error:', err);
    res.status(500).json({ message: 'Classification error' });
  }
});

/* ================================
   2. SEVERITY ASSESSMENT & PRIORITIZATION
   ================================ */

// POST /api/ai/assess-severity - Evaluate report urgency
router.post('/assess-severity', authMiddleware, async (req, res) => {
  try {
    const { disasterType, latitude, longitude, reportText } = req.body;

    if (!disasterType || latitude == null || longitude == null) {
      return res.status(400).json({ message: 'disasterType, latitude, longitude required' });
    }

    const assessment = enhancedML.assessSeverity(
      disasterType,
      latitude,
      longitude,
      reportText || ''
    );

    res.json(assessment);
  } catch (err) {
    console.error('Severity assessment error:', err);
    res.status(500).json({ message: 'Assessment error' });
  }
});

/* ================================
   3. REPORT VERIFICATION
   ================================ */

// POST /api/ai/verify-report - Check for duplicates & false alarms
router.post('/verify-report', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, disasterType, reportText, userId } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'location and data required' });
    }

    // Get recent reports from same area
    const recentReports = await Report.find({
      lat: { $gte: latitude - 0.05, $lte: latitude + 0.05 },
      lng: { $gte: longitude - 0.05, $lte: longitude + 0.05 },
      createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 30) }, // Last 30 minutes
    }).lean();

    const verification = enhancedML.verifyReport(
      { lat: latitude, lng: longitude, disasterType, reportText, userId },
      recentReports
    );

    // Add routing context
    const routeContext = enhancedML.getRouteOptimizationContext(disasterType, latitude, longitude);

    // Map verification recommendation to admin action
    let adminAction = 'REQUIRES_REVIEW';
    if (verification.recommendation === 'admin_can_dispatch' && verification.isCritical) {
      adminAction = 'ADMIN_CAN_DISPATCH_IF_CRITICAL';
    } else if (verification.recommendation === 'admin_review' || verification.recommendation === 'review') {
      adminAction = 'REQUIRES_ADMIN_REVIEW';
    } else if (verification.recommendation === 'flag_false_alarm') {
      adminAction = 'FLAG_AS_FALSE_ALARM';
    }

    res.json({
      ...verification,
      routeContext,
      adminAction,
      aiDecision: {
        isLegitimate: verification.isLegitimate,
        isCritical: verification.isCritical || false,
        severity: verification.severity,
        message: verification.isCritical ? 'AI identified as CRITICAL - Admin can dispatch' : 'AI identified as legitimate - Admin review needed'
      }
    });
  } catch (err) {
    console.error('Report verification error:', err);
    res.status(500).json({ message: 'Verification error' });
  }
});

/* ================================
   4. HOTSPOT DETECTION (Risk Mapping)
   ================================ */

// GET /api/ai/hotspots - Get all detected hotspots
router.get('/hotspots', authMiddleware, async (req, res) => {
  try {
    // Refresh hotspots
    const analysis = await enhancedML.detectHotspots();

    res.json({
      ...analysis,
      displayFormat: {
        description: 'Hotspots shown as circles on map with color coding',
        colors: {
          critical: '#DC2626',
          high: '#EA580C',
          moderate: '#F59E0B',
        },
      },
    });
  } catch (err) {
    console.error('Hotspot retrieval error:', err);
    res.status(500).json({ message: 'Error fetching hotspots' });
  }
});

// GET /api/ai/risk-map - Get risk heatmap data
router.get('/risk-map', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ lat: { $exists: true }, lng: { $exists: true } }).lean();

    // Generate heatmap points
    const heatmapPoints = reports.map(r => {
      const severityValue = { critical: 100, high: 75, moderate: 50, low: 25 }[r.severity] || 50;
      return {
        lat: r.lat,
        lng: r.lng,
        intensity: severityValue,
        type: r.disasterType,
      };
    });

    res.json({
      heatmap: heatmapPoints,
      summary: {
        totalIncidents: reports.length,
        criticalZones: enhancedML.hotspots.filter(h => h.riskLevel === 'critical').length,
        highRiskZones: enhancedML.hotspots.filter(h => h.riskLevel === 'high').length,
      },
    });
  } catch (err) {
    console.error('Risk map error:', err);
    res.status(500).json({ message: 'Error generating risk map' });
  }
});

// POST /api/ai/hotspots/near-location - Check if location is in hotspot
router.post('/hotspots/near-location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 2 } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'latitude & longitude required' });
    }

    const nearbyHotspots = enhancedML.hotspots.filter(h => {
      const distance = require('geolib').getDistance(
        { latitude: h.lat, longitude: h.lng },
        { latitude, longitude }
      );
      return distance / 1000 <= radiusKm;
    });

    res.json({
      location: { latitude, longitude },
      radiusKm,
      nearbyHotspots,
      isInHighRiskArea: nearbyHotspots.some(h => h.riskLevel === 'critical' || h.riskLevel === 'high'),
      warning: nearbyHotspots.length > 0 ? `[WARNING] ${nearbyHotspots.length} hotspot(s) nearby` : 'No hotspots in area',
    });
  } catch (err) {
    console.error('Hotspot location check error:', err);
    res.status(500).json({ message: 'Error checking location' });
  }
});

/* ================================
   5. AI DASHBOARD (Summary & Stats)
   ================================ */

// GET /api/ai/dashboard - Comprehensive AI analytics
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const allReports = await Report.countDocuments();
    const criticalReports = await Report.countDocuments({ severity: 'critical' });
    const reportsToday = await Report.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    const byType = await Report.aggregate([
      { $group: { _id: '$disasterType', count: { $sum: 1 } } },
    ]);

    const accuracy = allReports > 0
      ? Math.round((allReports - await Report.countDocuments({ status: 'false_alarm' })) / allReports * 100)
      : 0;

    res.json({
      systemMetrics: {
        totalReportsProcessed: allReports,
        criticalIncidents: criticalReports,
        reportsToday: reportsToday,
        accuracyScore: `${accuracy}%`,
      },
      aiCapabilities: {
        classification: 'Active',
        severityAssessment: 'Active',
        reportVerification: 'Active',
        hotspotDetection: 'Active',
        routeOptimization: 'Active',
      },
      riskAnalysis: {
        detectedHotspots: enhancedML.hotspots.length,
        criticalZones: enhancedML.hotspots.filter(h => h.riskLevel === 'critical').length,
        highRiskZones: enhancedML.hotspots.filter(h => h.riskLevel === 'high').length,
      },
      reportsByType: Object.fromEntries(byType.map(r => [r._id, r.count])),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Error generating dashboard' });
  }
});

module.exports = router;
