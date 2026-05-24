# DisasterSOS Architecture Diagrams

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DisasterSOS System Overview                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐         ┌──────────────────────────┐
│    MOBILE APP                │         │    ADMIN DASHBOARD       │
│  (React Native + Expo)       │         │  (AdminWebApp)           │
│                              │         │                          │
│  Features:                   │         │  Features:               │
│  - One-tap alert reporting   │         │  - View active alerts    │
│  - GPS location tracking     │         │  - Assign rescue teams   │
│  - Manual location selection │         │  - Mark cases resolved   │
│  - User auth (JWT + Google)  │         │  - Generate PDF reports  │
│  - Profile management        │         │  - View history          │
│  - Report history viewing    │         │  - ML analysis (async)   │
└──────────────────────────────┘         └──────────────────────────┘
           ▲                                      ▲
           │                                      │
           │ HTTP API                            │ HTTP API
           │ (port 5002)                         │ (port 5000)
           │                                      │
           └──────────────────┬──────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │  DisasterSOS        │
                   │  Backend            │
                   │  (Node.js/Express)  │
                   │                     │
                   │  Routes:            │
                   │  - /api/alerts      │
                   │  - /api/auth/*      │
                   │  - /api/users/*     │
                   └──────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │   MongoDB           │
                   │  (capstoneDB)       │
                   │                     │
                   │  Collections:       │
                   │  - users            │
                   │  - reports (alerts) │
                   │  - teams            │
                   └─────────────────────┘
```

## 2. Frontend Screen Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│              Frontend Navigation Structure                      │
└─────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────┐
                        │     App (entry)     │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     AppNavigator            │
                    │   (Stack Navigator)         │
                    └──────────────┬──────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
        ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
        │  LoginScreen │   │RegisterScreen│  │  HomeScreen  │
        │              │   │              │  │ (+ MainTabs) │
        │ • Email/Pass │   │ • Name/Email │  │              │
        │ • Google OAuth   │ • Password   │  │ [Home Tab]   │
        │ • reCAPTCHA  │   │ • Validation │  │ • One-tap     │
        └──────────────┘   └──────────────┘  │   alert       │
                                              │ • Mode select │
                                              │               │
                                              │ [Map Tab]     │
                                              │ • View map    │
                                              │               │
                                              │ [History Tab] │
                                              │ • User's      │
                                              │   reports     │
                                              └───┬───────────┘
                                                  │
                        ┌─────────────────────────┼─────────────────────────┐
                        │                         │                         │
                        ▼                         ▼                         ▼
               ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
               │  MapScreen      │      │ AlertHistory    │      │ AdminDashboard  │
               │                 │      │ Screen          │      │                 │
               │ • Full map      │      │                 │      │ • Active alerts │
               │ • User location │      │ • View reports  │      │ • Assign teams  │
               │ • Marker        │      │ • Disaster type │      │ • Resolve cases │
               │ • Zoom controls │      │ • Timestamp     │      │ • Generate PDF  │
               └─────────────────┘      │ • Clear history │      │ • View resolved │
                        │               └─────────────────┘      └─────────────────┘
                        │                         │                         │
                        └─────────────────────────┼─────────────────────────┘
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │ ProfileScreen   │
                                        │                 │
                                        │ • View profile  │
                                        │ • Update info   │
                                        │ • Change pass   │
                                        └─────────────────┘
```

## 3. One-Tap Alert Reporting Workflow

```
┌──────────────────────────────────────────────────────────────────────┐
│            One-Tap Emergency Alert Submission Flow                   │
└──────────────────────────────────────────────────────────────────────┘

   ┌──────────────────┐
   │  HomeScreen      │
   │   (User sees)    │
   │                  │
   │ [Red SOS Button] │
   │ [Disaster Type   │
   │  Dropdown]       │
   │ [Mode Indicator] │
   │ [Burger Menu]    │
   └────────┬─────────┘
            │
            ├─────────────────────────┬────────────────────────┐
            │ Menu Option             │ Another Option         │
            │                         │                        │
            ▼                         ▼                        ▼
    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
    │ Switch Mode  │         │ View History │         │   Profile    │
    │              │         │              │         │              │
    │ Bypasser Mode│         │ History      │         │ ProfileScreen│
    │   (GPS)      │         │ Screen↘      │         │  Screen↘     │
    │      ↓       │         └──────────────┘         └──────────────┘
    │ Report Mode  │
    │  (Manual)    │
    └────┬─────────┘
         │
         ▼
    ┌──────────────────────────────────────────┐
    │ SELECT DISASTER TYPE                     │
    │                                          │
    │ Dropdown Options:                        │
    │ • Flood                                  │
    │ • Fire                                   │
    │ • Earthquake                             │
    │ • Landslide                              │
    │ • Typhoon                                │
    └──────────┬───────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────────────────┐
    │ SELECT LOCATION                                      │
    └──────────────────────────────────────────────────────┘
         │
         ├─ Bypasser Mode                 ─┬─ Report Mode
         │                                  │
         ▼                                  ▼
    ┌─────────────────┐           ┌──────────────────────┐
    │ GPS BASED       │           │ MANUAL SELECTION     │
    │                 │           │                      │
    │ 1. Request      │           │ 1. Show dropdown     │
    │    location     │           │    list of 283       │
    │    permission   │           │    locations         │
    │ 2. Get current  │           │                      │
    │    GPS coords   │           │ 2. User selects      │
    │ 3. Use geolib   │           │    barangay/purok    │
    │    to find      │           │                      │
    │    nearest      │           │ 3. Get pre-stored    │
    │    barangay     │           │    coordinates       │
    │    (283 list)   │           │                      │
    │ 4. Distance     │           └────────┬─────────────┘
    │    calculated   │                    │
    │    in meters    │                    │
    └────────┬────────┘                    │
             │                             │
             └────────────┬────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │ VALIDATION                         │
         │                                    │
         │ Check:                             │
         │ ✓ Disaster type selected          │
         │ ✓ Location selected/detected      │
         │                                    │
         │ If missing:                        │
         │ Alert user to select items         │
         └────────────┬─────────────────────┘
                      │
                      ▼
         ┌────────────────────────────────────┐
         │ WARNING CONFIRMATION               │
         │                                    │
         │ "⚠️ WARNING                         │
         │  Sending false/fake report can     │
         │  mislead responders and waste      │
         │  resources. Submit genuine      │
         │  disaster reports only."           │
         │                                    │
         │ [OK]  [Cancel]                     │
         └────────────┬─────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────────┐
         │ PREPARE DATA                             │
         │                                          │
         │ Collect:                                 │
         │ • type: disaster type                    │
         │ • latitude: GPS or selected              │
         │ • longitude: GPS or selected             │
         │ • locationName: barangay/purok name      │
         │ • userId: from AsyncStorage (if logged)  │
         │ • userName: user.name or "Anonymous"     │
         └────────────┬─────────────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────────┐
         │ SUBMIT ALERT (POST /api/alerts)          │
         │                                          │
         │ FRONTEND:                                │
         │ • alertService.sendAlert(data)           │
         │ • Show loading spinner                   │
         │                                          │
         │ BACKEND:                                 │
         │ • Validate request                       │
         │ • Save Report to MongoDB                 │
         │ • status: 'new'                          │
         │ • Populate userId reference              │
         │ • Forward to AdminWebApp backend (async) │
         │   for ML analysis (non-blocking)         │
         │ • Return created report                  │
         └────────────┬─────────────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────────┐
         │ SUCCESS OVERLAY                          │
         │                                          │
         │ Display animated success message         │
         │ Duration: 3 seconds                      │
         │                                          │
         │ Then auto-reset:                         │
         │ • Form cleared                           │
         │ • Disaster type reset                    │
         │ • Location reset                         │
         │ • Ready for next report                  │
         └──────────────────────────────────────────┘
```

## 4. Data Model Relationships

```
┌─────────────────────────────────────────────────────────┐
│          MongoDB Collections & Relationships            │
└─────────────────────────────────────────────────────────┘

   ┌─────────────────┐
   │     Users       │
   │                 │
   │ _id ←─┐         │
   │ name  │         │
   │ email │         │
   │ pass  │         │
   │ role  │         │
   │ ...   │         │
   └───────┼─────────┘
           │
           │ (references to Reports as creator)
           │
    ┌──────▼──────────────────┐
    │     Reports (Alerts)    │
    │                         │
    │ _id                     │
    │ lat / lng               │
    │ severity                │
    │ status ('new', 'assigned', 'Resolved')
    │ disasterType            │
    │ locationName            │
    │ senderName              │
    │ userId ─────────────────┼──→ User who reported
    │ assignedTeam ──────┐    │
    │ resolvedBy ────────┤───→ User who resolved
    │ resolvedAt         │    │
    │ timestamps         │    │
    └────────┬───────────┘    │
             │                │
             │ references to Teams
             │
      ┌──────▼──────────────┐
      │      Teams          │
      │                     │
      │ _id                 │
      │ name                │
      │ leader ────────────→ User
      │ members ──────────→ [Users]
      │ status              │
      │ currentMission ─────→ Report
      │ color               │
      │ timestamps          │
      └─────────────────────┘
```

## 5. Backend Routes & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│        Backend Routes & Request/Response Flow               │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  AUTHENTICATION ROUTES (/api/auth)                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  POST /auth/register                                       │
│  ├─ In:  { name, email, password, recaptchaToken }        │
│  └─ Out: { token, user { _id, name, email, role } }       │
│                                                            │
│  POST /auth/login                                          │
│  ├─ In:  { email, password, recaptchaToken }              │
│  └─ Out: { token, user { _id, name, email, role } }       │
│                                                            │
│  POST /auth/google                                         │
│  ├─ In:  { idToken, recaptchaToken }                      │
│  └─ Out: { token, user { _id, name, email, role } }       │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  USER ROUTES (/api/users)                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  GET /users/profile  [Auth Required]                       │
│  └─ Out: { _id, name, email, avatar, birthday, ... }      │
│                                                            │
│  PUT /users/profile  [Auth Required]                       │
│  ├─ In:  { name, birthday, location }                     │
│  └─ Out: { user { ... } }                                 │
│                                                            │
│  POST /users/change-password  [Auth Required]              │
│  ├─ In:  { currentPassword, newPassword }                 │
│  └─ Out: { message: "Password changed" }                  │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ALERT ROUTES (/api/alerts)                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  POST /alerts                                              │
│  ├─ In:  {                                                 │
│  │        type, latitude, longitude, locationName,        │
│  │        userId, userName, severity, note                │
│  │       }                                                 │
│  │                                                         │
│  ├─ Server Action:                                        │
│  │  • Save to MongoDB with status='new'                   │
│  │  • ✓ Async forward to AdminBackend                    │
│  │                                                        │
│  └─ Out: { _id, lat, lng, status, ... }                  │
│                                                            │
│  GET /alerts                                               │
│  └─ Out: [ { all non-resolved reports } ]                │
│      Query: status != 'Resolved'                           │
│                                                            │
│  GET /alerts/history                                       │
│  └─ Out: [ { all resolved reports } ]                    │
│      Query: status = 'Resolved'                            │
│                                                            │
│  PUT /alerts/:id                                           │
│  ├─ In:  { assignedTeam, status, resolvedBy }            │
│  │        (if status='Resolved': also track resolvedAt)   │
│  └─ Out: { updated report }                               │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Backend to Backend Integration                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  When alert created on DisasterSOS backend:               │
│  (Non-blocking async forward)                             │
│                                                            │
│  POST ${ADMIN_BACKEND_URL}/api/reports                    │
│  └─ Forward alert data to AdminWebApp backend             │
│     Purpose: ML analysis of disaster events               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 6. Location System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│          Location Detection & Matching System                │
└──────────────────────────────────────────────────────────────┘

LOCATION DATABASE:
┌────────────────────────────────────────────────────────────┐
│ locations.js - Contains 283 Locations                      │
│                                                            │
│ Format:                                                    │
│ {                                                          │
│   label: "Barangay 1 - Purok 1",                          │
│   value: "Barangay1-Purok1",                              │
│   latitude: 8.1632,                                        │
│   longitude: 125.1278                                      │
│ }                                                          │
│                                                            │
│ Coverage: All 46 barangays in Malaybalay City             │
│ with multiple puroks each                                  │
└────────────────────────────────────────────────────────────┘

BYPASSER MODE (GPS-BASED):
┌────────────────────────────────────────────────────────────┐
│                                                            │
│ 1. expo-location.getCurrentPosition()                      │
│    └─ Get real-time GPS coordinates                       │
│       Requires: Location permission granted               │
│                                                            │
│ 2. Call: getNearestBarangay(lat, lng)                     │
│    └─ Algorithm:                                          │
│       • Loop through all 283 locations                    │
│       • Calculate distance using geolib haversine formula │
│       • Track shortest distance                           │
│       • Return nearest location object                    │
│                                                            │
│ 3. Format location: "Brgy X Purok Y (Bypasser)"            │
│    └─ Used in report note                                │
│                                                            │
│ 4. Distance shown in console (meters)                     │
│                                                            │
│ Output: {                                                  │
│   label: "Barangay 1 - Purok 1",                          │
│   fullName: "Brgy 1 Purok 1 (Bypasser)",                  │
│   latitude: 8.1632,                                       │
│   longitude: 125.1278,                                    │
│   distance: 256                    [meters]               │
│ }                                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘

REPORT MODE (MANUAL SELECTION):
┌────────────────────────────────────────────────────────────┐
│                                                            │
│ 1. Display Dropdown with 283 locations                     │
│    └─ React Native Element Dropdown component              │
│                                                            │
│ 2. User selects one location                               │
│    └─ Barangay/Purok name selected                        │
│                                                            │
│ 3. Use pre-stored coordinates                             │
│    └─ No GPS calls needed                                 │
│       In HomeScreen:                                      │
│         barangayOptions.find(b => b.value === selected)   │
│                                                            │
│ 4. Format location: "Barangay X - Purok Y, Malaybalay"   │
│                                                            │
│ Output:                                                    │
│ {                                                          │
│   field: selectedBarangay (e.g., "Barangay1-Purok1")     │
│   with coordinates from locations.js                      │
│ }                                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘

GEOLOCATION LIBRARY:
┌────────────────────────────────────────────────────────────┐
│ npm package: geolib                                        │
│                                                            │
│ Used for:                                                  │
│ • Distance calculations between coordinates                │
│ • Haversine formula implementation                         │
│ • Finding nearest point in array                           │
│                                                            │
│ Function: geolib.getDistance()                             │
│ Input:  { latitude, longitude }, { latitude, longitude }  │
│ Output: Distance in meters                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

This complete visual representation shows how all components interact in the DisasterSOS system.
