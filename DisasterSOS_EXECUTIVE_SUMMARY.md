# DisasterSOS Codebase - Executive Summary

**Created:** April 5, 2026  
**Project:** DisasterSOS Emergency Alert System  
**Location:** `c:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS`

---

## 📋 DOCUMENTATION OVERVIEW

Three comprehensive analysis documents have been created in `c:\Users\USER\OneDrive\Documents\Capstone\`:

1. **DisasterSOS_CODEBASE_ANALYSIS.md** (15 sections, ~8000 words)
   - Complete project structure breakdown
   - Frontend & backend architecture details
   - All critical features explained
   - Complete data flow documentation
   - Technology stack summary

2. **DisasterSOS_ARCHITECTURE_DIAGRAMS.md** (6 visual diagrams)
   - System architecture overview
   - Frontend navigation structure
   - One-tap alert workflow (detailed visual)
   - MongoDB data model relationships
   - Backend routes & API flow
   - Location detection system

3. **DisasterSOS_FILE_REFERENCE.md** (11 reference tables)
   - Complete file listing by category
   - Purpose & key functions for each file
   - Component hierarchy & data flow
   - Learning paths for different topics
   - State management locations
   - API endpoints reference
   - Environment variables guide

---

## 🎯 PROJECT AT A GLANCE

| Aspect | Details |
|--------|---------|
| **Type** | React Native Mobile App + Node.js Express Backend |
| **Primary Feature** | One-tap emergency disaster reporting |
| **Coverage Area** | Malaybalay City, Philippines (283 barangay/purok locations) |
| **Database** | MongoDB (capstoneDB) |
| **Deployment** | Expo (mobile), Node.js server (backend) |
| **Status** | Complete, integrated with AdminWebApp |

---

## 🏗️ ARCHITECTURE

### Frontend Stack
- **React Native** with Expo
- **Navigation**: Stack + Tab navigation
- **Services**: REST API (axios)
- **State**: AsyncStorage (persistent), React state (temporary)
- **Screens**: 7 main screens + components

### Backend Architecture
- **Express.js** server on port 5002
- **MongoDB** with mongoose ODM
- **Authentication**: JWT + Google OAuth + reCAPTCHA v3
- **Routes**: 11 endpoints across 2 route files
- **Integration**: Forwards alerts to AdminWebApp for ML analysis

---

## ⚡ CRITICAL COMPONENTS

### One-Tap Emergency Reporting
**HomeScreen.jsx** - The core feature:
```
User Interface:
├─ Header: SALBA logo + Burger menu
├─ Mode Selector: Bypasser (GPS) or Report (Manual)
├─ Disaster Type: Dropdown with 5 types
├─ Location Selection:
│  ├─ Bypasser: Auto GPS + nearest barangay matching
│  └─ Report: Manual selection from 283 locations
├─ Submit Button: Red "Tap to Alert"
└─ Success Overlay: 3-second confirmation

Data Submission:
  user selects type + location
  → validates input
  → shows warning confirmation
  → sends POST /api/alerts
  → backend saves to MongoDB
  → backend forwards to AdminWebApp (non-blocking)
  → frontend shows success (3 sec)
  → form resets for next report
