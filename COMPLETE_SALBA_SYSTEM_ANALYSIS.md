# 🚨 COMPLETE SALBA EMERGENCY SYSTEM ANALYSIS
## Comprehensive Multi-Application Architecture & Integration Guide
**Generated:** April 5, 2026 | **Status:** Final Analysis

---

## 📋 EXECUTIVE OVERVIEW

The SALBA (Sophisticated Aid, Life-saving Backup, Assistance) emergency system is a **comprehensive, three-tier emergency response platform** designed for Malaybalay City. It consists of three interconnected mobile and web applications that work together to handle emergency alerts from citizens through administrative review to rescue team deployment and response.

### System Composition
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE SALBA ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TIER 1: CITIZEN REPORTING     TIER 2: ADMINISTRATIVE MGMT  TIER 3: RESCUE  │
│  ═══════════════════════════   ═══════════════════════════  ══════════════  │
│                                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐     ┌────────────┐ │
│  │   DisasterSOS App    │      │   AdminWebApp        │     │ RescuerApp │ │
│  │                      │      │                      │     │            │ │
│  │  React Native/Expo   │      │  React Web           │     │React Native│ │
│  │                      │      │                      │     │            │ │
│  │  • Report incidents  │      │  • View all alerts   │     │  • Receive │ │
│  │  • GPS location      │      │  • Assign teams      │     │    missions│ │
│  │  • One-tap alert     │      │  • Mark resolved     │     │  • Track   │ │
│  │  • History tracking  │      │  • Generate reports  │     │    location│ │
│  │  • Multi-language UI │      │  • Analytics         │     │  • Real-   │ │
│  │  • OAuth support     │      │  • ML integration    │     │    time    │ │
│  └──────────┬───────────┘      └──────────┬───────────┘     │    updates │ │
│             │                              │                 └──────┬──────┘ │
│             └──────────────────────┬───────┴─────────────────────────┘      │
│                                    │                                         │
│                     ┌───────────────▼───────────────┐                       │
│                     │   Express.js Backend Server   │                       │
│                     │   (Node.js + Socket.IO)       │                       │
│                     │   Port: 5000                  │                       │
│                     │                               │                       │
│                     │   ✓ RESTful API endpoints     │                       │
│                     │   ✓ Real-time WebSocket       │                       │
│                     │   ✓ JWT Authentication        │                       │
│                     │   ✓ Location processing       │                       │
│                     │   ✓ ML integration            │                       │
│                     │   ✓ Push notifications        │                       │
│                     └───────────────┬───────────────┘                       │
│                                    │                                         │
│                     ┌───────────────▼───────────────┐                       │
│                     │    MongoDB Database           │                       │
│                     │    (capstoneDB)               │                       │
│                     │                               │                       │
│                     │  Collections:                 │                       │
│                     │  • users (citizens, admins,   │                       │
│                     │           rescuers)           │                       │
│                     │  • reports (emergency alerts) │                       │
│                     │  • teams (rescue teams)       │                       │
│                     │  • notifications              │                       │
│                     │  • predictions (ML/AI)        │                       │
│                     └───────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ DETAILED APPLICATION ARCHITECTURES

### 1. DISASTERSOS APP (Citizens/Users App)
**Type:** React Native + Expo Mobile Application  
**Purpose:** Emergency reporting from citizens  
**Platforms:** iOS, Android, Web  
**Location:** `c:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\`

#### Directory Structure
```
DisasterSOS/
├── App.js                          # Main entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies (React Native, Expo, Navigation)
├── babel.config.js                  # Babel configuration
├── index.js                         # Root JavaScript entry
│
├── assets/                          # Static assets
│   ├── images/
│   └── icons/
│
├── components/                      # Reusable UI components
│   ├── AlertCard.jsx               # Alert card display component
│   ├── Header.jsx                  # Header component
│   └── MapViewComponent.jsx        # Map visualization
│
├── screens/                         # Application screens
│   ├── LoginScreen.jsx             # Citizen login
│   ├── RegisterScreen.jsx          # Citizen registration
│   ├── HomeScreen.jsx              # Main home with one-tap alert
│   ├── MapScreen.jsx               # Map view with location selection
│   ├── AlertHistoryScreen.jsx      # View reported alerts
│   ├── ProfileScreen.jsx           # User profile management
│   └── AdminDashboard.jsx          # Admin view (if admin user)
│
├── navigation/                      # Navigation structure
│   ├── AppNavigator.js             # Main navigation orchestrator
│   ├── AuthStack.js                # Auth screens (login, register)
│   └── MainTabs.js                 # Tab-based navigation (home, map, history)
│
├── services/                        # API service layer
│   ├── alertService.js             # Alert submission logic
│   └── authService.js              # Authentication logic
│
├── config/                          # Configuration
│   └── api.js                       # Backend API URL (http://192.168.1.57:5000)
│
├── hooks/                           # Custom React hooks
│   └── useAuth.js                  # Authentication hook
│
└── utils/                           # Utility functions
    ├── locationHelper.js           # Location name resolution
    ├── validators.js               # Input validation
    └── formatters.js               # Data formatting
```

#### Key Technologies
- **Framework:** React Native (0.81.4)
- **App Shell:** Expo (~54.0.12)
- **Navigation:** React Navigation (stack, bottom-tabs)
- **Maps:** React Native Maps (1.20.1)
- **Location:** Expo Location (~19.0.7)
- **HTTP Client:** Fetch API
- **Local Storage:** AsyncStorage (2.2.0)
- **UI Components:** React Native Element Dropdown

#### Core Features
1. **One-Tap Alert System**
   - Quick disaster reporting with minimal input
   - Automatic GPS location capture
   - Emergency type selection (Fire, Flood, Earthquake, etc.)

2. **Authentication**
   - Email/password registration & login
   - Google OAuth integration
   - JWT token management
   - Role-based access (citizen vs. admin)

3. **Location Management**
   - Automatic GPS tracking
   - Manual location selection via map
   - Location name resolution to Malaybalay barangays
   - Geofencing capability

4. **Reporting History**
   - View all submitted alerts
   - Track status (new, acknowledged, in-progress, resolved)
   - Download PDF reports (via expo-print)

5. **Profile Management**
   - User information updates
   - Contact details
   - Settings & preferences

#### API Endpoint Integration (With Backend)
```javascript
// Base URL: http://192.168.1.57:5000/api

POST /alerts                    // Submit emergency alert
GET  /alerts/locations/barangays // Get location list
POST /auth/register             // Register as citizen
POST /auth/login                // Login with email
POST /auth/google               // Google OAuth login
GET  /auth/profile              // Get user profile
```

---

### 2. ADMINWEBAPP (Administrator Dashboard)
**Type:** React Web Application + Express.js Backend  
**Purpose:** Administrative review and rescue team management  
**Locations:**
- Frontend: `c:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\frontend\`
- Backend: `c:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\backend\`

#### Frontend Directory Structure
```
frontend/
├── package.json                     # Dependencies (React, Tailwind CSS)
├── public/
│   ├── index.html                  # HTML entry point
│   └── manifest.json               # PWA manifest
│
├── src/
│   ├── App.js                       # Main React component
│   ├── App.css                      # Global styles
│   ├── index.js                     # React entry point
│   ├── api.js                       # API client (axios)
│   │
│   ├── pages/
│   │   ├── AdminDashboard.js       # Main admin dashboard
│   │   ├── RescuerPanel.js         # Rescuer management view
│   │   ├── AlertsPage.js           # All alerts list
│   │   ├── TeamsPage.js            # Team management
│   │   ├── ReportsPage.js          # Report generation
│   │   ├── AnalyticsPage.js        # Analytics & insights
│   │   └── SettingsPage.js         # App settings
│   │
│   ├── components/
│   │   ├── RescuerDashboard.js     # Rescuer tracking dashboard
│   │   ├── AlertCard.js            # Alert card component
│   │   ├── MapComponent.js         # Interactive map
│   │   ├── TeamAssignment.js       # Team assignment UI
│   │   ├── ReportGenerator.js      # PDF report generation
│   │   └── MLAnalysis.js           # ML prediction display
│   │
│   ├── context/
│   │   ├── AuthContext.js          # Auth state management
│   │   └── AppContext.js           # Global app state
│   │
│   ├── hooks/
│   │   ├── useAuth.js              # Auth hook
│   │   ├── useAlerts.js            # Alerts hook
│   │   └── useWebSocket.js         # WebSocket connection hook
│   │
│   └── styles/
│       ├── dashboard.css           # Dashboard styles
│       ├── cards.css               # Card components styles
│       └── responsive.css          # Responsive styles (Tailwind)
│
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
└── build/                           # Production build output
```

#### Backend Directory Structure
```
backend/
├── server.js                        # Express server main file
├── package.json                     # Backend dependencies
├── .env                             # Environment variables
│
├── config/
│   └── db.js                        # MongoDB connection config
│
├── middleware/
│   └── authMiddleware.js            # JWT authentication middleware
│
├── models/                          # MongoDB data models
│   ├── User.js                      # User schema (citizens, admins, rescuers)
│   ├── Report.js                    # Emergency alert/report schema
│   ├── Team.js                      # Rescue team schema
│   ├── Notification.js              # Push notification schema
│   ├── AIFeedback.js                # ML/AI feedback tracking
│   └── PredictionCache.js           # ML prediction cache
│
├── routes/                          # API route handlers
│   ├── authRoutes.js                # /api/auth/* endpoints
│   ├── reportRoutes.js              # /api/reports/* endpoints
│   ├── alertRoutes.js               # /api/alerts/* endpoints
│   ├── rescueRoutes.js              # /api/rescue/* endpoints (rescuer endpoints)
│   ├── teamRoutes.js                # /api/teams/* endpoints
│   ├── mlRoutes.js                  # /api/ml/* endpoints
│   ├── aiRoutes.js                  # /api/ai/* endpoints
│   ├── feedbackRoutes.js            # /api/feedback/* endpoints
│   └── routeProxy.js                # /api/route/* (routing service)
│
├── utils/                           # Utility functions
│   ├── enhancedMLModel.js           # ML verification & severity assessment
│   ├── mlModel.js                   # ML model integration
│   ├── mlServiceClient.js           # ML service communication
│   └── malaybalayLocations.js       # Location database (barangays/puroks)
│
└── tests/
    ├── unit.test.js                 # Unit tests
    └── integration.test.js          # Integration tests
