const express = require('express');
const Report = require('../models/Report');
const Team = require('../models/Team');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware, requireRescuer } = require('../middleware/authMiddleware');

const router = express.Router();

// Update push token for notifications
router.post('/push-token', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const { pushToken } = req.body;
    await User.findByIdAndUpdate(req.user.id, { pushToken, isOnline: true, lastSeen: new Date() });
    res.json({ message: 'Push token updated' });
  } catch (err) {
    console.error('Push token update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get rescuer's team info
router.get('/my-team', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const team = await Team.findOne({ members: req.user.id })
      .populate('leader', 'name email')
      .populate('members', 'name email')
      .populate('currentMission')
      .lean();
    
    res.json(team || null);
  } catch (err) {
    console.error('Get my team error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get rescuer's current mission
router.get('/my-mission', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const team = await Team.findOne({ members: req.user.id }).lean();
    if (!team || !team.currentMission) {
      return res.json(null);
    }
    
    const report = await Report.findById(team.currentMission)
      .populate('userId', 'name email')
      .lean();
    
    res.json({
      report,
      team: {
        _id: team._id,
        name: team.name,
        status: team.status,
        color: team.color
      }
    });
  } catch (err) {
    console.error('Get my mission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const toRadians = (deg) => (deg * Math.PI) / 180;
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Rescuer updates mission status (admin still verifies final resolution)
router.patch('/my-mission/status', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const { status, note, resolutionPhotoUrl, latitude, longitude } = req.body;
    if (!['on_the_way', 'ongoing', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'status must be on_the_way, ongoing, or resolved' });
    }

    const [team, rescuerUser] = await Promise.all([
      Team.findOne({ members: req.user.id }).lean(),
      User.findById(req.user.id).select('name').lean(),
    ]);

    if (!team || !team.currentMission) {
      return res.status(404).json({ message: 'No active mission assigned to this rescuer' });
    }

    const report = await Report.findById(team.currentMission);
    if (!report) {
      return res.status(404).json({ message: 'Mission report not found' });
    }

    const now = new Date();
    report.rescuerMissionStatus = status;
    report.rescuerMissionUpdatedAt = now;
    report.rescuerMissionUpdatedBy = req.user.id;
    report.rescuerMissionNote = note || '';

    // Record route transitions & performance summary statistics
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

    if (status === 'on_the_way') {
      report.onTheWayAt = now;
      if (hasLocation) {
        report.startLat = lat;
        report.startLng = lng;
        console.log(`⏱️ [ROUTE] Rescuer started route from (${lat}, ${lng})`);
      }
    } else if (status === 'ongoing') {
      report.arrivedAt = now;
      if (hasLocation) {
        report.arrivalLat = lat;
        report.arrivalLng = lng;
        console.log(`⏱️ [ROUTE] Rescuer arrived at scene (${lat}, ${lng})`);
      }

      // Calculate elapsed response duration (minutes)
      if (report.onTheWayAt) {
        const diffMs = now.getTime() - new Date(report.onTheWayAt).getTime();
        report.responseDurationMinutes = Math.max(0.1, Number((diffMs / 60000).toFixed(1)));
        console.log(`⏱️ [ROUTE] Response time: ${report.responseDurationMinutes} minutes`);
      }

      // Calculate distance traveled from start location to scene
      if (report.startLat != null && report.startLng != null && hasLocation) {
        const distance = calculateDistanceMeters(report.startLat, report.startLng, lat, lng);
        if (distance != null) {
          report.responseDistanceMeters = Math.round(distance);
          console.log(`⏱️ [ROUTE] Distance traveled: ${report.responseDistanceMeters} meters`);
        }
      }
    } else if (status === 'resolved') {
      report.rescuerResolvedAt = now;
      if (resolutionPhotoUrl) {
        report.resolutionPhotoUrl = resolutionPhotoUrl;
        console.log(`📷 [RESCUE] Resolution photo saved for report ${report._id}`);
      }
    }

    if (status === 'on_the_way' || status === 'ongoing') {
      report.status = status;
    }

    await report.save();

    // Create a status_update Notification for the rescuer to track mission timeline
    try {
      const statusTextMap = {
        'on_the_way': 'On the Way',
        'ongoing': 'Arrived at Scene',
        'resolved': 'Mission Resolved',
        'none': 'Status Reset'
      };
      
      const statusTitle = statusTextMap[status] || status;
      const severityIcon = report.severity === 'critical' ? '🔴' : report.severity === 'high' ? '🟠' : report.severity === 'moderate' ? '🟡' : '🟢';

      await Notification.create({
        userId: req.user.id,
        type: 'status_update',
        title: `📍 Status Update: ${statusTitle}`,
        message: `Your mission status was updated to ${statusTitle} for ${report.disasterType || 'Emergency'} at ${report.locationName || 'Unknown'}. ${severityIcon} Severity: ${String(report.severity || '').toUpperCase()}`,
        data: {
          reportId: report._id,
          lat: report.lat,
          lng: report.lng,
          address: report.locationName
        }
      });
      console.log(`[Notification] Created timeline status update for rescuer ${req.user.id}`);
    } catch (notifErr) {
      console.warn('⚠️ [RESCUE STATUS] Notification creation failed (non-critical):', notifErr.message);
    }

    if (req.io) {
      req.io.to('admins').emit('rescuer_mission_status_updated', {
        reportId: report._id,
        status,
        note: report.rescuerMissionNote,
        rescuerId: String(req.user.id),
        rescuerName: rescuerUser?.name || 'Rescuer',
        updatedAt: report.rescuerMissionUpdatedAt,
        responseDurationMinutes: report.responseDurationMinutes,
        responseDistanceMeters: report.responseDistanceMeters,
      });
      // Emit alert update to trigger list/dashboard refresh
      req.io.to('admins').emit('alert_updated', report);
    }

    return res.json({
      success: true,
      message: `Mission marked as ${status}`,
      data: report,
    });
  } catch (err) {
    console.error('Update mission status error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get rescuer's notifications
router.get('/notifications', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('data.reportId')
      .populate('data.teamId')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authMiddleware, requireRescuer, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware, requireRescuer, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update rescuer online status
router.post('/status', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const { isOnline } = req.body;
    await User.findByIdAndUpdate(req.user.id, { 
      isOnline, 
      lastSeen: new Date() 
    });

    if (!isOnline && req.io) {
      req.io.to('admins').emit('rescuer_disconnected', { rescuerId: String(req.user.id) });
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protect the route
router.post('/start/:reportId', authMiddleware, requireRescuer, async (req, res) => {
  const { rescuerId, rescuerName, rescuerLat, rescuerLng } = req.body;

  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (report.status === 'in_progress')
      return res.status(400).json({ message: 'Rescue already ongoing for this report' });

    report.status = 'in_progress';
    report.assignedRescuer = { rescuerId, rescuerName, rescuerLat, rescuerLng, startedAt: new Date() };
    await report.save();

    res.json({ message: 'Rescue mission started successfully', report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// GET /api/reports/ongoing -- rescuer only: view ongoing reports

router.get('/new', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const reports = await Report.find({ status: 'new' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error('Get new reports error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;