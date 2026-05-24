# SALBA ML Service

Machine Learning service for disaster classification, severity prediction, and false alarm detection.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Export training data from MongoDB
python export_data.py

# Run Jupyter notebooks (in order)
jupyter notebook

# Train models
python train_models.py

# Start Flask API
python app.py
```

## API Endpoints

- `POST /api/ml/classify` - Classify disaster type
- `POST /api/ml/severity` - Predict severity level
- `POST /api/ml/verify` - Verify report (false alarm detection)
- `GET /api/ml/health` - Health check

## Model Files

- `models/disaster_classifier.pkl` - Disaster type classification model
- `models/severity_predictor.pkl` - Severity prediction model
- `models/false_alarm_detector.pkl` - False alarm detection model
- `models/label_encoders.pkl` - Feature encoders