```

#### Key Technologies
**Frontend:**
- **Framework:** React (19.1.0)
- **Styling:** Tailwind CSS (4.1.14)
- **HTTP Client:** Axios
- **State Management:** React Context API
- **Routing:** React Router

**Backend:**
- **Framework:** Express.js
- **Runtime:** Node.js
- **Database:** MongoDB (Mongoose ODM)
- **Real-time:** Socket.IO
- **Authentication:** JWT + bcryptjs
- **OAuth:** Google OAuth2Client
- **Process:** HTTP server with socket.io integration

#### Core Features
1. **Alert Management Dashboard**
   - Real-time alert feed
   - Filter & search alerts
   - Alert status tracking
   - Geospatial visualization

2. **Team Management**
   - Four predefined teams: Alpha, Bravo, Charlie, Delta
   - Team member assignment
   - Current mission tracking
   - Team availability status

3. **Rescue Assignment**
   - Assign rescue teams to alerts
   - Track team location in real-time
   - Update alert status
   - Assign individual rescuers

4. **Report Generation**
   - PDF export of incidents
   - Historical report generation
   - Filter by date range, location, type
   - Analytics & statistics

5. **ML/AI Integration**
   - Async AI verification of reports
   - Severity assessment
   - Fraud detection
   - Confidence scoring

6. **Rescuer Panel**
   - View all active rescuers
   - Real-time location tracking
   - Online/offline status
   - Last seen timestamps

#### API Endpoint Integration
```javascript
// Base URL: http://localhost:5000/api

AUTH ENDPOINTS
POST   /auth/register               // Register new user
POST   /auth/login                  // Login user
GET    /auth/users                  // Get all users (admin)
GET    /auth/profile                // Get user profile
PATCH  /auth/profile                // Update profile

ALERT ENDPOINTS
POST   /alerts                       // Create alert (from mobile)
GET    /alerts                       // Get all alerts
GET    /alerts/:id                   // Get alert details
PATCH  /alerts/:id                   // Update alert
GET    /alerts/locations/barangays   // Get location list

REPORT ENDPOINTS
GET    /reports                      // Get all reports
GET    /reports/:id                  // Get report details
POST   /reports/filter               // Filter reports
POST   /reports/generate-pdf         // Generate PDF report

RESCUE ENDPOINTS
POST   /rescue/push-token            // Register FCM/push token
GET    /rescue/my-team               // Get rescuer's team
GET    /rescue/my-mission            // Get current mission
GET    /rescue/notifications         // Get notifications
PATCH  /rescue/notifications/:id/read // Mark notification read
POST   /rescue/status                // Update rescuer status

TEAM ENDPOINTS
GET    /teams                        // Get all teams
GET    /teams/:id                    // Get team details
PATCH  /teams/:id/assignment         // Assign mission to team

ML/AI ENDPOINTS
POST   /ml/verify-report             // AI verify report
POST   /ai/assess-severity           // Assess severity
GET    /ai/feedback/:reportId        // Get AI feedback

ROUTING ENDPOINTS
POST   /route                        // Calculate optimal route
```

---

### 3. RESCUERAPP (Rescue Team Mobile App)
**Type:** React Native + Expo Mobile Application  
**Purpose:** Receive missions and coordinate fleet operations  
**Location:** `c:\Users\USER\OneDrive\Documents\Capstone\RescuerApp\`

#### Directory Structure
```
RescuerApp/
├── App.js                           # Main entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── babel.config.js                  # Babel config
│
├── assets/                          # App assets
│   ├── icons/
│   ├── images/
│   └── salbalogo.png
│
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js           # Rescuer login (username/password)
│   │   ├── RegisterScreen.js        # Rescuer registration
│   │   ├── DashboardScreen.js       # Main rescuer dashboard
│   │   │                          # Shows current mission & team info
│   │   ├── MapScreen.js             # Mission map with routing
│   │   ├── NotificationsScreen.js   # Mission notifications & alerts
│   │   └── ProfileScreen.js         # Rescuer profile & settings
│   │
│   ├── config/
│   │   └── api.js                   # API configuration
│   │                              # Base URL: http://192.168.1.57:5000/api
│   │                              # Includes timeout settings
│   │
│   ├── context/
│   │   ├── AuthContext.js           # Authentication state management
│   │   ├── NotificationContext.js   # Notification management
│   │   └── SocketContext.js         # WebSocket connection management
│   │
│   └── utils/
│       ├── locationHelpers.js       # GPS tracking utilities
│       └── notificationHelpers.js   # Push notification handlers
│
└── node_modules/                    # Dependencies
```

#### Key Technologies
- **Framework:** React Native (0.81.5)
- **App Shell:** Expo (~54.0.0)
- **Navigation:** React Navigation (stack, bottom-tabs)
- **Real-time:** Socket.IO Client (4.7.5)
- **Maps:** React Native Maps (1.20.1)
- **Location:** Expo Location (~19.0.8)
- **Notifications:** Expo Notifications (~0.32.16)
- **Local Storage:** AsyncStorage
- **Icons:** @expo/vector-icons (15.0.3)

#### Core Features
1. **Rescuer Authentication**
   - Unique username/password login (not email)
   - Registration with name, username, password
   - Role enforcement (rescuer-only access)
   - Token-based session management

2. **Mission Dashboard**
   - Current assigned mission display
   - Mission details & victim information
   - Team information
   - Status tracking

3. **Real-time Location Tracking**
   - Continuous GPS location updates via Socket.IO
   - Location broadcasting to backend
   - Nearest location name mapping
   - Accuracy monitoring

4. **Mission Map**
   - Interactive map view
   - Route navigation to incident location
   - Team member location visualization
   - Zoom & pan controls

5. **Notifications & Alerts**
   - Push notifications for new missions
   - In-app notification center
   - Mark as read functionality
   - Real-time updates via Socket.IO

6. **Profile Management**
   - Personal information
   - Duty status (on-duty/off-duty)
   - Contact information
   - Job title/position

#### API Endpoint Integration
```javascript
// Base URL: http://192.168.1.57:5000/api

AUTH ENDPOINTS
POST   /auth/login                   // Login with username & password
POST   /auth/register                // Register as rescuer
GET    /auth/profile                 // Get rescuer profile

