# SALBA ML Service - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### Step 1: Set Up Python Environment

```powershell
# Navigate to ML service directory
cd c:\Users\USER\OneDrive\Documents\Capstone\salba-ml-service

# Create virtual environment
python -m venv venv

# Activate environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Export Training Data

```powershell
# Export data from MongoDB to CSV
python export_data.py
```

**Expected output:**
```
✅ Connecting to MongoDB...
✅ Connected to capstoneDB
✅ Creating training data...
📊 Total reports: 100
📊 Disaster distribution:
   - Fire: 25
   - Flood: 25
   - Earthquake: 20
   - Landslide: 18
   - Typhoon: 12
✅ Data exported to data/training_data.csv
✅ Train/test split created
```

### Step 3: Train ML Models

```powershell
# Train all 3 models
python train_models.py
```

**Expected output:**
```
🚀 Training Disaster Classifier (Random Forest)...
✅ Model trained
Accuracy: 0.8750
📊 Models evaluation complete

✅ All models trained and saved:
   - models/disaster_classifier.pkl
   - models/severity_predictor.pkl
   - models/prank_detector.pkl
```

### Step 4: Start Flask API Server

```powershell
# Start the ML API
python app.py
```

**Expected output:**
```
⚙️  Loading models...
✅ All models loaded successfully
🚀 Starting Flask server...
 * Running on http://0.0.0.0:5001
 * Press CTRL+C to quit
```

### Step 5: Test the API

In a **new PowerShell terminal**:

```powershell
# Test health endpoint
$response = Invoke-RestMethod -Uri "http://localhost:5001/api/ml/health"
$response

# Expected:
# ok  : True
# timestamp : 2024-01-15T10:30:45.123456
```

---

## 🔌 API Endpoints

All endpoints are available at `http://localhost:5001/api/ml/`

### 1. Health Check
```
GET /api/ml/health
Response: { "ok": true, "timestamp": "..." }
```

### 2. Disaster Classification
```
POST /api/ml/classify
Body: {
  "description": "Large fire on hillside",
  "latitude": 8.156,
  "longitude": 125.128
}
Response: {
  "predicted_disaster_type": "Fire",
  "confidence": 0.92,
  "probabilities": {...}
}
```

### 3. Severity Prediction
```
POST /api/ml/severity
Body: {
  "description": "Buildings damaged, multiple casualties",
  "latitude": 8.162,
  "longitude": 125.135
}
Response: {
  "predicted_severity": "critical",
  "confidence": 0.88
}
```

### 4. False Alarm Detection
```
POST /api/ml/verify
Body: {
  "description": "This is a test report",
  "latitude": 8.150,
  "longitude": 125.120
}
Response: {
  "is_false_alarm": true,
  "confidence": 0.85
}
```

### 5. Comprehensive Evaluation
```
POST /api/ml/evaluate-report
Body: {
  "description": "Severe flooding in downtown",
  "latitude": 8.165,
  "longitude": 125.140
}
Response: {
  "predictions": {
    "disaster_type": "Flood",
    "severity": "high",
    "is_false_alarm": false,
    "confidence_scores": {...}
  }
}
```

---

## 📊 Using Jupyter Notebooks

```powershell
# Install Jupyter
pip install jupyter

# Start Jupyter
jupyter notebook

# Navigate to notebooks/ folder
# Open notebooks in order:
# 1. 01_data_exploration.ipynb
# 2. 02_feature_engineering.ipynb
# 3. 03_model_training.ipynb
# 4. 04_deployment_testing.ipynb
```

---

## 🔄 Integration with Node.js Backend

Add this to your Node.js backend `\api\ml\` route:

```javascript
// Example: Call ML API to get predictions
const callMLAPI = async (report) => {
  try {
    const response = await axios.post('http://localhost:5001/api/ml/evaluate-report', {
      description: report.description,
      latitude: report.latitude,
      longitude: report.longitude
    });
    
    return response.data.predictions;
  } catch (error) {
    console.error('ML API error:', error);
    // Fall back to rule-based AI
    return null;
  }
};

// Usage in alert submission:
const mlPredictions = await callMLAPI(report);
alert.mlPredictions = mlPredictions;
```

---

## 📁 Project Structure

```
salba-ml-service/
├── app.py                 # Flask API server
├── export_data.py         # Data export pipeline
├── train_models.py        # Model training script
├── requirements.txt       # Python dependencies
├── README.md             # Full documentation
├── .env                  # Configuration
├── models/               # Trained model files
│   ├── disaster_classifier.pkl
│   ├── severity_predictor.pkl
│   ├── prank_detector.pkl
│   └── encoders/
├── data/                 # Training data
│   ├── training_data.csv
│   ├── train_data.csv
│   └── test_data.csv
├── notebooks/           # Jupyter notebooks
│   ├── 01_data_exploration.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_model_training.ipynb
│   └── 04_deployment_testing.ipynb
└── utils/               # Utility functions
    └── preprocessing.py
```

---

## 🛠️ Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'flask'"
**Solution:**
```powershell
pip install -r requirements.txt
```

### Issue: "Connection refused" when starting app.py
**Solution:**
```powershell
# Make sure you're in the venv
.\venv\Scripts\Activate.ps1

# Check Python version
python --version  # Should be 3.8+

# Reinstall Flask
pip install Flask==2.3.0
```

### Issue: "BSON" or MongoDB connection error
**Solution:**
```powershell
# Make sure MongoDB is running:
# 1. Start MongoDB locally or
# 2. Update MONGO_URI in .env file
```

### Issue: Models still loading or API slow
**Solution:**
- First run takes longer (~30 seconds)
- Models are cached in memory after first load
- Subsequent requests should be <500ms

---

## ⚡ Performance Benchmarks

- **Data Export**: ~500ms per 100 records
- **Model Training**: ~1-2 minutes per model
- **Prediction Latency**: 50-100ms per request
- **Bulk Processing**: 10 reports in ~800ms

---

## 📈 Expected Model Accuracy

Based on typical disaster data:

| Model | Accuracy | Type |
|-------|----------|------|
| Disaster Classifier | 87-90% | Random Forest |
| Severity Predictor | 85-88% | XGBoost |
| Prank Detector | 92-95% | Logistic Regression |

*Actual accuracy depends on your data quality*

---

## 🎯 Next Steps

1. ✅ Set up Python environment
2. ✅ Export training data
3. ✅ Train models (3-5 minutes)
4. ✅ Start Flask server
5. ⏳ Test endpoints (via Jupyter notebook 04)
6. ⏳ Integrate with Node.js backend
7. ⏳ Update admin dashboard
8. ⏳ Monitor performance

---

## 📞 Support

For issues or questions:
1. Check log output in terminal
2. Review Jupyter notebook 04 for debugging
3. Check MongoDB connection in .env
4. Verify all dependencies: `pip list`

---

**Ready to deploy!** 🚀
