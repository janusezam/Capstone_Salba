# DisasterSOS Codebase - Comprehensive Analysis

**Project:** DisasterSOS Emergency Alert System  
**Location:** `c:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS`  
**Type:** React Native Mobile + Node.js Express Backend  
**Database:** MongoDB  

---

## 1. PROJECT STRUCTURE

### Root-Level Files
```
DisasterSOS/
├── App.js                          # Entry point - loads AppNavigator
├── index.js                        # App initialization
├── app.json                        # Expo configuration
├── package.json                    # Frontend dependencies
├── .env                            # Environment variables (API_URL)
├── babel.config.js
├── postcss.config.js
├── tailwind.config.js
└── node_modules/
```

### Main Directories

#### `navigation/` - Navigation Structure
- **AppNavigator.jsx**: Main stack navigator managing screen flow
  - Routes: Login → Register OR Home → Map/History/AdminDashboard/Profile
- **MainTabs.jsx**: Bottom tab navigator for Home, Map, History

#### `screens/` - UI Screens (7 screens)
- **LoginScreen.jsx**: Email/password login + Google OAuth
- **RegisterScreen.jsx**: User registration form
- **HomeScreen.jsx**: Main emergency alert interface (one-tap reporting)
- **MapScreen.jsx**: Display user's current location on map
- **AdminDashboard.jsx**: Admin view of active alerts + assignment
- **AlertHistoryScreen.jsx**: View sent reports history
- **ProfileScreen.jsx**: User profile & password management

#### `components/` - Reusable Components
- **AlertCard.jsx**: Display individual alert cards
- **Header.jsx**: Header component with SALBA logo
- **MapViewComponent.jsx**: Reusable map display component

#### `services/` - API Communication
- **authService.js**: User registration/login API calls
- **alertService.js**: Send emergency alerts to backend

#### `hooks/` - Custom React Hooks
- **useAuth.js**: Authentication state management
- **useLocation.js**: Get user's GPS location with permission handling

#### `utils/` - Utility Functions
- **constants.js**: App colors and constants
- **locations.js**: All 283 Malaybalay City barangay/purok locations with GPS coordinates
- **locationHelper.js**: GPS-to-nearest-barangay conversion using geolib
- **helpers.js**: General utility functions

#### `config/` - Configuration
- **api.js**: Base API URL (platform-dependent: localhost for web, 192.168.1.57 for mobile)

#### `assets/` - Static Resources
- salbalogo.png: SALBA logo
- icon.png, favicon.png, splash-icon.png

#### `backend/` - Node.js Express Server
```
backend/
├── server.js                       # Express app setup, routes registration
├── package.json                    # Backend dependencies
├── .env                            # Backend env variables
├── config/
│   └── db.js                       # MongoDB connection
├── routes/
│   ├── alertRoutes.js              # Alert CRUD operations
│   └── userRoutes.js               # User auth & profile routes
├── models/
│   ├── Alert.js                    # Report/Alert data model
│   ├── User.js                     # User data model
│   └── Team.js                     # Rescue team data model
└── node_modules/
```

---

## 2. FRONTEND ARCHITECTURE

### Navigation Flow

```
App.js
  └── AppNavigator (Stack Navigator)
      ├── LoginScreen (initialRoute)
      ├── RegisterScreen
      ├── HomeScreen (Bottom Tab Navigator)
      │   ├── Home Tab (emergency alert interface)
      │   ├── Map Tab (location view)
      │   └── History Tab (past reports)
      ├── MapScreen (full-screen map)
      ├── AdminDashboard (admin only)
      ├── AlertHistoryScreen (report history)
      └── ProfileScreen (user settings)
```

### Key Screens & Features

#### HomeScreen.jsx - ONE-TAP EMERGENCY REPORTING
**Purpose:** Primary interface for disaster reporting  
**Key State:**
- `mode`: "bypasser" (use GPS) or "report" (select location)
- `location`: GPS coordinates
- `disasterType`: Selected disaster (Flood, Fire, Earthquake, Landslide, Typhoon)
- `selectedBarangay`: Manually selected barangay
- `loading`: API request state
- `showSuccess`: Success overlay animation

