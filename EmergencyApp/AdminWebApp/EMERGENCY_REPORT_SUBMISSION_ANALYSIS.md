# Emergency Report & Alert Submission - Frontend Analysis

## Overview
The emergency reporting system has **two main submission flows**: one for authenticated web users and one for mobile app alerts. Reports are submitted to two endpoints with different data structures.

---

## 1. PRIMARY USER REPORT SUBMISSION

### Component: [UserDashboard.js](frontend/src/components/UserDashboard.js)

**File Path:** `frontend/src/components/UserDashboard.js`

**Purpose:** Allows authenticated users to submit basic emergency reports via web interface

**Report Submission Method:**
```javascript
const handleReport = async () => {
  setLoading(true);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          severity: "moderate",
        };
        await API.post("/reports", data);
        alert("Report sent successfully!");
      } catch (error) {
        alert("Failed to send report.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    });
  }
};
```

**API Endpoint:** `POST /api/reports` (authenticated)

**Fields Submitted:**
- `lat` (latitude) - from navigator.geolocation
- `lng` (longitude) - from navigator.geolocation  
- `severity` - hardcoded as **"moderate"** (not collected from user)

**UI:** Single button "Send Relief Report" - no form for disaster type or additional details

---

## 2. MOBILE/EXTERNAL ALERT SUBMISSION

### Endpoint: [backend/routes/alertRoutes.js](backend/routes/alertRoutes.js) - POST `/api/alerts`

**File Path:** `backend/routes/alertRoutes.js` (lines 62-150)

**Purpose:** Create emergency alerts from mobile apps or external systems (NO authentication required)

**Expected Request Data:**
```javascript
{
  type,              // Disaster type (Fire, Flood, Earthquake, Landslide, Typhoon)
  latitude,          // Required
  longitude,         // Required
  locationName,      // Optional
  userId,            // Optional (null for anonymous reports)
  userName           // Optional (defaults to "Anonymous Reporter")
}
```

**Code Snippet:**
```javascript
router.post('/', async (req, res) => {
  const { type, latitude, longitude, locationName, userId, userName } = req.body;
  
  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: 'latitude & longitude required' });
  }

  // Map disaster type to severity (case-insensitive)
  const severityMap = {
    'fire': 'critical',
    'earthquake': 'high',
    'flood': 'high',
    'landslide': 'high',
    'typhoon': 'high',
  };

  const report = await Report.create({
    userId: userId || null,
    lat: latitude,
    lng: longitude,
    accuracy: 10,
    severity: severityMap[type?.toLowerCase()] || 'medium',
    note: `${type} - ${resolvedLocationName || 'Location not specified'}`,
    geofenceRadiusMeters: 100,
    disasterType: type,                    // ← Disaster type stored here
    locationName: resolvedLocationName,
    senderName: userName || 'Anonymous Reporter',
  });
```

**Supported Disaster Types:** Fire, Flood, Earthquake, Landslide, Typhoon
- These map to severity levels (Fire → critical, Flood → high, etc.)

---

## 3. AUTHENTICATED USER REPORT SUBMISSION

### Endpoint: [backend/routes/reportRoutes.js](backend/routes/reportRoutes.js) - POST `/api/reports`

**File Path:** `backend/routes/reportRoutes.js` (lines 62-163)

**Purpose:** Create reports from authenticated web users

**Expected Request Data:**
```javascript
{
  lat,                        // Required - latitude
  lng,                        // Required - longitude
  accuracy,                   // Optional
  severity,                   // Optional (defaults to 'low')
  note,                       // Optional
  geofenceRadiusMeters,       // Optional
  locationName,               // Optional
  disasterType                // Optional
}
```

**Code Snippet:**
```javascript
router.post('/', authMiddleware, async (req, res) => {
  const { lat, lng, accuracy, severity, note, geofenceRadiusMeters, locationName, disasterType } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ message: 'lat & lng required' });

  // Map disaster type to severity if provided
  const severityMap = {
    'fire': 'critical',
    'earthquake': 'high',
    'flood': 'high',
    'landslide': 'high',
    'typhoon': 'high',
  };
  
  const resolvedSeverity = disasterType 
    ? severityMap[String(disasterType).toLowerCase()] || severity || 'medium'
    : severity || 'low';

  let r = await Report.create({
    userId: req.user.id,
    lat,
    lng,
    accuracy,
    severity: resolvedSeverity,
    note: note || '',
    geofenceRadiusMeters: geofenceRadiusMeters || Math.max(accuracy || 0, 20),
    locationName: resolvedLocationName,
    disasterType: disasterType || ''
  });
```

