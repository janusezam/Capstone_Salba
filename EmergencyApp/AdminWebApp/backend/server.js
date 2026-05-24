// server.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const routeProxy = require('./routes/routeProxy');
const rescueRoutes = require('./routes/rescueRoutes');
const teamRoutes = require('./routes/teamRoutes');
const alertRoutes = require('./routes/alertRoutes');
const mlRoutes = require('./routes/mlRoutes');
const aiRoutes = require('./routes/aiRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const sitrepRoutes = require('./routes/sitrepRoutes');
const sitrepDocRoutes = require('./routes/sitrepDocRoutes');
const hazardRoutes = require('./routes/hazardRoutes');
const bilingualRoutes = require('./routes/bilingualRoutes');

// Import models for socket handlers
const User = require('./models/User');
const Team = require('./models/Team');
const malaybalayLocations = require('./utils/malaybalayLocations');

// Helper function to find nearest location by coordinates
const findNearestLocationName = (lat, lng) => {
  if (!lat || !lng || !malaybalayLocations || malaybalayLocations.length === 0) {
    return null;
  }

  // Haversine formula to calculate distance between two coordinates
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Find location with minimum distance
  let nearestLocation = null;
  let minDistance = Infinity;

  for (const location of malaybalayLocations) {
    const distance = getDistance(lat, lng, location.latitude, location.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }
  }

  // Return nearest location regardless of distance (but log the distance for debugging)
  if (nearestLocation) {
    console.log(`📍 Mapped coords (${lat}, ${lng}) to "${nearestLocation.label}" (distance: ${minDistance.toFixed(2)}km)`);
    return nearestLocation.label;
  }

  return null;
};
const app = express();
const server = http.createServer(app);

// CORS allow all origins for development (mobile app + frontend)
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// connect DB
connectDB();

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// Make io available on req object to emit events from routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/route', routeProxy);
app.use('/api/rescue', rescueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/sitrep', sitrepRoutes);
app.use('/api/sitrep-docs', sitrepDocRoutes);
app.use('/api/hazard', hazardRoutes);
app.use('/api/bilingual', bilingualRoutes);

// Basic health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Socket handlers
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  // optional: let clients join rooms (for example admin clients)
  socket.on('join_admin', () => {
    socket.join('admins');
    console.log('Socket joined admins room:', socket.id);
  });

  // Allow rescuers to join their own room for targeted notifications
  socket.on('join_rescuer', (userId) => {
    socket.join(`rescuer_${userId}`);
    console.log('Rescuer joined room:', `rescuer_${userId}`, socket.id);
  });

  // Handle rescuer room join (from React Native and web apps)
  socket.on('join_rescuer_room', (userId) => {
    socket.join(`rescuer_${userId}`);
    console.log('Rescuer joined room:', `rescuer_${userId}`, socket.id);
  });

  // Handle rescuer location updates from multiple client event formats.
  const handleRescuerLocation = async (incoming = {}) => {
    try {
      const rawRescuerId = incoming.rescuerId || incoming.userId || incoming.id;
      const rescuerName = incoming.rescuerName || incoming.name || incoming.username;

      // Support common mobile payload shapes, including Expo/Geolocation nested coords.
      const lat = Number(
        incoming.lat ??
        incoming.latitude ??
        incoming.coords?.lat ??
        incoming.coords?.latitude
      );
      const lng = Number(
        incoming.lng ??
        incoming.longitude ??
        incoming.coords?.lng ??
        incoming.coords?.longitude
      );
      const accuracy = Number(
        incoming.accuracy ??
        incoming.coords?.accuracy
      );
      const timestamp = incoming.timestamp || incoming.coords?.timestamp || Date.now();

      let rescuerId = rawRescuerId;
      if (!rescuerId) {
        const rescuerUser = await User.findOne({
          $or: [
            rescuerName ? { name: rescuerName } : null,
            incoming.username ? { username: incoming.username } : null,
            incoming.email ? { email: incoming.email } : null,
          ].filter(Boolean)
        }).select('_id').lean();
        rescuerId = rescuerUser?._id ? String(rescuerUser._id) : null;
      }
      
      console.log('\n🟡 [RESCUER_LOCATION] Received:', { rescuerId, rescuerName, lat, lng });
      
      if (!rescuerId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn('Invalid location data:', incoming);
        return;
      }

      // Find nearest location name based on coordinates (for reference only)
      const locationName = findNearestLocationName(lat, lng);
      // Always use exact coordinates for map display, add location name only for reference
      const locationString = locationName ? `Near ${locationName}` : '';
      const displayString = locationString ? `${locationString} (${lat.toFixed(4)}, ${lng.toFixed(4)})` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      console.log(`✓ Location resolved to: "${displayString}"`);
      
      // Update rescuer's location in User model with exact coordinates
      const userUpdate = await User.findByIdAndUpdate(
        rescuerId,
        {
          location: displayString,
          lastLocationUpdate: new Date(),
          lastLocationCoords: { lat, lng }
        },
        { new: true }
      );

      console.log(`✓ Updated User.location: "${userUpdate?.location}"`);

      // Find all teams with an active mission containing this rescuer and update their reports.
      const Report = require('./models/Report');
      const teamsWithRescuer = await Team.find({
        members: rescuerId,
        currentMission: { $exists: true, $ne: null }
      }).populate('members', 'name email').populate('currentMission', '_id');

      console.log(`Found ${teamsWithRescuer.length} active-mission teams with rescuer ${rescuerName}`);

      for (const team of teamsWithRescuer) {
        // Update the Report's assignedRescuer coordinates with exact lat/lng
        if (team.currentMission?._id) {
          const reportId = String(team.currentMission._id);
          const reportUpdate = await Report.findByIdAndUpdate(
            team.currentMission._id,
            {
              $set: {
                'assignedRescuer.rescuerLat': lat,
                'assignedRescuer.rescuerLng': lng,
                'assignedRescuer.lastUpdateTime': new Date()
              }
            },
            { new: true }
          );
          console.log(`✓ Updated Report ${team.currentMission._id} rescuer coordinates to exact (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

          // Emit a report-scoped location update so admin maps can match updates reliably.
          io.to('admins').emit('rescuer_location_update', {
            reportId,
            teamId: String(team._id),
            rescuerId,
            rescuerName,
            lat,
            lng,
            accuracy,
            timestamp,
            location: displayString,
            locationName: locationName || 'Current Location'
          });
        }
      }

      // Fallback: update any active reports directly assigned to this rescuer.
      // This keeps Ongoing Rescue coordinates moving even if team status isn't "deployed".
      const directReportFilter = {
        status: { $in: ['in_progress', 'on_the_way', 'ongoing', 'pending', 'acknowledged'] },
        $or: []
      };

      if (rescuerId) {
        directReportFilter.$or.push({ 'assignedRescuer.rescuerId': String(rescuerId) });
      }
      if (rescuerName) {
        directReportFilter.$or.push({ 'assignedRescuer.rescuerName': rescuerName });
      }

      const directReports = directReportFilter.$or.length > 0
        ? await Report.find(directReportFilter).select('_id')
        : [];

      if (directReports.length > 0) {
        const reportIds = directReports.map((r) => r._id);
        await Report.updateMany(
          { _id: { $in: reportIds } },
          {
            $set: {
              'assignedRescuer.rescuerLat': lat,
              'assignedRescuer.rescuerLng': lng,
              'assignedRescuer.lastUpdateTime': new Date()
            }
          }
        );

        for (const reportId of reportIds) {
          io.to('admins').emit('rescuer_location_update', {
            reportId: String(reportId),
            rescuerId,
            rescuerName,
            lat,
            lng,
            accuracy,
            timestamp,
            location: displayString,
            locationName: locationName || 'Current Location'
          });
        }

        console.log(`✓ Updated ${reportIds.length} active reports directly by assignedRescuerId`);
      }

      // Generic fallback broadcast (kept for compatibility with existing listeners).
      io.to('admins').emit('rescuer_location_update', {
        rescuerId,
        rescuerName,
        lat,      // EXACT latitude - always use this
        lng,      // EXACT longitude - always use this
        accuracy,
        timestamp,
        location: displayString,
        locationName: locationName || 'Current Location'
      });

      console.log(`📍 Broadcast to admins: ${rescuerName} at exact coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})\n`);
    } catch (error) {
      console.error('Error handling rescuer location:', error.message);
      console.error(error);
    }
  };

  socket.on('rescuer_location', handleRescuerLocation);
  socket.on('location_update', handleRescuerLocation);
  socket.on('rescuer_location_update', handleRescuerLocation);
  socket.on('rescuerLocation', handleRescuerLocation);

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Start server with error handling
const startServer = () => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Backend listening on port ${PORT}`);
  });

  // Handle port already in use error
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
      console.error('\n═══════════════════════════════════════');
      console.error('To fix this:');
      console.error('─────────────────────────────────────');
      console.error('Option 1 (Recommended):');
      console.error(`  taskkill /F /IM node.exe`);
      console.error(`  Then restart this server`);
      console.error('\nOption 2:');
      console.error(`  Set PORT=5001 in .env`);
      console.error(`  npm start`);
      console.error('═══════════════════════════════════════\n');
      process.exit(1);
    }
  });
};

startServer();

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Received SIGINT, closing server gracefully...');
  server.close(() => {
    console.log('[OK] Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[FORCE CLOSE] Server did not close gracefully');
    process.exit(1);
  }, 10000);
});
