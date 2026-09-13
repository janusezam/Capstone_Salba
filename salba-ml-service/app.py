"""
app.py - Flask API for SALBA ML predictions

Serves ML predictions for:
1. Disaster Type Classification (Random Forest)
2. True Severity Level Prediction (XGBoost)
3. False Alarm & Legitimacy Detection (Gradient Boosting)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os
import threading
import hashlib
from dotenv import load_dotenv

from utils.preprocessing import (
    FEATURE_NAMES_CLASSIFIER,
    FEATURE_NAMES_SEVERITY,
    FEATURE_NAMES_FALSE_ALARM,
    find_nearest_barangay,
    find_nearest_hazard_zone,
    HOTSPOT_COUNTS,
    URGENCY_KEYWORDS,
    DOWNGRADE_KEYWORDS,
    PRANK_KEYWORDS
)

load_dotenv()

app = Flask(__name__)
CORS(app)

# ============================================
# LOAD TRAINED MODELS
# ============================================
print("[INFO] Loading trained models...")

try:
    classifier = joblib.load('models/disaster_classifier.pkl')
    severity_model = joblib.load('models/severity_predictor.pkl')
    false_alarm_model = joblib.load('models/false_alarm_detector.pkl')
    encoders = joblib.load('models/label_encoders.pkl')
    print("[OK] All models loaded successfully")
except FileNotFoundError as e:
    print(f"[ERROR] Error loading models: {e}")
    print("   Run 'python generate_enhanced_dataset.py' then 'python train_models_real_data.py' first")

# ============================================
# UTILITY FUNCTIONS
# ============================================

def extract_features(report_data):
    """Extract and normalize comprehensive features from report"""
    features = {}
    
    # 1. Text indicators
    note = str(report_data.get('description') or report_data.get('reportText') or report_data.get('note') or '')
    lower_note = note.lower()
    
    features['text_length'] = len(note)
    features['word_count'] = len(note.split())
    
    is_auto_note = any(note.strip().startswith(d) for d in ['Fire -', 'Flood -', 'Earthquake -', 'Landslide -', 'Typhoon -'])
    features['has_user_note'] = 1 if (len(note.strip()) > 0 and not is_auto_note) else 0
    
    features['has_urgency'] = 1 if any(kw in lower_note for kw in URGENCY_KEYWORDS) else 0
    features['note_urgency_score'] = sum(1 for kw in URGENCY_KEYWORDS if kw in lower_note)
    features['note_downgrade_score'] = sum(1 for kw in DOWNGRADE_KEYWORDS if kw in lower_note)
    features['has_prank_keywords'] = 1 if any(kw in lower_note for kw in PRANK_KEYWORDS) else 0
    
    # 2. Location features (normalized for Malaybalay geographic bounds)
    lat = float(report_data.get('latitude', report_data.get('lat', 8.156)))
    lng = float(report_data.get('longitude', report_data.get('lng', 125.126)))
    
    lat_min, lat_max = 8.05, 8.25
    lng_min, lng_max = 125.00, 125.25
    
    features['lat_normalized'] = max(0.0, min(1.0, (lat - lat_min) / (lat_max - lat_min)))
    features['lng_normalized'] = max(0.0, min(1.0, (lng - lng_min) / (lng_max - lng_min)))
    
    # Barangay resolution & encoding
    raw_loc = report_data.get('barangay') or report_data.get('locationName') or find_nearest_barangay(lat, lng)
    barangay = str(raw_loc).split(' - ')[0].strip() if ' - ' in str(raw_loc) else str(raw_loc).strip()
    
    try:
        if encoders and 'barangay' in encoders and barangay in encoders['barangay'].classes_:
            features['barangay_encoded'] = int(encoders['barangay'].transform([barangay])[0])
        else:
            nearest_b = find_nearest_barangay(lat, lng)
            if encoders and 'barangay' in encoders and nearest_b in encoders['barangay'].classes_:
                features['barangay_encoded'] = int(encoders['barangay'].transform([nearest_b])[0])
            else:
                features['barangay_encoded'] = 0
    except Exception:
        features['barangay_encoded'] = 0

    # Disaster type encoding
    disaster_type = report_data.get('disasterType') or report_data.get('disaster_type') or 'Flood'
    try:
        if encoders and 'disaster_type' in encoders and disaster_type in encoders['disaster_type'].classes_:
            features['disaster_type_encoded'] = int(encoders['disaster_type'].transform([disaster_type])[0])
        else:
            features['disaster_type_encoded'] = 0
    except Exception:
        features['disaster_type_encoded'] = 0

    # Hotspot calculations
    hist_count = HOTSPOT_COUNTS.get((barangay, disaster_type), 15)
    features['historical_incident_count'] = hist_count
    features['is_hotspot'] = 1 if hist_count >= 25 else 0

    # Hazard zone proximity
    hazard_risk, hazard_dist = find_nearest_hazard_zone(lat, lng)
    risk_map = {'NONE': 0, 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
    features['hazard_zone_risk_encoded'] = risk_map.get(str(hazard_risk).upper(), 0)
    features['hazard_zone_distance_km'] = round(hazard_dist, 2)

    # Time features
    now = datetime.now()
    features['hour'] = now.hour
    features['month'] = now.month
    features['day_of_week'] = now.weekday()
    
    return features

def features_to_array(features, feature_names):
    """Convert features dict to DataFrame with column names matching training data"""
    data = [[features[name] for name in feature_names]]
    return pd.DataFrame(data, columns=feature_names)


# ============================================
# HEALTH CHECK
# ============================================

@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'SALBA ML Service (Geographically Aware)',
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
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        features = extract_features(data)
        X = features_to_array(features, FEATURE_NAMES_CLASSIFIER)
        
        pred_encoded = classifier.predict(X)[0]
        pred_class = encoders['disaster_type'].inverse_transform([pred_encoded])[0]
        pred_proba = classifier.predict_proba(X)[0]
        confidence = float(np.max(pred_proba))
        
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
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        features = extract_features(data)
        X = features_to_array(features, FEATURE_NAMES_SEVERITY)
        
        pred_encoded = severity_model.predict(X)[0]
        pred_class = encoders['severity'].inverse_transform([pred_encoded])[0]
        pred_proba = severity_model.predict_proba(X)[0]
        confidence = float(np.max(pred_proba))
        
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
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        features = extract_features(data)
        X = features_to_array(features, FEATURE_NAMES_FALSE_ALARM)
        
        is_false_alarm = bool(false_alarm_model.predict(X)[0])
        confidence = float(np.max(false_alarm_model.predict_proba(X)))
        
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
# 4. COMPREHENSIVE EVALUATION
# ============================================

@app.route('/api/ml/evaluate-report', methods=['POST'])
def evaluate_report():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        features = extract_features(data)
        X_clf = features_to_array(features, FEATURE_NAMES_CLASSIFIER)
        X_sev = features_to_array(features, FEATURE_NAMES_SEVERITY)
        X_fa = features_to_array(features, FEATURE_NAMES_FALSE_ALARM)
        
        # Classification
        pred_type_encoded = classifier.predict(X_clf)[0]
        pred_type = encoders['disaster_type'].inverse_transform([pred_type_encoded])[0]
        type_conf = float(np.max(classifier.predict_proba(X_clf)))
        
        # Severity
        pred_sev_encoded = severity_model.predict(X_sev)[0]
        pred_sev = encoders['severity'].inverse_transform([pred_sev_encoded])[0]
        sev_conf = float(np.max(severity_model.predict_proba(X_sev)))
        
        # Verification
        is_false_alarm = bool(false_alarm_model.predict(X_fa)[0])
        is_legitimate = not is_false_alarm
        verify_conf = float(np.max(false_alarm_model.predict_proba(X_fa)))
        legit_conf = verify_conf if is_legitimate else (1.0 - verify_conf)
        
        overall_confidence = (type_conf + sev_conf + legit_conf) / 3
        
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
                'confidence': round(legit_conf, 4)
            },
            'overall': {
                'confidence': round(overall_confidence, 4),
                'recommendation': recommendation
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# 5. FAST MODE (CACHED / PARALLEL)
# ============================================

fast_prediction_cache = {}

@app.route('/api/ml/evaluate-report-fast', methods=['POST'])
def evaluate_report_fast():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        description = str(data.get('reportText') or data.get('description') or '')
        lat = str(data.get('latitude') or data.get('lat', 0))
        lng = str(data.get('longitude') or data.get('lng', 0))
        d_type = str(data.get('disasterType') or '')
        cache_key = hashlib.md5(f"{description}|{lat}|{lng}|{d_type}".encode()).hexdigest()
        
        if cache_key in fast_prediction_cache:
            return jsonify(fast_prediction_cache[cache_key])
        
        features = extract_features(data)
        X_clf = features_to_array(features, FEATURE_NAMES_CLASSIFIER)
        X_sev = features_to_array(features, FEATURE_NAMES_SEVERITY)
        X_fa = features_to_array(features, FEATURE_NAMES_FALSE_ALARM)
        
        results = {}
        
        def run_classify():
            try:
                pred_type_encoded = classifier.predict(X_clf)[0]
                results['type'] = encoders['disaster_type'].inverse_transform([pred_type_encoded])[0]
                results['type_conf'] = float(np.max(classifier.predict_proba(X_clf)))
            except Exception:
                results['type'] = data.get('disasterType') or 'Emergency'
                results['type_conf'] = 0.8
        
        def run_severity():
            try:
                pred_sev_encoded = severity_model.predict(X_sev)[0]
                results['sev'] = encoders['severity'].inverse_transform([pred_sev_encoded])[0]
                results['sev_conf'] = float(np.max(severity_model.predict_proba(X_sev)))
            except Exception:
                results['sev'] = 'moderate'
                results['sev_conf'] = 0.8
        
        def run_verify():
            try:
                is_false = bool(false_alarm_model.predict(X_fa)[0])
                results['legit'] = not is_false
                c = float(np.max(false_alarm_model.predict_proba(X_fa)))
                results['legit_conf'] = c if results['legit'] else (1.0 - c)
            except Exception:
                results['legit'] = True
                results['legit_conf'] = 0.9
        
        t1 = threading.Thread(target=run_classify)
        t2 = threading.Thread(target=run_severity)
        t3 = threading.Thread(target=run_verify)
        
        t1.start()
        t2.start()
        t3.start()
        
        t1.join(timeout=0.5)
        t2.join(timeout=0.5)
        t3.join(timeout=0.5)
        
        overall_conf = (results.get('type_conf', 0.8) + results.get('sev_conf', 0.8) + results.get('legit_conf', 0.9)) / 3
        
        response = {
            'classification': {
                'disaster_type': results.get('type', 'Emergency'),
                'confidence': round(results.get('type_conf', 0.8), 4)
            },
            'severity': {
                'level': results.get('sev', 'moderate'),
                'confidence': round(results.get('sev_conf', 0.8), 4)
            },
            'verification': {
                'is_legitimate': results.get('legit', True),
                'confidence': round(results.get('legit_conf', 0.9), 4)
            },
            'overall': {
                'confidence': round(overall_conf, 4),
                'recommendation': 'CACHED_FAST_MODE'
            }
        }
        
        fast_prediction_cache[cache_key] = response
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# RECOMMENDATIONS
# ============================================

def get_classification_recommendation(disaster_type, confidence):
    if confidence > 0.8:
        return f"High confidence: {disaster_type} incident detected."
    elif confidence > 0.6:
        return f"Moderate confidence: Likely {disaster_type}."
    else:
        return f"Uncertain classification, manual validation advised."

def get_severity_recommendation(severity):
    recommendations = {
        'critical': 'CRITICAL: Immediate multi-team dispatch and emergency protocol activated.',
        'high': 'HIGH: Urgent response required. Multiple responders advised.',
        'moderate': 'MODERATE: Standard response protocol. Single responder team sufficient.',
        'low': 'LOW: Monitoring status. Responders deploy if conditions worsen.'
    }
    return recommendations.get(severity, 'Standard protocol applies.')

def get_verification_recommendation(is_legitimate, confidence):
    if is_legitimate and confidence > 0.8:
        return 'Legitimate report: Corroborated with high confidence.'
    elif is_legitimate:
        return 'Likely legitimate: Admin review advised.'
    else:
        return 'Flagged as potential false alarm or simulation drill.'

if __name__ == '__main__':
    port = int(os.environ.get('PORT', os.environ.get('FLASK_PORT', 5001)))
    print(f"\n[START] Starting SALBA ML Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)

