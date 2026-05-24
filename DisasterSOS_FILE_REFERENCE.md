# DisasterSOS - Complete File Reference & Purpose

## QUICK NAVIGATION

| Category | File | Purpose | Key Functions/Exports |
|----------|------|---------|----------------------|
| **ENTRY POINT** |
| | `App.js` | App root component | Returns AppNavigator |
| | `index.js` | App initialization | Expo bootstrap |
| **NAVIGATION** |
| | `navigation/AppNavigator.jsx` | Main stack navigator | Routes: Login, Register, Home, Map, Dashboard, History, Profile |
| | `navigation/MainTabs.jsx` | Bottom tab navigator | Routes: Home, Map, History with icons |
| **SCREENS** |
| | `screens/HomeScreen.jsx` | Main emergency alert interface | `handleAlert()`, `proceedWithAlert()`, mode switching (bypasser/report) |
| | `screens/LoginScreen.jsx` | User login screen | `handleLogin()`, Google OAuth, reCAPTCHA |
| | `screens/RegisterScreen.jsx` | User registration | `handleRegister()`, form validation |
| | `screens/MapScreen.jsx` | Location map display | Uses `useLocation()` hook, MapView |
| | `screens/AdminDashboard.jsx` | Admin alert management | `fetchAlerts()`, `assignRescueTeam()`, `resolveAlert()`, `generatePDF()` |
| | `screens/AlertHistoryScreen.jsx` | User report history | `fetchAlerts()`, disaster type icons, `clearHistory()` |
| | `screens/ProfileScreen.jsx` | User profile management | `fetchProfile()`, `handleSaveProfile()`, `handleChangePassword()` |
| **COMPONENTS** |
| | `components/AlertCard.jsx` | Alert display card | Displays: title, lat/lng, date |
| | `components/Header.jsx` | Reusable header | Props: title; Shows SALBA logo |
| | `components/MapViewComponent.jsx` | Reusable map | Props: latitude, longitude; Displays: map with marker |
| **SERVICES (API)** |
| | `services/authService.js` | Authentication API calls | `registerUser()`, `loginUser()` |
| | `services/alertService.js` | Alert API calls | `sendAlert()` |
| **CUSTOM HOOKS** |
| | `hooks/useAuth.js` | Auth state hook | `useAuth()` - State: user; Methods: login, register |
| | `hooks/useLocation.js` | Location hook | `useLocation()` - Returns GPS coordinates with permission handling |
| **UTILITIES** |
| | `utils/constants.js` | App constants | `COLORS` object with color definitions |
| | `utils/locations.js` | Location database | `malaybalayBarangays` array with 283 barangays/puroks |
| | `utils/locationHelper.js` | Location matching | `getNearestBarangay(lat, lng)`, `formatLocationName()` |
| | `utils/helpers.js` | General utilities | (Additional helper functions) |
| **CONFIG** |
| | `config/api.js` | API configuration | `BASE_URL` (platform-dependent: localhost or 192.168.1.57) |
| **ASSETS** |
| | `assets/salbalogo.png` | SALBA logo | Used in headers/login |
| | `assets/icon.png` | App icon | Expo icon |
| | `assets/splash-icon.png` | Splash screen | Expo splash |
| | `assets/favicon.png` | Browser favicon | Web version |
| **CONFIG FILES** |
| | `package.json` | Dependencies | React Native, Navigation, Expo libs, axios, async-storage, maps |
| | `.env` | Frontend environment | `API_URL=http://192.168.1.56:5000` |
| | `babel.config.js` | Babel configuration | Expo preset |
| | `app.json` | Expo configuration | App name, version, icon, splash |
| | `postcss.config.js` | PostCSS config | Tailwind integration |
| | `tailwind.config.js` | Tailwind config | Styling setup |

---

## BACKEND FILE REFERENCE

