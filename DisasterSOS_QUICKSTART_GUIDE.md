# DisasterSOS Quickstart Guide

**For:** Developers wanting to understand, run, or modify the DisasterSOS codebase  
**Time:** 5 minutes to understand, 15 minutes to run locally

---

## 📖 Quick Understanding (5 minutes)

### What is DisasterSOS?
Emergency alert system for Malaybalay City where:
- **Citizens** tap one button to report disasters (floods, fires, earthquakes, etc.)
- **GPS automatically detects** the nearest barangay/purok and location
- **Admins manage** alerts, assign rescue teams, and track resolutions
- **Systems integrate** with AdminWebApp for ML analysis of disasters

### Key Screenshots Experience
```
Home Screen: Large red "Tap to Alert" button
    ↓
Select Disaster Type: Flood, Fire, Earthquake, Landslide, Typhoon
    ↓
Choose Location: GPS automatic OR manual selection from dropdown
    ↓
Confirm: Warning about false reports
    ↓
Submit: Alert sent, success overlay shows for 3 seconds
    ↓
Done: Ready to send next report, or view history
```

### Tech Stack (Simple Version)
- **Frontend**: React Native (works on phone/tablet/web)
- **Backend**: Node.js server
- **Database**: MongoDB storing users, alerts, and teams
- **Cloud**: None required - runs locally

---

## ⚡ 60-Second Architecture

```
User's Phone
    ↓ (one-tap alert)
        ↓
    DisasterSOS Mobile App (React Native)
        ↓ (HTTP API call)
            ↓
        DisasterSOS Backend (Node.js/Express)
            ↓ (saves)
            ↓
        MongoDB Database
            ↓ (also forwards non-blocking)
            ↓
        AdminWebApp Backend (for ML analysis)
    
Admin's Browser
    ↓ (accesses)
        ↓
    AdminWebApp Dashboard
        ↓ (HTTP API calls)
            ↓
        DisasterSOS Backend
            ↓ (reads)
            ↓
        MongoDB
        
Result: Admin sees alert → Assigns team → Marks resolved
```

---

## 🚀 Installation & Running (15 minutes)

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally
- Git (optional)

### Step 1: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd c:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend

# Install dependencies
npm install

# Create/verify .env file has:
PORT=5002
MONGO_URI=mongodb://127.0.0.1:27017/capstoneDB
JWT_SECRET=test_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
RECAPTCHA_SECRET_KEY=your_recaptcha_secret

# Start backend server
npm run dev
# Terminal shows: "🚀 [DisasterSOS] Server running on port 5002"
```

### Step 2: Frontend Setup (5 minutes)

```bash
# In new terminal, navigate to frontend
cd c:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS

# Install dependencies
npm install

# Start Expo dev server
npm start
# Terminal shows: "Expo development server started..."
```

### Step 3: Run on Device/Emulator (5 minutes)

**Option A: Use Expo on Phone**
```bash
# Scan QR code from `npm start` output with:
# - iPhone: Built-in camera app
# - Android: Expo app
```

**Option B: Run on Android Emulator**
```bash
# From npm start menu, press 'a'
```

**Option C: Run on Web Browser**
```bash
# From npm start menu, press 'w'
# Opens http://localhost:19006
```

### Step 4: Test the App

1. **Register**: Create test account
   - Email: test@example.com
   - Password: test123
   - Name: Test User

2. **Send Alert**:
   - Open HomeScreen
   - Select "Flood" from dropdown
   - Tap red alert button
   - Confirm warning
   - See success message

3. **View History**:
   - From menu, tap "My Report History"
   - See your sent alerts

4. **Admin Dashboard** (if admin role):
   - Navigate to AdminDashboard
   - See active alerts
   - Assign rescue teams
   - Mark as resolved

---

## 🗂️ Project Structure (30 seconds)

```
DisasterSOS/
├── App.js                               ← Entry point
├── screens/                             ← 7 UI screens
│   ├── HomeScreen.jsx                   ← Main alert interface
│   ├── LoginScreen.jsx
│   ├── RegisterScreen.jsx
│   ├── AdminDashboard.jsx               ← Admin management
│   ├── AlertHistoryScreen.jsx           ← User's reports
│   ├── ProfileScreen.jsx
│   └── MapScreen.jsx
├── services/                            ← API calls
│   ├── alertService.js                  ← Send alerts
│   └── authService.js                   ← Login/register
├── utils/
│   ├── locations.js                     ← 283 locations database
│   └── locationHelper.js                ← GPS matching
├── hooks/
│   ├── useLocation.js                   ← GPS hook
│   └── useAuth.js                       ← Auth hook
├── backend/                             ← Node.js server
│   ├── server.js
│   ├── routes/
│   │   ├── alertRoutes.js               ← Alert APIs
│   │   └── userRoutes.js                ← Auth APIs
│   ├── models/
│   │   ├── Alert.js
│   │   ├── User.js
│   │   └── Team.js
│   └── config/db.js                     ← MongoDB connection
└── package.json
```

---

## 🔥 Core Code Snippets to Understand

### How Alerts are Sent (Frontend)

```javascript
// File: HomeScreen.jsx - proceedWithAlert()