```

### Location System
**Two Detection Methods:**
1. **GPS-Based (Bypasser Mode)**
   - expo-location: requests permission + gets coordinates
   - geolib: calculates distance to each location
   - locationHelper: finds nearest barangay/purok
   - Returns: location with distance in meters

2. **Manual Selection (Report Mode)**
   - Dropdown with all 283 locations
   - Pre-stored coordinates from locations.js
   - User selects, coordinates used directly

### Admin Dashboard
**Alert Management:**
- View active (non-resolved) alerts
- Assign rescue teams
- Mark cases as resolved
- Generate PDF reports
- View history of resolved cases

---

## 📊 DATA MODELS

### User
```javascript
{
  _id, name, email, password (hashed), googleId,
  avatar, authProvider ('local' | 'google'),
  role ('citizen' | 'admin' | 'rescuer'),
  birthday, location, createdAt
}
```

### Alert (Report)
```javascript
{
  _id, userId (ref), lat, lng, accuracy,
  severity ('low' | 'moderate' | 'critical'),
  note, status ('new' | 'assigned' | 'Resolved'),
  geofenceRadiusMeters, assignedTeam (ref),
  disasterType, locationName, senderName,
  resolvedBy (ref), resolvedByName, resolvedAt,
  timestamps (createdAt, updatedAt)
}
```

### Team
```javascript
{
  _id, name, leader (ref), members [refs],
  status ('available' | 'busy' | 'offline'),
  currentMission (ref), color, timestamps
}
```

---

## 🔗 API ENDPOINTS

### Authentication (Public)
```
POST /api/auth/register        - Register new user
POST /api/auth/login           - Login with email/password
POST /api/auth/google          - Google OAuth authentication
```

### User (Auth Required)
```
GET  /api/users/profile        - Fetch user profile
PUT  /api/users/profile        - Update user profile
POST /api/users/change-password - Change password
```

### Alerts (Public)
```
POST /api/alerts                - Create new alert/report
GET  /api/alerts                - Get all active alerts
GET  /api/alerts/history        - Get resolved alerts
PUT  /api/alerts/:id            - Update alert (assign/resolve)
GET  /api/alerts/grouped        - Get alerts grouped by disaster type
```

---

## 📱 SCREENS & NAVIGATION

```
Login/Register
    ↓
