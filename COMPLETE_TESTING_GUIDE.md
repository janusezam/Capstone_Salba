# Complete System Testing & Startup Guide
## Emergency Response System (3 Apps + ML)

**Last Updated**: March 20, 2026
**Status**: Ready for Integration Testing (85-95% Complete)

---

## System Overview

```
DISASTERSOS          ADMINWEBAPP            RESCUERAPP
(Citizens)           (Admin Dashboard)      (Rescuers)
:5002                :5000 + :3000          :? 
   ↓                    ↓                       ↑
   └────────┬────────────┤                     │
            ↓            ↓                     │
         ML Service (:5001)                   │
            ↓            ↓                     │
         MongoDB (:27017)←─────────────────────┘
```

---

## Service Dependencies

### Level 1: Core Infrastructure (Start First)
1. **MongoDB** (27017) - Shared database
2. **ML Service** (5001) - Python Flask, 3 ML models

### Level 2: Backend APIs (Start Second)
3. **AdminWebApp Backend** (5000) - Main coordinator, Express
4. **DisasterSOS Backend** (5002) - User reports, Express

### Level 3: Frontend Apps (Start Last)
5. **AdminWebApp Frontend** (3000) - React Dashboard
6. **DisasterSOS Frontend** (Expo) - React Native App
7. **RescuerApp** (Expo) - React Native App

---

## Startup Procedures

### ✅ STEP 1: Start MongoDB (Port 27017)

**PowerShell**:
```powershell
# Navigate to workspace
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp

# Start MongoDB with data directory
mkdir c:\data\db -Force
mongod --dbpath c:\data\db
```

**Expected Output**:
```
[initandlisten] Listening on 127.0.0.1:27017
```

**Verify**: Open another terminal:
```powershell
mongo --eval "db.adminCommand('ping')"
# Should return: { "ok" : 1 }
```

---

### ✅ STEP 2: Start ML Service (Port 5001)

**PowerShell** (in new terminal):
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\ml_service

$pyExe = 'C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\.venv\Scripts\python.exe'
& $pyExe app.py
```

**Expected Output**:
```
 * Running on http://127.0.0.1:5001
```

**Verify**: In another terminal or browser:
```powershell
Invoke-WebRequest http://localhost:5001/health -UseBasicParsing
```

**Expected Response**:
```json
{
  "status": "OK",
  "classifier_ready": true,
  "severity_predictor_ready": true,
  "false_alarm_detector_ready": true
}
```

---

### ✅ STEP 3: Start AdminWebApp Backend (Port 5000)

**PowerShell** (in new terminal):
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\backend

node server.js
```

**Expected Output**:
```
[OK] Backend listening on port 5000
```

**Verify**:
```powershell
Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing
# Should return: { "ok": true }
```

---

### ⭐ NEW: STEP 4: Start DisasterSOS Backend (Port 5002)

**PowerShell** (in new terminal):
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend

npm install  # First time only
node server.js
```

**Expected Output**:
```
🚀 [DisasterSOS] Server running on port 5002
```

**Verify**:
```powershell
Invoke-WebRequest http://localhost:5002/api/health -UseBasicParsing
# Should return: { "status": "ok", "timestamp": "2026-03-20T..." }
```

---

### STEP 5: Start AdminWebApp Frontend (Port 3000)

**PowerShell** (in new terminal):
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\frontend

npm install  # First time only
npm start
```

**Automatic Browser Open**: http://localhost:3000

---

### OPTIONAL: STEP 6: Start DisasterSOS Frontend (Expo)

**PowerShell** (in new terminal):
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS

npm install  # First time only
npm start
```

**Output**: Will show a menu with options (w for web, a for Android, i for iOS)

---

### OPTIONAL: STEP 7: Start RescuerApp (Expo)

**PowerShell** (in new terminal):
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\RescuerApp

npm install  # First time only
npm start
```

---

## Testing the Complete Flow

### Test 1: Admin Login & Dashboard

**URL**: http://localhost:3000

**Login Credentials** (default):
- Email: `admin@example.com`
- Password: `password123`

**Expected**:
- ✅ Login succeeds
- ✅ Dashboard shows "Reports" section
- ✅ AI Status shows ML service connected

---

### Test 2: Create Report via Curl (DisasterSOS Backend)

**PowerShell**:
```powershell
$body = @{
    userId = "test-user-123"
    latitude = 8.2329
    longitude = 124.9433
    type = "Fire"
    severity = "high"
    note = "Large fire near Maria Clara Street"
    locationName = "Malaybalay City"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5002/api/alerts" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

**Expected Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "test-user-123",
  "lat": 8.2329,
  "lng": 124.9433,
  "severity": "high",
  "note": "Large fire near Maria Clara Street",
  "status": "new",
  "disasterType": "Fire",
  "createdAt": "2026-03-20T..."
}
```

**Check Backend Logs**:
- Should see: `"✓ Report forwarded to AdminWebApp for ML analysis"`

---

### Test 3: Verify Report in AdminWebApp

**URL**: http://localhost:3000/admin (or Dashboard)