RESCUE ENDPOINTS
POST   /rescue/push-token            // Register notification token
GET    /rescue/my-team               // Get assigned team details
GET    /rescue/my-mission            // Get current mission
GET    /rescue/missions              // Get paginated mission list
GET    /rescue/notifications         // Get all notifications
PATCH  /rescue/notifications/:id/read // Mark notification read
PATCH  /rescue/notifications/read-all // Clear all notifications
POST   /rescue/status                // Update online/offline status

TEAM ENDPOINTS
GET    /teams                        // Get team information
```

#### Real-time WebSocket Events
```javascript
// Emitted By Rescuer App
socket.emit('join_rescuer_room', userId)           // Join personal room
socket.emit('rescuer_location', {                  // Send location updates
  rescuerId, rescuerName, lat, lng, accuracy, timestamp
})

// Received By Rescuer App
socket.on('new_mission', data)                     // New mission assignment
socket.on('mission_updated', data)                 // Mission status change
socket.on('team_update', data)                     // Team member updates
socket.on('alert_broadcast', data)                 // General alerts
```

---

## 🔗 SYSTEM INTEGRATION ARCHITECTURE

### Cross-Application Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTER-APPLICATION COMMUNICATION FLOW                     │
└─────────────────────────────────────────────────────────────────────────────┘

FLOW 1: ALERT REPORTING (DisasterSOS App)
═════════════════════════════════════════════

User Action: One-tap alert submission
     │
     ▼
DisasterSOS Mobile App
     │
     ├─→ Capture GPS location (Expo Location)
     ├─→ Get user input: disaster type
     └─→ POST /api/alerts
          {
            type: "Fire",
            latitude: 8.2426,
            longitude: 125.0033,
            locationName: "Purok 1, Barangay 1",
            userId, userName
          }
     │
     ▼
Express Backend (Port 5000)
     │
     ├─→ Create Report document in MongoDB
     ├─→ Find nearest location name
     ├─→ RUN AI VERIFICATION (async/non-blocking)
     │   ├─→ Check for duplicates (geofence + time window)
     │   ├─→ Assess severity
     │   ├─→ Check legitimacy
     │   └─→ Update mlPredictions in Report
     │
     ├─→ BROADCAST via Socket.IO
     │   ├─→ To "admins" room: io.to('admins').emit('new_alert', report)
     │   └─→ To admin web dashboard (real-time)
     │
     └─→ Return: { reportId, status: 'new', ... }
     │
     ▼
AdminWebApp (Web Dashboard)
     │
     ├─→ Receives real-time alert via WebSocket
     ├─→ Display in alert feed
     ├─→ Admin reviews & decides action:
     │   ├─→ Acknowledge (change status to 'acknowledged')
     │   └─→ Assign rescue team
     │
     ▼
Assign Team to Alert
     │
     ├─→ Admin selects Team (Alpha, Bravo, Charlie, Delta)
     ├─→ PATCH /api/teams/:teamId/assignment
     │   {
     │     currentMission: reportId,
     │     status: 'deployed'
     │   }
     │
     └─→ Update Alert status to 'in_progress'
          (via PATCH /api/alerts/:reportId)
     │
     ▼
RescuerApp (Mobile - Rescuers)
     │
     ├─→ Team members subscribed to Socket.IO room
     ├─→ Receive: io.to('team_Alpha').emit('new_mission', { report, team })
     ├─→ Display mission with details
     │   ├─→ What: Disaster type & description
     │   ├─→ Where: Incident location on map
     │   ├─→ Who: Victim/reporter info
     │   └─→ Actions: Accept/Decline mission
     │
     └─→ Accept mission → Start real-time location tracking
          (emit 'rescuer_location' continuously)
     │
     ▼
Backend Location Processing
     │
     ├─→ Receive 'rescuer_location' events
     ├─→ Update User document with location
     ├─→ Store in lastLocationCoords & location fields
     │
     └─→ BROADCAST to AdminWebApp
          io.to('admins').emit('rescuer_location_update', { rescuerId, lat, lng })
     │
     ▼
AdminWebApp (Dashboard)
     │
     ├─→ Receive real-time rescuer location
     ├─→ Update map visualization
     ├─→ Show distance to incident
     ├─→ ETA calculation (via /api/route)
     │
     └─→ Admin can:
         ├─→ Mark as "In Progress" (status: 'in_progress')
         ├─→ Mark as "Resolved" (status: 'resolved')
         └─→ Add notes/actions


FLOW 2: ALERT RESOLUTION
═════════════════════════════════════════════

Rescuers Arrive at Scene
     │
     ├─→ Assessment & rescue operations
     ├─→ Continue sending location updates
     │
     ▼
Admin Marks as Resolved
     │
     ├─→ PATCH /api/alerts/:reportId
     │   {
     │     status: 'resolved',
     │     resolvedBy: adminId,
     │     actionNote: 'Victims rescued...'
     │   }
     │
     └─→ Update Team status back to 'available'
          (PATCH /api/teams/:teamId)
     │
     ▼
RescuerApp
     │
     ├─→ Receive Socket.IO event: 'mission_completed'
     ├─→ Clear current mission display
     ├─→ Return to dashboard
     │
     └─→ Team becomes available for next mission
          (Duty status updates)
     │
     ▼
Reporting & Analytics
     │
     └─→ Admin can generate PDF report
         POST /api/reports/generate-pdf
         ├─→ Incident details
         ├─→ Timeline of events
         ├─→ Team performance
         └─→ ML analysis results
```

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPLETE DATA FLOW MAP                         │
└─────────────────────────────────────────────────────────────────────┘

CITIZEN REPORT
│
├─→ [1] DisasterSOS sends POST /api/alerts
│        ├─ User ID (if logged in) / Anonymous
│        ├─ GPS coordinates
│        ├─ Disaster type
│        └─ Location name
│
▼
BACKEND PROCESSING
│
├─→ [2] Create Report document
│        ├─ Initial status: 'new'
│        ├─ Set severity based on type
│        ├─ Calculate nearest location
│        └─ Store all coordinates
│
├─→ [3] RUN ML VERIFICATION (Non-blocking)
│        ├─ Check for duplicate reports (30 min window, 0.05° radius)
│        ├─ Assess severity level
│        ├─ Verify legitimacy (0-100% confidence)
│        └─ Update mlPredictions.severity, isLegitimate, confidence
│
├─→ [4] BROADCAST TO ADMIN (Socket.IO)
│        └─ io.to('admins').emit('new_alert', report)
│
▼
ADMIN DASHBOARD
│
├─→ [5] Real-time alert ingestion
│        ├─ Display in main feed
│        ├─ Color-code by severity
│        ├─ Show ML confidence scores
│        └─ Filter & search options
│
├─→ [6] Admin action
│        ├─ Review alert details
│        ├─ Check location on map
│        ├─ View ML predictions
│        └─ Decide: Accept/Decline → Assign Team
│
├─→ [7] CALL TEAM ASSIGNMENT API
│        PATCH /api/teams/:teamId
│        ├─ Set currentMission: reportId
│        ├─ Set status: 'deployed'
│        └─ Update Report.assignedTeam
│
└─→ [8] UPDATE ALERT STATUS
         PATCH /api/alerts/:reportId
         ├─ status: 'in_progress'
         ├─ assignedTeam: teamId
         ├─ timestamp: assignment time
         └─ BROADCAST to all apps
             ├─ To RescuerApp (team members)
             └─ To other admin clients
│
▼
RESCUER APP
│
├─→ [9] Receive mission via Socket.IO
│        ├─ Room: 'team_Alpha' (or respective team)
│        ├─ Event: 'new_mission'
│        └─ Payload: { report, team, assignment }
│
├─→ [10] Display mission details
│         ├─ Dashboard shows current mission
│         ├─ Map shows incident location
│         ├─ Details: Disaster type, victim info, location
│         └─ Actions: Accept/Decline
│
├─→ [11] Start location tracking (if accepted)
│         ├─ Enable Expo Location permissions
│         ├─ Get current GPS continuously
│         └─ Emit 'rescuer_location' events
│
▼
BACKEND LOCATION UPDATES
│
├─→ [12] Receive 'rescuer_location' socket event
│         ├─ rescuerId, lat, lng, accuracy, timestamp
│         └─ Find nearest location name (Haversine formula)
│
├─→ [13] Update User document
│         ├─ User.location = "Purok 1, Barangay 1"
│         ├─ User.lastLocationCoords = { lat, lng }
│         ├─ User.lastLocationUpdate = timestamp
│         └─ User.isOnline = true
│
└─→ [14] BROADCAST TO ADMIN (Socket.IO)
          ├─ io.to('admins').emit('rescuer_location_update', {...})
          ├─ Payload: rescuerId, rescuerName, lat, lng, location
          └─ Update Rate: Per location socket event
