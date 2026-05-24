# 🛠️ SALBA SYSTEM: DEVELOPER QUICK REFERENCE & IMPLEMENTATION GUIDE

## Quick Navigation
- [System Startup](#system-startup)
- [API Quick Reference](#api-quick-reference)
- [Common Integration Patterns](#common-integration-patterns)
- [Troubleshooting](#troubleshooting)
- [Development Checklist](#development-checklist)

---

## SYSTEM STARTUP

### 1. Start Backend Server
```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
npm install

# Start the server
npm start
# OR
node server.js

# Expected output:
# ✓ Connected to MongoDB (capstoneDB)
# ✓ Server running on http://localhost:5000
# ✓ Socket.IO ready
```

### 2. Start Frontend Applications

#### DisasterSOS Mobile App
```bash
# Navigate to DisasterSOS directory
cd ../DisasterSOS/DisasterSOS

# Install dependencies (first time only)
npm install

# Start Expo
npm start

# Then in Expo menu:
# i - iOS simulator
# a - Android simulator
# w - Web browser (http://localhost:19006)
```

#### AdminWebApp
```bash
# Navigate to AdminWebApp frontend
cd ../../AdminWebApp/frontend

# Install dependencies
npm install

# Start development server
npm start
# Expected: http://localhost:3000
```

#### RescuerApp
```bash
# Navigate to RescuerApp
cd ../../RescuerApp

# Install dependencies
npm install

# Start Expo
npm start

# Then choose platform:
# i - iOS
# a - Android
# w - Web
```

### 3. Environment Variables

Create `.env` file in backend root:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/capstoneDB
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/capstoneDB

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this

# Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# Server
PORT=5000
NODE_ENV=development

# ML Service (if available)
ML_SERVICE_URL=http://localhost:5001
```

Create `.env` file in DisasterSOS/DisasterSOS:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.57:5000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_id
```

Create `.env` file in RescuerApp:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.57:5000
```

---

## API QUICK REFERENCE

### Authentication
```bash
# User Registration (Citizen)
POST /api/auth/register
Content-Type: application/json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "user"
}
Response: { token, user }

# User Registration (Rescuer)
POST /api/auth/register
{
  "name": "Jane Rescuer",
  "username": "jane_r",
  "password": "SecurePass123",
  "role": "rescuer"
}

# Login
POST /api/auth/login
{
  "email": "john@example.com",  // OR username for rescuers
  "password": "SecurePass123"
}
Response: { token, user }

# Get Profile
GET /api/auth/profile
Authorization: Bearer <JWT_TOKEN>
Response: { User object }

# Update Profile
PATCH /api/auth/profile
Authorization: Bearer <JWT_TOKEN>
{
  "phone": "+63-9123456789",
  "picture": "https://..."
}
```

### Alerts
```bash
# Submit Alert (Public - no auth)
POST /api/alerts
{
  "type": "Fire",
  "latitude": 8.2456,
  "longitude": 125.0089,
  "locationName": "Purok 1, Barangay 7",
  "userId": "optional_user_id",
  "userName": "optional_name"
}
Response: { reportId, status: "new", mlPredictions: {...} }

# Get All Alerts (Admin only)
GET /api/alerts?status=new&severity=high&limit=50
Authorization: Bearer <ADMIN_TOKEN>
Response: [{ Alert objects }]

# Get Single Alert
GET /api/alerts/:reportId
Authorization: Bearer <TOKEN>
Response: { Alert object with full details }

# Update Alert Status (Admin only)
PATCH /api/alerts/:reportId
Authorization: Bearer <ADMIN_TOKEN>
{
  "status": "in_progress",
  "actionNote": "Team Alpha deployed"
}

# Get Locations
GET /api/alerts/locations/barangays
Response: [
  {
    "value": "brgy1",
    "label": "Barangay 1",
    "puroks": [
      { "value": "p1", "label": "Purok 1" },
      { "value": "p2", "label": "Purok 2" }
    ]
  },
  ...
]
```

### Rescue Operations
```bash
# Register Push Token
POST /api/rescue/push-token
Authorization: Bearer <RESCUER_TOKEN>
{
  "pushToken": "ExponentPushToken[xxxxx]"
}

# Get Current Mission
GET /api/rescue/my-mission
Authorization: Bearer <RESCUER_TOKEN>
Response: {
  report: { Alert details },
  team: { Team info }
}

# Get My Team Info
GET /api/rescue/my-team
Authorization: Bearer <RESCUER_TOKEN>
Response: {
  _id, name, leader, members[], status, color
}

# Get Notifications
GET /api/rescue/notifications
Authorization: Bearer <RESCUER_TOKEN>
Response: [{ Notification[] }]

# Mark Notification Read
PATCH /api/rescue/notifications/:notificationId/read
Authorization: Bearer <RESCUER_TOKEN>

# Update Status
POST /api/rescue/status
Authorization: Bearer <RESCUER_TOKEN>
{
  "isOnline": true,
  "dutyStatus": "on-duty"
}
```

### Teams
```bash
# Get All Teams
GET /api/teams
Authorization: Bearer <TOKEN>
Response: [
  {
    "_id": "...",
    "name": "Alpha",
    "color": "#FF6B6B",
    "leader": { User },
    "members": [{ User }],
    "currentMission": Report OR null,
    "status": "available"
  }
]

# Assign Mission to Team (Admin only)
PATCH /api/teams/:teamId/assignment
Authorization: Bearer <ADMIN_TOKEN>
{
  "currentMission": "reportId",
  "status": "deployed"
}
```

### Reports
```bash
# Get Reports with Filter
GET /api/reports?startDate=2026-01-01&endDate=2026-04-05&status=resolved
Authorization: Bearer <TOKEN>
Response: [{ Report[] }]

# Generate PDF Report
POST /api/reports/generate-pdf
Authorization: Bearer <ADMIN_TOKEN>
{
  "reportId": "...",
  "includeAnalytics": true
}
Response: PDF file (binary)
```

---

## COMMON INTEGRATION PATTERNS

### Pattern 1: Submit Alert from Mobile App
```javascript
// File: DisasterSOS/services/alertService.js

export const sendAlert = async (alertData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: alertData.disasterType,
        latitude: alertData.coords.latitude,
        longitude: alertData.coords.longitude,
        locationName: alertData.locationName,
        userId: alertData.userId || null,
        userName: alertData.userName || 'Anonymous'
      })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    console.log('Alert submitted:', data.reportId);
    return data;
  } catch (error) {
    console.error('Alert submission failed:', error);
    throw error;
  }
};
```

### Pattern 2: Real-time Location Tracking (RescuerApp)
```javascript
// File: RescuerApp/src/screens/MapScreen.js

import * as Location from 'expo-location';
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function MapScreen() {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  useEffect(() => {
    let locationSubscription;
    
    const startTracking = async () => {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission denied');
        return;
      }
      
      // Watch position changes
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10  // Or when moved 10 meters
        },
        (location) => {
          // Emit to backend
          socket.emit('rescuer_location', {
            rescuerId: user._id,
            rescuerName: user.name,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date()
          });
        }
      );
    };
    
    startTracking();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [socket, user]);
}
```

### Pattern 3: Admin Assigns Team to Alert
```javascript
// File: AdminWebApp/frontend/src/components/TeamAssignment.js

