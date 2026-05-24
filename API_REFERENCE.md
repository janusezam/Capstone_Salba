# API Reference Guide - Reports Endpoint

## Quick Reference

### Get Filtered Reports
```bash
GET /api/reports?severity=critical&status=Active&search=fire&page=1&limit=50
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/reports?severity=critical&status=Active&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript/Fetch:**
```javascript
const params = new URLSearchParams({
  severity: 'critical',
  status: 'Active',
  search: 'fire',
  page: 1,
  limit: 50
});

fetch(`/api/reports?${params}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

### Export Filtered Reports
```bash
GET /api/reports/export/csv?severity=critical&status=Active
```

**JavaScript Example:**
```javascript
const response = await fetch(`/api/reports/export/csv?severity=${severity}&status=${status}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
link.click();
URL.revokeObjectURL(url);
```

---

## Filter Parameters

### Severity Filter
- **Values:** `All`, `Critical`, `High`, `Medium`, `Low`
- **Case-Insensitive:** Yes
- **Example:** `?severity=critical`

### Status Filter  
- **Values:** `All`, `Active`, `Responded`, `Pending`, `Resolved`
- **Case-Insensitive:** Yes
- **Example:** `?status=Active`

### Search Filter
- **Searches In:** Report notes, disaster type
- **Case-Insensitive:** Yes
- **Example:** `?search=fire`

### Sorting
- **Valid Fields:** `createdAt`, `severity`, `status`, `userId`
- **Default:** `createdAt:desc`
- **Example:** `?sortBy=severity&sortOrder=asc`

### Pagination
- **Default Page:** 1
- **Default Limit:** 50 (max 100)
- **Example:** `?page=2&limit=25`

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "severity": "critical",
      "status": "Active",
      "note": "Building collapse at downtown district",
      "lat": 8.4467,
      "lng": 124.6428,
      "mlPredictions": {
        "disasterType": "Building Collapse",
        "disasterTypeConfidence": 0.95
      },
      "userId": {
        "_id": "507f1f77bcf86cd799439001",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "resolvedBy": null,
      "createdAt": "2024-03-23T14:32:00Z",
      "updatedAt": "2024-03-23T14:32:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 50,
    "pages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid filter value",
  "error": "Severity must be: critical, high, medium, low, or All"
}
```

---

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Reports retrieved |
| 400 | Bad Request | Invalid filter value |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Non-admin user |
| 500 | Server Error | Database error |

---

## Common Use Cases

### Get All Critical Active Reports
```
GET /api/reports?severity=critical&status=Active
```

### Get High Priority Reports from Last 7 Days
```
GET /api/reports?severity=high&startDate=2024-03-17&endDate=2024-03-24
```

### Search for Flood Reports
```
GET /api/reports?search=flood
```

### Get Latest Resolved Reports (Page 2)
```
GET /api/reports?status=Resolved&page=2&limit=25&sortBy=createdAt&sortOrder=desc
```

### Export All Critical Reports
```
GET /api/reports/export/csv?severity=critical
```

---

## Frontend Integration

### Using with React Component

```javascript
const [reports, setReports] = useState([]);
const [loading, setLoading] = useState(false);

const fetchReports = async (filters) => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      severity: filters.severity || 'All',
      status: filters.status || 'All',
      search: filters.search || '',
      page: filters.page || 1,
      limit: 50
    });

    const res = await fetch(`/api/reports?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const { data, pagination } = await res.json();
    setReports(data);
    console.log(`✓ Fetched ${data.length} reports`);
  } catch (err) {
    console.error('✗ Failed to fetch reports:', err);
  } finally {
    setLoading(false);
  }
};

// Usage
fetchReports({
  severity: 'critical',
  status: 'Active',
  search: 'fire'
});
```

---

## Database Schema Reference

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  lat: Number,
  lng: Number,
  accuracy: Number,
  severity: String, // 'critical', 'high', 'medium', 'low'
  status: String, // 'Active', 'Responded', 'Pending', 'Resolved'
  note: String,
  mlPredictions: {
    disasterType: String,
    disasterTypeConfidence: Number,
    severity: String,
    severityConfidence: Number,
    isLegitimate: Boolean,
    legitimacyConfidence: Number
  },
  assignedTeam: ObjectId, // Reference to Team
  resolvedBy: ObjectId, // Reference to User
  resolvedAt: Date,
  declinedBy: ObjectId, // Reference to User
  declinedAt: Date,
  geofenceRadiusMeters: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Troubleshooting

### No Data Returned
- Check: Database has reports
- Check: Admin user is authenticated
- Check: No filters are too restrictive

### Invalid Filter Error
- Check: Filter value spelling
- Check: Allowed values list above
- Remember: All/All for no filter

### Export File Won't Download
- Check: Browser allows downloads from localhost
- Check: Correct responseType: 'blob'
- Check: Filename has proper extension (.csv)

### Performance Issues
- Limit limit parameter to <100
- Add date range filters to reduce results
- Paginate large result sets

---

**Last Updated:** March 24, 2026  
**API Version:** 1.0
