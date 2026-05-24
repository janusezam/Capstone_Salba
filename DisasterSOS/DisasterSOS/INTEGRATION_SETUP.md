# Multi-App Architecture & Port Configuration

## Current Issue: Port Conflict

**DisasterSOS Backend**: Runs on port 5000 (`/api/users`, `/api/alerts`)
**AdminWebApp Backend**: Runs on port 5000 (`/api/reports`, `/api/ml`, `/api/auth`)

Both trying to use the **same port**! This needs to be resolved for full integration.

---

## Solution: Port Allocation

### Recommended Configuration

```
MongoDB:           27017  (Database - shared)
ML Service:        5001   (Flask - ML models)
AdminWebApp API:   5000   (Express - admin features)
DisasterSOS API:   5002   (Express - user features)
RescuerApp API:    5003   (Express - rescuer features)
```

### Why This Works
- **MongoDB (27017)**: Shared database for all apps
- **ML Service (5001)**: Shared ML models used by all backends
- **DisasterSOS (5002)**: Citizens report disasters here
- **AdminWebApp (5000)**: Admin reviews & dispatches (main coordinator)
- **RescuerApp (5003)**: Optional rescuer backend if needed

---

## Data Flow with Updated Ports

```
┌─────────────────────────────────────────────────┐
│  DISASTERSOS (Mobile App - Citizen)             │
│  - Reports disaster to port 5002                │
│  - Gets confirmation from 5002                  │
└──────────────────┬──────────────────────────────┘
                   │ Report created
                   ↓
┌─────────────────────────────────────────────────┐
│  DISASTERSOS Backend (:5002)                    │
│  - Receives report: description + location      │
│  - Calls AdminWebApp backend (:5000)            │
│    Via: http://localhost:5000/api/reports      │
└──────────────────┬──────────────────────────────┘
                   │ Forward to admin backend
                   ↓
┌─────────────────────────────────────────────────┐
│  ADMINWEBAPP Backend (:5000)                    │
│  - POST /api/reports creates report             │
│  - Calls ML Service (:5001)                     │
│    Via: http://localhost:5001/classify          │
│         http://localhost:5001/predict-severity  │
│         http://localhost:5001/detect-false-alarm│
└──────────────────┬──────────────────────────────┘
                   │ ML predictions
                   ↓
┌─────────────────────────────────────────────────┐
│  ML SERVICE (:5001)                             │
│ - Random Forest (disaster type)                 │
│ - XGBoost (severity)                            │
│ - Logistic Regression (false alarm)             │
└──────────────────┬──────────────────────────────┘
                   │ Predictions returned
                   ↓
┌─────────────────────────────────────────────────┐
│  ADMINWEBAPP Frontend (React)                   │
│  - Displays AI predictions                      │
│  - Admin clicks "Dispatch"                      │
│  - Sends dispatch to :5000/api/rescue           │
└──────────────────┬──────────────────────────────┘
                   │ Dispatch published
                   ↓
┌─────────────────────────────────────────────────┐
│  RESCUERAPP (Mobile App - Rescuer)              │
│  - Receives notification via websocket          │
│  - Shows report location + AI verified type     │
│  - Navigates using Google Maps integration      │
└─────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update DisasterSOS Backend Port
**File**: `C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend\.env`

Add or modify:
```
PORT=5002
ADMIN_BACKEND_URL=http://localhost:5000
```

**File**: `C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend\server.js`

Change:
```javascript
const PORT = process.env.PORT || 5000;
```
To:
```javascript
const PORT = process.env.PORT || 5002;
```

---

### Step 2: Update DisasterSOS Frontend Config
**File**: `C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\config\api.js`

Change from:
```javascript
export const BASE_URL = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.43.211:5000';
```

To:
```javascript
export const BASE_URL = Platform.OS === 'web' ? 'http://localhost:5002' : 'http://192.168.43.211:5002';
```

---

### Step 3: Create Report Forwarding in DisasterSOS Backend
**File**: `C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend\routes\alertRoutes.js`

When user creates alert/report in DisasterSOS, forward to AdminWebApp:

```javascript
// After creating alert, forward to AdminWebApp for ML processing
const adminBackendUrl = process.env.ADMIN_BACKEND_URL || 'http://localhost:5000';
await fetch(`${adminBackendUrl}/api/reports`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lat: alert.latitude,
    lng: alert.longitude,
    severity: alert.severity,
    note: alert.description,
    userId: alert.userId
  })
});
```

---

### Step 4: Update Config Files

**AdminWebApp Backend** (`.env` already configured):
```
PORT=5000
ML_SERVICE_URL=http://localhost:5001
MONGO_URI=mongodb://127.0.0.1:27017/salba_db
```

**ML Service** (Already running on 5001)

**DisasterSOS Backend** (NEW):
```
PORT=5002
ADMIN_BACKEND_URL=http://localhost:5000
MONGO_URI=mongodb://127.0.0.1:27017/salba_db
```

---

## Services Startup Order

1. **MongoDB** (27017) - Database
   ```powershell
   mongod --dbpath c:\data\db
   ```

2. **ML Service** (5001) - Flask
   ```powershell
   cd ml_service
   python app.py
   ```

3. **AdminWebApp Backend** (5000) - Express
   ```powershell
   cd backend
   node server.js
   ```

4. **DisasterSOS Backend** (5002) - Express
   ```powershell
   cd ..\..\DisasterSOS\DisasterSOS\backend
   npm start  # or node server.js
   ```

5. **DisasterSOS Frontend** (Expo)
   ```powershell
   cd ..
   npm start
   ```

6. **AdminWebApp Frontend** (React)
   ```powershell
   cd ..\..\AdminWebApp\frontend
   npm start
   ```

7. **RescuerApp** (Expo)
   ```powershell
   cd ..\..\..\RescuerApp
   npm start
   ```

---

## Verification Checklist

- [ ] MongoDB running on 27017
- [ ] ML Service running on 5001 with all models ready
- [ ] AdminWebApp backend running on 5000
- [ ] DisasterSOS backend running on 5002
- [ ] DisasterSOS frontend can log in locally
- [ ] DisasterSOS frontend can submit disaster report
- [ ] Report appears in AdminWebApp dashboard with AI predictions
- [ ] Admin can dispatch rescue team
- [ ] RescuerApp receives notification of dispatch
- [ ] RescuerApp shows report location + AI data

---

## Current Status

**Running Now**:
- ✅ MongoDB (27017)
- ✅ ML Service (5001)
- ✅ AdminWebApp Backend (5000)

**Need to Start**:
- ❌ DisasterSOS Backend (5002) - PORT NEEDS CHANGING
- ❌ DisasterSOS Frontend (Expo)
- ❌ AdminWebApp Frontend (React) - or use existing
- ❌ RescuerApp (React Native Expo)