│
▼
ADMIN DASHBOARD (Real-time)
│
├─→ [15] Receive rescuer location update
│         ├─ Update map marker for rescuer
│         ├─ Calculate distance to incident
│         ├─ Show ETA calculation
│         └─ Display in rescuer panel
│
├─→ [16] Call route/optimization API (optional)
│         POST /api/route
│         └─ Provide: incident coords, team positions
│
└─→ [17] Update alert status as needed
          ├─ 'in_progress' - rescue ongoing
          ├─ 'resolved' - incident handled
          └─ Store resolvedBy, resolvedAt, actionNote
│
▼
RESOLUTION & REPORTING
│
├─→ [18] Admin marks alert as 'resolved'
│
├─→ [19] UPDATE TEAM STATUS
│         ├─ Team status: 'available' (back to ready)
│         ├─ currentMission: null
│         └─ BROADCAST to RescuerApp
│
├─→ [20] RescuerApp receives update
│         ├─ Clear current mission
│         ├─ Return dashboard to idle state
│         └─ Show "Available for next mission"
│
└─→ [21] Report generation (optional)
          POST /api/reports/generate-pdf
          ├─ Compile incident details
          ├─ Include timeline, team info
          ├─ Attach ML analysis results
          └─ Generate & download PDF
```

---

## 👥 USER ROLE MAPPING & PERMISSIONS

### Role Hierarchy
```
┌─────────────────────────────────────────────────────────────────┐
│                    THREE-TIER USER SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

TIER 1: CITIZEN
═════════════════════════════════════════════════════════════════

User Properties:
  ├─ role: "user"
  ├─ email: unique (for login)
  ├─ Can be: authenticated via email/password or Google OAuth
  │
  └─ Profile Fields:
     ├─ name, email, phone
     ├─ picture (from Google)
     ├─ lastLat, lastLng (location)
     └─ createdAt, updatedAt

Permissions & Access:
  ✓ Create emergency alerts (POST /api/alerts)
       └─ Can submit anonymous or with login
  ✓ View own report history (GET /api/reports?userId=me)
  ✓ View profile (GET /api/auth/profile)
  ✓ Update profile (PATCH /api/auth/profile)
  ✗ Cannot access admin features
  ✗ Cannot assign teams
  ✗ Cannot view other citizens' reports

App Access:
  ├─ DisasterSOS Mobile App (Main)
  └─ AdminWebApp (if role = 'admin')

Authentication:
  ├─ Email/Password (bcryptjs hashed)
  ├─ Google OAuth2 (verify ID token)
  └─ JWT token (7-day expiry)


TIER 2: ADMIN
═════════════════════════════════════════════════════════════════

User Properties:
  ├─ role: "admin"
  ├─ email: unique (required one admin: "admin@relief.com")
  │
  └─ Profile Fields:
     ├─ name, email, phone
     ├─ jobTitle, picture
     ├─ isOnline (tracks session)
     ├─ lastSeen
     └─ createdAt, updatedAt

Permissions & Access:
  ✓ Full alert management
     ├─ View all alerts (live feed)
     ├─ Filter & search alerts
     ├─ Update alert status
     │   (new → acknowledged → in_progress → resolved)
     └─ Add action notes
  
  ✓ Team management
     ├─ View all rescue teams (Alpha, Bravo, Charlie, Delta)
     ├─ Assign teams to alerts
     ├─ Update team status (available/deployed/standby)
     └─ View team members
  
  ✓ Rescuer management
     ├─ View all rescuers (realtime locations)
     ├─ See online/offline status
     ├─ Check last location update
     └─ View assigned teams
  
  ✓ Reporting & Analytics
     ├─ Generate PDF reports
     ├─ View statistics
     ├─ Filter reports by date/type/location
     └─ Export data
  
  ✓ ML/AI management
     ├─ View AI predictions for reports
     ├─ Adjust severity assessments
     ├─ Review legitimacy scores
     └─ Access confidence metrics
  
  ✓ User management (if super-admin)
     ├─ Create new admin accounts
     ├─ Create rescuer accounts
     ├─ Update user roles
     └─ Block/unblock users

Admin-Specific Fields:
  ├─ blocked: false (can be blocked to prevent spam)
  └─ pushToken: null (admin may not receive push notifications)

App Access:
  ├─ AdminWebApp (Main browser-based dashboard)
  └─ Optionally: DisasterSOS (if has dual role)

Authentication:
  ├─ Email/Password only (no OAuth)
  ├─ Strong password requirement
  └─ JWT token (7-day expiry)


TIER 3: RESCUER
═════════════════════════════════════════════════════════════════

User Properties:
  ├─ role: "rescuer"
  ├─ username: unique (for rescuers only, not email)
  │
  └─ Profile Fields:
     ├─ name, username, password
     ├─ phone (with country code: "+63")
     ├─ jobTitle (position in team)
     ├─ picture (profile photo)
     │
     ├─ Duty Information:
     │   ├─ dutyStatus: "on-duty" | "off-duty"
     │   ├─ isOnline: true/false (tracked from push token)
     │   └─ lastSeen: timestamp
     │
     ├─ Location Information:
     │   ├─ location: string (formatted: "Purok X, Brgy Y")
     │   ├─ lastLocationUpdate: timestamp
     │   ├─ lastLocationCoords: { lat, lng }
     │   └─ lastLat, lastLng (legacy)
     │
     └─ createdAt, updatedAt

Permissions & Access:
  ✓ View assigned missions (POST /rescue/my-mission)
  ✓ View team information (GET /rescue/my-team)
  ✓ Receive notifications (GET /rescue/notifications)
  ✓ Mark notifications as read
  ✓ Update location (emit 'rescuer_location')
  ✓ Update duty status
  ✓ Update profile
  ✓ View mission map
  ✗ Cannot create alerts
  ✗ Cannot view all alerts
  ✗ Cannot assign teams
  ✗ Cannot mark alerts as resolved (must be done by admin)

Team Membership:
  ├─ Teams: Alpha, Bravo, Charlie, Delta
  ├─ Each team has:
  │   ├─ leader: rescuerId
  │   ├─ members: [rescuerIds...]
  │   ├─ status: 'available' | 'deployed' | 'standby'
  │   └─ currentMission: reportId (if any)
  │
  └─ Rescuer is in Team.members array

Mission Assignment:
  ├─ Admin assigns entire team to alert
  ├─ All team members receive Socket.IO notification
  ├─ Rescuer sees mission in dashboard
  ├─ Rescuer can:
  │   ├─ Accept mission (start location tracking)
  │   ├─ Decline mission
  │   └─ Send status updates
  │
  └─ Cannot edit mission details (admin only)

App Access:
  ├─ RescuerApp (Main mobile app)
  └─ Restricted from AdminWebApp & DisasterSOS

Authentication:
  ├─ Username/Password only (not email-based)
  ├─ Cannot use Google OAuth
  ├─ JWT token (7-day expiry)
  └─ Push token management (Expo notifications)
```

### Permission Matrix
```
┌────────────────────────────────────────────────────────────────────────────┐
│                    ACTION PERMISSION MATRIX                                │
├────────────────────────────────────────────────────────────────────────────┤
│ Action                              │ Citizen │ Admin │ Rescuer │ Anonymous │
├────────────────────────────────────────────────────────────────────────────┤
│ Submit Alert                         │    ✓    │   ✓   │   ✗    │     ✓     │
│ View Own Alerts                      │    ✓    │   -   │   ✗    │     -     │
│ View All Alerts                      │    ✗    │   ✓   │   ✗    │     ✗     │
│ Acknowledge Alert                    │    ✗    │   ✓   │   ✗    │     ✗     │
│ Assign Team to Alert                 │    ✗    │   ✓   │   ✗    │     ✗     │
│ Update Alert Status                  │    ✗    │   ✓   │   ✗    │     ✗     │
│ View Current Mission                 │    ✗    │   ✗   │   ✓    │     ✗     │
│ View Team Members                    │    ✗    │   ✓   │   ✓    │     ✗     │
│ Update Location                      │    ✓*   │   ✗   │   ✓    │     ✗     │
│ Send Location Events                 │    ✗    │   ✗   │   ✓    │     ✗     │
│ View Reports                         │    ✓**  │   ✓   │   ✗    │     ✗     │
│ Generate PDF Reports                 │    ✗    │   ✓   │   ✗    │     ✗     │
│ View ML Predictions                  │    ✗    │   ✓   │   ✗    │     ✗     │
│ Manage User Accounts                 │    ✗    │   ✓   │   ✗    │     ✗     │
│ Access Admin Dashboard               │    -    │   ✓   │   ✗    │     ✗     │
│ Access Rescuer App                   │    ✗    │   ✗   │   ✓    │     ✗     │
│ Access DisasterSOS App               │    ✓    │   ✓   │   ✗    │     ✓     │
├────────────────────────────────────────────────────────────────────────────┤
Notes:
  * = Can enable location tracking when reporting alert
  ** = Can view only own submitted alerts
  ✓ = Allowed
  ✗ = Not allowed
  - = N/A (not applicable to that role)
