// routes/alertRoutes.js
// Public endpoint for mobile app emergency alerts (no auth required for emergencies)
const express = require('express');
const Report = require('../models/Report');
const HazardZone = require('../models/HazardZone');
const malaybalayLocations = require('../utils/malaybalayLocations');
const enhancedML = require('../utils/enhancedMLModel');
const { resolveLocationName } = require('../utils/locationResolver');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const toRadians = (deg) => (deg * Math.PI) / 180;
const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const assessSuspiciousLocationJump = async ({ userId, senderPhone, senderName, currentReportId, lat, lng, disasterType }) => {
  const reporterFilters = [];
  if (userId) reporterFilters.push({ userId });
  if (senderPhone) reporterFilters.push({ senderPhone });
  if (senderName) reporterFilters.push({ senderName });

  if (reporterFilters.length === 0) {
    return {
      suspicious: false,
      maxSpeedKmh: 0,
      crossLocationBursts: 0,
      reason: null,
    };
  }

  const recentReports = await Report.find({
    $or: reporterFilters,
    _id: { $ne: currentReportId },
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('lat lng createdAt disasterType senderPhone senderName userId')
    .lean();

  let maxSpeedKmh = 0;
  let crossLocationBursts = 0;

  for (const previous of recentReports) {
    if (!Number.isFinite(previous?.lat) || !Number.isFinite(previous?.lng)) continue;

    const distanceMeters = haversineDistanceMeters(previous.lat, previous.lng, lat, lng);
    const elapsedHours = Math.max((Date.now() - new Date(previous.createdAt).getTime()) / 3600000, 1 / 3600);
    const speedKmh = distanceMeters / 1000 / elapsedHours;
    maxSpeedKmh = Math.max(maxSpeedKmh, speedKmh);

    const differentType = String(previous.disasterType || '').toLowerCase() !== String(disasterType || '').toLowerCase();
    const farEnough = distanceMeters >= 1500;
    const fastEnough = speedKmh >= 120;

    if (farEnough && fastEnough) {
      crossLocationBursts += differentType ? 2 : 1;
    }
  }

  const suspicious = Boolean(maxSpeedKmh >= 150 || crossLocationBursts >= 2);

  return {
    suspicious,
    maxSpeedKmh: Math.round(maxSpeedKmh),
    crossLocationBursts,
    reason: suspicious
      ? `same-user cross-location burst detected (max ${Math.round(maxSpeedKmh)} km/h)`
      : null,
  };
};

// TEST: GET /api/alerts/test-severity - Quick test to verify severity mapping
router.get('/test-severity', async (req, res) => {
  try {
    const severityMap = {
      'fire': 'critical',
      'earthquake': 'high',
      'flood': 'high',
      'landslide': 'high',
      'typhoon': 'high',
    };

    console.log('[TEST-SEVERITY] Severity mapping test:');
    const testTypes = ['fire', 'Fire', 'FIRE', 'earthquake'];
    const results = {};
    for (const type of testTypes) {
      const mapped = severityMap[String(type).toLowerCase()] || 'medium';
      console.log(`  "${type}" -> "${mapped}"`);
      results[type] = mapped;
    }

    res.json({
      test: 'severity_mapping',
      status: 'OK',
      mapping: severityMap,
      testCases: results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const isPinnedLocationLabel = (value) => {
  if (!value) return false;
  return /^pinned\s*location\b/i.test(value.trim());
};

// Fallback function for nearest-point matching (used if GeoJSON fails)
const findNearestLocationNameFallback = (lat, lng) => {
  if (lat == null || lng == null || !Array.isArray(malaybalayLocations) || malaybalayLocations.length === 0) {
    return null;
  }

  const toRadians = (deg) => (deg * Math.PI) / 180;
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  let nearest = null;
  let minDistance = Infinity;

  for (const location of malaybalayLocations) {
    if (location?.latitude == null || location?.longitude == null) continue;
    const distance = getDistanceKm(lat, lng, location.latitude, location.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = location;
    }
  }

  return nearest?.label || null;
};

// GET /api/alerts/locations/barangays - Get unique barangays and zones from disaster data (MUST be before GET /)
router.get('/locations/barangays', async (req, res) => {
  try {
    // Return comprehensive list of all barangays (1-11) with puroks
    // This ensures users always see all available locations regardless of imported data
    res.json(malaybalayLocations);
  } catch (err) {
    console.error('Get locations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/alerts -- create emergency alert from mobile app (no auth)
router.post('/', async (req, res) => {
  try {
    const { type, latitude, longitude, locationName, userId, userName, userPhone, senderPhone } = req.body;
    const normalizedType = String(type || '').trim().toLowerCase();
    const reporterFilters = [];
    if (userId) reporterFilters.push({ userId });
    if (userPhone || senderPhone) reporterFilters.push({ senderPhone: userPhone || senderPhone });
    if (userName) reporterFilters.push({ senderName: userName });
    
    console.log('📨 [AdminWebApp] Alert received:', {
      type,
      userName,
      userPhone,
      senderPhone,
      latitude,
      longitude,
    });
    
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'latitude & longitude required' });
    }

    // DUPLICATE PREVENTION: Check if an alert with same coordinates was created in the last 5 seconds
    const duplicateThreshold = 5000; // 5 seconds
    const recentDuplicate = await Report.findOne({
      lat: latitude,
      lng: longitude,
      disasterType: type,
      createdAt: { $gte: new Date(Date.now() - duplicateThreshold) }
    }).lean();

    if (recentDuplicate) {
      console.log('⚠️ [DUPLICATE] Alert with same coordinates created recently, skipping:', {
        lat: latitude,
        lng: longitude,
        type: type,
        existingId: recentDuplicate._id,
        timeDiffMs: Date.now() - new Date(recentDuplicate.createdAt).getTime()
      });

      try {
        const existingReport = await Report.findById(recentDuplicate._id);
        if (existingReport) {
          const duplicateSuspiciousJump = await assessSuspiciousLocationJump({
            userId,
            senderPhone: userPhone || senderPhone || null,
            senderName: userName || null,
            currentReportId: existingReport._id,
            lat: latitude,
            lng: longitude,
            disasterType: type,
          });

          if (duplicateSuspiciousJump.suspicious) {
            existingReport.mlPredictions = {
              disasterType: type || existingReport.disasterType || null,
              disasterTypeConfidence: null,
              severity: existingReport.severity || 'moderate',
              severityConfidence: null,
              isLegitimate: false,
              legitimacyConfidence: 0.18,
              overall: {
                confidence: 0.25,
                recommendation: 'flag_false_alarm',
                reason: duplicateSuspiciousJump.reason,
              }
            };
            existingReport.mlProcessedAt = new Date();
            await existingReport.save();
            if (reporterFilters.length > 0) {
              await Report.updateMany(
                {
                  $or: reporterFilters,
                  createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
                  _id: { $ne: existingReport._id },
                  'mlPredictions.isLegitimate': { $ne: false },
                },
                {
                  $set: {
                    'mlPredictions.isLegitimate': false,
                    'mlPredictions.legitimacyConfidence': 0.18,
                    'mlPredictions.overall.confidence': 0.25,
                    'mlPredictions.overall.recommendation': 'flag_false_alarm',
                    'mlPredictions.overall.reason': duplicateSuspiciousJump.reason,
                    mlProcessedAt: new Date(),
                  }
                }
              );
            }
            console.log(`[AI] Duplicate-path suspicious override applied for alert ${existingReport._id}`);
          }
        }
      } catch (dupAiError) {
        console.error('Duplicate-path AI handling failed:', dupAiError.message);
      }
      
      // Return the existing report instead of creating a duplicate
      const populated = await Report.findById(recentDuplicate._id)
        .populate('userId', 'name email')
        .lean();
      
      return res.status(201).json({ 
        success: true, 
        isDuplicate: true,
        message: 'Alert already exists, returning existing report',
        report: populated 
      });
    }

    // Map disaster type to severity (case-insensitive)
    const severityMap = {
      fire: 'critical',
      earthquake: 'high',
      flood: 'high',
      landslide: 'high',
      typhoon: 'high',
    };

    // Resolve location using GeoJSON boundaries with fallback to nearest-point
    let resolvedLocationName = locationName;
    if (!locationName || isPinnedLocationLabel(locationName)) {
      resolvedLocationName = 
        resolveLocationName(latitude, longitude, findNearestLocationNameFallback) || 
        locationName || 
        '';
    } else {
      resolvedLocationName = locationName.trim();
    }

    const report = await Report.create({
      userId: userId || null, // Can be null for anonymous reports
      lat: latitude,
      lng: longitude,
      accuracy: 10,
      severity: severityMap[normalizedType] || 'moderate',
      note: `${type || 'Unknown'} - ${resolvedLocationName || 'Location not specified'}`,
      geofenceRadiusMeters: 100,
      disasterType: type,
      locationName: resolvedLocationName,
      senderName: userName || 'Anonymous Reporter',
      senderPhone: userPhone || senderPhone || null, // Accept either userPhone or senderPhone
    });

    // Apply suspicious-jump override immediately so admins don't see fallback confidence first.
    try {
      const immediateSuspiciousJump = await assessSuspiciousLocationJump({
        userId,
        senderPhone: userPhone || senderPhone || null,
        senderName: userName || null,
        currentReportId: report._id,
        lat: latitude,
        lng: longitude,
        disasterType: type,
      });

      if (immediateSuspiciousJump.suspicious) {
        report.mlPredictions = {
          disasterType: type || null,
          disasterTypeConfidence: null,
          severity: report.severity || 'moderate',
          severityConfidence: null,
          isLegitimate: false,
          legitimacyConfidence: 0.18,
          overall: {
            confidence: 0.25,
            recommendation: 'flag_false_alarm',
            reason: immediateSuspiciousJump.reason,
          }
        };
        report.mlProcessedAt = new Date();
        await report.save();
        if (reporterFilters.length > 0) {
          await Report.updateMany(
            {
              $or: reporterFilters,
              createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
              _id: { $ne: report._id },
              'mlPredictions.isLegitimate': { $ne: false },
            },
            {
              $set: {
                'mlPredictions.isLegitimate': false,
                'mlPredictions.legitimacyConfidence': 0.18,
                'mlPredictions.overall.confidence': 0.25,
                'mlPredictions.overall.recommendation': 'flag_false_alarm',
                'mlPredictions.overall.reason': immediateSuspiciousJump.reason,
                mlProcessedAt: new Date(),
              }
            }
          );
        }
        console.log(`[AI] Immediate suspicious-jump override applied for alert ${report._id}`);
      }
    } catch (immediateAiError) {
      console.error('Immediate suspicious-jump check failed:', immediateAiError.message);
    }

    // CHECK: If 3+ different users report same location within 1 hour, escalate to CRITICAL
    setImmediate(async () => {
      try {
        const nearbyReports = await Report.find({
          lat: { $gte: latitude - 0.01, $lte: latitude + 0.01 }, // ~1km radius
          lng: { $gte: longitude - 0.01, $lte: longitude + 0.01 },
          createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60) }, // Last 1 hour
        }).lean();

        // Count unique users/reporters
        const uniqueReporters = new Set(
          nearbyReports
            .map(r => r.userId?.toString() || r.senderPhone || r.senderName)
            .filter(Boolean)
        );

        console.log(`📍 [MULTI-REPORT CHECK] Location: ${resolvedLocationName} | Reports: ${nearbyReports.length} | Unique Reporters: ${uniqueReporters.size}`);

        // If 3+ different users reported same location, escalate all to CRITICAL
        if (uniqueReporters.size >= 3 && nearbyReports.length >= 3) {
          console.log(`🚨 [AUTO-ESCALATE] ${uniqueReporters.size} different users reported same location! Escalating all to CRITICAL`);
          
          const escalatedIds = nearbyReports.map(r => r._id);
          const updateResult = await Report.updateMany(
            { _id: { $in: escalatedIds } },
            { 
              severity: 'critical',
              note: (doc) => `ESCALATED: ${doc.note} - Multiple reporters (${uniqueReporters.size})`
            }
          );

          // Fetch updated reports and broadcast
          if (req.io) {
            const updated = await Report.find({ _id: { $in: escalatedIds } })
              .populate('userId', 'name email')
              .lean();
            
            updated.forEach(updatedReport => {
              req.io.to('admins').emit('report_escalated', {
                ...updatedReport,
                reason: `3+ different users reported same location`,
                escalatedAt: new Date()
              });
            });
          }

          console.log(`✓ Escalated ${updateResult.modifiedCount} reports to critical severity`);
        }
      } catch (escalationError) {
        console.error('Multi-report escalation check failed:', escalationError.message);
      }
    });

    // CHECK: If alert is in a HIGH RISK hazard zone, auto-escalate to CRITICAL
    setImmediate(async () => {
      try {
        // Find nearby hazard zones (within 2km)
        const nearbyHazardZones = await HazardZone.find({
          isActive: true,
          latitude: { $gte: latitude - 0.03, $lte: latitude + 0.03 },
          longitude: { $gte: longitude - 0.03, $lte: longitude + 0.03 }
        });

        // Calculate actual distance
        const getDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const hazardZonesWithDistance = nearbyHazardZones
          .map(zone => ({
            ...zone.toObject(),
            distance: getDistance(latitude, longitude, zone.latitude, zone.longitude)
          }))
          .filter(z => z.distance <= 2) // Within 2km
          .sort((a, b) => a.distance - b.distance);

        const highRiskZones = hazardZonesWithDistance.filter(z => z.riskLevel === 'HIGH');

        if (highRiskZones.length > 0) {
          const closestZone = highRiskZones[0];
          console.log(`🚨 [HAZARD ZONE ESCALATION] Alert in HIGH RISK zone: ${closestZone.location} (${closestZone.distance.toFixed(2)}km away)`);
          
          // Update the report to CRITICAL
          const updateResult = await Report.updateOne(
            { _id: report._id },
            { 
              severity: 'critical',
              note: `${report.note} | IN HIGH RISK HAZARD ZONE: ${closestZone.location}`,
              hazardZones: [{
                zone: closestZone.location,
                distance: closestZone.distance.toFixed(2),
                riskLevel: closestZone.riskLevel,
                hazardTypes: closestZone.hazardTypes
              }]
            }
          );

          // Broadcast escalation to admins
          if (req.io) {
            const updated = await Report.findById(report._id)
              .populate('userId', 'name email')
              .lean();
            
            req.io.to('admins').emit('hazard_zone_alert', {
              ...updated,
              reason: `Alert in HIGH RISK hazard zone`,
              hazardZone: closestZone,
              escalatedAt: new Date()
            });
          }

          console.log(`✓ Escalated report ${report._id} to CRITICAL due to hazard zone`);
        } else if (hazardZonesWithDistance.length > 0) {
          // Log medium/low risk zones for context
          const zone = hazardZonesWithDistance[0];
          console.log(`ℹ️ [HAZARD ZONE INFO] Alert in ${zone.riskLevel} RISK zone: ${zone.location} (${zone.distance.toFixed(2)}km away)`);
          
          await Report.updateOne(
            { _id: report._id },
            { 
              hazardZones: [{
                zone: zone.location,
                distance: zone.distance.toFixed(2),
                riskLevel: zone.riskLevel,
                hazardTypes: zone.hazardTypes
              }]
            }
          );
        }
      } catch (hazardError) {
        console.error('Hazard zone escalation check failed:', hazardError.message);
      }
    });

    // Run AI verification in background (non-blocking)
    setImmediate(async () => {
      let suspiciousJump = {
        suspicious: false,
        maxSpeedKmh: 0,
        crossLocationBursts: 0,
        reason: null,
      };

      const applySuspiciousOnlyFallback = async () => {
        if (!suspiciousJump.suspicious) return;

        report.mlPredictions = {
          disasterType: type || null,
          disasterTypeConfidence: null,
          severity: report.severity || 'moderate',
          severityConfidence: null,
          isLegitimate: false,
          legitimacyConfidence: 0.18,
          overall: {
            confidence: 0.25,
            recommendation: 'flag_false_alarm',
            reason: suspiciousJump.reason,
          }
        };
        report.mlProcessedAt = new Date();
        await report.save();
        if (reporterFilters.length > 0) {
          await Report.updateMany(
            {
              $or: reporterFilters,
              createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
              _id: { $ne: report._id },
              'mlPredictions.isLegitimate': { $ne: false },
            },
            {
              $set: {
                'mlPredictions.isLegitimate': false,
                'mlPredictions.legitimacyConfidence': 0.18,
                'mlPredictions.overall.confidence': 0.25,
                'mlPredictions.overall.recommendation': 'flag_false_alarm',
                'mlPredictions.overall.reason': suspiciousJump.reason,
                mlProcessedAt: new Date(),
              }
            }
          );
        }
        console.log('[AI] Suspicious location-jump override applied (alerts fallback path)');
      };

      try {
        suspiciousJump = await assessSuspiciousLocationJump({
          userId,
          senderPhone: userPhone || senderPhone || null,
          senderName: userName || null,
          currentReportId: report._id,
          lat: latitude,
          lng: longitude,
          disasterType: type,
        });

        if (suspiciousJump.suspicious) {
          console.log(`[AI] Suspicious jump detected for alert ${report._id}:`, suspiciousJump);
        }

        // Verify report legitimacy using AI
        const recentReports = await Report.find({
          lat: { $gte: latitude - 0.05, $lte: latitude + 0.05 },
          lng: { $gte: longitude - 0.05, $lte: longitude + 0.05 },
          createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 30) }, // Last 30 minutes
          _id: { $ne: report._id } // Exclude current report
        }).lean();

        const verification = enhancedML.verifyReport(
          { lat: latitude, lng: longitude, disasterType: type, reportText: locationName, userId },
          recentReports
        );

        // Assess severity with AI
        const assessment = enhancedML.assessSeverity(type, latitude, longitude, locationName || '');

        // Build dynamic confidence instead of fixed values.
        const urgency = Number(assessment?.urgencyIndicators || 0);
        const inHotspot = Boolean(assessment?.inHotspot);
        const severityConfidence = Math.max(0.55, Math.min(0.98, 0.72 + (urgency * 0.06) + (inHotspot ? 0.08 : 0)));
        const disasterTypeConfidence = Math.max(0.7, Math.min(0.99, type ? 0.95 : 0.78));
        const overallConfidence = Math.max(
          0.5,
          Math.min(
            0.99,
            ((Number(verification?.confidence) || 0.7) * 0.6) + (severityConfidence * 0.4)
          )
        );

        // Update report with ML predictions
        const verificationConfidence = Number(verification.confidence);
        const basePredictions = {
          disasterType: type,
          disasterTypeConfidence,
          severity: assessment.severity,
          severityConfidence,
          isLegitimate: verification.isValid,
          legitimacyConfidence: verification.confidence,
          overall: {
            confidence: overallConfidence,
            recommendation: verification.recommendation,
            reason: null,
          }
        };

        report.mlPredictions = suspiciousJump.suspicious
          ? {
              ...basePredictions,
              isLegitimate: false,
              legitimacyConfidence: Number.isFinite(verificationConfidence)
                ? Math.min(verificationConfidence, 0.18)
                : 0.18,
              overall: {
                ...basePredictions.overall,
                confidence: Math.min(Number(basePredictions.overall?.confidence || 0.5), 0.3),
                recommendation: 'flag_false_alarm',
                reason: suspiciousJump.reason,
              }
            }
          : basePredictions;

        report.mlProcessedAt = new Date();
        await report.save();

        if (req.io) {
          const updated = await Report.findById(report._id)
            .populate('userId', 'name email')
            .lean();
          req.io.to('admins').emit('report_ml_updated', updated);
        }

        console.log('✓ AI verification completed for alert');
      } catch (aiError) {
        console.error('AI verification failed, continuing without it:', aiError.message);
        try {
          await applySuspiciousOnlyFallback();
        } catch (fallbackError) {
          console.error('Suspicious fallback save failed:', fallbackError.message);
        }
      }
    });

    // Populate user if exists
    let populated = report;
    if (report.userId) {
      populated = await report.populate('userId', 'name email');
    }

    // Broadcast to connected admins via Socket.IO
    if (req.io) {
      console.log('[Socket.IO] Broadcasting new_report event');
      req.io.to('admins').emit('new_report', populated);
      console.log('[Socket.IO] Emitted new_report to admins room with senderPhone:', report.senderPhone);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Alert sent successfully',
      report: populated 
    });
  } catch (err) {
    console.error('Create alert error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/alerts/analyze-priority - Groq AI prioritization of critical reports
const groqService = require('../utils/groqService');

router.post('/analyze-priority', async (req, res) => {
  try {
    const { language = 'en' } = req.body;
    
    // Get all critical reports
    const criticalReports = await Report.find({ severity: 'critical' })
      .populate('userId', 'name phone')
      .populate('assignedTeam', 'teamName')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to last 10 critical reports

    if (criticalReports.length === 0) {
      return res.json({
        message: 'No critical reports to analyze',
        recommendations: []
      });
    }

    // Use Groq AI to analyze and prioritize
    const analysis = await groqService.analyzeCriticalReports(criticalReports, language);

    // Map priorities back to report IDs with full report details
    if (analysis.success && analysis.analysis.priorityOrder) {
      const prioritizedReports = analysis.analysis.priorityOrder.map(item => {
        const fullReport = criticalReports.find(r => r._id.toString() === item.reportId);
        return {
          ...item,
          report: fullReport ? {
            _id: fullReport._id,
            disasterType: fullReport.disasterType,
            locationName: fullReport.locationName,
            note: fullReport.note,
            severity: fullReport.severity,
            status: fullReport.status,
            senderPhone: fullReport.senderPhone,
            createdAt: fullReport.createdAt
          } : null
        };
      });

      return res.json({
        success: true,
        analysisTimestamp: analysis.timestamp,
        reportCount: criticalReports.length,
        analysis: {
          ...analysis.analysis,
          priorityOrder: prioritizedReports
        },
        fallback: analysis.fallback || false
      });
    }

    res.json(analysis);

  } catch (error) {
    console.error('Priority analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze priorities',
      message: error.message
    });
  }
});

// GET /api/alerts -- get all alerts/reports
router.get('/', async (req, res) => {
  try {
    const alerts = await Report.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(alerts);
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper: Convert status to display format
const getStatusDisplay = (status) => {
  if (!status) return 'New';
  const statusMap = {
    'new': 'New',
    'pending': 'Pending',
    'acknowledged': 'Acknowledged',
    'in_progress': 'In Progress',
    'on_the_way': 'On The Way',
    'ongoing': 'Ongoing',
    'resolved': 'Resolved',
    'declined': 'Declined'
  };
  return statusMap[String(status).toLowerCase()] || 'Unknown';
};

// Helper: Convert rescuer mission status to display format
const getRescuerStatusDisplay = (status) => {
  if (!status || status === 'none') return null;
  const statusMap = {
    'on_the_way': 'On The Way',
    'ongoing': 'Ongoing',
    'resolved': 'Resolved'
  };
  return statusMap[String(status).toLowerCase()] || status;
};

// GET /api/alerts/my-reports - Get reports from the current user (protected route)
router.get('/my-reports', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - no user ID' });
    }

    const reports = await Report.find({ userId })
      .select('disasterType locationName status note severity lat lng createdAt senderName senderPhone assignedTeam rescuerMissionStatus')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`📋 Found ${reports.length} reports for user ${userId}`);
    
    res.json({
      success: true,
      count: reports.length,
      reports: reports.map((r, idx) => {
        // Prioritize rescuer mission status if available, otherwise use report status
        const effectiveStatus = (r.rescuerMissionStatus && r.rescuerMissionStatus !== 'none') 
          ? r.rescuerMissionStatus 
          : r.status || 'new';
        
        const effectiveStatusDisplay = (r.rescuerMissionStatus && r.rescuerMissionStatus !== 'none')
          ? getRescuerStatusDisplay(r.rescuerMissionStatus)
          : getStatusDisplay(r.status);
        
        const formattedReport = {
          _id: r._id,
          type: r.disasterType && r.disasterType.trim() !== '' ? r.disasterType : 'Not Specified',
          location: r.locationName || 'Location not specified',
          // IMPORTANT: Show what matters most to the user
          // If rescuer has updated their mission status, that's the real progress the user cares about
          status: (r.rescuerMissionStatus && r.rescuerMissionStatus !== 'none') 
            ? r.rescuerMissionStatus 
            : r.status || 'new',
          // Formatted display version
          statusDisplay: (r.rescuerMissionStatus && r.rescuerMissionStatus !== 'none')
            ? getRescuerStatusDisplay(r.rescuerMissionStatus)
            : getStatusDisplay(r.status),
          message: r.note || '',
          severity: r.severity || 'moderate',
          timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Date Unavailable',
          time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : 'Time Unavailable',
          lat: r.lat,
          lng: r.lng,
          senderName: r.senderName || 'Anonymous',
          assignedTeamId: r.assignedTeam,
          // Include both for frontend flexibility
          _rescuerMissionStatus: r.rescuerMissionStatus,
          _reportStatus: r.status
        };
        console.log(`  [${idx + 1}] Type: ${formattedReport.type} | SHOWING: "${formattedReport.statusDisplay}" | (rescuer: "${r.rescuerMissionStatus}" vs report: "${r.status}") | Date: ${formattedReport.date}`);
        return formattedReport;
      })
    });
  } catch (err) {
    console.error('❌ Get my reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports', error: err.message });
  }
});

module.exports = router;