const proceedWithAlert = async () => {
  // Get user from storage
  const userData = await AsyncStorage.getItem("userData");
  
  // Get location (either GPS or manual)
  let location;
  if (mode === "bypasser") {
    const loc = await Location.getCurrentPositionAsync({});
    location = {latitude: loc.coords.latitude, longitude: loc.coords.longitude};
  } else {
    const barangay = barangayOptions.find(b => b.value === selectedBarangay);
    location = {latitude: barangay.latitude, longitude: barangay.longitude};
  }
  
  // Send to backend
  await sendAlert({
    type: disasterType,                    // "Flood", "Fire", etc.
    latitude: location.latitude,
    longitude: location.longitude,
    locationName: locationName,            // "Brgy X Purok Y"
    userId: userData._id,
    userName: userData.name
  });
  
  // Show success overlay for 3 seconds
  setShowSuccess(true);
  setTimeout(() => setShowSuccess(false), 3000);
};
```

### How Alerts are Received (Backend)

```javascript
// File: backend/routes/alertRoutes.js - POST /api/alerts

router.post("/", async (req, res) => {
  try {
    // Save alert to MongoDB
    const reportData = {
      userId: req.body.userId,
      lat: req.body.latitude,
      lng: req.body.longitude,
      severity: 'moderate',
      note: `${req.body.type} - ${req.body.locationName}`,
      status: 'new',
      disasterType: req.body.type,
      locationName: req.body.locationName,
      senderName: req.body.userName || 'Anonymous'
    };
    
    const report = new Report(reportData);
    await report.save();
    
    // Async forward to AdminWebApp for ML analysis (non-blocking)
    setImmediate(async () => {
      await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(saveData)
      });
    });
    
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});
```

### How Location is Matched (Utility)

```javascript
// File: utils/locationHelper.js - getNearestBarangay()

export const getNearestBarangay = (latitude, longitude) => {
  let nearestLocation = null;
  let shortestDistance = Infinity;
  
  // Loop through all 283 locations
  malaybalayBarangays.forEach((location) => {
    // Calculate distance using geolib
    const distance = geolib.getDistance(
      {latitude, longitude},
      {latitude: location.latitude, longitude: location.longitude}
    );
    
    // Track nearest
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestLocation = location;
    }
  });
  
  return {
    label: nearestLocation.label,
    fullName: `${nearestLocation.label} (Bypasser)`,
    distance: shortestDistance,  // in meters
    ...nearestLocation
  };
};
```

---

## 🔐 User Authentication Flow

```javascript
// LoginScreen.jsx - handleLogin()

const handleLogin = async () => {
  // Call backend API
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  
  // Store token and user data
  await AsyncStorage.setItem("userToken", data.token);
  await AsyncStorage.setItem("userData", JSON.stringify(data.user));
  
  // Navigate to Home
  navigation.replace("Home");
};

// Backend: backend/routes/userRoutes.js - POST /auth/login

router.post("/login", async (req, res) => {
  const user = await User.findOne({email: req.body.email});
  const isMatch = await bcrypt.compare(req.body.password, user.password);
  
  if (isMatch) {
    const token = jwt.sign({id: user._id}, JWT_SECRET, {expiresIn: "7d"});
    res.json({
      token,
      user: {_id: user._id, name: user.name, email: user.email, role: user.role}
    });
  }
});
```

---

## 📊 Database Models (MongoDB)

### User Collection
```javascript
{
  _id: ObjectId,
  name: "John Doe",
  email: "john@example.com",
  password: "$2a$10$...", // hashed
  role: "citizen",        // citizen | admin | rescuer
  authProvider: "local",  // local | google
  createdAt: ISODate
}
```

### Report Collection (Alerts)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref to User
  lat: 8.1632,
  lng: 125.1278,
  severity: "moderate",       // low | moderate | critical
  status: "new",              // new | assigned | Resolved
  disasterType: "Flood",      // Flood|Fire|Earthquake|Landslide|Typhoon
  locationName: "Brgy 1 Purok 1",
  senderName: "John Doe",
  assignedTeam: ObjectId,     // ref to Team (optional)
  resolvedBy: ObjectId,       // ref to User (when resolved)
  resolvedByName: "Admin User",
  resolvedAt: ISODate,        // when marked resolved
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Team Collection
```javascript
{
  _id: ObjectId,
  name: "Fire Rescue Team",
  leader: ObjectId,           // ref to User
  members: [ObjectId, ...],   // refs to Users
  status: "available",        // available | busy | offline
  currentMission: ObjectId,   // ref to Report (current task)
  createdAt: ISODate
}
```

---

## 🔗 API Endpoints Cheat Sheet

```bash
# AUTHENTICATION
POST /api/auth/register
  Body: {name, email, password}

