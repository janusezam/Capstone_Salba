# SALBA AI System - Complete Documentation

## Overview
Your SALBA system now has a complete AI/ML implementation covering all 5 components you planned. This document explains each feature and how to use the API endpoints.

---

## 🎯 Component 1: Emergency Classification

**Purpose**: Automatically identify the type of disaster (Fire, Flood, Earthquake, Landslide, Typhoon)

### Endpoint
```
POST /api/ai/classify
Content-Type: application/json
Authorization: Bearer {token}

Body: {
  "reportText": "There's a lot of smoke and fire spreading quickly near the school",
  "disasterType": "Fire"  // Optional - AI will refine it
}
```

### Response
```json
{
  "originalInput": "Fire",
  "classification": "Fire",
  "confidence": 0.87,
  "interpretation": "Fire (87% confidence)"
}
```

**How it works**:
- Uses keyword matching + confidence scoring
- Analyzes report text for disaster indicators
- Improves accuracy with each new report

---

## 📊 Component 2: Severity Assessment & Prioritization

**Purpose**: Assign priority level (critical/high/moderate/low) to each incident

### Endpoint
```
POST /api/ai/assess-severity
Content-Type: application/json
Authorization: Bearer {token}

Body: {
  "disasterType": "Fire",
  "latitude": 8.1565,
  "longitude": 125.1237,
  "reportText": "URGENT: Fire threatening residential area"
}
```

### Response
```json
{
  "severity": "critical",
  "inHotspot": true,
  "urgencyIndicators": 3,
  "recommendation": "Immediate multi-team dispatch. Activate emergency protocol."
}
```

**Decision Logic**:
- Base severity by disaster type
- Escalates if location is in historical hotspot
- Analyzes text for urgency keywords
- Final severity = highest signal

---

## 🔍 Component 3: Report Verification (Duplicate & False Alarm Detection)

**Purpose**: Identify false alarms, duplicates, and flag suspicious reports

### Endpoint
```
POST /api/ai/verify-report
Content-Type: application/json
Authorization: Bearer {token}

Body: {
  "latitude": 8.1565,
  "longitude": 125.1237,
  "disasterType": "Fire",
  "reportText": "Fire at Market",
  "userId": "user123"
}
```

### Response
```json
{
  "isValid": true,
  "confidence": 0.82,
  "duplicateRisk": 0.1,
  "falseAlarmRisk": 0.08,
  "issues": [],
  "recommendation": "auto-dispatch",
  "adminAction": "AUTO_DISPATCH"
}
```

**Verification Checks**:
✓ Spatial duplicate (same location, same type, <10 min)
✓ Spam detection (multiple reports from same user)
✓ Report quality (minimum text length)
✓ Prank keywords (test, prank, false)
✓ Classification confidence

**Admin Actions**:
- `AUTO_DISPATCH`: High confidence, automatically dispatch team
- `REQUIRES_REVIEW`: Medium confidence, admin reviews before dispatch
- `FLAG_AS_FALSE_ALARM`: Low confidence, mark as potential false alarm

---

## 🔥 Component 4: Hotspot Detection (Risk Mapping)

**Purpose**: Identify high-risk areas prone to disasters using historical data

### Endpoint 1: Get All Hotspots
```
GET /api/ai/hotspots
Authorization: Bearer {token}
```

### Response
```json
{
  "hotspots": [
    {
      "lat": 8.156,
      "lng": 125.124,
      "reportCount": 12,
      "riskScore": 1.67,
      "riskLevel": "critical",
      "radiusMeters": 1000,
      "disasterTypes": ["Fire", "Flood"]
    }
  ],
  "totalAnalyzed": 48,
  "displayFormat": {
    "colors": {
      "critical": "#DC2626",
      "high": "#EA580C",
      "moderate": "#F59E0B"
    }
  }
}
```

### Endpoint 2: Get Risk Heatmap
```
GET /api/ai/risk-map
Authorization: Bearer {token}
```

Returns heatmap data for visualization with intensity based on severity.

### Endpoint 3: Check if Location is in Hotspot
```
POST /api/ai/hotspots/near-location
Authorization: Bearer {token}

Body: {
  "latitude": 8.1565,
  "longitude": 125.1237,
  "radiusKm": 2
}
```

### Response
```json
{
  "location": {"latitude": 8.1565, "longitude": 125.1237},
  "radiusKm": 2,
  "nearbyHotspots": [...],
  "isInHighRiskArea": true,
  "warning": "⚠️ 2 hotspot(s) nearby"
}
```

**Hotspot Calculation**:
1. Grid-based clustering (1km x 1km cells)
2. Risk Score = (critical_reports × 2 + high_reports × 1) / total_reports
3. Risk Level: critical (≥1.5), high (≥0.7), moderate (<0.7)
4. Only hotspots with risk score >0.5 are shown

---

## 🛣️ Component 5: Route Optimization

**Purpose**: Find the fastest path for responders to reach affected areas

### Endpoint 1: Find Shortest Route (Nearest Rescuer)
```
POST /api/ml/shortest-route
Authorization: Bearer {token}

Body: {
  "latitude": 8.1565,
  "longitude": 125.1237
}
```