| File | Location | Purpose | Key Exports |
|------|----------|---------|------------|
| **SERVER** |
| `server.js` | `backend/` | Express server setup | App initialization, route mounting, CORS, JSON middleware |
| **ROUTES** |
| `alertRoutes.js` | `backend/routes/` | Alert CRUD endpoints | POST, GET, GET/history, PUT (assign team, resolve) |
| `userRoutes.js` | `backend/routes/` | Auth & profile endpoints | POST/register, POST/login, POST/google, GET/profile, PUT/profile, POST/change-password |
| **MODELS** |
| `Alert.js` | `backend/models/` | Alert/Report schema | Schema: userId, lat, lng, severity, status, disasterType, senderName, resolvedBy |
| `User.js` | `backend/models/` | User schema | Schema: name, email, password, googleId, role, authProvider |
| `Team.js` | `backend/models/` | Team schema | Schema: name, leader, members, status, currentMission |
| **CONFIG** |
| `db.js` | `backend/config/` | MongoDB connection | `connectDB()` - Connects to MONGO_URI |
| **CONFIG FILES** |
| `package.json` | `backend/` | Dependencies | express, mongoose, bcryptjs, jsonwebtoken, cors |
| `.env` | `backend/` | Backend environment | PORT, MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID, RECAPTCHA_SECRET_KEY, ADMIN_BACKEND_URL |

---

## COMPONENT HIERARCHY & DATA FLOW

### Frontend Component Tree

```
App
└── AppNavigator (Stack)
    ├── LoginScreen
    │   ├── Uses: authService.loginUser()
    │   ├── Stores: userToken, userData (AsyncStorage)
    │   └── Nav: → RegisterScreen or Home
    │
    ├── RegisterScreen
    │   ├── Uses: authService.registerUser()
    │   └── Nav: → LoginScreen
    │
    ├── HomeScreen
    │   ├── Uses Hooks: useLocation (for GPS in bypasser mode)
    │   ├── Uses: locationHelper.getNearestBarangay()
    │   ├── Uses: alertService.sendAlert()
    │   ├── Components: MapView, Dropdown, Modal (menu)
    │   ├── Subcomponents:
    │   │   ├── Header (with logo)
    │   │   └── Burger Menu (mode select, history, profile)
    │   └── Bottom Tabs (MainTabs):
    │       ├── Home (self)
    │       ├── Map → MapScreen
    │       └── History → AlertHistoryScreen
    │
    ├── MapScreen
    │   ├── Uses Hook: useLocation()
    │   └── Components: MapView, Marker
    │
    ├── AdminDashboard
    │   ├── Uses: API calls (GET /alerts, GET /alerts/history, PUT /alerts/:id)
    │   ├── Features: TabView (active/history)
    │   ├── Components: MapView for each alert, Alert cards
    │   └── Actions: assignRescueTeam(), resolveAlert(), generatePDF()
    │
    ├── AlertHistoryScreen
    │   ├── Uses: API call (GET /alerts)
    │   ├── Components: ScrollView, AlertCard components
    │   └── Features: Pull-to-refresh, icon mapping
    │
    └── ProfileScreen
        ├── Uses: API calls (GET/PUT /api/users/profile, POST /change-password)
        └── Features: Form inputs for profile + password change
```

### Data Flow

**User Authentication:**
1. LoginScreen → POST /api/auth/login → Backend validates
2. Returns JWT token + user object
3. Frontend stores in AsyncStorage (userToken, userData)
4. User logged in, navigated to Home

**Alert Submission:**
1. HomeScreen: User selects disaster type + location
2. In bypasser mode: GPS location auto-detected
3. In report mode: User selects from dropdown (283 locations)
4. Alert validation (type + location required)
5. User confirmation (warning about false reports)
6. Call alertService.sendAlert(data)
7. Backend: POST /api/alerts
8. Backend saves to MongoDB
9. Backend async forwards to AdminWebApp for ML
10. Frontend shows success overlay (3 sec)
11. Form resets

**Admin Management:**
1. Admin accesses AdminDashboard
2. Fetches active alerts: GET /api/alerts
3. Can assign team: PUT /api/alerts/:id with { assignedTeam, status: 'assigned' }
4. Can resolve: PUT /api/alerts/:id with { status: 'Resolved', resolvedBy }
5. Can view history: GET /api/alerts/history
6. Can generate PDF report from resolved case

---

## CRITICAL FILES TO UNDERSTAND