**Workflow:**
1. User sees header with SALBA logo + burger menu
2. Mode selector shows "Bypasser Mode" or "Report Incident Mode"
3. User selects disaster type from dropdown
4. User selects location:
   - **Bypasser Mode**: GPS auto-detects + finds nearest barangay/purok
   - **Report Mode**: User manually selects barangay from list
5. User taps red "Tap to Alert" button
6. Warning confirmation shown about false reports
7. Alert data sent to backend via `sendAlert()`
8. Success animation + form reset
9. Burger menu has options:
   - Switch mode
   - View report history
   - Go to Profile Settings

**Alert Data Sent:**
```javascript
{
  type: disasterType,           // "Flood", "Fire", etc.
  latitude: number,             // GPS lat or selected location lat
  longitude: number,            // GPS lng or selected location lng
  locationName: string,         // "Brgy X Purok Y" or database location
  userId: string,               // User's MongoDB ID (if logged in)
  userName: string              // User's name or "Anonymous"
}
```

#### MapScreen.jsx
- Displays user's current GPS location on map
- Uses `useLocation` hook to fetch permissions + coordinates
- Minimal functionality - just visualization

#### LoginScreen.jsx
**Features:**
- Email/password login
- Google OAuth sign-in (requires OAuth setup)
- reCAPTCHA v3 bot protection
- Form validation
- Links to Register screen
- Stores JWT token in AsyncStorage

#### RegisterScreen.jsx
- Name/email/password registration
- Form validation
- Redirects to Login on success

#### AdminDashboard.jsx
**Features:**
- View active (non-resolved) alerts in real-time
- Two tabs: "active" and "history"
- Assign rescue teams to alerts
- Mark cases as "Resolved"
- Generate PDF reports (using expo-print)
- Refresh active alerts
- Shows alert details:
  - Location (lat/lng)
  - Disaster type
  - Sender name
  - Assigned team
  - Resolution info

#### AlertHistoryScreen.jsx
- View all alerts sent by current user
- Pull-to-refresh functionality
- Icons for disaster types (Flood→water, Fire→flame, etc.)
- Location and timestamp for each report
- Option to clear history view

#### ProfileScreen.jsx
- View current profile (name, email, birthday, location, auth provider)
- Update profile information
- Change password (if local auth)
- Google OAuth accounts not allowed to change password

### Components

#### AlertCard.jsx
```javascript
// Props: item (alert object)
// Displays: Message, Lat/Lng, Date
```

#### Header.jsx
```javascript
// Props: title
// Displays: SALBA logo + title
// Used in screens
```

#### MapViewComponent.jsx
```javascript
// Props: latitude, longitude
// Displays: Interactive map with marker at coordinates
```

### Services (API Integration)

#### authService.js
```javascript
registerUser(data)          // POST /api/auth/register
loginUser(data)             // POST /api/auth/login
```

#### alertService.js
```javascript
sendAlert(data)             // POST /api/alerts
// Sends emergency alert to DisasterSOS backend
```

### Custom Hooks

#### useLocation.js
```javascript
// Returns GPS coordinates {latitude, longitude, altitude, accuracy}
// Requests permissions automatically
// Used in MapScreen, HomeScreen (bypasser mode)
```

#### useAuth.js
```javascript
// State: user object
// Methods: login(email, password), register(name, email, password)
// Returns: {user, login, register}
```

### Data Storage

**AsyncStorage (React Native storage):**
- `userToken`: JWT authentication token
- `userData`: User object {_id, name, email, avatar, role, etc.}

### Location Data

**locations.js** contains 283 locations:
- 46 Barangays in Malaybalay City
- Multiple Puroks per barangay
- Format: `{ label, value, latitude, longitude }`
- Example: `{ label: "Barangay 1 - Purok 1", latitude: 8.1632, longitude: 125.1278 }`

**locationHelper.js** provides:
- `getNearestBarangay(lat, lng)`: Uses geolib to find closest barangay/purok to GPS coordinates
- `formatLocationName(barangay, purok)`: Format location display string

---

## 3. BACKEND ARCHITECTURE

### Server Setup (server.js)

```javascript
// Express server on port 5002 (default)
// Middleware: CORS, JSON parsing
// Routes: /api/alerts, /api/users
// Health check: GET /api/health
// Graceful shutdown handling
```

