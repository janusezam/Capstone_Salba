# SALBA ML Integration Guide

## Overview
The RescuerApp backend is now integrated with the SALBA ML Service (Flask backend) for automated disaster classification, severity prediction, and false alarm detection.

## Architecture

```
RescuerApp Frontend
        ↓
    Node.js Backend (Port 5000)
        ↓
    ML Service Routes
        ↓
    ML Service Client
        ↓
    Flask ML Service (Port 5001)
        ↓
    Trained ML Models (91% accuracy)
```

## Integration Points

### 1. Report Creation (POST /api/reports)
When a user submits a disaster report:
- Report is saved immediately
- ML Service is called asynchronously
- Predictions are added to the report document
- No blocking of report creation

**Example Flow:**
```
POST /api/reports {lat, lng, note}
  ↓
Report Created
  ↓
ML Service Called (background)
  ↓
Predictions Stored in mlPredictions field
```

### 2. ML Routes
New endpoints for direct ML predictions:

#### GET /api/ml/health
Check if ML service is available
```bash
curl http://localhost:5000/api/ml/health
```
Response:
```json
{
  "success": true,
  "status": "OK",
  "models": {
    "classifier": "Ready",
    "false_alarm": "Ready",
    "severity": "Ready"
  }
}
```

#### POST /api/ml/classify
Classify disaster type
```bash
curl -X POST http://localhost:5000/api/ml/classify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Heavy flooding with water waist deep",
    "latitude": 8.157,
    "longitude": 125.126
  }'
```

#### POST /api/ml/predict-severity
Predict severity level
```bash
curl -X POST http://localhost:5000/api/ml/predict-severity \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Major earthquake with 7.5 magnitude"
  }'
```

#### POST /api/ml/verify
Check if report is legitimate
```bash
curl -X POST http://localhost:5000/api/ml/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Fire spreading rapidly",
    "hasPrankKeywords": 0
  }'
```

#### GET /api/ml/model-stats
View ML model statistics and coverage
```bash
curl http://localhost:5000/api/ml/model-stats \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "totalReports": 100,
  "reportsWithMLPredictions": 95,
  "mlCoverage": "95.00%",
  "reportsByType": {
    "Earthquake": 25,
    "Fire": 20,
    "Flood": 30,
    "Landslide": 25
  },
  "mlPredictionsByType": [
    {
      "disasterType": "Earthquake",
      "count": 24,
      "averageConfidence": "91.50%"
    }
  ]
}
```

## Database Schema Changes

### Report Model
New ML prediction fields added:

```javascript
mlPredictions: {
  disasterType: String,           // Predicted disaster type
  disasterTypeConfidence: Number, // 0-1 confidence score
  severity: String,               // Predicted severity level
  severityConfidence: Number,     // 0-1 confidence score
  isLegitimate: Boolean,          // Is report legitimate?
  legitimacyConfidence: Number,   // 0-1 confidence score
  overall: {
    confidence: Number,
    recommendation: String
  }
},
mlProcessedAt: Date              // When ML predictions were made
```

## Configuration

### Environment Variables
File: `.env`
```
ML_SERVICE_URL=http://localhost:5001/api/ml
```

### Service URLs
- **Node.js Backend**: http://localhost:5000
- **ML Service**: http://localhost:5001
- **Database**: mongodb://127.0.0.1:27017/capstoneDB

## Deployment Checklist

### Local Development
```bash
# 1. Start ML Service (separate terminal)
cd c:\Users\USER\OneDrive\Documents\Capstone\salba-ml-service
.\venv\Scripts\python.exe app.py

# 2. Start Node Backend (separate terminal)
cd c:\Users\USER\OneDrive\Documents\Capstone\EmergencyApp\reliefgoods\backend
npm install
npm start

# 3. Verify integration
curl http://localhost:5000/api/ml/health
# Should return success: true

# 4. Create test report
curl -X POST http://localhost:5000/api/reports \
  -H "Authorization: Bearer <token>" \
  -d '{
    "lat": 8.157,
    "lng": 125.126,
    "note": "Heavy rain triggered massive flooding"
  }'

# 5. Check report (should have mlPredictions)
curl http://localhost:5000/api/reports/<reportId> \
  -H "Authorization: Bearer <token>"
```

## Model Performance

### Trained on 1,000 Real Malaybalay Disaster Reports

| Model | Accuracy | Type | Features |
|-------|----------|------|----------|
| Disaster Classifier | 91% | Random Forest | Text length, location, time |
| Severity Predictor | 26.5% | Gradient Boosting | Location, temporal features |
| False Alarm Detector | 90% | Logistic Regression | Text content, keywords |

### Feature Engineering
- **text_length**: Length of report text
- **word_count**: Number of words
- **has_urgency**: Contains urgency keywords
- **lat_normalized**: Normalized latitude (0-1)
- **lng_normalized**: Normalized longitude (0-1)
- **hour**: Report timestamp hour
- **month**: Report timestamp month
- **day_of_week**: Day of week (0-6)

## Troubleshooting

### ML Service Not Available
```
Error: ECONNREFUSED - ML Service is not running
Solution: Start Flask ML Service on port 5001
```

### Timeout Errors
```
Error: Prediction timeout after 5000ms
Solution: ML Service may be overwhelmed
- Check Python CPU usage
- Restart Flask service
- Check network connectivity
```

### Model Not Found
```
Error: FileNotFoundError - models/disaster_classifier.pkl
Solution: Run training script in ML service directory
```

## System Requirements

### Node.js Backend
- Node.js 14+
- MongoDB 4.0+
- 2GB RAM minimum

### ML Service
- Python 3.8+
- Flask 3.1+
- scikit-learn 1.8+
- 1GB RAM for models

## Future Enhancements

1. **Batch Processing**: Process multiple reports at once
2. **Model Retraining**: Auto-retrain with new CDRRMO data
3. **Confidence Thresholds**: Flag low-confidence predictions
4. **Fallback Logic**: Use local model if ML Service unavailable
5. **Caching**: Cache predictions for duplicate reports
6. **Analytics Dashboard**: Real-time prediction statistics

## Support

For integration issues:
1. Check `.env` configuration
2. Verify both services are running
3. Check network connectivity
4. Review error logs in both terminals
5. Restart both services
