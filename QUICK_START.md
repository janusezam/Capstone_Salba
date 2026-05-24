# Quick Start: 5-Minute System Launch

## The Situation
You have **3 apps + ML system ready for integration testing**.

Currently running:
- ✅ MongoDB (27017)
- ✅ ML Service (5001)
- ✅ AdminWebApp Backend (5000)

Need to start:
- DisasterSOS Backend (5002)
- Test complete flow

---

## Option A: Start Everything (5 PowerShell Terminals)

### Terminal 1: MongoDB (Already Running)
```powershell
# If not running, start it:
mongod --dbpath c:\data\db
```

### Terminal 2: ML Service (Already Running)  
```powershell
# If not running, start it:
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\ml_service
python app.py
```

### Terminal 3: AdminWebApp Backend (Already Running)
```powershell
# If not running, start it:
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\backend
node server.js
```

### Terminal 4: **NEW** DisasterSOS Backend
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend
npm install
node server.js
```

**Wait for output**:
```
🚀 [DisasterSOS] Server running on port 5002
```

### Terminal 5: AdminWebApp Frontend
```powershell
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\frontend
npm install
npm start
```

Browser opens to: http://localhost:3000

---

## Option B: Quick Test (No Frontend)

### Just Start Services 1-4, Then Test via API

```powershell
# Login to get token (in new terminal)
$login = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"admin@example.com","password":"password123"}' `
    -UseBasicParsing

$token = ($login.Content | ConvertFrom-Json).token
Write-Host "Token: $token"

# Create test report via DisasterSOS
$body = @{
    userId = "test-user"
    latitude = 8.2329
    longitude = 124.9433
    type = "Fire"
    severity = "high"
    note = "Large fire near City Center"
    locationName = "Malaybalay"
} | ConvertTo-Json

$report = Invoke-WebRequest -Uri "http://localhost:5002/api/alerts" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

Write-Host "Report created:"
$report.Content | ConvertFrom-Json | Format-List

# Check it in AdminWebApp (after 1-2 seconds for ML processing)
Start-Sleep -Seconds 2

$reports = Invoke-WebRequest -Uri "http://localhost:5000/api/reports" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"} `
    -UseBasicParsing

Write-Host "`nReports in AdminWebApp:"
($reports.Content | ConvertFrom-Json) | Format-List
```

---

## System Health Check (Copy & Run)

```powershell
Write-Host "=== EMERGENCY SYSTEM STATUS ===" -ForegroundColor Cyan
Write-Host ""

# Check each service
$checks = @(
    @{name="MongoDB"; url=""; cmd="Get-Process mongod -EA SilentlyContinue"},
    @{name="ML Service"; url="http://localhost:5001/health"; cmd=""},
    @{name="AdminWebApp API"; url="http://localhost:5000/api/health"; cmd=""},
    @{name="DisasterSOS API"; url="http://localhost:5002/api/health"; cmd=""}
)

foreach($check in $checks) {
    if($check.cmd) {
        $proc = Invoke-Expression $check.cmd
        Write-Host "$($check.name): $(if($proc) {'✓ Running'} else {'✗ Stopped'})" -ForegroundColor $(if($proc) {'Green'} else {'Red'})
    } else {
        try {
            $resp = Invoke-WebRequest -Uri $check.url -UseBasicParsing -TimeoutSec 2
            Write-Host "$($check.name): ✓ Running" -ForegroundColor Green
        } catch {
            Write-Host "$($check.name): ✗ Stopped" -ForegroundColor Red
        }
    }
}
```

---

## What Happens When It Works

### You Should See:

**In DisasterSOS Backend Terminal**:
```
POST /api/alerts
✓ Report forwarded to AdminWebApp for ML analysis
```

**In AdminWebApp Backend Terminal**:
```
POST /api/reports
[OK] ML predictions completed (fast mode)
✓ ML predictions completed
```

**In AdminWebApp Dashboard** (http://localhost:3000):
```
New report appears:
- Location: 8.2329, 124.9433
- AI Prediction: Fire (95% confidence)
- AI Severity: Critical
- Admin button: "Dispatch" ← Click to send to rescuers
```

---

## Verify It's Working

### Check 1: Report Created
```powershell
# Should return report with _id
Invoke-WebRequest http://localhost:5002/api/alerts -UseBasicParsing
```

### Check 2: Report Forwarded
```powershell
# Should show recent report with mlPredictions
mongo
use capstoneDB
db.reports.findOne({}, {sort: {createdAt: -1}})
```

### Check 3: Dashboard Shows It
```powershell
# Open http://localhost:3000
# Should show new report with AI predictions
```

---

## If Something Breaks

| Problem | Fix |
|---------|-----|
| "Port already in use" | `Stop-Process -Name node -Force` |
| "Cannot reach ML Service" | Check: `Get-Process python` |
| "MongoDB won't start" | Check: `mongod --dbpath c:\data\db` |
| "DisasterSOS can't reach AdminWebApp" | Check: `$env:ADMIN_BACKEND_URL` is set |

---

## Files to Reference

| For | Open |
|-----|------|
| Complete startup procedure | `COMPLETE_TESTING_GUIDE.md` |
| Architecture overview | `SYSTEM_INTEGRATION_ROADMAP.md` |
| DisasterSOS setup details | `INTEGRATION_SETUP.md` |
| All changes made | `INTEGRATION_SUMMARY.md` (this directory) |

---

## Success = This Works

1. ✅ DisasterSOS Backend starts on :5002
2. ✅ Create report → appears in AdminWebApp within 2 seconds
3. ✅ AdminWebApp shows AI predictions (type, severity, legitimacy)
4. ✅ Admin clicks "Dispatch" → report sent to RescuerApp
5. ✅ RescuerApp shows rescue mission with AI data

**When all 5 work = 95% Complete** 🎉

---

## Copy-Paste Command Blocks

### Start All Services at Once (Run in PowerShell)
```powershell
# Open 5 PowerShell windows and run these:

# Window 1: MongoDB
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp ; mongod --dbpath c:\data\db

# Window 2: ML Service
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\ml_service ; python app.py

# Window 3: AdminWebApp Backend
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\backend ; node server.js

# Window 4: DisasterSOS Backend (NEW)
cd C:\Users\USER\OneDrive\Documents\Capstone\DisasterSOS\DisasterSOS\backend ; npm install ; node server.js

# Window 5: AdminWebApp Frontend
cd C:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\AdminWebApp\frontend ; npm start
```

### Quick Test (Run in single terminal after services start)
```powershell
# Wait 2 seconds for all services to be ready
Start-Sleep -Seconds 2

# Test all endpoints
foreach($url in @("http://localhost:27017", "http://localhost:5001/health", "http://localhost:5000/api/health", "http://localhost:5002/api/health")) {
    try { 
        if($url -eq "http://localhost:27017") {
            Write-Host "MongoDB: CHECKING..."
            # MongoDB doesn't respond to /health, just check if process is running
            if(Get-Process mongod -EA SilentlyContinue) { Write-Host "✓ MongoDB RUNNING" -ForegroundColor Green }
        } else {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
            if($resp.StatusCode -eq 200) { Write-Host "✓ $url RUNNING" -ForegroundColor Green }
        }
    } catch { 
        Write-Host "✗ $url FAILED" -ForegroundColor Red 
    }
}
```

---

## You're at 85-90%

To reach **95%**:
1. Start DisasterSOS backend (terminal 4) ← DO THIS NEXT
2. Create test report
3. Verify it appears in AdminWebApp with AI predictions
4. Test dispatch workflow

**Estimated time**: 15-20 minutes