### Database Connection
**MongoDB** via mongoose  
**Location:** mongodb://127.0.0.1:27017/capstoneDB  
**Models:** User, Alert (Report), Team

### Routes

#### alertRoutes.js - Alert Management

```
POST /api/alerts
  Purpose: Create new disaster report
  Body: { userId, latitude, longitude, severity, type, locationName, etc. }
  Action: Save to DB + forward to AdminWebApp backend for ML analysis
  Returns: Created report object

GET /api/alerts
  Purpose: Get all active (non-resolved) alerts
  Returns: Array of active reports with populated userid, assignedTeam
  Query: status != 'Resolved'

GET /api/alerts/history
  Purpose: Get all resolved cases
  Returns: Array of resolved reports with resolvedBy details
  Populated: userId, assignedTeam, resolvedBy

PUT /api/alerts/:id
  Purpose: Update alert (assign team or resolve)
  Body: { assignedTeam, status, resolvedBy, resolvedByName }
  Returns: Updated report

GET /api/alerts/grouped
  Purpose: Group alerts by disaster type
  Returns: Aggregate data with counts
```

#### userRoutes.js - Authentication & Profile

```
POST /api/auth/register
  Purpose: User registration
  Body: { name, email, password, recaptchaToken }
  Action: Hash password, create user, return JWT token
  Returns: { token, user }

POST /api/auth/login
  Purpose: User login
  Body: { email, password, recaptchaToken }
  Action: Verify credentials, generate JWT
  Returns: { token, user }

POST /api/auth/google
  Purpose: Google OAuth authentication
  Body: { idToken, recaptchaToken }
  Action: Verify Google token, create/link user
  Returns: { token, user }

GET /api/users/profile
  Auth: Bearer token required
  Purpose: Get current user profile
  Returns: User object (excluding password)

PUT /api/users/profile
  Auth: Bearer token required
  Purpose: Update user profile
  Body: { name, birthday, location }
  Returns: Updated user object

POST /api/users/change-password
  Auth: Bearer token required
  Purpose: Change password
  Body: { currentPassword, newPassword }
  Returns: Success message
```

### Data Models

#### Alert.js (Report Schema)
```javascript
{
  userId: ObjectId,          // Reference to User who reported
  lat: Number,               // Latitude
  lng: Number,               // Longitude
  accuracy: Number,          // GPS accuracy (meters)
  severity: String,          // 'low', 'moderate', 'critical'
  note: String,              // Description/notes
  status: String,            // 'new', 'assigned', 'Resolved'
  geofenceRadiusMeters: Number, // Radius for geofence
  assignedTeam: ObjectId,    // Reference to Team
  disasterType: String,      // Type of disaster
  locationName: String,      // Human-readable location
  senderName: String,        // Name of reporter
  resolvedBy: ObjectId,      // Reference to User who resolved
  resolvedByName: String,    // Name of resolver
  resolvedAt: Date,          // When case was resolved
  timestamps: true           // Auto createdAt, updatedAt
}
```

#### User.js (User Schema)
```javascript
{
  name: String,              // Full name (required)
  email: String,             // Email (required, unique)
  password: String,          // Hashed password
  googleId: String,          // Google OAuth ID
  avatar: String,            // Profile picture URL
  authProvider: String,      // 'local' or 'google'
  role: String,              // 'citizen', 'admin', 'rescuer'
  birthday: Date,
  location: String,          // User's location/address
  createdAt: Date            // Auto created
}
```

#### Team.js (Rescue Team Schema)
```javascript
{
  name: String,              // Team name
  leader: ObjectId,          // Reference to User (leader)
  members: [ObjectId],       // Array of User references
  status: String,            // 'available', 'busy', 'offline'
  currentMission: ObjectId,  // Reference to Report
  color: String,             // Color code for UI
  timestamps: true           // Auto createdAt, updatedAt
}
```

### Authentication
**JWT (JSON Web Tokens):**
- Generated on login/register with 7-day expiry
- Stored in AsyncStorage on frontend
- Sent via Authorization header: `Bearer <token>`
- Verified by `auth` middleware in userRoutes