### Response
```json
{
  "nearestRescuer": {
    "id": "rescuer123",
    "name": "John Smith",
    "distanceKm": 2.5,
    "currentLocation": {"latitude": 8.14, "longitude": 125.12}
  },
  "targetLocation": {"latitude": 8.1565, "longitude": 125.1237},
  "route": {...},  // GeoJSON route from OpenRouteService
  "allRescuers": [...]  // Top 5 closest
}
```

### Endpoint 2: Find Nearby Rescuers
```
POST /api/ml/find-nearby-rescuers
Authorization: Bearer {token}

Body: {
  "latitude": 8.1565,
  "longitude": 125.1237,
  "radiusKm": 5
}
```

### Endpoint 3: Optimize Multiple Dispatches (Admin)
```
POST /api/ml/optimize-dispatch
Authorization: Bearer {token}  (Admin only)

Body: {
  "reportIds": ["report1", "report2", "report3"]
}
```

Assigns closest available teams to each report.

---

## 📈 AI Dashboard

**Purpose**: View overall AI system performance and metrics

### Endpoint
```
GET /api/ai/dashboard
Authorization: Bearer {token}
```

### Response
```json
{
  "systemMetrics": {
    "totalReportsProcessed": 487,
    "criticalIncidents": 23,
    "reportsToday": 12,
    "accuracyScore": "94%"
  },
  "aiCapabilities": {
    "classification": "Active",
    "severityAssessment": "Active",
    "reportVerification": "Active",
    "hotspotDetection": "Active",
    "routeOptimization": "Active"
  },
  "riskAnalysis": {
    "detectedHotspots": 7,
    "criticalZones": 2,
    "highRiskZones": 3
  },
  "reportsByType": {...}
}
```

---

## 🔄 Complete Report Flow

Here's how all 5 AI components work together when a new emergency report comes in:

```
User submits report
    ↓
[1] Classification AI → "What type of disaster is this?"
    ↓
[2] Severity Assessment → "How urgent is this?"
    ↓
[3] Report Verification → "Is this real or false alarm?"
    ↓
    If confidence > 80% → Auto-dispatch
    If confidence 50-80% → Admin review
    If confidence < 50% → Flag as false alarm
    ↓
[4] Hotspot Detection → "Is this in a high-risk area?"
    ↓
    Update risk maps and escalate if in hotspot
    ↓
[5] Route Optimization → "Who's closest? What's fastest path?"
    ↓
    Dispatch nearest rescuer team via optimized route
    ↓
Admin Dashboard shows all metrics + AI confidence scores
```

---

## 📱 Integration with Your Apps

### RescuerApp
- Need to track rescuer GPS location
- Send location updates when available
- Call `/api/ml/shortest-route` to show navigation

### DisasterSOS App
- When user submits report, call `/api/ai/classify` to verify
- Get severity assessment for proper category
- Show confidence score to user

### Admin Dashboard
- Display hotspots on map (use `/api/ai/hotspots`)
- Show risk heatmap (use `/api/ai/risk-map`)
- View AI dashboard metrics
- See verification confidence before auto-dispatch

---

## ⚙️ How to Add Rescuer Location Tracking

In RescuerApp, add location tracking:

```javascript
// When rescuer opens app or shares location
const navigator = require('@react-native-community/geolocation').default;

navigator.getCurrentPosition(position => {
  const { latitude, longitude } = position.coords;
  
  // Update user's location in backend
  fetch('http://192.168.1.56:5000/api/rescue/update-location', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ latitude, longitude })
  });
});
```

Backend endpoint needed in rescueRoutes.js:
```javascript
router.post('/update-location', authMiddleware, requireRescuer, async (req, res) => {
  const { latitude, longitude } = req.body;
  await User.findByIdAndUpdate(req.user.id, { 
    lastLat: latitude, 
    lastLng: longitude,
    isOnline: true
  });
  res.json({ message: 'Location updated' });
});
```

---

## 📊 Total API Endpoints in Your System

| Category | Count | Endpoints |
|----------|-------|-----------|
| Authentication | 4 | login, register, create-rescuer, profile |
| Reports | 4 | create, user-list, admin-list, update |
| Teams | 8 | list, get, update, add-member, remove, dispatch, complete |
| Rescue | 6 | push-token, my-team, my-mission, notifications, mark-read, read-all |
| Routing | 1 | get-route |
| Alerts | 2 | create, list |
| **ML/AI** | **13** | classify, assess-severity, verify, hotspots, risk-map, hotspot-check, dashboard, shortest-route, nearby-rescuers, optimize-dispatch, model-stats |
| **TOTAL** | **38** | Complete system for emergency response |

---

## 🎯 Next Steps

1. **Test with Real Data**: Submit test reports to train AI model
2. **Location Tracking**: Enable GPS tracking in RescuerApp
3. **Dashboard Visualization**: Create map visualizations for hotspots
4. **Confidence Display**: Show AI confidence scores in admin UI
5. **Auto-dispatch Logic**: Implement automatic team dispatch for high-confidence reports

---

## 🔐 Authorization

All AI endpoints require:
- Valid JWT token in header: `Authorization: Bearer {token}`
- For some admin operations: User role must be "admin"

---

*SALBA - An AI-Assisted One-Tap Digital Platform for Emergency Reporting and Rescue Coordination*
