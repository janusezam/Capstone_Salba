# ML Service Integration Guide

## Overview

This guide explains how to integrate the Python ML service with your Node.js backend.

---

## Architecture

```
┌─────────────────────┐
│   RescuerApp        │
│  (React Native)     │
└──────────┬──────────┘
           │ POST /api/reports
           ▼
┌─────────────────────┐
│  Node.js Backend    │ (Port 5000)
│  - Express.js       │
│  - MongoDB          │
│  - Socket.IO        │
└──────────┬──────────┘
           │ POST /api/ml/evaluate-report
           ▼
┌─────────────────────┐
│   Flask ML API      │ (Port 5001)
│  - Random Forest    │
│  - XGBoost          │
│  - Logistic Reg     │
└─────────────────────┘
```

---

## Step 1: Update Database Schema

Add these fields to your `Alert` model in MongoDB:

```javascript
// models/Report.js or similar
const reportSchema = new Schema({
  // ... existing fields ...
  description: String,
  disaster_type: String,
  severity: String,
  latitude: Number,
  longitude: Number,
  
  // NEW ML FIELDS
  ml_predictions: {
    disaster_type: String,      // Fire, Flood, Earthquake, Landslide, Typhoon
    disaster_confidence: Number,  // 0-1
    severity: String,            // low, moderate, high, critical
    severity_confidence: Number,  // 0-1
    is_false_alarm: Boolean,      // true/false
    alarm_confidence: Number,     // 0-1
    timestamp: Date,              // When prediction was made
    model_version: String         // v1.0, etc
  }
});
```

---

## Step 2: Create ML Route in Node.js Backend

Create `/api/ML/predictReport.js`:

```javascript
const axios = require('axios');
const Report = require('../models/Report');

const ML_API_URL = 'http://localhost:5001/api/ml';

const predictReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Get report from database
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Call ML API
    const mlResponse = await axios.post(
      `${ML_API_URL}/evaluate-report`,
      {
        description: report.description,
        latitude: report.latitude,
        longitude: report.longitude
      },
      { timeout: 5000 }
    );
    
    // Extract predictions
    const predictions = mlResponse.data.predictions;
    
    // Update report with ML predictions
    report.ml_predictions = {
      disaster_type: predictions.disaster_type,
      disaster_confidence: predictions.disaster_confidence,
      severity: predictions.severity,
      severity_confidence: predictions.severity_confidence,
      is_false_alarm: predictions.is_false_alarm,
      alarm_confidence: predictions.alarm_confidence,
      timestamp: new Date(),
      model_version: 'v1.0'
    };
    
    await report.save();
    
    // Return results
    res.json({
      success: true,
      predictions: report.ml_predictions,
      message: 'ML prediction completed'
    });
    
  } catch (error) {
    console.error('ML prediction error:', error.message);
    
    // If ML fails, don't block the request
    res.json({
      success: false,
      error: error.message,
      message: 'ML prediction failed, using rule-based AI'
    });
  }
};

module.exports = { predictReport };
```

---

## Step 3: Connect ML Route to Express

Update your `server.js`:

```javascript
const mlRoutes = require('./api/ML/predictReport');

// Add this after other route mounts
app.post('/api/reports/:reportId/predict-ml', mlRoutes.predictReport);
```

---

## Step 4: Call ML API When Submitting Report

Update your alert submission endpoint:

