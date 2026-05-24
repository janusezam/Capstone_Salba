# Real-Time Map Feature - Setup & Test Guide

## Quick Start

The Real-Time Map feature has been successfully integrated into your Admin Dashboard. Here's what was added:

### New Files
1. **`frontend/src/components/RescueMap.js`** - Real-time map component with WebSocket integration

### Modified Files  
1. **`frontend/src/components/AdminDashboard.js`** - Integrated RescueMap into Ongoing Rescues tab

## Prerequisites

✅ **Already Installed & Configured:**
- ✅ react-leaflet (v5.0.0)
- ✅ leaflet (v1.9.4)
- ✅ socket.io-client (v4.8.1)
- ✅ Backend WebSocket support (socket.io)
- ✅ Backend `/api/route` endpoint (OpenRouteService proxy)

## Testing the Feature

### Step 1: Start Backend Server
```bash
cd backend
npm start
# or
npm run dev
```

Verify backend is running at `http://localhost:5000`

### Step 2: Start Frontend Development Server
```bash
cd frontend
npm start
```

Verify frontend is running at `http://localhost:3000`

### Step 3: Create Test Rescue Data

You have two options:

#### Option A: Use Existing Ongoing Rescues
If you already have ongoing rescues with assigned rescuers, they will automatically show the map.

#### Option B: Create New Test Data
Use the backend test scripts:
```bash
cd backend
node create-active-response.js
```

Or manually trigger a new report/alert in the admin dashboard.

### Step 4: View Real-Time Map

1. Open Admin Dashboard: `http://localhost:3000/admin`
2. Click **"Ongoing Rescue"** in sidebar
3. Click on any rescue incident card to expand
4. Look for **"Real-Time Location & Route"** section
5. You should see:
   - Interactive map with incident location
   - Rescuer location (if rescuer has login to RescuerApp)
   - Route visualization

### Step 5: Test Real-Time Updates

To see real-time location updates:

1. **Start RescuerApp** (if available)
2. Login as a rescuer assigned to the incident
3. Go to Map screen in RescuerApp
4. Watch the location in Admin Dashboard update in real-time
5. The route will automatically recalculate as rescuer moves

## Expected Behavior

### Initial State
- **Map loads** with incident location (red marker)
- **"Awaiting rescuer location..."** message if no rescuer location yet
- **Yellow pulsing dot** in status bar

### When Rescuer Location Available
- **Blue marker** appears at rescuer location
- **Blue route line** shows optimal path to incident
- **Accuracy circle** (optional) shows GPS accuracy
- **"Live tracking active"** with green dot in status bar
- **Route Information** card shows distances and times

### Real-Time Updates
- Map updates automatically every 5 seconds
- Route recalculates when rescuer moves significantly
- Status indicators update in real-time
- No page refresh needed

## Browser Console Debugging

Open Developer Tools (F12) and check:

### WebSocket Connection
```
✓ Connected to real-time location updates
```

### Location Updates
```
📍 Real-time rescuer location update: {
  rescuerId: "...",
  rescuerName: "...",
  lat: 8.1234,
  lng: 125.5678,
  accuracy: 10,
  timestamp: "2024-04-07T..."
}
```

### Route Loading
```
⏳ Loading route...
✓ Route loaded
⚠ Route unavailable
```

## Troubleshooting Checklist

### Map Not Displaying
- [ ] Backend is running (`http://localhost:5000` is accessible)
- [ ] Rescue has assigned rescuer with coordinates
- [ ] Browser console has no errors
- [ ] Leaflet CSS is loaded (check Network tab)

### No Real-Time Updates
- [ ] WebSocket connection established (check console)
- [ ] Rescuer is logged into RescuerApp
- [ ] RescuerApp location permissions granted
- [ ] Backend is emitting `rescuer_location_update` events
- [ ] Admin is in `admins` socket room

### Route Not Showing
- [ ] Backend route endpoint is working
- [ ] Test: `GET http://localhost:5000/api/route?start=125.1276,8.1575&end=125.2,8.2`
- [ ] OpenRouteService is accessible from backend
- [ ] Coordinates are valid road network points