**Security Features:**
- Password hashed with bcryptjs (10 rounds)
- reCAPTCHA v3 bot protection on login/register
- Google OAuth verification via Google Auth Library

### Backend-to-Backend Integration
**DisasterSOS Backend → AdminWebApp Backend (non-blocking):**
- When alert is created, it's forwarded to AdminBackend for ML analysis
- URL: `ADMIN_BACKEND_URL` or localhost:5000
- Endpoint: POST /api/reports
- Purpose: ML model analyzes severity/priority

---

## 4. CRITICAL FEATURES

### One-Tap Emergency Reporting

**Workflow:**
1. **Authentication:** User logged in (or anonymous as "Anonymous")
2. **Location Capture:**
   - **Bypasser Mode**: Automatic GPS capture via expo-location
   - **Report Mode**: Manual barangay selection from database
3. **Disaster Type Selection:** Dropdown with 5 types
4. **Validation:** Type + location required
5. **Confirmation:** Warning about false reports
6. **Submission:** POST to `/api/alerts`
7. **Feedback:** Success overlay (3 seconds) then form reset
8. **Forwarding:** Alert forwarded to AdminWebApp for ML analysis

**Key Files:**
- `HomeScreen.jsx` (main logic)
- `alertService.js` (API call)
- `locationHelper.js` (GPS conversion)
- `locations.js` (location database)

### Location Tracking

**Two Modes:**

**A. GPS-Based (Bypasser Mode)**
- Requests location permission via expo-location
- Gets user's real-time GPS coordinates
- Uses `geolib` to find nearest barangay/purok
- Distance calculation in meters shown in console
- Fallback to "Unknown Location" if no match

**B. Manual Selection (Report Mode)**
- User selects from dropdown of 283 locations
- Locations pre-stored in `locations.js`
- Each location has GPS coordinates for backend

**Implementation:**
- `expo-location` for GPS on mobile
- `geolib` library for distance calculations
- Custom `getNearestBarangay()` function

### User Roles & Permissions

**Three Role Types:**
- **citizen**: Regular user (default) - can report alerts
- **rescuer**: Rescue team member - can view assigned alerts
- **admin**: Admin user - can assign teams, resolve cases, generate reports

**Role-Based Routing:**
- Stored in `user.role` field
- AdminDashboard accessible only to admin users
- Standard users see Home, Map, History screens

### Alert Submission & Processing

**Frontend Submission:**
1. User enters data (type, location, etc.)
2. Retrieves user info from AsyncStorage
3. Calls `sendAlert(data)` → POST `/api/alerts`
4. Response indicates success/failure

**Backend Processing:**
1. Alert saved to MongoDB with status='new'
2. User reference populated from userId
3. Non-blocking async forward to AdminWebApp backend
4. Returns alert object to frontend

**Admin Dashboard:**
1. Admins view active (non-resolved) alerts
2. Can assign rescue teams via PUT request
3. Can mark as 'Resolved' with resolver info
4. Can generate PDF reports
5. View resolved cases in history tab

**Data Flow:**
```
Mobile App (HomeScreen)
  ↓ (POST /api/alerts)
DisasterSOS Backend
  ├→ Save to MongoDB
  ├→ Populate userId
  └→ Forward to AdminWebApp for ML analysis
  
Admin Dashboard
  ↓ (GET /api/alerts)
View active alerts
  ↓ (PUT /api/alerts/:id)
Update status/assign team
  ↓ (Mark as Resolved)
Move to history
```

### Report History & PDF Generation

**User Report History:**
- AlertHistoryScreen shows all alerts sent by user
- Fetches from `/api/alerts` endpoint
- Icons differentiate disaster types
- Pull-to-refresh to update

**Admin Report Generation:**
- AdminDashboard can generate PDF for each report
- Uses expo-print to generate HTML → PDF
- Shows case info, location, disaster type, team assigned, resolution details
- Shareable/exportable

---

## 5. OVERALL DATA FLOW