**Expected**:
- ✅ New report appears in the list
- ✅ Shows disaster type: "Fire"
- ✅ Shows AI predictions:
  - `Disaster Type`: Fire
  - `Severity`: Critical / High
  - `Legitimate`: true/false

**Look for AI Labels**:
- 🚨 AI CRITICAL (if fire or high severity)
- ⚠️ FLAGGED (if false alarm detected)
- Confidence: X%

---

### Test 4: Admin Dispatch

**In Dashboard**:
1. Find the test report
2. Click "Dispatch" or "Assign Team"
3. Assign rescue team

**Expected**:
- ✅ Report status changes to "Assigned"
- ✅ Rescue team receives notification (if RescuerApp running)

---

### Test 5: Verify ML Predictions Accuracy

**Check MongoDB**:
```powershell
mongo

# Use database
use capstoneDB

# Find recent report
db.reports.findOne({}, {sort: {createdAt: -1}})

# Should show mlPredictions object with:
# - disasterType: "Fire"
# - disasterTypeConfidence: 95-100
# - severity: "critical" or "high"
# - isLegitimate: true/false
```

---

## Service Status Checklist

Before testing, verify all services are running:

```powershell
# Check all ports
Write-Host "=== SERVICE STATUS ===" -ForegroundColor Cyan

# MongoDB
$mongo = Get-Process mongod -ErrorAction SilentlyContinue
Write-Host "MongoDB (27017): $(if($mongo) {'✓ Running'} else {'✗ Stopped'})" -ForegroundColor $(if($mongo) {'Green'} else {'Red'})

# ML Service
try {
    $ml = Invoke-WebRequest http://localhost:5001/health -UseBasicParsing -TimeoutSec 2
    Write-Host "ML Service (5001): ✓ Running" -ForegroundColor Green
} catch {
    Write-Host "ML Service (5001): ✗ Stopped" -ForegroundColor Red
}

# AdminWebApp Backend
try {
    $admin = Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing -TimeoutSec 2
    Write-Host "AdminWebApp Backend (5000): ✓ Running" -ForegroundColor Green
} catch {
    Write-Host "AdminWebApp Backend (5000): ✗ Stopped" -ForegroundColor Red
}

# DisasterSOS Backend
try {
    $sos = Invoke-WebRequest http://localhost:5002/api/health -UseBasicParsing -TimeoutSec 2
    Write-Host "DisasterSOS Backend (5002): ✓ Running" -ForegroundColor Green
} catch {
    Write-Host "DisasterSOS Backend (5002): ✗ Stopped" -ForegroundColor Red
}

# AdminWebApp Frontend
try {
    $frontend = Invoke-WebRequest http://localhost:3000 -UseBasicParsing -TimeoutSec 2
    Write-Host "AdminWebApp Frontend (3000): ✓ Running" -ForegroundColor Green
} catch {
    Write-Host "AdminWebApp Frontend (3000): ✗ Stopped" -ForegroundColor Red
}
```

---

## Troubleshooting

### Issue: "Port already in use"
```powershell
# Find process using port
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
Get-Process -Id <PID>

# Kill it
Stop-Process -Id <PID> -Force
```

### Issue: "Cannot connect to ML Service"
```powershell
# Check if Python is running
Get-Process python | Select-Object ProcessName, Id

# Check if Flask app is outputting errors
cd ml_service && python app.py
```

### Issue: "MongoDB connection failed"
```powershell
# Check if mongod is running
Get-Process mongod

# If not, restart:
mongod --dbpath c:\data\db
```

### Issue: "DisasterSOS can't reach AdminWebApp"
```powershell
# Check .env file
cat C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend\.env
# Make sure: ADMIN_BACKEND_URL=http://localhost:5000

# Test connectivity from DisasterSOS backend terminal:
Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing
```

---

## Files Modified

### DisasterSOS Backend
- [.env](../DisasterSOS/DisasterSOS/backend/.env) - PORT changed to 5002, added ADMIN_BACKEND_URL
- [server.js](../DisasterSOS/DisasterSOS/backend/server.js) - Updated listen port message
- [config/api.js](../DisasterSOS/DisasterSOS/config/api.js) - Updated BASE_URL to :5002
- [routes/alertRoutes.js](../DisasterSOS/DisasterSOS/backend/routes/alertRoutes.js) - Added AdminWebApp forwarding

### AdminWebApp
- Already configured ✅

### ML Service
- Already running ✅

---

## Success Metrics (95% = All ✅)

- [x] MongoDB running and seeded
- [x] ML Service running with 3 models ready
- [x] AdminWebApp Backend running (:5000)
- [ ] DisasterSOS Backend running (:5002)
- [ ] DisasterSOS reports forwarded to AdminWebApp
- [ ] AdminWebApp dashboard shows AI predictions
- [ ] Admin can dispatch based on AI recommendations
- [ ] RescuerApp receives dispatch notifications
- [ ] Complete flow: Report → AI → Admin → Rescuer ✅

---

**Next Steps**:
1. Start DisasterSOS backend (`node server.js` in port 5002)
2. Create test report via DisasterSOS or curl
3. Verify it appears in AdminWebApp with AI predictions
4. Test admin dispatch
5. Monitor system logs for errors

