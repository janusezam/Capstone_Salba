# Real-Time Map Feature - Ongoing Rescues

## Overview

The Real-Time Map feature allows admins to track rescuer locations and view the optimal route to disaster zones in real-time. This feature is integrated into the **Ongoing Rescues** section of the Admin Dashboard.

## How to Use

### 1. **Access the Feature**
- Navigate to **Sidebar → Ongoing Rescue**
- Click on any rescue incident card to expand it
- Scroll down to the **"Real-Time Location & Route"** section
- A map will load showing:
  - **Red Marker**: Incident/Disaster Location
  - **Blue Marker**: Current Rescuer Location
  - **Blue Line**: Optimal route from rescuer to incident
  - **Accuracy Circle**: GPS accuracy radius around rescuer

### 2. **Map Features**

#### Map Controls
- **Pan & Zoom**: Use mouse or trackpad to navigate
- **Markers**: Click on any marker to see detailed coordinates and information
- **Auto-fit**: Map automatically centers to show both incident and rescuer locations

#### Real-Time Information
The following information updates in real-time as rescuers move:
- Rescuer GPS coordinates (updates every 5 seconds or 10 meters of movement)
- GPS accuracy indicator
- Route optimization
- Distance and estimated travel time (when available)

### 3. **Information Displayed**

Below the map, you'll see **Route Information** card with:
- **Rescuer Location**: Current GPS coordinates
- **Incident Location**: Disaster zone GPS coordinates
- **Distance**: Straight-line distance (when route data is available)
- **Estimated Time**: ETA from rescuer to incident (when route data is available)

## Technical Details

### Components

#### RescueMap.js
Located at: `frontend/src/components/RescueMap.js`

**Key Features:**
- Renders interactive Leaflet map
- Real-time location updates via WebSocket
- Route fetching from backend `/route` endpoint
- Fallback straight-line display if route fetch fails
- GPS accuracy visualization with circles

**Props:**
```javascript
<RescueMap 
  rescue={rescueObject}           // Full rescue/report object
  onRealTimeUpdate={callback}     // Optional callback for location updates
/>
```

**State Management:**
- `rescuerLocation`: Current rescuer location with accuracy
- `routeCoordinates`: List of waypoints along the optimal route
- `routeStatus`: "idle", "loading", "success", or "error"
- `routeDistance`: Calculated distance (km)
- `routeDuration`: Estimated travel time (minutes)

### Backend Integration

#### Real-Time Location Updates
- **WebSocket Event**: `rescuer_location_update`
- **Broadcast Room**: `admins`
- **Data Structure**:
  ```javascript
  {
    rescuerId: string,
    rescuerName: string,
    lat: number,
    lng: number,
    accuracy: number (meters),
    timestamp: ISO8601 string,
    locationName: string (optional)
  }
  ```

#### Route Endpoint
- **Endpoint**: `GET /api/route`
- **Query Parameters**:
  - `start`: Starting coordinates as `longitude,latitude`
  - `end`: Destination coordinates as `longitude,latitude`
- **Returns**: GeoJSON FeatureCollection with route geometry
  ```json
  {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], [lng, lat], ...]
      },
      "properties": {
        "summary": {
          "distance": 5000,    // meters
          "duration": 300      // seconds
        }
      }
    }]
  }
  ```

### Real-Time Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ RescuerApp (React Native)                                   │
│ └─ Location tracking (expo-location)                        │
│    └─ Updates every 5s or 10m movement                      │
│       └─ Emits 'rescuer_location' to backend               │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.IO
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Node.js/Express)                                   │
│ └─ server.js socket handler                                │
│    └─ Receives rescuer location                            │
│    └─ Updates User & Team models                           │
│    └─ Broadcasts 'rescuer_location_update' to 'admins'    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.IO
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ AdminWebApp Dashboard (React)                               │
│ └─ RescueMap component                                      │
│    └─ Socket listener: 'rescuer_location_update'           │
│    └─ Updates rescuer marker in real-time                  │
│    └─ Fetches new route from /api/route                    │
│    └─ Updates Leaflet map display                          │
└─────────────────────────────────────────────────────────────┘
```

## Status Indicators

### Connection Status (Bottom of Map)
- **Green dot + "Live tracking active"**: WebSocket connected and receiving updates
- **Yellow dot (pulsing) + "Awaiting rescuer location..."**: Waiting for first location update

### Route Status (Bottom of Map)
- **"⏳ Loading route..."**: Fetching route from backend
- **"✓ Route loaded"**: Route successfully displayed
- **"⚠ Route unavailable"**: Route fetch failed, showing fallback line

## Troubleshooting

### Map Not Showing
- Check that the rescue has an assigned rescuer with valid GPS coordinates
- Verify backend is running at `http://localhost:5000`
- Check browser console for errors

### Real-Time Updates Not Working
- Verify WebSocket connection at `http://localhost:5000`
- Check that rescuer is logged into RescuerApp
- Verify rescuer location permissions are granted in RescuerApp
- Check browser console for socket errors

### Route Not Loading
- Verify `/api/route` endpoint is working
- Test endpoint manually: `http://localhost:5000/api/route?start=125.1234,8.1234&end=125.5678,8.5678`
- Check backend logs for route service errors
- Coordinates may be invalid or out of service area

### Coordinates Appear Incorrect
- Verify the order: coordinates should be `[longitude, latitude]`
- The app uses the Haversine formula to map to named locations
- Manual coordinates are displayed as fallback

## Performance Notes

- Map rerenders only when rescuer location changes (WebSocket update)
- Route is fetched once when rescuer location is available
- Route is refetched when rescuer location changes significantly
- Map is memory-efficient with single map instance per rescue

## Limitations

1. **Route Service**: Depends on OpenRouteService availability
2. **Accuracy**: GPS accuracy varies with device and location
3. **Update Frequency**: Updates every 5 seconds or 10 meters
4. **Offline**: Requires active WebSocket connection for real-time updates
5. **Service Area**: Route endpoint only works for valid road network coordinates

## Future Enhancements

- [ ] Multiple rescuer tracking on same map
- [ ] Route history/breadcrumb trail
- [ ] Traffic layer integration
- [ ] Offline route caching
- [ ] Custom map styling
- [ ] Route waypoint customization
- [ ] ETA accuracy based on traffic patterns
- [ ] Rescue team status overlay

## Files Modified

- `frontend/src/components/AdminDashboard.js` - Added RescueMap import and integration
- `frontend/src/components/RescueMap.js` - New component for real-time map

## Configuration

### Backend URL
Located in `RescueMap.js` line ~135:
```javascript
const SOCKET_URL = "http://localhost:5000";
```

Change this if your backend runs on a different port or server.

### API Route Endpoint
Located in `RescueMap.js` line ~75:
```javascript
`http://localhost:5000/api/route?start=...`
```

Change this if your route endpoint is at a different location.

## Support

For issues or feature requests, check:
1. Browser console (F12) for JavaScript errors
2. Network tab for failed requests
3. Backend logs for server-side errors
4. Backend WebSocket connections in server logs