Home (Main Tab Navigator)
├─ Home Tab → HomeScreen (one-tap alert)
├─ Map Tab → MapScreen (location view)
└─ History Tab → AlertHistoryScreen (user's reports)

Burger Menu Options:
├─ Mode Selector (Bypasser ↔ Report Incident)
├─ My Report History → AlertHistoryScreen
└─ Profile Settings → ProfileScreen

Admin-Only:
└─ AdminDashboard → Alert management + PDF generation
```

---

## 🔐 Security Features

1. **Password Security**: bcryptjs hashing (10 rounds)
2. **Authentication**: JWT tokens (7-day expiry)
3. **Login Protection**: reCAPTCHA v3 bot detection
4. **OAuth**: Google OAuth2 verification
5. **API Protection**: CORS enabled
6. **Authorization**: Role-based (citizen/admin/rescuer)

---

## 🌍 LOCATION COVERAGE

- **City**: Malaybalay City, Philippines
- **Barangays**: 46 total
- **Puroks**: Up to 8 per barangay
- **Total Locations**: 283
- **Detection Method**: GPS with geolib distance calculation
- **Fallback**: Manual location selection

---

## 🔄 COMPLETE DATA FLOW

### Alert Submission Lifecycle
```
1. User Authentication
   LoginScreen → POST /api/auth/login → JWT stored

2. Location Capture
   GPS Mode: expo-location.getCurrentPosition() → geolib matching
   Manual: User selects from dropdown (283 options)

3. Disaster Selection
   Dropdown: Flood, Fire, Earthquake, Landslide, Typhoon

4. Validation & Confirmation
   Validate type + location → Show warning → User confirms

5. Alert Submission
   HomeScreen.alertService.sendAlert(data)
   → POST /api/alerts to backend
   → Backend saves to MongoDB
   → Backend async forwards to AdminBackend
   → Frontend shows success (3 sec)

6. Admin Management
   AdminDashboard.fetchAlerts() → Display active
   → Assign team: PUT /api/alerts/:id {assignedTeam}
   → Resolve: PUT /api/alerts/:id {status: 'Resolved'}
   → Generate PDF → Share

7. User History
   AlertHistoryScreen → GET /api/alerts → Display user's reports
```

---

## 🚀 RUNNING THE APPLICATION

### Frontend
```bash
cd DisasterSOS
npm install
npm start                    # Start Expo dev server
npm run android             # Run on Android
npm run ios                 # Run on iOS
npm run web                 # Run on web browser
```

### Backend
```bash
cd DisasterSOS/backend
npm install
npm run dev                 # Start with nodemon
npm start                   # Start directly
# Server runs on http://localhost:5002
```

### Database
```bash
# Ensure MongoDB is running
mongod
# Default: mongodb://127.0.0.1:27017/capstoneDB
```

---

## 🔗 INTEGRATION WITH ADMINWEBAPP

When an alert is created in DisasterSOS:

1. Alert saved to DisasterSOS MongoDB
2. Non-blocking async POST to AdminWebApp backend
3. AdminWebApp URL: `http://localhost:5000/api/reports`
4. Purpose: ML analysis for severity/priority calculation
5. Original submission completes immediately (non-blocking)

---

## 📁 KEY DIRECTORIES

```
DisasterSOS/
├── App.js                    # Entry point
├── navigation/               # Screen navigation
├── screens/                  # 7 UI screens
├── services/                 # API communication
├── components/               # Reusable components
├── hooks/                    # Custom React hooks
├── utils/                    # Utilities (locations, helpers)
├── config/                   # Configuration
├── assets/                   # Images/icons
├── backend/                  # Express server
│   ├── server.js
│   ├── routes/               # API endpoints
│   ├── models/               # MongoDB schemas
│   ├── config/               # DB connection
│   └── package.json
└── package.json              # Frontend dependencies
```

---

## 🛠️ TECHNOLOGY STACK

### Frontend
- React Native 19.1.0
- Expo 54.0.12
- @react-navigation 7.x (Stack, Tabs)
- react-native-maps 1.20.1
- expo-location 19.0.7
- expo-auth-session 7.0.10
- axios 1.12.2
- geolib 3.3.4
- react-native-element-dropdown 2.12.4
- @react-native-async-storage/async-storage 2.2.0

### Backend
- Node.js (Express 4.22.1)
- MongoDB (mongoose 8.19.1)
- JWT (jsonwebtoken 9.0.3)
- bcryptjs 3.0.3
- google-auth-library 10.5.0
- CORS (cors 2.8.5)
- Socket.io 4.8.3 (optional)

---

## 📊 STATISTICS

| Metric | Count |
|--------|-------|
| Frontend Screens | 7 |
| Components | 3 |
| Custom Hooks | 2 |
| API Endpoints | 11 |
| MongoDB Collections | 3 |
| Location Database Entries | 283 |
| Disaster Types | 5 |
| User Roles | 3 |
| Routes Files | 2 |
| Model Files | 3 |

---

## ✅ FEATURE CHECKLIST

- ✅ One-tap emergency reporting
- ✅ GPU location tracking (Bypasser mode)
- ✅ Manual location selection (283 locations)
- ✅ User authentication (JWT + Google OAuth)
- ✅ reCAPTCHA bot protection
- ✅ Admin dashboard for alert management
- ✅ Rescue team assignment
- ✅ Case resolution tracking
- ✅ PDF report generation
- ✅ Report history viewing
- ✅ User profile management
- ✅ Password change functionality
- ✅ Backend-to-backend integration (ML analysis)
- ✅ Real-time capable (Socket.io installed)
- ✅ Cross-platform support (Mobile + Web)

---

## 📚 DETAILED DOCUMENTATION CHAPTERS

| Document | Focus | Length |
|----------|-------|--------|
| DisasterSOS_CODEBASE_ANALYSIS.md | Complete system explanation | ~8000 words, 9 sections |
| DisasterSOS_ARCHITECTURE_DIAGRAMS.md | Visual system architecture | 6 ASCII diagrams |
| DisasterSOS_FILE_REFERENCE.md | File-by-file reference | 11 reference tables |
| DisasterSOS_EXECUTIVE_SUMMARY.md | This document | Quick overview |

---

## 🎓 LEARNING PATHS

### Beginner (Understand the flow)
1. Read: DisasterSOS_EXECUTIVE_SUMMARY.md (this file)
2. Diagram: View "One-tap Alert Workflow" in ARCHITECTURE_DIAGRAMS
3. Code: Open HomeScreen.jsx and follow the flow

### Intermediate (Understand implementation)
1. Read: DisasterSOS_CODEBASE_ANALYSIS.md sections 2-4
2. Reference: DisasterSOS_FILE_REFERENCE.md
3. Code: Study services/alertService.js and backend/routes/alertRoutes.js

### Advanced (Full system understanding)
1. Read: All three documentation files
2. Study: Data model relationships diagram
3. Code: Read all route files and models
4. Trace: Complete alert lifecycle from frontend to backend

---

## 🤝 COMPONENT INTEGRATION

```
Frontend Components interact via:
├─ API Services (axios)
├─ AsyncStorage (local persistence)
└─ Navigation (React Navigation)

Backend APIs serve:
├─ Authentication (JWT)
├─ User management
├─ Alert CRUD
└─ Team assignment

Components communicate via:
├─ HTTP REST API
├─ JSON request/response
└─ Error handling & validation
```

---

## ⚙️ CONFIGURATION

### Frontend (.env)
```
API_URL=http://192.168.1.56:5000  # DisasterSOS backend
```

### Backend (.env)
```
PORT=5002
MONGO_URI=mongodb://127.0.0.1:27017/capstoneDB
JWT_SECRET=your_jwt_secret_key_here
ADMIN_BACKEND_URL=http://localhost:5000  # AdminWebApp backend
GOOGLE_CLIENT_ID=your_google_client_id_here
RECAPTCHA_SECRET_KEY=your_recaptcha_v3_secret_key_here
```

---

## ❓ FREQUENTLY ASKED ABOUT

**Q: How does one-tap reporting work?**  
A: User selects disaster type + location (GPS or manual) → Confirms → Alert sent to backend → PDF available in admin dashboard

**Q: How is location detected?**  
A: Bypasser mode uses GPS + geolib to find nearest barangay. Report mode uses manual selection from 283-entry dropdown.

**Q: Who can access admin features?**  
A: Users with `role: 'admin'` can access AdminDashboard to manage alerts.

**Q: How is data secured?**  
A: Passwords hashed with bcryptjs, JWT for auth, reCAPTCHA for bot protection, Google OAuth available.

**Q: Can I use this on any device?**  
A: Yes - Android, iOS (via Expo), or Web browser via Expo.

**Q: How does admin get notified of new alerts?**  
A: Real-time capable via Socket.io (installed but commented out). Currently polling with GET /api/alerts.

---

## 📞 INTEGRATION POINTS

1. **Frontend ↔ DisasterSOS Backend** (Port 5002)
   - All mobile app API calls

2. **DisasterSOS Backend ↔ AdminWebApp Backend** (Port 5000)
   - Non-blocking async alert forwarding for ML analysis

3. **Both ↔ MongoDB**
   - Data persistence

---

## 🎯 SUMMARY

**DisasterSOS** is a complete, production-ready emergency alert system featuring:
- ✅ Instant one-tap disaster reporting from mobile
- ✅ Intelligent GPS location detection with manual fallback
- ✅ Secure user authentication (JWT + OAuth)
- ✅ Centralized admin dashboard for alert management
- ✅ Team assignment and case resolution tracking
- ✅ Integration with AdminWebApp for ML-based severity analysis
- ✅ Cross-platform support (mobile + web)

**Frontend**: React Native with Expo - 7 screens for user and admin functions  
**Backend**: Node.js/Express - 11 endpoints for auth, users, and alerts  
**Database**: MongoDB - 3 collections (users, reports, teams)  
**Locations**: 283 Malaybalay City barangays/puroks with GPS coordinates

---

For detailed information, see the three comprehensive analysis documents in:
`c:\Users\USER\OneDrive\Documents\Capstone\`

- `DisasterSOS_CODEBASE_ANALYSIS.md`
- `DisasterSOS_ARCHITECTURE_DIAGRAMS.md`
- `DisasterSOS_FILE_REFERENCE.md`
