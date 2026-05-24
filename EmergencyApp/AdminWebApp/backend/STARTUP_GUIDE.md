# BACKEND STARTUP GUIDE - Quick Reference

## Problem Solved ✅
Fixed EADDRINUSE error that occurs when port 5000 is already in use.

---

## 🚀 How to Start Backend (Choose One)

### Option 1: EASIEST (Double-click)
```
backend/start-backend.bat
```
- Windows batch file
- Automatically clears port 5000
- Starts server
- No terminal commands needed

### Option 2: NPM Scripts (Fast)
```powershell
cd backend
npm run restart
```
- Clears port 5000
- Starts with `npm start`
- Error handling included

### Option 3: NPM Clean Start
```powershell
cd backend
npm run clean-start
```
- Cleans port
- Starts fresh
- Same as Option 2

### Option 4: Development Mode (with auto-reload)
```powershell
cd backend
npm run clean-dev
```
- Clears port
- Starts Nodemon (auto-restarts on file change)
- Best for development

### Option 5: Manual (if other options fail)
```powershell
cd backend
node kill-port.js
node server.js
```
- Manually run cleanup
- Manually start server
- Good for troubleshooting

---

## 📋 If You Still Get EADDRINUSE Error

### Step 1: Nuclear Option (Kill ALL Node Processes)
```powershell
taskkill /F /IM node.exe
```

### Step 2: Wait
```powershell
Start-Sleep -Seconds 2
```

### Step 3: Restart
```powershell
cd backend
npm start
```

---

## ✅ You Know It's Working When You See:
```
[OK] Backend listening on port 5000
```

---

## 🔧 What Was Changed

### Files Created:
- `backend/kill-port.js` - Script to clear port 5000
- `backend/start-backend.bat` - One-click startup for Windows

### Files Modified:
- `backend/server.js` - Added error handling & graceful shutdown
- `backend/package.json` - Added npm scripts

### New npm Commands:
- `npm start` - Normal start
- `npm run restart` - Clean start
- `npm run clean` - Just cleanup
- `npm run clean-start` - Clean + start
- `npm run clean-dev` - Clean + dev mode
- `npm run dev` - Nodemon development

---

## 🎯 Recommended Workflow

### First Time Starting:
```powershell
cd backend
npm install  # Install dependencies
npm run clean-start  # Clean start
```

### Subsequent Starts:
```powershell
cd backend
npm run restart  # Fastest way
```

### During Development:
```powershell
cd backend
npm run clean-dev  # Starts with auto-reload
```

---

## 📊 Port Overview

| Service | Port | Status |
|---------|------|--------|
| MongoDB | 27017 | Shared database |
| ML Service | 5001 | Python Flask |
| AdminWebApp Backend | 5000 | **← You're here** |
| DisasterSOS Backend | 5002 | User reports |

---

## ⚙️ Configuration

Your `.env` is already set up:
```
PORT=5000                    # ← Backend port
MONGO_URI=mongodb://...      # ← Database
ML_SERVICE_URL=http://localhost:5001  # ← ML service
```

To change port:
1. Edit `backend/.env`
2. Change `PORT=5001` (or your port)
3. Restart

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **EADDRINUSE error** | Run `npm run restart` |
| **Port still in use after restart** | `taskkill /F /IM node.exe` then `npm start` |
| **Server crashes immediately** | Check MongoDB is running (port 27017) |
| **Cannot connect to ML Service** | Check ML Service running on 5001 |
| **Database connection error** | Check MongoDB running: `mongod --dbpath c:\data\db` |

---

## ✨ New Error Messages

You'll now see helpful messages if something goes wrong:

```
❌ ERROR: Port 5000 is already in use!

═══════════════════════════════════════
To fix this:
─────────────────────────────────────
Option 1 (Recommended):
  taskkill /F /IM node.exe
  Then restart this server

Option 2:
  Set PORT=5001 in .env
  npm start
═══════════════════════════════════════
```

---

## 🎓 How It Works Now

```
1. You run: npm run restart
   ↓
2. kill-port.js executes
   ↓
3. Finds process on port 5000
   ↓
4. Kills it (taskkill)
   ↓
5. Waits 2 seconds
   ↓
6. server.js starts
   ↓
7. Error handler activated
   ↓
8. If port still in use → helpful error message
```

---

## 💡 Pro Tips

1. **Always use `npm run restart`** instead of `npm start` - it's safer
2. **If problems persist**: `taskkill /F /IM node.exe` clears everything
3. **Check what's running**: `Get-Process node`
4. **Find what's on port 5000**: `netstat -ano | findstr :5000`

---

**You're all set! Pick Option 1 (start-backend.bat) for easiest startup.** ✨