### Complete Alert Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: USER AUTHENTICATION                                     │
├─────────────────────────────────────────────────────────────────┤
│ Frontend: LoginScreen or RegisterScreen                         │
│   POST /api/auth/login      → Backend validates, returns JWT   │
│   POST /api/auth/register   → Backend creates user, returns JWT │
│   JWT + userData → AsyncStorage                                 │
│ Role assigned: 'citizen' (default) or 'admin' if applicable    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: LOCATION CAPTURE                                        │
├─────────────────────────────────────────────────────────────────┤
│ Bypasser Mode:                                                  │
│   expo-location.getCurrentPosition() → GPS coords               │
│   locationHelper.getNearestBarangay(lat, lng) → Match to location
│                                                                  │
│ Report Mode:                                                    │
│   User selects from dropdown (283 locations in locations.js)   │
│   Selected location already has lat/lng                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: DISASTER TYPE SELECTION                                 │
├─────────────────────────────────────────────────────────────────┤
│ User selects from: Flood, Fire, Earthquake, Landslide, Typhoon │
│ State: disasterType                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: ALERT SUBMISSION                                        │
├─────────────────────────────────────────────────────────────────┤
│ Frontend: HomeScreen.proceedWithAlert()                         │
│   Collect: type, latitude, longitude, locationName, userId     │
│   Call: alertService.sendAlert(data)                            │
│   POST /api/alerts with JSON body                               │
│   Show: Success overlay (3 seconds)                             │
│   Reset: Form for next report                                   │
│                                                                  │
│ Backend: alertRoutes.post("/")                                  │
│   Validate request body                                         │
│   Get sender name from userId if available                      │
│   Create Report document:                                       │
│     - lat, lng, severity, note                                  │
│     - status: 'new'                                             │
│     - disasterType, locationName, senderName                   │
│   Save to MongoDB                                               │
│   ✓ Async: Forward to AdminWebApp backend (non-blocking)      │
│   Return: Created report to frontend                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: ADMIN DASHBOARD ALERT MANAGEMENT                        │
├─────────────────────────────────────────────────────────────────┤
│ Admin accesses: AdminDashboard (role-based routing)             │
│                                                                  │
│ View Active Alerts:                                             │
│   GET /api/alerts → Filter status != 'Resolved'                 │
│   Display: Disaster type, location, sender, timestamp           │
│                                                                  │
│ Assign Rescue Team:                                             │
│   PUT /api/alerts/{alertId}                                     │
│   Body: { assignedTeam: teamId, status: 'assigned' }            │
│   Update: Alert.assignedTeam, Alert.status                      │
│                                                                  │
│ Mark as Resolved:                                               │
│   PUT /api/alerts/{alertId}                                     │
│   Body: { status: 'Resolved', resolvedBy, resolvedByName }      │
│   Update: Alert.status, Alert.resolvedAt, Alert.resolvedBy      │
│                                                                  │
│ Generate PDF Report:                                            │
│   expo-print generates HTML → PDF                               │
│   Includes: Case ID, location, disaster type, team, resolution  │
│   Shareable via expo-sharing                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: LAY USER REPORT HISTORY                                 │
├─────────────────────────────────────────────────────────────────┤
│ User accesses: AlertHistoryScreen from menu                     │
│   GET /api/alerts → Get all alerts                              │
│   Display: Cards with disaster type icon, location, timestamp   │
│   Pull-to-refresh: Reload from backend                          │
│   Clear history: Local UI only (not backed)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: PROFILE MANAGEMENT                                      │
├─────────────────────────────────────────────────────────────────┤
│ User accesses: ProfileScreen from menu                          │
│   GET /api/users/profile (auth required)                        │
│   Display: Name, email, birthday, location, auth provider       │
│                                                                  │
│ Update Profile:                                                 │
│   PUT /api/users/profile                                        │
│   Body: { name, birthday, location }                            │
│   Update: User document                                         │
│   Return: Updated user object                                   │
│                                                                  │
│ Change Password (local auth only):                              │
│   POST /api/users/change-password                               │
│   Body: { currentPassword, newPassword }                        │
│   Verify: Current password via bcrypt.compare()                │
│   Update: Hashed new password                                   │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | ❌ | Register new user |
| `/api/auth/login` | POST | ❌ | User login with email/password |
| `/api/auth/google` | POST | ❌ | Google OAuth authentication |
| `/api/users/profile` | GET | ✅ | Fetch user profile |
| `/api/users/profile` | PUT | ✅ | Update user profile |
| `/api/users/change-password` | POST | ✅ | Change password |
| `/api/alerts` | POST | ❌ | Create new alert/report |
| `/api/alerts` | GET | ❌ | Get all active alerts |
| `/api/alerts/history` | GET | ❌ | Get resolved alerts |
| `/api/alerts/:id` | PUT | ❌ | Update alert (assign team/resolve) |
| `/api/alerts/grouped` | GET | ❌ | Get alerts grouped by type |

