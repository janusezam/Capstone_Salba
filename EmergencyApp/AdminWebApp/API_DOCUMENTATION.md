# SALBA Emergency Response System - API Documentation

## System Overview
**SALBA** (Smart Alert Leveraging Barangay Assessment) is a comprehensive emergency response system for Malaybalay City with 3 integrated applications.

### Base URLs
- **Admin & Development**: `http://localhost:5000/api`
- **Mobile Apps (Network)**: `http://192.168.1.56:5000/api`

---

## Authentication Endpoints

### 1. User Registration
**POST** `/auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "securePassword123",
  "phone": "+63912345678"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "userId": "user_123",
  "token": "jwt_token_here"
}
```

---

### 2. User Login
**POST** `/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "civilian"
  }
}
```

---

## Locations Endpoints

### 3. Get All Barangays
**GET** `/alerts/locations/barangays`

**Response:** `200 OK`
```json
[
  {
    "barangay": "Barangay 1",
    "purok": "Purok 1",
    "label": "Brgy 1 - Purok 1",
    "value": "Brgy1-Purok1",
    "latitude": 8.156766,
    "longitude": 125.126543,
    "district": "Poblacion",
    "classification": "Urban"
  },
  ...354 total locations
]
```

**Notes:**
- Returns all 354 barangay/purok locations in Malaybalay City
- Each location has GPS coordinates for mapping
- Includes Barangay 1-11 (Poblacion area) + 35 named barangays
- Supports search by label

---

## Alerts & Reports Endpoints

### 4. Create Emergency Alert
**POST** `/alerts`

**Request:**
```json
{
  "type": "Flood",
  "latitude": 8.1565,
  "longitude": 125.1237,
  "locationName": "Brgy 1 - Purok 1",
  "userId": "user_123",
  "userName": "John Doe"
}
```

**Disaster Types:** `Flood`, `Fire`, `Earthquake`, `Landslide`, `Typhoon`

**Response:** `201 Created`
```json
{
  "message": "Alert created successfully",
  "reportId": "report_123",
  "timestamp": "2026-03-16T10:30:00Z"
}
```

---

### 5. Get All Reports
**GET** `/alerts`

**Query Parameters:**
- `disasterType` (optional): Filter by type
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `limit` (optional): Number of results (default: 50)

**Response:** `200 OK`
```json
[
  {
    "id": "report_123",
    "type": "Flood",
    "locationName": "Brgy 1 - Purok 1",
    "latitude": 8.1565,
    "longitude": 125.1237,
    "userId": "user_123",
    "userName": "John Doe",
    "createdAt": "2026-03-16T10:30:00Z",
    "status": "pending"
  }
]
```

---

### 6. Get Single Report
**GET** `/alerts/:reportId`

**Response:** `200 OK`
```json
{
  "id": "report_123",
  "type": "Flood",
  "locationName": "Brgy 1 - Purok 1",
  "latitude": 8.1565,
  "longitude": 125.1237,
  "userId": "user_123",
  "createdAt": "2026-03-16T10:30:00Z",
  "details": "Heavy flooding in purok area"
}
```

---

## AI & ML Endpoints

### 7. Get AI Predictions
**POST** `/ai/predict`

**Request:**
```json
{
  "reportId": "report_123",
  "features": {
    "weather": "rainy",
    "rainfall": 50,
    "terrain": "lowland"
  }
}
```

**Response:** `200 OK`
```json
{
  "disasterType": "Flood",
  "confidence": 0.93,
  "alternative": {
    "disasterType": "Landslide",
    "confidence": 0.05
  }
}
```

---

### 8. Submit Feedback (Improve AI)
**POST** `/feedback/submit-feedback`

**Request:**
```json
{
  "reportId": "report_123",
  "actualType": "Flood",
  "predictedType": "Fire",
  "correct": false,
  "feedback": "This was definitely a flood"
}
```

**Response:** `201 Created`
```json
{
  "message": "Feedback recorded",
  "feedbackId": "feedback_123"
}
```

---

### 9. Get AI Metrics
**GET** `/feedback/accuracy-metrics`

**Response:** `200 OK`
```json
{
  "currentAccuracy": 0.93,
  "targetAccuracy": 0.95,
  "improvedAccuracy": 0.95,
  "feedbackCount": 45,
  "trainingDataPoints": 2000,
  "lastUpdated": "2026-03-16T10:30:00Z"
}
```

---

## Rescuer Endpoints

### 10. Get Pending Dispatch Alerts
**GET** `/rescues/dispatch-alerts`

**Response:** `200 OK`
```json
[
  {
    "alertId": "alert_123",
    "disasterType": "Flood",
    "location": "Brgy 1 - Purok 1",
    "latitude": 8.1565,
    "longitude": 125.1237,
    "reportedBy": "John Doe",
    "timestamp": "2026-03-16T10:30:00Z",
    "status": "pending_dispatch"
  }
]
```

---

### 11. Assign Rescuers to Incident (Team Leader)
**POST** `/rescues/assign-team`

**Request:**
```json
{
  "incidentId": "inc_123",
  "teamLeaderId": "rescuer_1",
  "teamMembers": ["rescuer_2", "rescuer_3", "rescuer_4"]
}
```

**Response:** `201 Created`
```json
{
  "message": "Team assigned successfully",
  "assignmentId": "assign_123"
}
```

---

### 12. Update Mission Status
**PATCH** `/rescues/mission/:missionId`

**Request:**
```json
{
  "status": "in_progress",
  "progress": 50,
  "notes": "First responders on scene"
}
```

**Response:** `200 OK`
```json
{
  "message": "Mission updated",
  "missionId": "mission_123"
}
```

---

## Real-time Updates (WebSocket/Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:5000');

// Connect
socket.on('connect', () => {
  console.log('Connected');
});

// Listen for new alerts
socket.on('new_alert', (data) => {
  console.log('Alert:', data);
});

// Listen for mission updates
socket.on('mission_update', (data) => {
  console.log('Mission:', data);
});
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid request data",
  "errors": ["Email is required", "Password too short"]
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error occurred"
}
```

---

## Rate Limiting
- **Requests per minute**: 60 (public), 100 (authenticated)
- **Burst limit**: 10 requests within 5 seconds

---

## Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Data Validation

### Coordinates
- Latitude: -90 to 90
- Longitude: -180 to 180
- Malaybalay City bounds: 8.0-8.4°N, 125.0-125.3°E

### Disaster Types
- `Flood`
- `Fire`
- `Earthquake`
- `Landslide`
- `Typhoon`

---

## Example: Complete Alert Flow

1. **User opens DisasterSOS app**
2. **User taps "Report Incident"**
3. **GET** `/alerts/locations/barangays` - Get location options
4. **User selects** "Brgy 1 - Purok 1"
5. **User selects** "Flood" as disaster type
6. **POST** `/alerts` - Submit report
7. **WebSocket** `new_alert` - Admin & rescuers notified
8. **Admin reviews** on dashboard
9. **Rescuer team leader assigns team** with **POST** `/rescues/assign-team`
10. **Team responds** with **PATCH** `/rescues/mission/:missionId`

---

## Support
For API issues or questions, contact: admin@emergencycity.gov.ph
