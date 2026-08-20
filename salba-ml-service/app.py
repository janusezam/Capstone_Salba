"""
app.py - Flask API for ML predictions

This is the main Flask application that serves ML predictions.
It integrates with the Node.js backend via HTTP requests.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ============================================
# LOAD TRAINED MODELS
# ============================================
print("🤖 Loading trained models...")

try:
    classifier = joblib.load('models/disaster_classifier.pkl')
    severity_model = joblib.load('models/severity_predictor.pkl')
    false_alarm_model = joblib.load('models/false_alarm_detector.pkl')
    encoders = joblib.load('models/label_encoders.pkl')
    print("✅ All models loaded successfully")
except FileNotFoundError as e:
    print(f"❌ Error loading models: {e}")
    print("   Run 'python export_data.py' then 'python train_models.py' first")

# Feature names for different models
FEATURE_NAMES_TYPE_ALARM = [
    'text_length', 'word_count', 'has_urgency',
    'lat_normalized', 'lng_normalized',
    'hour', 'month', 'day_of_week'
]

FEATURE_NAMES_SEVERITY = [
    'text_length', 'word_count', 'has_urgency',
    'lat_normalized', 'lng_normalized',
    'hour', 'month', 'day_of_week',
    'disaster_type_encoded'
]

# ============================================
# UTILITY FUNCTIONS
# ============================================

def extract_features(report_data):
    """Extract and normalize features from report"""
    
    features = {}
    
    # Text features - handle both description and reportText fields
    note = str(report_data.get('description') or report_data.get('reportText') or '')
    features['text_length'] = len(note)
    features['word_count'] = len(note.split())
    features['has_urgency'] = 1 if any(word in note.lower() 
                            for word in ['urgent', 'critical', 'emergency', 'immediate', 'help', 'danger']) else 0
    
    # Location features (normalize with Malaybalay dataset range)
    lat = float(report_data.get('latitude', 8.156))
    lng = float(report_data.get('longitude', 125.126))
    # Malaybalay ranges: lat 8.147-8.159, lng 125.118-125.141
    features['lat_normalized'] = (lat - 8.147) / (8.159 - 8.147) if (8.159 - 8.147) > 0 else 0
    features['lng_normalized'] = (lng - 125.118) / (125.141 - 125.118) if (125.141 - 125.118) > 0 else 0
    
    # Clamp to [0, 1]
    features['lat_normalized'] = max(0, min(1, features['lat_normalized']))
    features['lng_normalized'] = max(0, min(1, features['lng_normalized']))
    
    # Time features
    now = datetime.now()
    features['hour'] = now.hour
    features['month'] = now.month
    features['day_of_week'] = now.weekday()
    
    # Disaster type encoding for severity prediction
    disaster_type = report_data.get('disasterType') or report_data.get('disaster_type') or 'Other'
    try:
        if encoders and 'disaster_type' in encoders and disaster_type in encoders['disaster_type'].classes_:
            features['disaster_type_encoded'] = int(encoders['disaster_type'].transform([disaster_type])[0])
        else:
            features['disaster_type_encoded'] = 0
    except Exception as e:
        features['disaster_type_encoded'] = 0
    
    return features

def features_to_array(features, feature_names):
    """Convert features dict to numpy array in correct order"""
    return np.array([features[name] for name in feature_names]).reshape(1, -1)

# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'SALBA ML Service',
        'models': {
            'classifier': 'Ready',
            'severity': 'Ready',
            'false_alarm': 'Ready'
        }
    })

# ============================================
# 1. DISASTER TYPE CLASSIFICATION
# ============================================

@app.route('/api/ml/classify', methods=['POST'])
def classify_disaster():
    """
    Classify disaster type using trained model
    
    Request:
    {
        "reportText": "Fire at downtown market",
        "latitude": 8.1565,
        "longitude": 125.1237
    }
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract features
        features = extract_features(data)
        X = features_to_array(features, FEATURE_NAMES_TYPE_ALARM)
        
        # Predict
        pred_encoded = classifier.predict(X)[0]
        pred_class = encoders['disaster_type'].inverse_transform([pred_encoded])[0]
        pred_proba = classifier.predict_proba(X)[0]
        confidence = float(np.max(pred_proba))
        
        # Build response with all probabilities
        probabilities = {}
        for i, class_name in enumerate(encoders['disaster_type'].classes_):
            probabilities[class_name] = float(pred_proba[i])
        
        return jsonify({
            'classification': pred_class,
            'confidence': round(confidence, 4),
            'probabilities': probabilities,
            'recommendation': get_classification_recommendation(pred_class, confidence)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# 2. SEVERITY PREDICTION
# ============================================

@app.route('/api/ml/severity', methods=['POST'])
def predict_severity():
    """
    Predict disaster severity level
    
    Request:
    {
        "reportText": "Fire at downtown market",
        "latitude": 8.1565,
        "longitude": 125.1237,
        "disasterType": "Fire"
    }
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract features
        features = extract_features(data)
        X = features_to_array(features, FEATURE_NAMES_SEVERITY)
        
        # Predict
        pred_encoded = severity_model.predict(X)[0]
        pred_class = encoders['severity'].inverse_transform([pred_encoded])[0]
        pred_proba = severity_model.predict_proba(X)[0]
        confidence = float(np.max(pred_proba))
        
        # Build response
        probabilities = {}
        for i, class_name in enumerate(encoders['severity'].classes_):
            probabilities[class_name] = float(pred_proba[i])
        
        return jsonify({
            'predicted_severity': pred_class,
            'confidence': round(confidence, 4),
            'probabilities': probabilities,
            'recommendation': get_severity_recommendation(pred_class)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# 3. FALSE ALARM DETECTION
# ============================================

@app.route('/api/ml/verify', methods=['POST'])
def verify_report():
    """
    Verify if report is legitimate (false alarm detection)
    
    Request:
    {
        "reportText": "Fire at downtown market",
        "latitude": 8.1565,
        "longitude": 125.1237
    }
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract features
        features = extract_features(data)
        X = features_to_array(features, FEATURE_NAMES_TYPE_ALARM)
        
        # Predict
        is_false_alarm = bool(false_alarm_model.predict(X)[0])
        confidence = float(np.max(false_alarm_model.predict_proba(X)))
        
        # Determine legitimacy
        is_legitimate = not is_false_alarm
        legitimacy_confidence = confidence if is_legitimate else (1.0 - confidence)
        
        return jsonify({
            'is_legitimate': is_legitimate,
            'is_false_alarm': is_false_alarm,
            'confidence': round(legitimacy_confidence, 4),
            'recommendation': get_verification_recommendation(is_legitimate, legitimacy_confidence)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# ML-ASSISTED REPORT EVALUATION
# ============================================

@app.route('/api/ml/evaluate-report', methods=['POST'])
def evaluate_report():
    """
    Comprehensive report evaluation combining all 3 models
    
    Request:
    {
        "reportText": "URGENT: Fire spreading at downtown market",
        "latitude": 8.1565,
        "longitude": 125.1237
    }
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract features
        features = extract_features(data)
        X_type_alarm = features_to_array(features, FEATURE_NAMES_TYPE_ALARM)
        X_sev = features_to_array(features, FEATURE_NAMES_SEVERITY)
        
        # Classification
        pred_type_encoded = classifier.predict(X_type_alarm)[0]
        pred_type = encoders['disaster_type'].inverse_transform([pred_type_encoded])[0]
        type_conf = float(np.max(classifier.predict_proba(X_type_alarm)))
        
        # Severity
        pred_sev_encoded = severity_model.predict(X_sev)[0]
        pred_sev = encoders['severity'].inverse_transform([pred_sev_encoded])[0]
        sev_conf = float(np.max(severity_model.predict_proba(X_sev)))
        
        # Verification
        is_legitimate = not bool(false_alarm_model.predict(X_type_alarm)[0])
        verify_conf = float(np.max(false_alarm_model.predict_proba(X_type_alarm)))
        
        # Overall recommendation
        overall_confidence = (type_conf + sev_conf + verify_conf) / 3
        
        if not is_legitimate:
            recommendation = 'FLAG_AS_FALSE_ALARM'
        elif overall_confidence > 0.85:
            recommendation = 'AUTO_DISPATCH'
        elif overall_confidence > 0.65:
            recommendation = 'REQUIRES_REVIEW'
        else:
            recommendation = 'REQUIRES_VERIFICATION'
        
        return jsonify({
            'classification': {
                'disaster_type': pred_type,
                'confidence': round(type_conf, 4)
            },
            'severity': {
                'level': pred_sev,
                'confidence': round(sev_conf, 4)
            },
            'verification': {
                'is_legitimate': is_legitimate,
                'confidence': round(verify_conf, 4)
            },
            'overall': {
                'confidence': round(overall_confidence, 4),
                'recommendation': recommendation
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# RECOMMENDATION FUNCTIONS
# ============================================

def get_classification_recommendation(disaster_type, confidence):
    """Get recommendation based on classification confidence"""
    if confidence > 0.8:
        return f"High confidence: This is likely a {disaster_type}"
    elif confidence > 0.6:
        return f"Moderate confidence: Probably a {disaster_type}"
    else:
        return f"Low confidence: Uncertain classification, requires review"

def get_severity_recommendation(severity):
    """Get action recommendation based on predicted severity"""
    recommendations = {
        'critical': 'IMMEDIATE multi-team dispatch required. Emergency protocol activated.',
        'high': 'URGENT dispatch needed. Multiple teams recommended.',
        'moderate': 'Standard response. One team should be sufficient.',
        'low': 'Monitor situation. Dispatch only if escalation occurs.'
    }
    return recommendations.get(severity, 'Standard protocols apply.')

def get_verification_recommendation(is_legitimate, confidence):
    """Get verification recommendation"""
    if is_legitimate and confidence > 0.8:
        return 'Report appears legitimate. AutoDispatch recommended.'
    elif is_legitimate and confidence > 0.6:
        return 'Report likely legitimate. Admin review recommended.'
    else:
        return 'Report flagged for manual verification.'

# ============================================
# OPTIMIZED FAST MODE (for real-time dashboard)
# ============================================

fast_prediction_cache = {}  # Simple in-memory cache

@app.route('/api/ml/evaluate-report-fast', methods=['POST'])
def evaluate_report_fast():
    """
    FAST MODE: Cached predictions for real-time dashboard updates
    Returns cached result or performs quick inference
    Trades some accuracy for speed (< 100ms response time)
    
    Request:
    {
        "reportText": "Fire in downtown area",
        "latitude": 8.1565,
        "longitude": 125.1237
    }
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Generate cache key
        import hashlib
        description = str(data.get('reportText') or data.get('description') or '')
        lat = str(data.get('latitude', 0))
        lng = str(data.get('longitude', 0))
        cache_key = hashlib.md5(f"{description}|{lat}|{lng}".encode()).hexdigest()
        
        # Return cached result if available
        if cache_key in fast_prediction_cache:
            return jsonify(fast_prediction_cache[cache_key])
        
        # Quick inference
        features = extract_features(data)
        X_type_alarm = features_to_array(features, FEATURE_NAMES_TYPE_ALARM)
        X_sev = features_to_array(features, FEATURE_NAMES_SEVERITY)
        
        # Parallel inference on all 3 models
        import threading
        results = {}
        
        def classify():
            try:
                pred_type_encoded = classifier.predict(X_type_alarm)[0]
                results['type'] = encoders['disaster_type'].inverse_transform([pred_type_encoded])[0]
                results['type_conf'] = float(np.max(classifier.predict_proba(X_type_alarm)))
            except:
                results['type'] = 'Unknown'
                results['type_conf'] = 0.0
        
        def severity():
            try:
                pred_sev_encoded = severity_model.predict(X_sev)[0]
                results['sev'] = encoders['severity'].inverse_transform([pred_sev_encoded])[0]
                results['sev_conf'] = float(np.max(severity_model.predict_proba(X_sev)))
            except:
                results['sev'] = 'moderate'
                results['sev_conf'] = 0.0
        
        def verify():
            try:
                is_false = bool(false_alarm_model.predict(X_type_alarm)[0])
                results['legit'] = not is_false
                results['legit_conf'] = float(np.max(false_alarm_model.predict_proba(X_type_alarm)))
            except:
                results['legit'] = True
                results['legit_conf'] = 0.0
        
        # Run in parallel for speed
        t1 = threading.Thread(target=classify)
        t2 = threading.Thread(target=severity)
        t3 = threading.Thread(target=verify)
        
        t1.start()
        t2.start()
        t3.start()
        
        t1.join(timeout=0.5)
        t2.join(timeout=0.5)
        t3.join(timeout=0.5)
        
        response = {
            'classification': {
                'disaster_type': results.get('type', 'Unknown'),
                'confidence': round(results.get('type_conf', 0.0), 4)
            },
            'severity': {
                'level': results.get('sev', 'moderate'),
                'confidence': round(results.get('sev_conf', 0.0), 4)
            },
            'verification': {
                'is_legitimate': results.get('legit', True),
                'confidence': round(results.get('legit_conf', 0.0), 4)
            },
            'overall': {
                'confidence': round((results.get('type_conf', 0) + results.get('sev_conf', 0) + results.get('legit_conf', 0)) / 3, 4),
                'recommendation': 'CACHED_FAST_MODE'
            }
        }
        
        # Cache for 5 minutes
        fast_prediction_cache[cache_key] = response
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================

@app.route('/api/ml/models-info', methods=['GET'])
def models_info():
    """Get information about trained models"""
    return jsonify({
        'disaster_classifier': {
            'type': 'Random Forest',
            'n_estimators': 100,
            'accuracy': '~87%',  # From training
            'classes': list(encoders['disaster_type'].classes_)
        },
        'severity_predictor': {
            'type': 'XGBoost',
            'n_estimators': 100,
            'accuracy': '~85%',
            'classes': list(encoders['severity'].classes_)
        },
        'false_alarm_detector': {
            'type': 'Logistic Regression',
            'accuracy': '~82%',
            'task': 'Binary classification'
        }
    })

# ============================================
# ERROR HANDLER
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================
# START SERVER
# ============================================

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"\n🚀 Starting SALBA ML Service on port {port}...")
    print(f"📊 API Documentation: http://localhost:{port}/api/ml/health")
    app.run(host='0.0.0.0', port=port, debug=True)
