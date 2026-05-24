// routes/reportRoutes.js
const express = require('express');
const Report = require('../models/Report');
const Team = require('../models/Team');
const User = require('../models/User');
const PredictionCache = require('../models/PredictionCache');
const malaybalayLocations = require('../utils/malaybalayLocations');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const mlServiceClient = require('../utils/mlServiceClient');
const { resolveLocationName } = require('../utils/locationResolver');

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

const assessSuspiciousLocationJump = async ({ userId, currentReportId, lat, lng, disasterType }) => {
  const recentReports = await Report.find({
    userId,
    _id: { $ne: currentReportId },
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('lat lng createdAt disasterType')
    .lean();

  let maxSpeedKmh = 0;
  let mostSuspicious = null;
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
      crossLocationBursts += 1;
      if (!mostSuspicious || speedKmh > mostSuspicious.speedKmh) {
        mostSuspicious = {
          distanceMeters,
          speedKmh,
          previousCreatedAt: previous.createdAt,
          differentType
        };
      }
    }
  }

  const suspicious = Boolean(
    (mostSuspicious && mostSuspicious.speedKmh >= 150) ||
    crossLocationBursts >= 2
  );

  return {
    suspicious,
    maxSpeedKmh: Math.round(maxSpeedKmh),
    crossLocationBursts,
    reason: suspicious
      ? `same-user cross-location burst detected (max ${Math.round(maxSpeedKmh)} km/h)`
      : null
  };
};