import API from '../api';

const assignTeamToAlert = async (alertId, teamId) => {
  try {
    // 1. Update team with current mission
    await API.patch(`/teams/${teamId}/assignment`, {
      currentMission: alertId,
      status: 'deployed'
    });
    
    // 2. Update alert with assigned team
    await API.patch(`/alerts/${alertId}`, {
      status: 'in_progress',
      assignedTeam: teamId
    });
    
    console.log(`Team ${teamId} assigned to alert ${alertId}`);
    
    // 3. UI automatically updates via Socket.IO listener
    // socket.on('mission_assigned', (data) => { ... })
    
  } catch (error) {
    console.error('Team assignment failed:', error);
    alert(`Error: ${error.response?.data?.message || error.message}`);
  }
};
```

### Pattern 4: Socket.IO Event Handling
```javascript
// File: Common pattern for all apps

import io from 'socket.io-client';

// Connect to server
const socket = io('http://192.168.1.57:5000', {
  auth: {
    token: jwtToken
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10
});

// Admin app: Join admins room to get all alerts
socket.on('connect', () => {
  socket.emit('join_admin');
});

// Rescuer app: Join personal room
socket.on('connect', () => {
  socket.emit('join_rescuer_room', userId);
});

// Listen for new mission
socket.on('new_mission', (missionData) => {
  console.log('New mission received:', missionData);
  // Update UI, show notification, etc.
  displayMissionAlert(missionData);
});

// Listen for location updates (admin)
socket.on('rescuer_location_update', (locationData) => {
  console.log('Rescuer location:', locationData);
  // Update map marker
  updateRescuerMarker(locationData);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Socket disconnected');
});
```

### Pattern 5: Authentication with Async Storage (Mobile)
```javascript
// File: RescuerApp/src/context/AuthContext.js

import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  // Load auth on app start
  useEffect(() => {
    const restoreToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to restore token', e);
      }
    };
    
    restoreToken();
  }, []);
  
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Store token & user
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Pattern 6: ML Prediction Async Processing
```javascript
// File: backend/routes/alertRoutes.js

// Backend runs ML verification without blocking response
router.post('/', async (req, res) => {
  try {
    // Create report immediately
    const report = await Report.create({
      userId: req.body.userId,
      lat: req.body.latitude,
      lng: req.body.longitude,
      disasterType: req.body.type,
      status: 'new'
    });
    
    // Send response immediately
    res.json(report);
    
    // Run ML verification in background (non-blocking)
    setImmediate(async () => {
      try {
        const verification = enhancedML.verifyReport(req.body, recentReports);
        const assessment = enhancedML.assessSeverity(req.body.type, ...);
        
        // Update report with predictions
        report.mlPredictions = {
          disasterType: verification.type,
          severity: assessment.severity,
          isLegitimate: verification.isValid,
          legitimacyConfidence: verification.confidence,
          overall: { confidence: verification.confidence }
        };
        report.mlProcessedAt = new Date();
        
        await report.save();
        
        // Emit updated event
        req.io.to('admins').emit('alert_updated', report);
        
      } catch (aiError) {
        console.error('ML processing failed', aiError);
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

---

## TROUBLESHOOTING

### Issue: "Cannot connect to backend"
```
Error: ECONNREFUSED 127.0.0.1:5000