```

---

## 🔄 ALERT LIFECYCLE ACROSS ALL THREE APPS

### Complete Timeline & State Progression
```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ALERT LIFECYCLE: COMPLETE STATE PROGRESSION                    │
└─────────────────────────────────────────────────────────────────────────────┘

STAGE 1: INITIAL REPORT
════════════════════════════════════════════════════════════════════════════

Time: T+0
Status: "new"
Location: DisasterSOS Mobile App

Actions:
├─ Citizen opens DisasterSOS app
├─ Selects one-tap alert button
├─ System captures GPS location automatically
├─ Citizen selects disaster type (Fire/Earthquake/Flood/etc)
├─ Citizen optionally selects location from map
├─ Citizen submits alert
│
└─→ POST /api/alerts request sent

Backend Processing:
├─ [T+0ms] Create Report document
│   ├─ status: 'new'
│   ├─ severity: (mapped from type)
│   ├─ mlPredictions: { pending }
│   └─ createdAt: now
│
├─ [T+50ms] Find nearest location name
│   ├─ Haversine distance calculation
│   ├─ Map coords to Barangay/Purok
│   └─ Store in locationName field
│
├─ [T+100ms] START ASYNC ML VERIFICATION
│   ├─ Query for duplicate reports (30-min 0.05° window)
│   ├─ Assess severity score
│   ├─ Check legitimacy (spam/hoax detection)
│   ├─ Generate confidence metrics
│   └─ Update Report.mlPredictions
│      (continues in background, non-blocking)
│
└─ [T+200ms] Socket.IO broadcast
    └─→ io.to('admins').emit('new_alert', {...})

DisasterSOS App Receives:
├─ Response: { reportId, status: 'new', ... }
├─ Display: "Alert submitted successfully"
└─ Redirect: Alert appears in history


────────────────────────────────────────────────────────────────────────────


STAGE 2: ADMIN REVIEW
════════════════════════════════════════════════════════════════════════════

Time: T+0.5s to T+5s (variable: admin response time)
Status: "new" → "acknowledged"
Location: AdminWebApp Dashboard

Real-time Feed Update:
├─ Alert appears in admin dashboard
├─ Color-coded by severity
├─ ML confidence scores displayed
└─ Admin notified (via Socket.IO)

Admin Actions (choices):
│
├─→ CHOICE A: ACCEPT ALERT
│   │
│   ├─ Admin reviews alert details
│   │  ├─ Disaster type & description
│   │  ├─ Location (map view)
│   │  ├─ Reporter info
│   │  └─ ML analysis
│   │
│   ├─ Admin clicks "Acknowledge" button
│   │  └─→ PATCH /api/alerts/:reportId
│   │     { status: 'acknowledged' }
│   │
│   ├─ Update Report in MongoDB:
│   │  ├─ status: 'acknowledged'
│   │  ├─ acknowledgedAt: now
│   │  └─ acknowledgedBy: adminId
│   │
│   └─→ NEXT: Go to STAGE 3 (Team Assignment)
│
│
├─→ CHOICE B: DECLINE ALERT
│   │
│   ├─ Admin determines alert is not legitimate
│   │
│   ├─ Admin clicks "Decline" button
│   │  └─→ PATCH /api/alerts/:reportId
│   │     {
│   │       status: 'Declined',
│   │       declinedBy: adminId,
│   │       declinedAt: now,
│   │       actionNote: 'False alarm - prank call'
│   │     }
│   │
│   ├─ Update Report in MongoDB:
│   │  └─ declinedReason logged
│   │
│   └─→ END: Alert closed (no team deployment)
│
│
└─→ CHOICE C: NO ACTION YET
    │
    ├─ Admin leaves alert in "new" status
    ├─ Can reassign or delete later
    │
    └─→ Alert remains in feed until resolved


────────────────────────────────────────────────────────────────────────────


STAGE 3: TEAM ASSIGNMENT
════════════════════════════════════════════════════════════════════════════

Time: T+1s to T+30s (depends on admin decision speed)
Status: "acknowledged" → "in_progress"
Location: AdminWebApp Dashboard

Prerequisites:
├─ Alert must be in "acknowledged" status
├─ Admin must have selected a team
└─ Team must be in "available" status

Assignment Process:
│
├─ [Admin Decision] Select team from dropdown
│  ├─ Available teams: Alpha, Bravo, Charlie, Delta
│  ├─ Show current status: deployed/available/standby
│  ├─ Show member count & leader
│  │
│  └─→ Admin clicks "Assign Team" button
│
├─ [API Call] PATCH /api/teams/:teamId
│   {
│     currentMission: reportId,
│     status: 'deployed'
│   }
│
├─ [API Call] PATCH /api/alerts/:reportId
│   {
│     status: 'in_progress',
│     assignedTeam: teamId,
│     assignedRescuer: {
│       rescuerId: (if specific rescuer selected),
│       rescuerName,
│       startedAt: now
│     }
│   }
│
├─ [Backend Processing]
│  ├─ Update Team.currentMission = reportId
│  ├─ Update Team.status = 'deployed'
│  ├─ Update Report.assignedTeam = teamId
│  ├─ Update Report.status = 'in_progress'
│  └─ Update Report.assignedRescuer info
│
└─ [Socket.IO Broadcast]
    ├─→ io.to('team_Alpha').emit('new_mission', {
    │     report,
    │     team: { _id, name, status, color },
    │     assignment
    │   })
    │
    └─→ All team members connected to RescuerApp receive event


────────────────────────────────────────────────────────────────────────────


STAGE 4: RESCUER NOTIFICATION & ACCEPTANCE
════════════════════════════════════════════════════════════════════════════

Time: T+1.5s to T+2s (immediate)
Status: "in_progress" (confirmed)
Location: RescuerApp (Team Members)

Notification Delivery:
│
├─ [Socket.IO Event] 'new_mission' received by all team members
│  └─ Only rescuers in Team.members array receive this event
│
├─ [RescuerApp] Display notification/alert sound
│  ├─ Mission details popup
│  ├─ Incident location
│  ├─ Victim/reporter information
│  └─ "Accept Mission" button
│
├─ [Parallel: Push Notifications]
│  ├─ If rescuer app not open, send Expo push notification
│  ├─ Include mission summary
│  └─ Wake user to accept mission
│
└─ Rescuer sees mission on dashboard


Rescuer Actions:
│
├─→ OPTION A: ACCEPT MISSION
│  │
│  ├─ Rescuer clicks "Accept" in app
│  │
│  ├─ [App Action] Enable location services
│  │  ├─ Ask for GPS permission (if not already granted)
│  │  ├─ Start continuous GPS tracking
│  │  └─ Get initial accurate location
│  │
│  ├─ [Navigation] Show incident location on map
│  │  ├─ Mark incident with red pin
│  │  ├─ Mark rescuer current position with blue pin
│  │  ├─ Draw route between them
│  │  ├─ Show distance & ETA
│  │  └─ Activate turn-by-turn navigation option
│  │
│  ├─ [Socket.IO Emit] Start 'rescuer_location' events
│  │  └─ Emit every 5-10 seconds:
│  │     {
│  │       rescuerId, rescuerName,
│  │       lat, lng,
│  │       accuracy, timestamp
│  │     }
│  │
│  └─→ NEXT: STAGE 5 (Real-time Tracking)
│
│
└─→ OPTION B: DECLINE MISSION
   │
   ├─ Rescuer clicks "Decline" (may be off-duty, unavailable)
   │
   ├─ Send notification back to admin
   │  └─ Show "Team Alpha member unavailable"
   │
   ├─ Alert remains assigned to team (maybe another member accepts)
   │
   └─→ Wait: Other team members may accept, or admin reassigns