const isPinnedLocationLabel = (value) => {
  if (!value) return false;
  return /^pinned\s*location\b/i.test(String(value).trim());
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

const resolveLocationNameForReport = (report) => {
  if (!report) return '';
  const current = report.locationName;
  if (!current || isPinnedLocationLabel(current)) {
    return resolveLocationName(report.lat, report.lng, findNearestLocationNameFallback) || current || '';
  }
  return current;
};

// POST /api/reports  -- create report (authenticated user)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, accuracy, severity, note, geofenceRadiusMeters, locationName, disasterType } = req.body;
    console.log('\n[REPORT] Creating new report:', {
      lat, lng, disasterType,
      userId: req.user?.id,
      inputSeverity: severity
    });
    if (lat == null || lng == null) return res.status(400).json({ message: 'lat & lng required' });

    // Map disaster type to severity if provided
    const severityMap = {
      'fire': 'critical',
      'earthquake': 'high',
      'flood': 'high',
      'landslide': 'high',
      'typhoon': 'high',
    };
    
    const resolvedSeverity = disasterType 
      ? severityMap[String(disasterType).toLowerCase()] || severity || 'medium'
      : severity || 'low';
    
    console.log('[REPORT] Severity mapping:', {
      disasterType,
      mappedTo: resolvedSeverity,
      severityMapExists: !!severityMap[String(disasterType).toLowerCase()]
    });

    const resolvedLocationName = (!locationName || isPinnedLocationLabel(locationName))
      ? (resolveLocationName(lat, lng, findNearestLocationNameFallback) || locationName || '')
      : String(locationName).trim();

    // Create report without ML predictions first
    let r = await Report.create({
      userId: req.user.id,
      lat,
      lng,
      accuracy,
      severity: resolvedSeverity,
      note: note || '',
      geofenceRadiusMeters: geofenceRadiusMeters || Math.max(accuracy || 0, 20),
      locationName: resolvedLocationName,
      disasterType: disasterType || ''
    });

    // Preserve the rule: if 3+ different users report the same location within 1 hour, escalate to critical.
    try {
      const baseLat = Number(lat);
      const baseLng = Number(lng);

      if (Number.isFinite(baseLat) && Number.isFinite(baseLng)) {
        const nearbyReports = await Report.find({
          lat: { $gte: baseLat - 0.01, $lte: baseLat + 0.01 },
          lng: { $gte: baseLng - 0.01, $lte: baseLng + 0.01 },
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        })
          .select('_id userId senderPhone senderName severity')
          .lean();

        const uniqueReporters = new Set(
          nearbyReports
            .map((entry) => entry.userId?.toString() || entry.senderPhone || entry.senderName)
            .filter(Boolean)
        );

        if (uniqueReporters.size >= 3 && nearbyReports.length >= 3) {
          const ids = nearbyReports.map((entry) => entry._id);
          const updateResult = await Report.updateMany(
            { _id: { $in: ids }, severity: { $ne: 'critical' } },
            { $set: { severity: 'critical' } }
          );

          if (updateResult.modifiedCount > 0) {
            // Ensure current response reflects escalation if this report was updated.
            r = await Report.findById(r._id);

            if (req.io) {
              const escalated = await Report.find({ _id: { $in: ids } })
                .populate('userId', 'name email')
                .lean();

              escalated.forEach((entry) => {
                req.io.to('admins').emit('report_escalated', {
                  ...entry,
                  reason: '3+ different users reported same location',
                  escalatedAt: new Date()
                });
              });
            }
          }
        }
      }
    } catch (escalationError) {
      console.error('Multi-user same-location escalation failed:', escalationError.message);
    }

    // Get ML predictions in background (non-blocking) - OPTIMIZED PIPELINE
    setImmediate(async () => {
      let suspiciousJump = {
        suspicious: false,
        maxSpeedKmh: 0,
        crossLocationBursts: 0,
        reason: null,
      };

      const applySuspiciousOnlyFallback = async () => {
        if (!suspiciousJump.suspicious) return;

        r.mlPredictions = {
          disasterType: disasterType || null,
          disasterTypeConfidence: null,
          severity: resolvedSeverity,
          severityConfidence: null,
          isLegitimate: false,
          legitimacyConfidence: 0.18,
          overall: {
            confidence: 0.25,
            recommendation: 'flag_false_alarm',
            reason: suspiciousJump.reason
          }
        };
        r.mlProcessedAt = new Date();
        await r.save();
        console.log('[AI] Suspicious location-jump override applied (fallback path)');
      };

      try {
        const description = note || '';
        suspiciousJump = await assessSuspiciousLocationJump({
          userId: req.user.id,
          currentReportId: r._id,
          lat,
          lng,
          disasterType: disasterType || ''
        });

        const applySuspiciousOverride = (predictionSource) => {
          if (!suspiciousJump.suspicious) return predictionSource;

          const baseConfidence = Number(predictionSource?.legitimacyConfidence);
          const downgradedConfidence = Number.isFinite(baseConfidence)
            ? Math.min(baseConfidence, 0.22)
            : 0.18;

          return {
            ...predictionSource,
            isLegitimate: false,
            legitimacyConfidence: downgradedConfidence,
            overall: {
              ...(predictionSource?.overall || {}),
              confidence: Math.min(Number(predictionSource?.overall?.confidence || 0.5), 0.3),
              recommendation: 'flag_false_alarm',
              reason: suspiciousJump.reason
            }
          };
        };
        
        // Step 1: Check database cache first (< 1ms)
        let cachedPredictions = await PredictionCache.getCache(description, lat, lng);
        if (cachedPredictions) {
          r.mlPredictions = applySuspiciousOverride(cachedPredictions);
          r.mlProcessedAt = new Date();
          await r.save();
          console.log('[OK] Used database cache for predictions');
          return;
        }
        
        // Step 2: Try fast-mode endpoint first (100-300ms)
        let mlResult = await mlServiceClient.evaluateReportFast({
          description,
          latitude: lat,
          longitude: lng,
          textLength: description.length,
        });

        if (mlResult.success) {
          const basePredictions = {
            disasterType: mlResult.classification?.disaster_type,
            disasterTypeConfidence: mlResult.classification?.confidence,
            severity: mlResult.severity?.level,
            severityConfidence: mlResult.severity?.confidence,
            isLegitimate: mlResult.verification?.is_legitimate,
            legitimacyConfidence: mlResult.verification?.confidence,
            overall: mlResult.overall,
          };

          const predictions = applySuspiciousOverride(basePredictions);
          
          r.mlPredictions = predictions;
          r.mlProcessedAt = new Date();
          await r.save();
          
          // Cache result for future use
          await PredictionCache.setCache(description, lat, lng, basePredictions);
          console.log('✓ ML predictions completed (fast mode)');
        } else if (suspiciousJump.suspicious) {
          await applySuspiciousOnlyFallback();
        }
      } catch (mlError) {
        console.error('ML prediction failed, continuing without it:', mlError.message);
        try {
          await applySuspiciousOnlyFallback();
        } catch (fallbackError) {
          console.error('Suspicious fallback save failed:', fallbackError.message);
        }
      }
    });

    // Populate user brief
    const populated = await r.populate('userId', 'name email');

    // Broadcast to connected admins via Socket.IO
    if (req.io) {
      const adminCount = req.io.sockets.adapter.rooms.get('admins')?.size || 0;
      console.log(`[Socket.IO] Broadcasting new_report to admins room (${adminCount} admins connected)`);
      req.io.to('admins').emit('new_report', populated);
      console.log(`[Socket.IO] Emitted new_report: ${populated._id} - ${populated.severity} severity`);
    } else {
      console.warn('[Socket.IO] req.io not available - event not emitted');
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error('[REPORT] ❌ ERROR creating report:', {
      message: err.message,
      code: err.code,
      stack: err.stack.split('\n').slice(0, 3)
    });
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// GET /api/reports/user  -- get reports of the logged-in user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Get user reports error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/ongoing/list -- get ongoing rescues with assigned rescuers
router.get('/ongoing/list', authMiddleware, async (req, res) => {
  try {
    const ongoingReports = await Report.find({
      status: { $in: ['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'] }
    })
      .populate('userId', 'name email')
      .populate('assignedTeam', 'name leader members')
      .sort({ createdAt: -1 });

    // Enrich with team member details
    const enrichedReports = await Promise.all(
      ongoingReports.map(async (report) => {
        const reportObj = report.toObject();
        reportObj.locationName = resolveLocationNameForReport(reportObj);
        if (reportObj.assignedTeam && reportObj.assignedTeam.members) {
          const Team = require('../models/Team');
          const User = require('../models/User');
          const teamDetails = await Team.findById(reportObj.assignedTeam._id)
            .populate('members', 'name email status')
            .lean();
          reportObj.assignedTeam = teamDetails;
        }
        return reportObj;
      })
    );

    res.json(enrichedReports);
  } catch (err) {
    console.error('Get ongoing reports error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/export/csv -- export reports as CSV with filters applied
router.get('/export/csv', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const {
      severity,
      status,
      search,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    // Build filter object (same as list endpoint)
    const filter = {};
    if (severity && severity !== 'All') {
      filter.severity = { $regex: new RegExp(`^${severity}$`, 'i') };
    }
    if (status && status !== 'All') {
      filter.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (search) {
      filter.$or = [
        { note: { $regex: search, $options: 'i' } },
        { 'mlPredictions.disasterType': { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Fetch all filtered reports
    const reports = await Report.find(filter)
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('declinedBy', 'name email')
      .populate('assignedTeam', 'name teamCode')
      .sort({ createdAt: -1 })
      .lean();

    // Generate CSV content
    const headers = 'ID,Type,Location,Severity,Status,Submitter,Submitted Date,Resolved By,Notes\n';
    const rows = reports.map(report => {
      const id = report._id?.toString() || 'N/A';
      const type = report.mlPredictions?.disasterType || 'N/A';
      const location = 'N/A'; // latitude: ${report.lat}, longitude: ${report.lng}
      const severity = report.severity || 'N/A';
      const reportStatus = report.status || 'pending';
      const submitter = report.userId?.name || 'N/A';
      const submittedDate = report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A';
      const resolvedBy = report.resolvedBy?.name || 'N/A';
      const notes = (report.note || '').replace(/"/g, '""'); // Escape quotes

      return `"${id}","${type}","${location}","${severity}","${reportStatus}","${submitter}","${submittedDate}","${resolvedBy}","${notes}"`;
    }).join('\n');

    const csvContent = headers + rows;

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="disaster_reports_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export reports error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export reports',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/reports/:id/resolve -- admin: mark ongoing rescue as resolved
router.post('/:id/resolve', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { actionNote } = req.body;
    console.log('🔑 [RESOLVE] Endpoint called for reportId:', req.params.id);
    
    // Get the original report to find the assigned team
    const originalReport = await Report.findById(req.params.id)
      .populate('assignedTeam');
    
    if (!originalReport) {
      console.log('❌ [RESOLVE] Report not found:', req.params.id);
      return res.status(404).json({ message: 'Report not found' });
    }

    console.log('📋 [RESOLVE] Found report. Status:', originalReport.status, 'Team:', originalReport.assignedTeam?.name);
    console.log('📋 [RESOLVE] assignedTeam value:', originalReport.assignedTeam);

    // Update the report status to Resolved
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
        actionNote: actionNote || '',
        assignedTeam: null
      },
      { new: true }
    )
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('assignedTeam', 'name');

    console.log('✅ [RESOLVE] Report updated to Resolved');

    // Find which team to mark as available
    let teamToUpdate = null;
    
    if (originalReport.assignedTeam && originalReport.assignedTeam._id) {
      // Method 1: Team is directly linked to report
      teamToUpdate = originalReport.assignedTeam._id;
      console.log('👥 [RESOLVE] Using directly assigned team:', originalReport.assignedTeam.name);
    } else {
      // Method 2: Find any team with this report as currentMission
      console.log('⚠️  [RESOLVE] No direct team assignment. Searching for team with this report as currentMission...');
      const teamWithMission = await Team.findOne({ currentMission: req.params.id });
      if (teamWithMission) {
        teamToUpdate = teamWithMission._id;
        console.log('👥 [RESOLVE] Found team with currentMission:', teamWithMission.name);
      }
    }
    
    // Update the team status if one was found
    if (teamToUpdate) {
      const teamUpdateResult = await Team.findByIdAndUpdate(
        teamToUpdate,
        {
          status: 'available',
          currentMission: null
        },
        { new: true }
      );
      
      if (!teamUpdateResult) {
        console.log('❌ [RESOLVE] Team update returned null - team not found!');
      } else {
        console.log('✓ [RESOLVE] Team marked as available. New status:', teamUpdateResult.status, 'currentMission:', teamUpdateResult.currentMission);
        
        // Clear location for all team members
        if (teamUpdateResult.members && teamUpdateResult.members.length > 0) {
          await User.updateMany(
            { _id: { $in: teamUpdateResult.members } },
            { location: null }
          );
          console.log(`✓ [RESOLVE] Cleared locations for ${teamUpdateResult.members.length} team members`);
        }
        
        // Notify rescuers that their mission is complete
        if (req.io) {
          console.log('📡 [RESOLVE] Socket.io available, sending mission_complete events');
          const teamWithMembers = await Team.findById(teamUpdateResult._id).populate('members');
          const teamMembers = teamWithMembers.members || [];
          console.log('👤 [RESOLVE] Found team members:', teamMembers.map(m => ({ id: m._id, name: m.name })));
          
          teamMembers.forEach(member => {
            const roomName = `rescuer_${member._id}`;
            console.log(`📤 [RESOLVE] Emitting mission_complete to room: ${roomName}`);
            req.io.to(roomName).emit('mission_complete', {
              reportId: req.params.id,
              message: 'Your current mission has been marked as resolved by the admin.',
              resolvedAt: new Date()
            });
          });
          
          // Broadcast to admins to remove from Alerts & Map views
          console.log('📤 [RESOLVE] Broadcasting report_resolved to admins');
          req.io.to('admins').emit('report_resolved', {
            reportId: req.params.id,
            status: 'resolved'
          });
          
          console.log('✅ [RESOLVE] All events emitted (rescuers + admins)');
        }
      }
    } else {
      console.log('⚠️  [RESOLVE] No team found to update for this report');
    }

    res.json({
      success: true,
      message: 'Rescue marked as resolved',
      data: updated
    });
  } catch (err) {
    console.error('❌ [RESOLVE] Resolve report error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/reports/:id  -- fetch a single report by ID (MUST come before GET /:/)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedRescuer', 'rescuerName rescuerLat rescuerLng')
      .populate('assignedTeam');
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json({ 
      success: true,
      report 
    });
  } catch (err) {
    console.error('Fetch report error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: err.message 
    });
  }
});

// GET /api/reports  -- admin only: list reports with filtering, sorting, pagination
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Extract query parameters
    const {
      severity,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by severity (case-insensitive)
    if (severity && severity !== 'All') {
      filter.severity = { $regex: new RegExp(`^${severity}$`, 'i') };
    }

    // Filter by status (case-insensitive)
    if (status && status !== 'All') {
      filter.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    // Search by note/description or disaster type
    if (search) {
      filter.$or = [
        { note: { $regex: search, $options: 'i' } },
        { 'mlPredictions.disasterType': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Validate sorting parameters
    const validSortFields = ['createdAt', 'severity', 'status', 'userId'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrderValue = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with filtering, sorting, and pagination
    const [reports, totalCount] = await Promise.all([
      Report.find(filter)
        .populate('userId', 'name email')
        .populate('resolvedBy', 'name email')
        .populate('declinedBy', 'name email')
        .populate('assignedTeam', 'name teamCode')
        .sort({ [sortField]: sortOrderValue })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Report.countDocuments(filter)
    ]);

    const normalizedReports = reports.map((report) => ({
      ...report,
      locationName: resolveLocationNameForReport(report)
    }));

    // Return reports with pagination metadata
    res.json({
      success: true,
      data: normalizedReports,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PATCH /api/reports/:id  -- admin update (status, severity, geofence radius, note)
router.patch('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Track admin actions for status changes
    if (updates.status === 'resolved') {
      updates.resolvedBy = req.user.id;
      updates.resolvedAt = new Date();
    } else if (updates.status === 'declined') {
      updates.declinedBy = req.user.id;
      updates.declinedAt = new Date();
    }
    
    const updated = await Report.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('declinedBy', 'name email')
      .populate('assignedTeam');
    res.json(updated);
  } catch (err) {
    console.error('Update report error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