| Learning Path | Files | Read In Order |
|---------------|-------|--------------|
| **Frontend Architecture** | 1. App.js 2. AppNavigator.jsx 3. MainTabs.jsx | Understand UI structure |
| **One-Tap Reporting** | 1. HomeScreen.jsx 2. alertService.js 3. locationHelper.js 4. locations.js | Complete alert flow |
| **Authentication** | 1. LoginScreen.jsx 2. RegisterScreen.jsx 3. userRoutes.js (backend) | User auth flow |
| **Location System** | 1. utils/locations.js 2. utils/locationHelper.js 3. HomeScreen.jsx (bypasser mode) | Location matching |
| **Backend Routes** | 1. server.js 2. routes/alertRoutes.js 3. routes/userRoutes.js 4. models/* | API endpoints |
| **Admin Features** | 1. AdminDashboard.jsx 2. alertRoutes.js (PUT endpoint) 3. models/Alert.js 4. models/Team.js | Team assignment & resolution |

---

## STATE MANAGEMENT LOCATIONS

### AsyncStorage (Frontend - React Native)

- **userToken**: JWT authentication token
- **userData**: User object `{ _id, name, email, avatar, birthday, location, role }`

### Component State (Local)

**HomeScreen:**
- `loading`: API request state
- `location`: GPS coordinates (bypasser mode)
- `disasterType`: Selected disaster type
- `sentent`: Alert submission state
- `mode`: 'bypasser' or 'report'
- `selectedBarangay`: Manual location selection
- `showSuccess`: Success overlay visibility
- `barangayOptions`: Locations list (from DB or default)
- `menuVisible`: Burger menu visibility

**AdminDashboard:**
- `alerts`: Active alerts
- `historyAlerts`: Resolved alerts
- `loading`: Data fetch state
- `editingId`: Currently editing alert ID
- `rescueTeamInput`: Team input field
- `activeTab`: 'active' or 'history'
- `resolveModalVisible`: Resolve dialog visibility

**LoginScreen:**
- `email`: Input field
- `password`: Input field
- `loading`: Button loading state
- `googleLoading`: Google auth loading state
- `showPassword`: Password visibility toggle

**ProfileScreen:**
- `loading`: Initial fetch state
- `saving`: Save operation state
- `name`: User name field
- `email`: Read-only field
- `birthday`: Birthday field
- `location`: Location field
- `authProvider`: Auth method (read-only)
- `showPasswordSection`: Password section visibility
- `currentPassword`, `newPassword`, `confirmPassword`: Password fields
- `changingPassword`: Password change loading state

---

## API ENDPOINTS SUMMARY

### Authentication (No Auth Required)

```
POST   /api/auth/register         → Register new user
POST   /api/auth/login            → Login with credentials
POST   /api/auth/google           → Google OAuth login
```

### User Management (Auth Required)

```
GET    /api/users/profile         → Fetch current user profile
PUT    /api/users/profile         → Update user profile
POST   /api/users/change-password → Change password
```

### Alerts/Reports (No Auth)

```
POST   /api/alerts                → Create new alert
GET    /api/alerts                → Get all non-resolved alerts
GET    /api/alerts/history        → Get all resolved alerts
PUT    /api/alerts/:id            → Update alert (assign team/resolve)
GET    /api/alerts/grouped        → Get alerts grouped by type
```

---

## ENVIRONMENT VARIABLES

### Frontend (.env in root)

```
API_URL=http://192.168.1.56:5000
```

### Backend (.env in backend/)

```
PORT=5002
ADMIN_BACKEND_URL=http://localhost:5000   # For forwarding alerts
MONGO_URI=mongodb://127.0.0.1:27017/capstoneDB
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
RECAPTCHA_SECRET_KEY=your_recaptcha_v3_secret_key_here
```

---

## KEY DEPENDENCIES

### Frontend (React Native + Expo)

- **@react-navigation/***: Navigation (stack, tabs, drawer)
- **react-native-maps**: Map display and markers
- **expo-location**: GPS location access
- **expo-auth-session**: Google OAuth
- **axios**: HTTP client
- **@react-native-async-storage/async-storage**: Local storage
- **react-native-element-dropdown**: Dropdown component
- **geolib**: Geolocation calculations
- **expo-print**: PDF generation
- **expo-sharing**: File sharing
- **expo-crypto**: Cryptography utilities
- **@expo/vector-icons**: Icon library

### Backend (Node.js)

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT generation/verification
- **google-auth-library**: Google OAuth verification
- **cors**: CORS middleware
- **axios**: HTTP client (for forwarding alerts)
- **dotenv**: Environment variables

---

## FILE SIZE & Organization

**Frontend Code:** ~15 screens + components + utils
**Backend Code:** ~3 routes files + 3 models + config
**Database:** MongoDB with 3 collections (users, reports, teams)
**Total Locations:** 283 Malaybalay City barangays/puroks

**Deployment:**
- Frontend: Can deploy to Expo, Android, iOS, or Web
- Backend: Runs on Node.js (port 5002)
- Database: Local MongoDB instance

---

This reference guide provides complete information about every file in the DisasterSOS codebase and how they interact.