────────────────────────────────────────────────────────────────────────────


STAGE 5: REAL-TIME LOCATION TRACKING
════════════════════════════════════════════════════════════════════════════

Time: T+3s to T+15min (continuous during response)
Status: "in_progress" (ongoing)
Location: Between Rescuer & Admin Dashboard

RescuerApp Behavior:
│
├─ Continuous GPS tracking (location accuracy: ~10m)
├─ Every 5-10 seconds emit 'rescuer_location' socket event
└─ Include: lat, lng, accuracy, timestamp

Backend Location Processing:
│
├─ [Per Event] Receive 'rescuer_location' socket event
│  ├─ rescuerId, lat, lng, accuracy, timestamp
│  │
│  ├─ [Location Name Mapping]
│  │  ├─ Use Haversine formula to find nearest barangay/purok
│  │  └─ Store: location = "Purok 3, Barangay 5"
│  │
│  ├─→ [Database Update] User.findByIdAndUpdate(rescuerId, {
│  │     location: locationString,
│  │     lastLocationUpdate: now,
│  │     lastLocationCoords: { lat, lng }
│  │   })
│  │
│  └─→ [Socket.IO Broadcast]
│      io.to('admins').emit('rescuer_location_update', {
│        rescuerId, rescuerName, lat, lng,
│        location, accuracy, timestamp,
│        teamId, distanceToIncident
│      })

AdminWebApp Real-time Updates:
│
├─ Display map with:
│  ├─ Red marker: Incident location (from report)
│  ├─ Blue markers: All active rescuers
│  │  └─ Update position every 5-10 seconds
│  │
│  ├─ Draw line: Incident to nearest rescuer
│  ├─ Calculate: Distance remaining
│  ├─ Calculate: ETA to incident
│  │
│  └─ Color-coded team indicators:
│     └─ Alpha (purple), Bravo (green), Charlie (orange), Delta (blue)
│
├─ Show Status Panel:
│  ├─ "Team Alpha: 2 rescuers en route"
│  ├─ "Nearest: Rescuer John - 500m away - ETA 4 min"
│  ├─ "Alert Status: In Progress"
│  └─ "Time Elapsed: 3 minutes"
│
├─ Admin Can:
│  ├─ View all rescuer locations in real-time
│  ├─ Monitor response progress
│  ├─ Calculate if need additional teams
│  └─ Provide directions via mobile message (future feature)

Duration:
├─ Continues until rescuers reach incident location
├─ Typically 5-20 minutes depending on distance
└─ May continue during active rescue operations


────────────────────────────────────────────────────────────────────────────


STAGE 6: INCIDENT RESOLUTION
════════════════════════════════════════════════════════════════════════════

Time: T+10min to T+1hour (variable)
Status: "in_progress" → "resolved"
Location: AdminWebApp Dashboard

Trigger Events:
│
├─ Rescuers arrive at scene (shown on map)
├─ Request/operations complete
├─ Victims rescued/scene secured
│
└─ Admin marks alert as resolved

Resolution Process:
│
├─ [Admin Action] Click "Mark Resolved" button
│  └─ May optionally add action note:
│     "2 victims rescued, transported to hospital"
│
├─ [API Call] PATCH /api/alerts/:reportId
│   {
│     status: 'resolved',
│     resolvedBy: adminId,
│     resolvedAt: now,
│     actionNote: 'Rescue completed...'
│   }
│
├─ [API Call] PATCH /api/teams/:teamId
│   {
│     status: 'available',
│     currentMission: null
│   }
│
├─ [Database Updates]
│  ├─ Report.status = 'resolved'
│  ├─ Report.resolvedBy = adminId
│  ├─ Report.resolvedAt = timestamp
│  ├─ Team.status = 'available'
│  ├─ Team.currentMission = null
│  └─ Team back to available status
│
└─ [Socket.IO Broadcast]
    ├─→ io.to('team_Alpha').emit('mission_completed', {...})
    │
    └─→ RescuerApp receives: mission cleared, return to dashboard


RescuerApp Receives Update:
│
├─ Socket.IO event: 'mission_completed'
├─ Clear current mission from dashboard
├─ Update team status: "Available"
├─ Stop continuous location tracking
│  (or transition to normal GPS tracking for duty status)
│
└─ Team ready to accept next mission


────────────────────────────────────────────────────────────────────────────


STAGE 7: POST-INCIDENT REPORTING
════════════════════════════════════════════════════════════════════════════

Time: T+1hour+ (after resolution)
Status: "resolved"
Location: AdminWebApp Dashboard

Admin Report Generation:
│
├─ Click "Generate Report" on resolved alert
│
├─ [API Call] POST /api/reports/generate-pdf
│   {
│     reportId,
│     includeAnalytics: true,
│     includeTeamPerformance: true
│   }
│
├─ PDF Generation:
│  ├─ Header: Incident summary
│  ├─ Timeline:
│  │  ├─ T+0: Alert submitted by citizen
│  │  ├─ T+1s: Admin acknowledged
│  │  ├─ T+2s: Team assigned (Alpha)
│  │  ├─ T+12min: Team arrived at scene
│  │  └─ T+30min: Incident resolved
│  │
│  ├─ Location Information:
│  │  ├─ Incident: Barangay 7, Purok 2
│  │  ├─ GPS: 8.2456°N, 125.0089°E
│  │  └─ Map image
│  │
│  ├─ Team Performance:
│  │  ├─ Response time: 12 minutes
│  │  ├─ Team members: 4 rescuers
│  │  ├─ Equipment used: (if tracked)
│  │  └─ Outcome: 2 victims saved
│  │
│  ├─ AI/ML Analysis:
│  │  ├─ Automatic severity assessment: High
│  │  ├─ Confidence scores
│  │  ├─ Legitimacy check: Verified
│  │  └─ Fraud risk: Low
│  │
│  └─ Narrative:
│     └─ Human-readable incident summary
│
├─ Generate PDF file
│
└─ Download to admin device


Data Retention:
│
├─ Report remains in MongoDB indefinitely
├─ Accessible via Reports page with filters:
│  ├─ Date range
│  ├─ Location
│  ├─ Disaster type
│  ├─ Team assigned
│  └─ Status
│
└─ Historical analytics available for study

───────────────────────────────────────────────────────────────────────────

FINAL STATE SUMMARY
═══════════════════════════════════════════════════════════════════════════

Report Document State:
├─ status: "resolved"
├─ userId: (original reporter)
├─ location: (mapped barangay/purok)
├─ assignedTeam: teamId
├─ assignedRescuer: { rescuerId, rescuerName, startedAt }
├─ resolvedBy: adminId
├─ resolvedAt: timestamp
├─ actionNote: "Rescue completed..."
├─ mlPredictions: {
│    disasterType: verified type,
│    isLegitimate: true/false,
│    severity: assessed level,
│    confidence: 0.85-0.95
│  }
└─ timestamps: { createdAt, updatedAt, acknowledgedAt, resolvedAt }

Team State:
├─ status: "available"
├─ currentMission: null
├─ members: (unchanged)
└─ ready for next alert

User (Citizen) State:
├─ reportHistory includes completed alert
├─ can view details, generate personal report copy
└─ ready to submit new alerts

User (Rescuer) State:
├─ dutyStatus: (unchanged - may be on/off duty)
├─ location: (current location if still active)
├─ lastMission: (now completed)
└─ available for next mission

User (Admin) State:
├─ All actions logged
├─ Report generated and archived
├─ Can export statistics
└─ Track performance metrics
```

---

## 📡 API ENDPOINTS & COMMUNICATION PROTOCOLS

### Complete API Reference by Application

#### **AUTHENTICATION ENDPOINTS** (Shared Backend)
```
POST /api/auth/register
  ├─ Purpose: User registration
  ├─ Auth: None (public)
  ├─ Body: { name, email OR username, password, role? }
  ├─ Citizens: email-based
  ├─ Rescuers: username-based
  ├─ Returns: { token, user }
  └─ Used By: DisasterSOS, RescuerApp, AdminWebApp

POST /api/auth/login
  ├─ Purpose: User login
  ├─ Auth: None (public)
  ├─ Body: { email/username, password }
  ├─ Returns: { token, user }
  └─ Used By: All apps