### Frontend-Backend Communication

**Base URL:**
- Web: `http://localhost:5000`
- Mobile: `http://192.168.1.57:5000` (config/api.js)
- DisasterSOS Backend: `http://192.168.1.56:5000/api`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  (for protected endpoints)
```

**Response Format:**
```javascript
{
  // Success
  { token, user }  // After login/register
  { _id, name, email, ... }  // User/alert data
  
  // Error
  { message: "Error description" }
}
```

---

## 6. TECHNOLOGY STACK

### Frontend
- **Framework:** React Native (Expo)
- **Navigation:** @react-navigation (Stack, Bottom Tabs)
- **HTTP Client:** axios
- **Location:** expo-location
- **Authentication:** JWT + AsyncStorage
- **Maps:** react-native-maps
- **UI Components:** React Native Elements, Ionicons
- **PDF Generation:** expo-print
- **File Sharing:** expo-sharing
- **Geo Calculations:** geolib

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (mongoose)
- **Authentication:** JWT, bcryptjs, google-auth-library
- **API Features:** CORS, JSON parsing
- **Real-time (Optional):** Socket.io (installed but commented out)

### Development Tools
- **Expo CLI** for mobile development
- **Nodemon** for backend auto-reload
- **Babel** for JSX transformation

### Security
- Password hashing (bcryptjs)
- JWT token-based auth
- reCAPTCHA v3 bot protection
- OAuth2 Google integration
- CORS protection

---

## 7. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `App.js` | App entry point |
| `navigation/AppNavigator.jsx` | Main navigation structure |
| `screens/HomeScreen.jsx` | One-tap alert reporting interface |
| `screens/AdminDashboard.jsx` | Admin alert management |
| `services/alertService.js` | Alert API calls |
| `services/authService.js` | Auth API calls |
| `utils/locationHelper.js` | GPS → barangay conversion |
| `utils/locations.js` | 283 Malaybalay locations database |
| `backend/server.js` | Express server setup |
| `backend/routes/alertRoutes.js` | Alert endpoints |
| `backend/routes/userRoutes.js` | User/auth endpoints |
| `backend/models/Alert.js` | Report schema |
| `backend/models/User.js` | User schema |
| `backend/config/db.js` | MongoDB connection |

---

## 8. CONFIGURATION & ENVIRONMENT

### Frontend (.env)
```
API_URL=http://192.168.1.56:5000
```

### Backend (.env)
```
PORT=5002
ADMIN_BACKEND_URL=http://localhost:5000
MONGO_URI=mongodb://127.0.0.1:27017/capstoneDB
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
RECAPTCHA_SECRET_KEY=your_recaptcha_v3_secret_key_here
```

---

## 9. RUNNING THE APPLICATION

### Start Frontend
```bash
cd DisasterSOS
npm install
npm start          # Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
```

### Start Backend
```bash
cd DisasterSOS/backend
npm install
npm run dev        # With nodemon
npm start          # Direct run
```

Backend runs on **port 5002**

---

## Summary

**DisasterSOS** is a complete emergency alert system with:
- ✅ **One-tap emergency reporting** via mobile app
- ✅ **GPS location tracking** with automatic location identification
- ✅ **Dual reporting modes**: GPS-based and manual location selection
- ✅ **Admin dashboard** for alert management and team assignment
- ✅ **User role system**: citizen, rescuer, admin
- ✅ **Secure authentication**: JWT + reCAPTCHA + Google OAuth
- ✅ **Report generation**: PDF export for resolved cases
- ✅ **Integration**: Forwards alerts to AdminWebApp for ML analysis
- ✅ **Mobile-first design**: Optimized for Expo/React Native
- ✅ **Real-time capable**: Socket.io installed (optional)

The system enables rapid disaster reporting from civilians, centralized management by admins, and team coordination for rescue operations.