Solution:
1. Check backend is running: npm start from /backend
2. Verify IP address in config
   - Emulator: use 10.0.2.2 instead of localhost
   - Physical device: use actual machine IP (ipconfig)
3. Firewall: Allow port 5000 in Windows Defender/Firewall
4. Check MongoDB connection:
   - Local: mongodb://localhost:27017
   - Atlas: Use connection string from MongoDB dashboard
```

### Issue: "JWT token expired"
```
Error: 401 Unauthorized

Solution:
1. User needs to login again
2. App should check token expiry (7 days)
3. Implement refresh token mechanism:
   - Store refresh token in secure storage
   - When access token expires, use refresh token to get new one
   - Or force re-login
```

### Issue: "Distance to rescuer calculation wrong"
```
Problem: Location mapping not working

Check:
1. Ensure coordinate format: latitude first, longitude second
2. Test with known barangay coordinates
3. Verify Haversine formula:
   const getDistance = (lat1, lon1, lat2, lon2) => {
     const R = 6371; // Earth radius in km
     const dLat = (lat2 - lat1) * Math.PI / 180;
     const dLon = (lon2 - lon1) * Math.PI / 180;
     const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
               Math.sin(dLon/2) * Math.sin(dLon/2);
     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
     return R * c;
   };
```

### Issue: "Socket.IO events not received"
```
Problem: Real-time updates not working

Debug:
1. Check server log for "Socket connected: <socket-id>"
2. Verify token in io.use() middleware:
   io.use((socket, next) => {
     const token = socket.handshake.auth.token;
     if (!token) return next(new Error('Auth failed'));
     // verify JWT...
   });
3. Check room subscription:
   - Admin: socket.emit('join_admin')
   - Rescuer: socket.emit('join_rescuer_room', userId)
4. Server should emit: io.to(roomName).emit(eventName, data)
5. Client should listen: socket.on(eventName, (data) => {...})
```

### Issue: "Location permission denied"
```
Problem: App can't access GPS

Fix:
1. Mobile: Grant app location permission in settings
2. Code: Check permission before requesting:
   const { status } = await Location.requestForegroundPermissionsAsync();
   if (status !== 'granted') { alert('Location denied'); }
3. Test with high accuracy:
   accuracy: Location.Accuracy.BestForNavigation
4. For background tracking, request:
   Location.requestBackgroundPermissionsAsync()
```

### Issue: "Map not showing markers"
```
Problem: React Native Maps not rendering

Solutions:
1. Ensure both latitude and longitude are valid numbers
2. Set initial region:
   <MapView
     initialRegion={{
       latitude: 8.2456,
       longitude: 125.0089,
       latitudeDelta: 0.05,
       longitudeDelta: 0.05
     }}
   />