### Wrong Coordinates Displayed
- [ ] Verify data format: `latitude, longitude` vs `longitude, latitude`
- [ ] Map uses `[lat, lng]`, route API uses `lng,lat`
- [ ] Check database records for coordinate values

## Network Requests to Monitor

Open Network tab in DevTools to see:

1. **WebSocket Connection**
   - URL: `ws://localhost:5000/socket.io/`
   - Type: websocket
   - Should see continuous connection

2. **Route API Call**
   - URL: `http://localhost:5000/api/route?start=125...,8...&end=125...,8...`
   - Method: GET
   - Should return: 200 OK with GeoJSON

3. **Map Tiles**
   - URL: `https://tile.openstreetmap.org/...`
   - Multiple requests for map tiles
   - May fail if offline (map shows gray)

## Configuration Files

If you need to change server URLs:

### `frontend/src/components/RescueMap.js`
```javascript
// Line ~135
const SOCKET_URL = "http://localhost:5000";

// Line ~75
const response = await fetch(
  `http://localhost:5000/api/route?start=...`
);
```

### For Production
Update these URLs to your production server:
```javascript
const SOCKET_URL = "https://your-production-server.com";
const API_URL = "https://your-production-server.com/api";
```

## Performance Tips

1. **Limit Map Updates**: Component only updates when data changes
2. **Optimize Routes**: Route calculation runs on backend (efficient)
3. **WebSocket Efficiency**: Uses event-based updates (not polling)
4. **Memory Usage**: Single map instance per rescue card

## Testing Scenarios

### Scenario 1: Stationary Rescuer
- Rescuer location stays same
- Route doesn't change
- Expected: Static map, no unnecessary updates

### Scenario 2: Moving Rescuer  
- Rescuer moves toward incident
- Route updates gradually
- Expected: Smooth marker movement, route recalculation

### Scenario 3: Offline/No Connection
- WebSocket disconnected
- Expected: Last known location remains
- Status shows: "Disconnected from real-time updates"
- Reconnect automatically after 5 seconds

### Scenario 4: Route Unavailable
- OpenRouteService unreachable
- Expected: Fallback to straight line (dashed red)
- Status shows: "⚠ Route unavailable"
- Red status bar and warning icon

## Common Issues & Solutions

### Issue: Map shows blank/gray area
**Solution**: Tiles loading failed. Check internet connection and OpenStreetMap status.

### Issue: Markers not visible
**Solution**: 
- Check marker images loaded in Network tab
- Verify marker coordinates are not [0,0]
- Zoom in/out to ensure markers fit in viewport

### Issue: Route line not visible
**Solution**:
- Zoom to fit both markers
- Check route endpoint is returning data
- Verify response includes `geometry.coordinates`

### Issue: Real-time updates stop after 5-10 minutes  
**Solution**:
- Browser may have tabbed out (reduces network priority)
- Check if WebSocket auto-reconnection happened
- Refresh page if needed
- Check backend logs for disconnections

## Next Steps

1. ✅ **Test with existing data** - Navigate to Ongoing Rescues
2. ✅ **Test with RescuerApp** - See real-time updates
3. ✅ **Monitor console** - Check for errors
4. ✅ **Test route calculation** - Verify distances make sense
5. ✅ **Test offline fallback** - Verify graceful degradation
6. ✅ **Deploy to production** - Update configuration URLs

## Additional Features to Consider

- [ ] Route history/breadcrumb trail for rescuer path
- [ ] Multiple rescuers on same map
- [ ] Route waypoint editing by admin
- [ ] Traffic layer overlay
- [ ] ETA countdown timer
- [ ] GPS accuracy warnings
- [ ] Route optimization for multiple rescuers

## Support & Debugging

If something doesn't work:

1. **Check console errors** (F12 → Console tab)
2. **Check network requests** (F12 → Network tab)
3. **Check backend logs** (`node server.js` output)
4. **Verify all services running**:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`
   - Database: MongoDB connection
5. **Test API endpoints directly**:
   - WebSocket: Use postman/curl with WebSocket client
   - Route: Visit `http://localhost:5000/api/route?start=125.1,8.1&end=125.2,8.2`

Happy monitoring! 🗺️📍