POST /api/auth/login
  Body: {email, password}
  Response: {token, user}

# ALERTS
POST /api/alerts
  Body: {type, latitude, longitude, locationName, userId, userName}
  Response: {_id, status: 'new', ...}

GET /api/alerts
  Response: [{...}, {...}]  // All non-resolved alerts

GET /api/alerts/history
  Response: [{...}, {...}]  // All resolved alerts

PUT /api/alerts/:id
  Body: {status, assignedTeam, resolvedBy}
  Response: {updated alert}

# USER
GET /api/users/profile
  Header: Authorization: Bearer <token>
  Response: {name, email, role, ...}

PUT /api/users/profile
  Header: Authorization: Bearer <token>
  Body: {name, birthday, location}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Basic Alert Submission
```
1. Register: test@test.com / password123
2. HomeScreen: Select "Fire" disaster type
3. Select location from dropdown (Manual mode)
4. Tap "Tap to Alert"
5. Confirm warning
6. ✅ See success message + alert saved
```

### Scenario 2: GPS Based Reporting
```
1. Login
2. HomeScreen: Switch to "Bypasser Mode"
3. Allow location permission
4. Select "Earthquake" disaster
5. Tap alert button (uses GPS location)
6. ✅ Alert saved with coordinates + nearest barangay
```

### Scenario 3: Admin Management
```
1. Login as admin user (role: 'admin')
2. Navigate to AdminDashboard
3. View active alerts (GET /api/alerts)
4. Assign team to alert
5. Mark as resolved
6. ✅ Alert moves to history tab
```

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Backend won't start** | MongoDB not running | Run `mongod` in separate terminal |
| **API calls fail** | Wrong API_URL | Check config/api.js - update to match your IP |
| **Location permission denied** | Permission not granted | Tap "Allow" when prompted by app |
| **Google OAuth fails** | No CLIENT_ID set | Add GOOGLE_CLIENT_ID to backend .env |
| **Admin dashboard empty** | Not admin user | Change role to 'admin' in MongoDB |
| **Port 5002 already in use** | Another app using port | Kill process with `netstat -ano` or change PORT in .env |

---

## 📱 File Size Overview

| Component | Files | Size |
|-----------|-------|------|
| Screens | 7 | ~1500 lines |
| Components | 3 | ~200 lines |
| Services | 2 | ~80 lines |
| Utilities | 4 | ~400 lines |
| Backend Routes | 2 | ~400 lines |
| Backend Models | 3 | ~150 lines |
| **TOTAL CODE** | **21** | **~3200 lines** |

---

## 🎯 Next Steps

### To Understand the Code
1. Read: **DisasterSOS_EXECUTIVE_SUMMARY.md**
2. Study: HomeScreen.jsx + alertService.js
3. Reference: DisasterSOS_FILE_REFERENCE.md
4. Explore: backend/routes/alertRoutes.js

### To Modify the App
1. Add new disaster type: Edit `disasterOptions` in HomeScreen.jsx
2. Change colors: Edit `utils/constants.js`
3. Add locations: Add to `utils/locations.js`
4. Add API endpoint: Create in `backend/routes/*.js`
5. Change alert fields: Update `Alert.js` model + frontend submission

### To Deploy
1. Frontend: `npm run build` then deploy to Expo/Play Store/App Store
2. Backend: Deploy Node.js server to AWS/Heroku/DigitalOcean
3. Database: Use MongoDB Atlas or self-hosted instance
4. Environment: Update .env with production URLs

---

## 📞 Support Resources

| Resource | Location |
|----------|----------|
| Full Analysis | DisasterSOS_CODEBASE_ANALYSIS.md |
| Diagrams | DisasterSOS_ARCHITECTURE_DIAGRAMS.md |
| File Reference | DisasterSOS_FILE_REFERENCE.md |
| Executive Summary | DisasterSOS_EXECUTIVE_SUMMARY.md |
| This Guide | DisasterSOS_QUICKSTART_GUIDE.md |

---

## ✅ Checklist Before Starting Code

- [ ] Node.js installed and updated
- [ ] MongoDB running locally
- [ ] Backend .env configured
- [ ] Frontend can reach backend API
- [ ] Read HomeScreen.jsx code
- [ ] Understand alert submission flow
- [ ] Test basic alert submission
- [ ] Review MongoDB collections

---

## 🎉 You're Ready!

You now have everything needed to:
- ✅ Understand the DisasterSOS system
- ✅ Run it locally
- ✅ Test the features
- ✅ Modify the code
- ✅ Deploy to production

Happy coding! 🚀