**Key Differences from UserDashboard:**
- User can pass `disasterType` explicitly
- User can pass custom `severity` and `note`
- If `disasterType` provided, severity is auto-mapped
- Report associated with authenticated user's ID

---

## 4. ADMIN DASHBOARD - REPORT VISUALIZATION

### Component: [AdminDashboard.js](frontend/src/components/AdminDashboard.js)

**File Path:** `frontend/src/components/AdminDashboard.js`

**Where Disaster Type is Used:**
- Line 91-92: Extracts disasterType from ML predictions or alert data
- Line 101-112: Generates AI summary using disasterType
- Line 1668: Displays disasterType in reports table
- Line 1787: Shows disasterType in active alerts panel
- Line 1865: Filters fire incidents using `isFireIncident(alert?.disasterType)`
- Line 2019-2083: Maps fire hydrants for fire incidents

**Helper Function - Check if Fire Incident:**
```javascript
const isFireIncident = (disasterType) => {
  const text = String(disasterType || '').toLowerCase();
  return text.includes('fire') || text.includes('sunog');
};
```

**AI Summary Generation:**
```javascript
const generateAISummary = (alert) => {
  if (!alert || !alert.mlPredictions) return '';
  
  const ml = alert.mlPredictions;
  const disasterType = ml.disasterType || alert.disasterType || "Unknown";
  const severity = ml.severity || alert.severity || "Unknown";
  const typeConfidence = ml.disasterTypeConfidence ? Math.round(ml.disasterTypeConfidence * 100) : 0;
  const severityConfidence = ml.severityConfidence ? Math.round(ml.severityConfidence * 100) : 0;
  
  // Build AI summary showing disaster type, severity, and confidence levels
  let summary = `• Disaster Type: ${toTitleCase(disasterType)} (${typeConfidence}% confidence)\n`;
  summary += `• Predicted Severity: ${toTitleCase(severity)} (${severityConfidence}% confidence)\n`;
  
  return summary;
};
```

---

## 5. SITREP SUBMISSION (Post-Rescue Documentation)

### Component: [SitrepForm.js](frontend/src/components/SitrepForm.js)

**File Path:** `frontend/src/components/SitrepForm.js`

**Purpose:** Submit structured situation reports (SKU format) for ongoing rescue operations

**API Calls:**
- `POST /api/sitrep` - Save SITREP as draft
- `POST /api/sitrep/{reportId}/submit` - Submit SITREP for approval
- `POST /api/sitrep/{reportId}/export-word` - Export as Word document

