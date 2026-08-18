// routes/teamRoutes.js
const express = require('express');
const Team = require('../models/Team');
const User = require('../models/User');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Initialize default teams if they don't exist
const initializeTeams = async () => {
  try {
    const teams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];
    
    for (let i = 0; i < teams.length; i++) {
      const existing = await Team.findOne({ name: teams[i] });
      if (!existing) {
        const newTeam = await Team.create({ name: teams[i], color: colors[i] });
        console.log(`✓ Created team: ${teams[i]} (${newTeam._id})`);
      } else {
        console.log(`✓ Team already exists: ${teams[i]}`);
      }
    }
    console.log('✓ Team initialization complete');
  } catch (error) {
    console.error('✗ Error initializing teams:', error.message);
  }
};

// Call on startup
initializeTeams();

// GET /api/teams/rescuers/available - Get all available rescuers (MUST be before /:id)
router.get('/rescuers/available', authMiddleware, async (req, res) => {
  try {
    const rescuers = await User.find({ role: 'rescuer' }).select('name email');
    res.json(rescuers);
  } catch (err) {
    console.error('Get rescuers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/teams - Get all teams with populated members
router.get('/', authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('leader', 'name email')
      .populate('members', 'name email location')
      .populate('currentMission');
    res.json(teams);
  } catch (err) {
    console.error('Get teams error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/teams/:id - Get single team
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('leader', 'name email')
      .populate('members', 'name email location')
      .populate('currentMission');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('Get team error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/teams/:id - Update team (set leader, add/remove members)
router.patch('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { leader, status, color } = req.body;
    const updates = {};
    
    if (leader !== undefined) updates.leader = leader;
    if (status) updates.status = status;
    if (color) updates.color = color;
    
    const team = await Team.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('leader', 'name email')
      .populate('members', 'name email');
    
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('Update team error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/teams/:id/members - Add member to team
router.post('/:id/members', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check if user exists and is a rescuer
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Remove from any other team first
    await Team.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );
    
    // Also remove as leader from other teams
    await Team.updateMany(
      { leader: userId },
      { leader: null }
    );
    
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate('leader', 'name email')
      .populate('members', 'name email');
    
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/teams/:id/members/:userId - Remove member from team
router.delete('/:id/members/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.params.userId } },
      { new: true }
    )
      .populate('leader', 'name email')
      .populate('members', 'name email');
    
    // If removed member was leader, clear leader
    if (team.leader && team.leader._id.toString() === req.params.userId) {
      team.leader = null;
      await team.save();
    }
    
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/teams/:id/dispatch - Dispatch team to a location/report
router.post('/:id/dispatch', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { reportId, lat, lng, address } = req.body;
    console.log(`📋 [DISPATCH] Starting dispatch for team ${req.params.id}, report ${reportId}`);
    
    // Populate both leader and members
    const team = await Team.findById(req.params.id)
      .populate('leader', 'name email lastLocationCoords')
      .populate('members', 'name email lastLocationCoords');
    if (!team) {
      console.log('❌ [DISPATCH] Team not found');
      return res.status(404).json({ message: 'Team not found' });
    }
    
    if (team.status === 'deployed') {
      console.log('❌ [DISPATCH] Team already deployed');
      return res.status(400).json({ message: 'Team is already deployed' });
    }

    console.log(`✓ [DISPATCH] Found team: ${team.name}`);
    
    // Update team status
    team.status = 'deployed';
    if (reportId) {
      team.currentMission = reportId;
      
      // Get primary rescuer - use leader if available, otherwise first member
      let assignedRescuer = team.leader;
      if (!assignedRescuer && team.members && team.members.length > 0) {
        assignedRescuer = team.members[0];
      }
      
      const report = await Report.findById(reportId);
      
      // Use rescuer's actual location if available; wait for Socket.IO if not
      let rescuerLat, rescuerLng;
      if (assignedRescuer?.lastLocationCoords?.lat && assignedRescuer?.lastLocationCoords?.lng) {
        // Use rescuer's actual GPS coordinates
        rescuerLat = assignedRescuer.lastLocationCoords.lat;
        rescuerLng = assignedRescuer.lastLocationCoords.lng;
        console.log(`📍 [DISPATCH] Using rescuer's actual location: ${rescuerLat}, ${rescuerLng}`);
      } else {
        // Don't set fallback offset - let Socket.IO real-time updates provide accurate location
        rescuerLat = null;
        rescuerLng = null;
        console.log(`⏳ [DISPATCH] Rescuer location not available yet; waiting for real-time location update`);
      }
      
      // Get rescuer name and ID
      const rescuerName = assignedRescuer?.name || `${team.name} Leader` || 'Unknown';
      const rescuerId = assignedRescuer?._id || null;
      
      console.log(`📋 [DISPATCH] Assigning rescuer:`, {
        rescuerId: rescuerId?.toString(),
        rescuerName,
        rescuerLat,
        rescuerLng
      });
      
      const updatedReport = await Report.findByIdAndUpdate(reportId, { 
        status: 'acknowledged',
        assignedTeam: team._id,
        assignedRescuer: {
          rescuerId: rescuerId?.toString() || null,
          rescuerName: rescuerName,
          rescuerLat: rescuerLat || null,
          rescuerLng: rescuerLng || null,
          startedAt: new Date()
        }
      }, { new: true });
      
      console.log(`✓ [DISPATCH] Updated report ${reportId} with rescuer ${rescuerName}`);
      console.log(`📍 [DISPATCH] Final assignedRescuer data:`, updatedReport.assignedRescuer);
    }
    
    // Update location for all team members when deployed
    if (lat && lng && team.members && team.members.length > 0) {
      try {
        await User.updateMany(
          { _id: { $in: team.members } },
          { location: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
        );
        console.log(`✓ [DISPATCH] Updated locations for ${team.members.length} team members`);
      } catch (userErr) {
        console.warn('⚠️ [DISPATCH] User location update failed (non-critical):', userErr.message);
      }
    }
    
    // Save team status change
    const savedTeam = await team.save();
    console.log(`✓ [DISPATCH] Saved team with deployed status`);
    
    // Create notifications for all team members
    if (team.members && team.members.length > 0) {
      try {
        const notificationPromises = team.members.map(member => 
          Notification.create({
            userId: member._id,
            type: 'dispatch',
            title: '🚨 Emergency Dispatch Alert',
            message: `Team ${team.name} has been deployed! Check the map for your assigned location.`,
            data: {
              reportId: reportId || null,
              teamId: team._id,
              lat,
              lng,
              address: address || 'Emergency Location'
            }
          })
        );
        await Promise.all(notificationPromises);
        console.log(`✓ [DISPATCH] Created ${team.members.length} notifications`);
      } catch (notifErr) {
        console.warn('⚠️ [DISPATCH] Notification creation failed (non-critical):', notifErr.message);
      }
    }
    
    // Get fresh team data
    const populated = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email pushToken location')
      .populate('currentMission');
    
    console.log(`✓ [DISPATCH] Team fully populated`);
    
    // Emit socket event for real-time update to rescuer apps and admin dashboard
    if (req.io && team.members && team.members.length > 0) {
      try {
        // Emit to admins room for dashboard refresh
        req.io.to('admins').emit('team_dispatched', { team: populated, lat, lng, address });
        
        // Emit to specific rescuer rooms for dispatch alert
        team.members.forEach(member => {
          req.io.to(`rescuer_${member._id}`).emit('dispatch_alert', {
            team: populated,
            lat,
            lng,
            address,
            reportId,
            location: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          });
        });
        console.log('✓ [DISPATCH] Socket events emitted to admins and rescuers');
      } catch (socketErr) {
        console.warn('⚠️ [DISPATCH] Socket event emission failed (non-critical):', socketErr.message);
      }
    }
    
    console.log(`✅ [DISPATCH] Successfully dispatched team ${team.name}`);
    res.json({ success: true, message: 'Team dispatched successfully', team: populated });
  } catch (err) {
    console.error('❌ [DISPATCH] Dispatch team error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
});

// POST /api/teams/:id/complete - Mark mission complete
router.post('/:id/complete', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('members');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    
    // Update associated report if exists
    if (team.currentMission) {
      await Report.findByIdAndUpdate(team.currentMission, { status: 'resolved' });
    }
    
    // Clear location for all team members when mission is complete
    await User.updateMany(
      { _id: { $in: team.members } },
      { location: null }
    );
    console.log(`✓ Cleared locations for ${team.members.length} team members`);
    
    // Create mission complete notifications for all team members
    const notificationPromises = team.members.map(member => 
      Notification.create({
        userId: member._id,
        type: 'mission_complete',
        title: '✅ Mission Completed',
        message: `Team ${team.name}'s mission has been marked as complete. Great work!`,
        data: {
          teamId: team._id
        }
      })
    );
    await Promise.all(notificationPromises);
    
    team.status = 'available';
    team.currentMission = null;
    await team.save();
    
    const populated = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email location');
    
    if (req.io) {
      req.io.emit('team_available', populated);
      
      // Emit to specific rescuer rooms
      team.members.forEach(member => {
        req.io.to(`rescuer_${member._id}`).emit('mission_complete', {
          team: populated
        });
      });
    }
    
    res.json({ message: 'Mission completed', team: populated });
  } catch (err) {
    console.error('Complete mission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/teams/:id/mark-available - Directly mark a team as available (fallback endpoint)
router.post('/:id/mark-available', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log('📍 [MARK-AVAILABLE] Marking team as available:', req.params.id);
    
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      {
        status: 'available',
        currentMission: null
      },
      { new: true }
    ).populate('leader', 'name email').populate('members', 'name email');
    
    if (!team) return res.status(404).json({ message: 'Team not found' });
    
    console.log('✅ [MARK-AVAILABLE] Team marked as available:', team.name);
    
    // Notify rescuers
    if (team.members && team.members.length > 0) {
      const notificationPromises = team.members.map(member => 
        Notification.create({
          userId: member._id,
          type: 'mission_complete',
          title: '✅ Mission Marked Complete',
          message: `Your team ${team.name} is now available for new deployments.`,
          data: { teamId: team._id }
        })
      );
      await Promise.all(notificationPromises);
    }
    
    // Socket.io notification
    if (req.io && team.members) {
      req.io.emit('team_available', team);
      team.members.forEach(member => {
        req.io.to(`rescuer_${member._id}`).emit('team_available', { team });
      });
    }
    
    res.json({ message: 'Team marked as available', team });
  } catch (err) {
    console.error('Mark available error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