POST /api/auth/google
  ├─ Purpose: Google OAuth login
  ├─ Auth: None (public)
  ├─ Body: { idToken }
  ├─ Returns: { token, user }
  └─ Used By: DisasterSOS (citizens only)

GET /api/auth/users
  ├─ Purpose: List all users
  ├─ Auth: JWT (admin only)
  ├─ Query: ?role=rescuer|admin|user
  ├─ Returns: [User[], ...]
  └─ Used By: AdminWebApp

GET /api/auth/profile
  ├─ Purpose: Get current user profile
  ├─ Auth: JWT (required)
  ├─ Returns: { User details }
  └─ Used By: All apps

PATCH /api/auth/profile
  ├─ Purpose: Update user profile
  ├─ Auth: JWT (required)
  ├─ Body: { name, phone, jobTitle, ... }
  ├─ Returns: { updated user }
  └─ Used By: All apps (role-based fields)
```

#### **ALERT ENDPOINTS** (Public-facing)
```
POST /api/alerts
  ├─ Purpose: Submit emergency alert
  ├─ Auth: None (public) - anonymous or authenticated
  ├─ Body: {
  │   type: "Fire|Flood|Earthquake|Landslide|Typhoon",
  │   latitude: number,
  │   longitude: number,
  │   locationName?: string,
  │   userId?: ObjectId,
  │   userName?: string
  │ }
  ├─ Processing:
  │   ├─ Create Report document
  │   ├─ Run async ML verification
  │   ├─ Broadcast to admins via Socket.IO
  │   └─ Call ML service if available
  ├─ Returns: { reportId, status, ... }
  └─ Used By: DisasterSOS (citizens), Anonymous

GET /api/alerts
  ├─ Purpose: Get all active alerts
  ├─ Auth: JWT (admin only)
  ├─ Query: ?status=new&severity=high&limit=50
  ├─ Returns: [Alert[], ...]
  └─ Used By: AdminWebApp

GET /api/alerts/:id
  ├─ Purpose: Get alert details
  ├─ Auth: JWT
  ├─ Returns: { Alert with full details + ML predictions }
  └─ Used By: AdminWebApp, DisasterSOS (own alerts)

PATCH /api/alerts/:id
  ├─ Purpose: Update alert status
  ├─ Auth: JWT (admin only)
  ├─ Body: {
  │   status: "acknowledged|in_progress|resolved",
  │   actionNote?: string,
  │   resolvedBy?: adminId
  │ }
  ├─ Broadcast: Socket.IO to concerned parties
  └─ Used By: AdminWebApp

GET /api/alerts/locations/barangays
  ├─ Purpose: Get all barangay/purok locations
  ├─ Auth: None (public)
  ├─ Returns: [Barangay locations with purok list]
  └─ Used By: DisasterSOS (location picker)
```

#### **RESCUE ENDPOINTS** (Rescuer-specific)
```
POST /api/rescue/push-token
  ├─ Purpose: Register push notification token
  ├─ Auth: JWT (rescuer only)
  ├─ Body: { pushToken: string }
  ├─ Updates: User.pushToken, User.isOnline = true
  └─ Used By: RescuerApp

GET /api/rescue/my-team
  ├─ Purpose: Get assigned team details
  ├─ Auth: JWT (rescuer only)
  ├─ Returns: { Team details with members, leader }
  └─ Used By: RescuerApp

GET /api/rescue/my-mission
  ├─ Purpose: Get current assigned mission
  ├─ Auth: JWT (rescuer only)
  ├─ Returns: { Report (mission), team info }
  └─ Used By: RescuerApp

GET /api/rescue/missions
  ├─ Purpose: Get paginated mission history
  ├─ Auth: JWT (rescuer only)
  ├─ Query: ?page=1&limit=20&status=resolved
  ├─ Returns: [Missions[], pagination]
  └─ Used By: RescuerApp

GET /api/rescue/notifications
  ├─ Purpose: Get notifications
  ├─ Auth: JWT (rescuer only)
  ├─ Returns: [Notification[], max 50 recent]
  └─ Used By: RescuerApp

PATCH /api/rescue/notifications/:id/read
  ├─ Purpose: Mark notification as read
  ├─ Auth: JWT (rescuer only)
  ├─ Returns: { message }
  └─ Used By: RescuerApp

PATCH /api/rescue/notifications/read-all
  ├─ Purpose: Mark all notifications read
  ├─ Auth: JWT (rescuer only)
  └─ Used By: RescuerApp

POST /api/rescue/status
  ├─ Purpose: Update rescuer online/duty status
  ├─ Auth: JWT (rescuer only)
  ├─ Body: { isOnline: boolean, dutyStatus: "on-duty|off-duty" }
  ├─ Updates: User.isOnline, User.dutyStatus, User.lastSeen
  └─ Used By: RescuerApp
```

#### **TEAM ENDPOINTS**
```
GET /api/teams
  ├─ Purpose: Get all teams
  ├─ Auth: JWT
  ├─ Returns: [Team[], ...]
  └─ Used By: AdminWebApp, RescuerApp

GET /api/teams/:id
  ├─ Purpose: Get team details
  ├─ Auth: JWT
  ├─ Returns: { Team with members populated }
  └─ Used By: AdminWebApp

PATCH /api/teams/:id/assignment
  ├─ Purpose: Assign mission to team
  ├─ Auth: JWT (admin only)
  ├─ Body: { currentMission: reportId, status: 'deployed' }
  ├─ Triggers: Socket.IO broadcast to team_X room
  └─ Used By: AdminWebApp
```

#### **REPORT ENDPOINTS**
```
GET /api/reports
  ├─ Purpose: Get historical reports
  ├─ Auth: JWT
  ├─ Query: ?startDate=&endDate=&status=resolved&location=
  ├─ Returns: [Report[], ...]
  └─ Used By: AdminWebApp, DisasterSOS

POST /api/reports/filter
  ├─ Purpose: Advanced report filtering
  ├─ Auth: JWT (admin)
  ├─ Body: { dateRange, type, team, status }
  ├─ Returns: [Filtered reports]
  └─ Used By: AdminWebApp

POST /api/reports/generate-pdf
  ├─ Purpose: Generate PDF report
  ├─ Auth: JWT (admin only)
  ├─ Body: { reportId, includeAnalytics }
  ├─ Returns: PDF file (file download)
  └─ Used By: AdminWebApp
```

#### **ML/AI ENDPOINTS**
```
POST /api/ml/verify-report
  ├─ Purpose: Run ML verification on report
  ├─ Auth: JWT (admin)
  ├─ Body: { reportId }
  ├─ Processing: Call external ML service (async)
  └─ Returns: { predictions, confidence }

POST /api/ai/assess-severity
  ├─ Purpose: Get AI severity assessment
  ├─ Auth: JWT (admin)
  ├─ Body: { disasterType, location, description }
  └─ Returns: { severity, confidence }

GET /api/ai/feedback/:reportId
  ├─ Purpose: Get AI feedback for report
  ├─ Auth: JWT
  ├─ Returns: { AIFeedback document }
  └─ Used By: AdminWebApp
```

#### **ROUTING ENDPOINTS**
```
POST /api/route
  ├─ Purpose: Calculate optimal route
  ├─ Auth: JWT
  ├─ Body: {
  │   origin: { lat, lng },
  │   destination: { lat, lng },
  │   rescuerLocations: [{ lat, lng }, ...]
  │ }
  ├─ Returns: { route, distance, eta, nearer... }
  └─ Used By: AdminWebApp, RescuerApp
```

---

### Real-time Communication (Socket.IO)

#### **Connection & Authentication**
```javascript
// RescuerApp & AdminWebApp Connect
const socket = io('http://192.168.1.57:5000', {
  auth: {
    token: jwt_token
  }
});

// Server verifies JWT in io.use((socket, next) => {...})
```

#### **Socket.IO Events Emitted TO Backend**

```javascript
// From AdminWebApp
socket.emit('join_admin')
  → Joins 'admins' room
  → Receives all new alerts

// From RescuerApp
socket.emit('join_rescuer_room', userId)
  → Joins 'rescuer_<userId>' room
  → Receives personal notifications

socket.emit('rescuer_location', {
  rescuerId, rescuerName,
  lat, lng, accuracy, timestamp
})
  → Emitted every 5-10 seconds during active mission
  → Backend updates User location
  → Backend broadcasts to admins

socket.emit('mission_status', {
  missionId, status,
  note: "At scene, beginning operations"
})
  → Rescuer provides real-time updates