**Submit Function (Line 159):**
```javascript
const handleSubmit = async () => {
  if (!window.confirm('Submit SITREP for approval? This cannot be undone.')) return;

  try {
    setSaving(true);
    
    // First, save the SITREP data
    const payload = { ...sitrep, status: 'Draft', templateType: 'SITREP2' };
    const saveResponse = await fetch(`${API_BASE}/api/sitrep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });

    // Then submit
    const response = await fetch(`${API_BASE}/api/sitrep/${rescue._id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });

    if (response.ok) {
      setStatus('Submitted');
      showToast('SITREP submitted for approval', 'success');
    }
  } catch (error) {
    showToast('Error submitting SITREP: ' + error.message, 'error');
  } finally {
    setSaving(false);
  }
};
```

---

## 6. Report Data Structure in Database

**Fields with Disaster/Severity Info:**
- `disasterType` - Type of emergency (Fire, Flood, Earthquake, etc.)
- `severity` - Level of incident (critical, high, medium, low)
- `mlPredictions.disasterType` - AI-predicted disaster type
- `mlPredictions.disasterTypeConfidence` - Confidence percentage
- `mlPredictions.severity` - AI-predicted severity
- `mlPredictions.severityConfidence` - Confidence percentage
- `locationName` - Named location (barangay, purok)
- `lat/lng` - Geographic coordinates

---

## 7. API Client Configuration

### File: [frontend/src/api.js](frontend/src/api.js)

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
```

**Base URL:** `http://localhost:5000/api`
**Authentication:** Bearer token from localStorage
**Used in:** All components making API calls

---

## 8. Report Fetching & Filtering

### Admin Dashboard Report Fetching

**Main Query (AdminDashboard.js ~ line 800+):**
```javascript
const fetchReports = async (pageNum = 1) => {
  const params = new URLSearchParams({
    severity: filterSeverity,
    status: filterStatus,
    search: searchQuery,
    page: pageNum,
    limit: pagination.limit,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const res = await API.get(`/reports?${params}`);
  // Returns paginated reports with filtering
};
```

**Filters Applied:**
- By `severity` (critical, high, medium, low)
- By `status` (new, acknowledged, pending, resolved, etc.)
- By `search` (searches location name, disaster type)

---

## 9. Real-Time Updates via Socket.IO

### Admin Dashboard Socket Events (AdminDashboard.js ~ line 1160+)

**Events Received:**
- `new_report` - Triggers AI summary generation and notification
- `new_alert` - New alert from mobile app
- `team_dispatched` - Team assigned to report
- `report_resolved` - Report marked as resolved
- `rescuer_location_update` - Real-time rescuer GPS tracking

**Real-Time Event Handler:**
```javascript
socket.on("new_report", (data) => {
  const type = data?.disasterType || 'Report';
  const severity = data?.severity || 'Unknown';
  
  showNotification(`New ${type} Report - ${severity.toUpperCase()}`, {
    body: `Report at ${data?.locationName || 'Unknown location'}`,
    requireInteraction: true
  });
  
  refreshDashboardData();
});
```

---

## 10. Export & Data Analysis

### CSV Export (AdminDashboard.js ~ line 1115+)

```javascript
const handleExport = async () => {
  const params = new URLSearchParams({
    severity: filterSeverity,
    status: filterStatus,
    search: searchQuery,
    format: 'csv'
  });

  const response = await API.get(`/reports/export/csv?${params}`, {
    responseType: 'blob'
  });

  // Download as CSV
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `disaster_reports_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};
```

---

## Summary: Where Disaster Type, Severity, and Location Are Set

| Component | Where Set | How Set | Flow |
|-----------|-----------|---------|------|
| **UserDashboard** | Client-side | Button click + geolocation | User clicks "Send Relief Report" → POST /api/reports with lat/lng/severity |
| **Mobile Alerts** | Request body | Mobile app/external API | POST /api/alerts with `type`, `latitude`, `longitude` |
| **Admin Dashboard** | Visualization | Fetched from DB | Displays reports with disasterType, severity, locationName |
| **AI System** | Background processing | ML model | Predicts disasterType/severity after report creation |
| **SITREP Form** | Structured fields | Admin input | Documents situation for ongoing rescue |

---

## Key Findings

✅ **Severity is AUTO-MAPPED from disasterType:**
- Fire → critical
- Flood/Earthquake/Landslide/Typhoon → high
- Others → medium/low

✅ **LocationName is AUTO-RESOLVED:**
- By GeoJSON boundaries if not provided
- Falls back to nearest location if boundaries don't match
- Can be manually overridden by user

✅ **DisasterType can come from:**
1. Mobile alert request body (`type` field)
2. Authenticated user payload (`disasterType` field)
3. AI ML predictions (background processing)

✅ **Current UserDashboard limitation:**
- Only collects lat/lng/severity
- Does NOT collect disasterType from user
- Could be enhanced with dropdown for disaster types

---

## Recommendations for Enhancement

1. **Add Disaster Type Dropdown to UserDashboard:**
   ```javascript
   const [disasterType, setDisasterType] = useState('Other');
   
   const disasterOptions = ['Fire', 'Flood', 'Earthquake', 'Landslide', 'Typhoon', 'Other'];
   
   // Include in POST request:
   const data = {
     lat: pos.coords.latitude,
     lng: pos.coords.longitude,
     severity: "moderate",
     disasterType: disasterType,  // Add this
     note: "User-submitted emergency report"
   };
   ```

2. **Add Location Name Input:**
   ```javascript
   // Allow users to specify location/landmark
   const data = {
     lat: pos.coords.latitude,
     lng: pos.coords.longitude,
     severity: "moderate",
     disasterType: disasterType,
     locationName: userProvidedLocation
   };
   ```

3. **Add Description/Note Field:**
   ```javascript
   const data = {
     lat: pos.coords.latitude,
     lng: pos.coords.longitude,
     severity: "moderate",
     disasterType: disasterType,
     note: userDescription  // What's happening?
   };
   ```
