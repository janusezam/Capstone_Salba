# 🧪 RescuerApp Assignment Status - Testing Guide

## Setup Status
✅ Backend running on port 5000 (Socket.io enabled)
✅ Frontend running on port 3000 (AdminDashboard + RescuerDashboard)
✅ MongoDB connected to capstoneDB
✅ RescuerDashboard.js updated with Socket.io listeners

---

## Test Scenario 1: Admin Dispatches a Team

### Prerequisites
1. Open **AdminDashboard** at `http://localhost:3000`
   - Login as admin (janusezam@gmail.com / 123456)
2. Create a **critical/high severity report** in DisasterSOS or use existing one
3. **Open RescuerDashboard in a NEW BROWSER TAB** at `http://localhost:3000`
   - Logout from admin account
   - Login as a rescuer (check DB for rescuer account or create one)
   - Or keep both dashboards side-by-side with split screen

### Step-by-Step Test

**Step 1: Admin Initiates Dispatch**
```
In AdminDashboard:
1. Go to "Reports" or "Current Alerts" section
2. Click on a critical/high severity report (red alert)
3. See "Critical Alert Modal" popup
4. Click "Dispatch" button next to a team (e.g., "Team Alpha")
5. Confirm dispatch in modal
```

**Step 2: Watch RescuerApp Real-Time Update**
```
In RescuerDashboard (other tab/window):
⏱️ WITHIN 1-2 SECONDS, you should see:

STATUS DISPLAY:
✓ Status banner changes from BLUE → RED
✓ Shows: "🚨 Team Assigned - Mission Active!" (or "🚨 TEAM DEPLOYED")

TEAM INFO APPEARS:
✓ Card shows: "Team: Alpha" 
✓ Shows: "Status: DEPLOYED"
✓ Shows: "Members: [number]"
✓ Shows: "Leader: [name]"

MISSION DETAILS APPEAR:
✓ Red card labeled "🚨 Current Mission Assignment"
✓ Shows: Type of incident (Flood, Fire, etc.)
✓ Shows: Severity (critical/high)
✓ Shows: Location address
✓ Shows: Latitude/Longitude coordinates
✓ Button: "Start Assigned Mission" is ready to click

MAP UPDATES:
✓ Blue marker for rescuer location visible
✓ RED marker appears for the mission location
```

---

## Test Scenario 2: Mission Completion

### From admin side
```
1. In AdminDashboard, find the deployed team
2. Click "Complete Mission" or "Mark as Resolved"
3. Backend will emit 'mission_complete' event
```

### Watch RescuerApp update
```
In RescuerDashboard:
✓ Mission card disappears
✓ Status changes back to "Not Assigned"
✓ Team info might still show (depending on backend logic)
✓ Map shows only rescuer location, mission marker gone
```

---

## Test Scenario 3: Real-Time Notification

### Multiple Teams Deployed Simultaneously
```
1. Create 2-3 critical reports in DisasterSOS
2. In AdminDashboard, dispatch:
   - Report 1 → Team Alpha
   - Report 2 → Team Bravo
   - Report 3 → Team Charlie
3. Open RescuerDashboard for EACH rescuer in different tabs
4. Each should see their team's assignment in real-time
```

---

## Expected Socket.io Events

### On Admin Dispatch
```
Event: dispatch_alert
Sent to: rescuer_${userId} room
Contains: {
  team: { _id, name, status, members, currentMission },
  lat: mission_latitude,
  lng: mission_longitude,
  address: mission_address,
  reportId: report_id
}
```

### RescuerApp Listeners Active
✓ dispatch_alert → Updates assignment, fetches team data
✓ team_dispatched → Updates team status display
✓ mission_complete → Clears mission, shows "Not Assigned"
✓ connect → Joins rescuer room with userId

---

## Debugging Checklist

### If Assignment Status NOT updating:

1. **Check Socket.io Connection**
   ```
   In Browser Console (F12):
   - Look for: "✓ RescuerApp connected to Socket.io"
   - Should appear within 2 seconds of page load
   ```

2. **Check Socket.io Room Subscription**
   ```
   Console should show:
   - "📢 Dispatch alert received: {data}"
   When admin dispatches
   ```

3. **Check Backend Logs**
   ```
   In terminal running backend (npm start):
   - Look for: "emit('dispatch_alert'...)" or "req.io.emit"
   - Should print when dispatch button clicked
   ```

4. **Check Team Assignment in DB**
   ```
   MongoDB query:
   db.teams.findOne({})
   Should have:
   - status: "deployed" (after dispatch)
   - currentMission: ObjectId (of the report)
   ```

5. **Check Rescuer is Team Member**
   ```
   MongoDB:
   db.teams.findOne({ members: ObjectId(rescuerId) })
   Should return the team
   ```

---

## Network Testing (Remote Devices)

### From Another Device on WiFi (192.168.1.56)

1. **Open Frontend**
   ```
   Browser: http://192.168.1.56:3000
   (Replace 192.168.1.56 with your actual IP)
   ```

2. **Login as Rescuer**
   - Use rescuer credentials

3. **Dispatch from Admin Tab**
   - Keep AdminDashboard open at http://localhost:3000
   - Dispatch a team
   
4. **Verify Remote Update**
   - Status should update in real-time on remote device
   - Socket.io should work across WiFi network

---

## Success Criteria ✅

**All Tests Pass When:**

- [ ] Admin dispatches team
- [ ] RescuerApp status changes from "Not Assigned" → "🚨 Team Assigned"
- [ ] Team info card appears with correct details
- [ ] Mission card appears with incident details
- [ ] Mission marker shows on map
- [ ] "Start Assigned Mission" button is visible
- [ ] After mission complete, status reverts to "Not Assigned"
- [ ] Works on remote device (192.168.1.56) via WiFi
- [ ] Works with multiple teams dispatched simultaneously
- [ ] Socket.io logs show no errors in console

---

## Terminal Commands for Manual Testing

### Check if services are running
```powershell
netstat -ano | findstr ":5000\|:3000\|:27017"
```

### View backend logs
```powershell
# Terminal already running: npm start
# Watch for "dispatch_alert" messages
```

### Check MongoDB connection
```powershell
mongo
> use capstoneDB
> db.teams.findOne({})
```

### Restart everything
```powershell
taskkill /F /IM node.exe
Start-Sleep -Seconds 2
# Run: npm start (in backend)
# Run: npm start (in frontend, new terminal)
```

---

## Troubleshooting Common Issues

### Issue: "Cannot GET /rescue/my-team"
**Fix:** Backend `/api/rescue/my-team` endpoint not found
- Check: `backend/routes/rescueRoutes.js` line 24
- Ensure route is mounted in `server.js`

### Issue: Socket.io not connecting
**Fix:** Check auth token
- Verify token is in localStorage
- Check: browser DevTools → Storage → LocalStorage → token

### Issue: Status says "No Team Assignment"
**Fix:** Rescuer not added to any team in DB
- Go to AdminDashboard → Teams
- Add rescuer to Team Alpha (or any team)
- Refresh RescuerDashboard

### Issue: Mission details don't show on map
**Fix:** Missing currentMission in team object
- Check: `/api/rescue/my-mission` is returning data
- Verify: `/api/rescue/my-team` has currentMission field populated

---

## Quick Test Command

Open 2 browser windows:
```
Window 1: http://localhost:3000 (admin logged in)
Window 2: http://localhost:3000 (rescuer logged in)

1. In Window 1, click "Critical Alert" → "Dispatch Alpha"
2. Check Window 2 for status update
3. Should see red banner + team info + mission details within 1-2 seconds
```

---

**Status:** ✅ Ready to Test
**Last Updated:** March 20, 2026