```javascript
// In your report submission route
app.post('/api/reports', async (req, res) => {
  try {
    // Save report to database
    const report = new Report(req.body);
    await report.save();
    
    // NEW: Call ML API asynchronously (don't wait)
    setTimeout(() => {
      axios.post(`http://localhost:5000/api/reports/${report._id}/predict-ml`)
        .catch(err => console.error('ML prediction failed:', err.message));
    }, 100);
    
    // Return immediately
    res.json({
      success: true,
      report: report,
      message: 'Report submitted. ML analysis in progress...'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 5: Update Admin Dashboard

Add ML predictions display in your admin dashboard:

```jsx
// Component to display ML results
const MLPredictionCard = ({ report }) => {
  if (!report.ml_predictions) {
    return <div>ML analysis pending...</div>;
  }
  
  const p = report.ml_predictions;
  
  return (
    <div className="ml-card">
      <h3>🤖 ML Predictions</h3>
      
      <div className="prediction-row">
        <strong>Disaster Type:</strong>
        <span>{p.disaster_type}</span>
        <span className="confidence">{(p.disaster_confidence * 100).toFixed(1)}%</span>
      </div>
      
      <div className="prediction-row">
        <strong>Severity:</strong>
        <span className={`severity-${p.severity}`}>{p.severity}</span>
        <span className="confidence">{(p.severity_confidence * 100).toFixed(1)}%</span>
      </div>
      
      <div className="prediction-row">
        <strong>Verification:</strong>
        <span className={p.is_false_alarm ? 'danger' : 'success'}>
          {p.is_false_alarm ? '⚠️ Flagged' : '✓ Legitimate'}
        </span>
        <span className="confidence">{(p.alarm_confidence * 100).toFixed(1)}%</span>
      </div>
      
      <div className="timestamp">
        Updated: {new Date(p.timestamp).toLocaleString()}
      </div>
    </div>
  );
};
```

---

## Step 6: Test Integration

### Test 1: Verify ML Service is Running

```bash
curl http://localhost:5001/api/ml/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Test 2: Submit Test Report

```bash
curl -X POST http://localhost:5000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Fire on hillside",
    "latitude": 8.156,
    "longitude": 125.128,
    "severity": "high"
  }'
```

### Test 3: Check ML Predictions

Wait ~1 second, then:

```bash
curl http://localhost:5000/api/reports/{reportId}
```

You should see `ml_predictions` field populated.

---

## Step 7: Handle Edge Cases

### Case 1: ML Service Unavailable

```javascript
// Add retry logic in the ML call
const callMLWithRetry = async (report, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        `${ML_API_URL}/evaluate-report`,
        report,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  return null;
};
```

### Case 2: Fallback to Rule-Based AI

```javascript
const getReportPredictions = async (report) => {
  try {
    // Try ML first
    const mlResult = await callMLWithRetry(report);
    if (mlResult) return mlResult;
  } catch (error) {
    console.log('ML failed, using rule-based AI');
  }
  
  // Fallback to rule-based AI
  return getRuleBasedPrediction(report);
};
```

---

## Step 8: Monitor Performance

Create a monitoring endpoint:

```javascript
app.get('/api/ml/status', (req, res) => {
  const startTime = Date.now();
  
  axios.get('http://localhost:5001/api/ml/health')
    .then(() => {
      const latency = Date.now() - startTime;
      res.json({
        mlServiceStatus: 'online',
        latency: `${latency}ms`,
        timestamp: new Date()
      });
    })
    .catch(error => {
      res.json({
        mlServiceStatus: 'offline',
        error: error.message
      });
    });
});
```

---

## Step 9: Configuration

Create a `.env` file in your Node backend:

```
# ML Service Configuration
ML_API_URL=http://localhost:5001/api/ml
ML_TIMEOUT=5000
ML_RETRY_ATTEMPTS=3
ML_ENABLED=true

# Feature Flags
USE_ML_PREDICTIONS=true
FALLBACK_TO_RULES=true
STORE_ML_PREDICTIONS=true
```

---

## Step 10: Testing Checklist

- [ ] MongoDB has ML fields added
- [ ] Node.js backend can connect to Flask API
- [ ] Report submission triggers ML prediction
- [ ] ML predictions are stored in database
- [ ] Admin dashboard displays predictions
- [ ] Fallback works if ML service is down
- [ ] Performance is acceptable (<2s per report)
- [ ] Error handling is graceful
- [ ] Logs show ML activity

---

## API Integration Summary

| Component | Port | Status |
|-----------|------|--------|
| MongoDB | 27017 | Required |
| Node.js Backend | 5000 | Running |
| Flask ML API | 5001 | Running |
| Admin Dashboard | 3000/3001 | Displays ML |

---

## Production Considerations

1. **Load Balancing**: Use multiple Flask instances if needed
2. **Caching**: Cache predictions for identical reports
3. **Monitoring**: Log all ML predictions for analysis
4. **Version Control**: Track model versions in predictions
5. **Feedback Loop**: Store user feedback for retraining
6. **Scaling**: Move to GPU for faster predictions if needed

---

## Troubleshooting

### Problem: "Cannot connect to ML API"
- Check Flask is running: `python app.py`
- Check ports are not blocked: `netstat -ano | findstr 5001`

### Problem: "Predictions not appearing"
- Check MongoDB connection
- Verify ML fields were added to schema
- Check server logs for errors

### Problem: "Slow predictions"
- Check system resources
- Verify models loaded successfully
- Consider using GPU

---

## Next Steps

1. Complete all 10 steps above
2. Run integration tests
3. Monitor performance metrics
4. Collect user feedback
5. Plan quarterly model retraining
6. Document any customizations

---

**Integration Complete!** 🎉