3. Check location permissions granted
4. Restart app/emulator
5. For web: Ensure leaflet CSS loaded in <head>
```

---

## DEVELOPMENT CHECKLIST

### Before Deployment
- [ ] All environment variables set correctly
- [ ] MongoDB connection tested
- [ ] Google OAuth credentials valid
- [ ] JWT secret changed from default
- [ ] All node modules installed (`npm install`)
- [ ] No console.error() statements ignored

### Backend Testing
- [ ] POST /alerts is working (test with Postman/curl)
- [ ] GET /alerts/:id returns correct data
- [ ] PATCH /alerts/:id updates status
- [ ] Socket.IO broadcasts to admins room
- [ ] Location updates processed correctly
- [ ] ML async verification completes
- [ ] MongoDB indices created

### Mobile App Testing
- [ ] DisasterSOS can submit alerts
- [ ] GPS location capture working
- [ ] Admin receives alert via Socket.IO
- [ ] RescuerApp receives mission notification
- [ ] Location tracking emits events
- [ ] Map displays rescuer & incident locations
- [ ] All screens navigate correctly

### Admin Dashboard Testing
- [ ] Alert feed displays real-time
- [ ] Team assignment works
- [ ] Rescuer locations update in real-time
- [ ] PDF report generation works
- [ ] ML predictions display correctly
- [ ] Responsive on different screen sizes

### Security Checklist
- [ ] All passwords use bcryptjs (round 10)
- [ ] JWT tokens have 7-day expiry
- [ ] Admin endpoints require auth middleware
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] SQL/NoSQL injection prevention (Mongoose)
- [ ] No sensitive data in console logs

### Performance Checklist
- [ ] Response time < 500ms for most endpoints
- [ ] Real-time updates < 1000ms latency
- [ ] Database indices on: status, userId, createdAt
- [ ] Async processing doesn't block responses
- [ ] Connection pooling for MongoDB
- [ ] Socket.IO rooms used efficiently

---

## KEY FILE LOCATIONS

```
Backend Configuration:
  backend/.env                    - Environment variables
  backend/server.js               - Entry point
  backend/config/db.js            - MongoDB connection
  
API Routes:
  backend/routes/alertRoutes.js   - Alert endpoints
  backend/routes/rescueRoutes.js  - Rescuer endpoints
  backend/routes/authRoutes.js    - Auth endpoints
  
Data Models:
  backend/models/User.js          - User schema
  backend/models/Report.js        - Alert/Report schema
  backend/models/Team.js          - Team schema
  
DisasterSOS:
  DisasterSOS/DisasterSOS/config/api.js     - API config
  DisasterSOS/DisasterSOS/services/alertService.js
  DisasterSOS/DisasterSOS/screens/HomeScreen.jsx
  
AdminWebApp:
  frontend/src/api.js             - Axios instance
  frontend/src/pages/AdminDashboard.js
  
RescuerApp:
  RescuerApp/src/config/api.js    - API config
  RescuerApp/src/context/AuthContext.js
  RescuerApp/src/context/SocketContext.js
```

---

## USEFUL COMMANDS

```bash
# MongoDB
# Start local MongoDB
mongod
# Or if installed as service: net start MongoDB

# View database
mongo
> use capstoneDB
> db.users.find()
> db.reports.find()

# Clear test data
> db.reports.deleteMany({status: "new"})

# Create index
> db.reports.createIndex({status: 1, createdAt: -1})

# Backend
npm install              # Install dependencies
npm start               # Start server
npm test                # Run tests
npm run dev             # Run with nodemon

# Frontend
npm install
npm start               # Start dev server (port 3000)
npm run build          # Production build
npm run eject          # Eject from Create React App

# Mobile
npx expo start          # Start Expo
npx expo publish        # Publish to Expo
eas build              # Build APK/IPA
```

---

## GETTING HELP

**Common Resources:**
- MongoDB: https://docs.mongodb.com/
- Express.js: https://expressjs.com/
- React: https://react.dev/
- React Native: https://reactnative.dev/
- Socket.IO: https://socket.io/docs/
- Expo: https://docs.expo.dev/

**Debug Tools:**
- Postman: Test API endpoints
- Redux DevTools: State management
- Network tab in browser DevTools
- Expo DevTools in mobile app
- MongoDB Compass: Visual database explorer

---

**Quick Reference Version:** 2.0  
**Last Updated:** April 5, 2026  
**Status:** Ready for Development