```

#### **Socket.IO Events Received FROM Backend**

```javascript
// Broadcast to 'admins' room
io.to('admins').emit('new_alert', {
  reportId, type, location,
  severity, lat, lng,
  mlPredictions: { ... },
  timestamp
})
  → Received by AdminWebApp
  → Display in real-time alert feed

io.to('admins').emit('rescuer_location_update', {
  rescuerId, rescuerName,
  lat, lng, location,
  accuracy, timestamp,
  teamId, distanceToIncident, eta
})
  → Received by AdminWebApp
  → Update rescuer markers on map
  → Update ETA information

// Broadcast to team room (e.g., 'team_Alpha')
io.to('team_Alpha').emit('new_mission', {
  report: { ... },
  team: { _id, name, color },
  assignment: { startedAt, ... }
})
  → Received by all rescuers in that team
  → Display mission notification
  → Allow accept/decline

io.to('team_Alpha').emit('mission_completed', {
  missionId, status,
  note: "Incident resolved..."
})
  → Mission cleared
  → Team back to available

// Personal room (e.g., 'rescuer_12345')
socket.emit('notification', {
  type: 'new_mission|status_update|alert',
  data: { ... }
})
  → Personal notifications
  → Only sent to specific rescuer
```

---

## 🗄️ DATABASE MODELS & RELATIONSHIPS

### MongoDB Collections Schema

#### **users Collection**
```javascript
{
  _id: ObjectId,
  
  // Basic Identity
  name: String,
  email: String (unique, sparse),        // Citizens & Admins
  username: String (unique, sparse),     // Rescuers only
  password: String (bcrypt hashed),
  phone: String (default: "+63"),
  jobTitle: String,
  picture: String (URL),
  
  // Role & Permission
  role: "user" | "admin" | "rescuer",
  blocked: Boolean (default: false),
  
  // Location Tracking
  location: String ("Purok 1, Barangay 1"),
  lastLocationUpdate: Date,
  lastLocationCoords: {
    lat: Number,
    lng: Number
  },
  lastLat: Number,
  lastLng: Number,
  
  // Rescuer-specific
  dutyStatus: "on-duty" | "off-duty",
  pushToken: String (Expo notification token),
  
  // Session Tracking
  isOnline: Boolean,
  lastSeen: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### **reports Collection**
```javascript
{
  _id: ObjectId,
  
  // Reporter Information
  userId: ObjectId (ref: User) OR null,
  senderName: String,
  
  // Location
  lat: Number (required),
  lng: Number (required),
  accuracy: Number,
  locationName: String ("Purok 1, Barangay 1"),
  geofenceRadiusMeters: Number,
  
  // Incident Details
  disasterType: String ("Fire|Flood|Earthquake|..."),
  note: String,
  severity: "low|moderate|high|critical",
  
  // Status Workflow
  status: "new|acknowledged|in_progress|resolved|Pending|Ongoing|Declined",
  
  // Team Assignment
  assignedTeam: ObjectId (ref: Team) OR null,
  assignedRescuer: {
    rescuerId: String,
    rescuerName: String,
    rescuerLat: Number,
    rescuerLng: Number,
    startedAt: Date
  },
  
  // Resolution
  resolvedBy: ObjectId (ref: User) OR null,
  resolvedAt: Date,
  declinedBy: ObjectId (ref: User) OR null,
  declinedAt: Date,
  actionNote: String,
  
  // ML/AI Predictions
  mlPredictions: {
    disasterType: String,
    disasterTypeConfidence: Number (0-1),
    severity: String,
    severityConfidence: Number (0-1),
    isLegitimate: Boolean,
    legitimacyConfidence: Number (0-1),
    overall: {
      confidence: Number (0-1),
      recommendation: String
    }
  },
  mlProcessedAt: Date,
  
  // Timestamps
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

Indices:
  - status
  - userId
  - assignedTeam
  - createdAt
  - geolocation: geoSpatial index on [lat, lng]
```

#### **teams Collection**
```javascript
{
  _id: ObjectId,
  
  // Team Identity
  name: String (enum: ["Alpha", "Bravo", "Charlie", "Delta"],unique),
  color: String (hex color code),
  
  // Members
  leader: ObjectId (ref: User),
  members: [ObjectId] (ref: User, array),
  
  // Current Mission
  currentMission: ObjectId (ref: Report) OR null,
  status: "available|deployed|standby",
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

Indices:
  - name (unique)
  - status
```

#### **notifications Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  
  type: "new_mission|update|alert|message",
  
  data: {
    reportId: ObjectId,
    teamId: ObjectId,
    message: String,
    actionUrl: String
  },
  
  isRead: Boolean (default: false),
  
  createdAt: Date,
  updatedAt: Date
}

Indices:
  - userId
  - isRead
  - createdAt
```

#### **aifeedback Collection**
```javascript
{
  _id: ObjectId,
  reportId: ObjectId (ref: Report),
  
  // ML Model Outputs
  predictions: {
    disasterType: { label, confidence },
    severity: { label, confidence },
    legitimacy: { isValid, confidence }
  },
  
  // Admin Feedback (if any corrections)
  adminFeedback: String,
  adminCorrection: {
    type: String,
    severity: String,
    note: String
  },
  
  createdAt: Date,
  updatedAt: Date
}

Indices:
  - reportId
  - createdAt
```

---

## 🔐 Security & Authentication

### JWT Token Structure
```
Header: { alg: "HS256", typ: "JWT" }

Payload: {
  id: ObjectId (userId),
  role: "user|admin|rescuer",
  iat: timestamp,
  exp: timestamp (7 days)
}

Signed with: process.env.JWT_SECRET
```

### Password Hashing
```
Algorithm: bcryptjs
Rounds: 10
Used for: user & rescuer passwords (not emails)
```

### OAuth2 Flow (Google)
```
1. User clicks "Sign in with Google" in DisasterSOS
2. Expo redirects to Google OAuth consent screen
3. User authorizes app
4. App receives ID token
5. Send token to POST /api/auth/google
6. Backend verifies with Google OAuth2Client
7. Create/update user in database
8. Issue JWT token
9. User logged in
```

---

## 📊 System Metrics & Performance

### Expected Performance
```
Alert Submission:
  ├─ API Response: < 200ms
  ├─ Socket.IO Broadcast: < 50ms
  ├─ Admin Dashboard Update: < 100ms
  └─ Total End-to-End: < 500ms

Location Update:
  ├─ Socket.IO Emit: < 100ms
  ├─ Backend Processing: < 150ms
  ├─ Location Name Mapping: ~50ms
  ├─ Admin Dashboard Update: < 100ms
  └─ Total: < 500ms

Database:
  ├─ Read Operations: ~10ms (with indices)
  ├─ Write Operations: ~25ms
  ├─ Geospatial Queries: ~50ms
  └─ Aggregations: ~100-500ms

Concurrent Users:
  ├─ Supported (with current setup): 100-500
  ├─ Can scale to: 1000+ (with optimization)
  └─ Database: MongoDB Atlas (scales automatically)
```

---

## 🚀 Deployment Architecture

###Ports & Services
```
Port 5000   - Express.js Backend (Admin + Rescue APIs)
Port 5002   - (Optional) DisasterSOS mobile backend
Port 27017  - MongoDB (local) OR MongoDB Atlas (cloud)

Frontend Hosting:
  ├─ AdminWebApp: Deployed on web server / cloud (Vercel, Heroku, etc.)
  ├─ DisasterSOS: React Native (compiled to APK/IPA)
  └─ RescuerApp: React Native (compiled to APK/IPA)

Database:
  ├─ Option 1: Local MongoDB instance
  └─ Option 2: MongoDB Atlas (recommended for production)
```

---

## 📝 SUMMARY

The **SALBA Emergency System** is a production-ready, three-tier emergency response platform that seamlessly integrates:

1. **DisasterSOS** - Citizen reporting interface
2. **AdminWebApp** - Administrative control center
3. **RescuerApp** - Field operations platform

All three applications communicate through a centralized Express.js backend with MongoDB, utilizing:
- RESTful APIs for standard operations
- WebSocket (Socket.IO) for real-time updates
- JWT authentication for security
- ML/AI integration for intelligence

The system supports the complete lifecycle from alert submission through team deployment, real-time tracking, and resolution reporting.

---

**Document Version:** 1.0  
**Last Updated:** April 5, 2026  
**Status:** Complete Analysis
