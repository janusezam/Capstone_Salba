# 🔧 Troubleshooting: "Failed to Load Your Reports"

## Quick Fix Checklist

- [ ] **Backend is running** on port 5000
- [ ] **Logged in with valid credentials** in the mobile app
- [ ] **User token is stored** in AsyncStorage
- [ ] **Internet connection is active**
- [ ] **Database has data** for your user ID

---

## Common Issues & Solutions

### ❌ Issue 1: "Failed to load your reports" alert appears

**Cause:** Backend is not responding or user is not authenticated

**Solutions:**

1. **Check if backend is running:**
   ```bash
   # In backend directory
   node server.js
   ```
   Should show: `[OK] Backend listening on port 5000`

2. **Check internet connection:**
   - Make sure your device can reach the backend server
   - If testing on emulator, use correct IP address in BASE_URL

3. **Re-login:**
   - Log out from the app
   - Log back in with valid credentials
   - Your JWT token will be refreshed

---

### ❌ Issue 2: Empty report list (no reports showing)

**Cause:** 
- No reports submitted yet
- Reports exist but not linked to your user

**Check:**
1. Submit a new report using the app
2. Wait 2-3 seconds
3. Pull down to refresh the list
4. New report should appear

---

### ❌ Issue 3: "Unauthorized" error in console

**Cause:** JWT token is invalid or expired

**Solution:**
1. Clear app storage
2. Log out and log back in
3. Check that `.env` on backend has valid `JWT_SECRET`

---

## Technical Details

### API Endpoint
```
GET /api/alerts/my-reports
Authorization: Bearer <your-jwt-token>
```

### Response Format
```json
{
  "success": true,
  "count": 5,
  "reports": [
    {
      "_id": "6647abc...",
      "type": "Fire",
      "location": "Melendez, Malaybalay",
      "status": "pending",
      "message": "Fire in building",
      "severity": "critical",
      "timestamp": "2026-04-13T10:30:00Z",
      "senderName": "John Doe"
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Failed to load reports"
}
```

---

## Step-by-Step Verification

### Step 1: Backend Status
```bash
# Check if backend is running
curl -s http://localhost:5000/api/alerts | head -20
```
Should return alert data (not an error)

### Step 2: Test the My-Reports Endpoint
```bash
# With a valid JWT token
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/alerts/my-reports
```

Should return:
```json
{
  "success": true,
  "count": 0,
  "reports": []
}
```

### Step 3: Mobile App Session
1. Open app and **log in successfully**
2. Go to "My Reports" tab
3. Should see: Loading spinner → Query backend → Display results

---

## Debug Logs to Check

### Backend Console
Look for:
```
📱 Backend listening on port 5000
✓ MongoDB connected
```

### Mobile App Console
Look for:
```
📱 Fetching my reports with token: ✓ Present
✓ Fetched user reports: 0
```

Or error:
```
⚠️ User-specific endpoint failed: 401
```

---

## Authentication Requirements

For the `/my-reports` endpoint to work:

1. **JWT Token** must be present in request headers:
   ```javascript
   Authorization: Bearer eyJhbGc...
   ```

2. **Token payload** must include user ID:
   ```javascript
   {
     "id": "user-mongo-id",
     "role": "user",
     "iat": 1234567890
   }
   ```

3. **Token must be valid** - not expired, not tampered with

---

## Reset/Clear Cache

If you're still getting errors:

### Clear Mobile App Cache
1. Remove app from phone
2. Clear AsyncStorage:
   ```javascript
   // Add this temporarily to app
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```
3. Reinstall app
4. Log in again

### Restart Services
```bash
# Backend
taskkill /F /IM node.exe
node server.js

# MongoDB (if needed)
# Restart MongoDB service
```

---

## Enable Detailed Logging

### In Backend (alertRoutes.js)
```javascript
console.log('📱 userId from token:', req.user);
console.log('📱 Reports found:', reports.length);
```

### In App (AlertHistoryScreen.jsx)
```javascript
const token = await AsyncStorage.getItem("userToken");
console.log('Token present:', !!token);
console.log('Base URL:', BASE_URL);
```

---

## Contact Support

If issue persists after trying above:

1. **Collect logs:**
   - Backend console output
   - Mobile app console errors
   - Network request details

2. **Check:**
   - Are you the admin or regular user?
   - Have you submitted any reports?
   - Is your account properly created?

3. **Report with:**
   - Error message exact text
   - Steps to reproduce
   - Backend logs
   - App version

---

## ✅ Verification Checklist - Everything Should Work

- [x] Backend on port 5000
- [x] JWT token stored after login
- [x] `/my-reports` endpoint responds
- [x] Reports appear in list after submission
- [x] Status badges show (Pending/Ongoing/Resolved)
- [x] Details modal opens on tap
- [x] Pull-to-refresh works

**Once all checked, feature should be working! 🎉**
