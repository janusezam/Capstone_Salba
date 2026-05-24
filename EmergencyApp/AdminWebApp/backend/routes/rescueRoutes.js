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

// Rescuer updates mission status (admin still verifies final resolution)
router.patch('/my-mission/status', authMiddleware, requireRescuer, async (req, res) => {
  try {
    const { status, note } = req.body;
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

    // Keep admin as final authority for official resolution.
    report.rescuerMissionStatus = status;
    report.rescuerMissionUpdatedAt = new Date();
    report.rescuerMissionUpdatedBy = req.user.id;
    report.rescuerMissionNote = note || '';

    if (['on_the_way', 'ongoing'].includes(status) && !['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'].includes(String(report.status))) {
      report.status = 'in_progress';
    }

    await report.save();

    if (req.io) {
      req.io.to('admins').emit('rescuer_mission_status_updated', {
        reportId: report._id,
        status,
        note: report.rescuerMissionNote,
        rescuerId: String(req.user.id),
        rescuerName: rescuerUser?.name || 'Rescuer',
        updatedAt: report.rescuerMissionUpdatedAt,
      });
    }

    return res.json({
      success: true,
      message: `Mission marked as ${status}`,
      data: {
        reportId: report._id,
        rescuerMissionStatus: report.rescuerMissionStatus,
        rescuerMissionUpdatedAt: report.rescuerMissionUpdatedAt,
      },
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