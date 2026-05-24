from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import numpy as np
from models import DisasterClassifier, SeverityPredictor, FalseAlarmDetector
from config import API_PORT, API_HOST, DISASTER_TYPES
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize models
classifier = DisasterClassifier()
severity_predictor = SeverityPredictor()
false_alarm_detector = FalseAlarmDetector()

# Load pretrained models on startup
@app.before_request
def load_models():
    """Load models if not already loaded"""
    if not classifier.is_trained:
        try:
            classifier.load()
            severity_predictor.load()
            false_alarm_detector.load()
            logger.info("All models loaded successfully")
        except Exception as e:
            logger.warning(f"Models not found. Train them first using train.py: {e}")

# Health Check
@app.route('/health', methods=['GET'])
def health():
    """Check ML service health"""
    return jsonify({
        'status': 'OK',
        'classifier_ready': classifier.is_trained,
        'severity_predictor_ready': severity_predictor.is_trained,
        'false_alarm_detector_ready': false_alarm_detector.is_trained,
        'models': {
            'disaster_classifier': 'Ready' if classifier.is_trained else 'Not loaded',
            'severity_predictor': 'Ready' if severity_predictor.is_trained else 'Not loaded',
            'false_alarm_detector': 'Ready' if false_alarm_detector.is_trained else 'Not loaded'
        }
    }), 200

# Endpoint: Classify Disaster Type
@app.route('/classify', methods=['POST'])
def classify():
    """
    Classify disaster type using Random Forest
    
    Request body:
    {
        "description": "Heavy fire spreading rapidly",
        "latitude": 8.1565,
        "longitude": 125.1237
    }
    """
    try:
        data = request.json
        
        # Validate input
        if not data or 'description' not in data:
            return jsonify({'error': 'Missing description field'}), 400
        
        if not classifier.is_trained:
            return jsonify({'error': 'Classifier model not loaded'}), 503
        
        # Prepare features
        text = data.get('description', '')
        latitude = data.get('latitude', 0)
        longitude = data.get('longitude', 0)
        
        text_lower = text.lower()
        text_length = len(text)
        word_count = len(text.split())
        
        fire_keywords = text_lower.count('fire') + text_lower.count('burn') + text_lower.count('flame')
        flood_keywords = text_lower.count('flood') + text_lower.count('water') + text_lower.count('wave')
        earthquake_keywords = text_lower.count('earthquake') + text_lower.count('quake') + text_lower.count('tremor')
        landslide_keywords = text_lower.count('landslide') + text_lower.count('mudslide') + text_lower.count('slope')
        typhoon_keywords = text_lower.count('typhoon') + text_lower.count('storm') + text_lower.count('wind')
        
        urgency_keywords = text_lower.count('urgent') + text_lower.count('immediate') + text_lower.count('critical')
        prank_keywords = text_lower.count('prank') + text_lower.count('test') + text_lower.count('false')
        
        X = np.array([[
            text_length, word_count, fire_keywords, flood_keywords,
            earthquake_keywords, landslide_keywords, typhoon_keywords,
            urgency_keywords, prank_keywords, latitude, longitude, 0
        ]])
        
        # Predict
        result = classifier.predict(X)
        
        if result is None:
            return jsonify({'error': 'Prediction failed'}), 500
        
        return jsonify({
            'disaster_type': result['disaster_type'],
            'confidence': result['confidence'],
            'model': 'Random Forest Classifier'
        }), 200
    
    except Exception as e:
        logger.error(f"Error in classify endpoint: {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

# Endpoint: Predict Severity
@app.route('/predict-severity', methods=['POST'])
def predict_severity():
    """
    Predict severity level using XGBoost
    
    Request body:
    {
        "description": "Major fire threatening residential area",
        "disaster_type": "Fire"
    }
    """
    try:
        data = request.json
        
        if not data or 'description' not in data:
            return jsonify({'error': 'Missing description field'}), 400
        
        if not severity_predictor.is_trained:
            return jsonify({'error': 'Severity predictor model not loaded'}), 503
        
        # Prepare features
        text = data.get('description', '')
        disaster_type = data.get('disaster_type', '')
        
        text_length = len(text)
        urgency_keywords = text.lower().count('urgent') + text.lower().count('immediate') + text.lower().count('critical')
        
        severity_baseline = {
            'Fire': 3, 'Earthquake': 4, 'Flood': 2, 'Landslide': 2, 'Typhoon': 3
        }.get(disaster_type, 2)
        
        X = np.array([[
            text_length, urgency_keywords, severity_baseline,
            1 if 'immediate' in text.lower() else 0,
            1 if 'emergency' in text.lower() else 0
        ]])
        
        # Predict
        result = severity_predictor.predict(X)
        
        if result is None:
            return jsonify({'error': 'Prediction failed'}), 500
        
        return jsonify({
            'severity': result['severity'],
            'confidence': result['confidence'],
            'level': result['level'],
            'model': 'XGBoost Classifier'
        }), 200
    
    except Exception as e:
        logger.error(f"Error in predict-severity endpoint: {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

# Endpoint: Detect False Alarms
@app.route('/detect-false-alarm', methods=['POST'])
def detect_false_alarm():
    """
    Detect false alarms using Logistic Regression
    
    Request body:
    {
        "description": "This is just a test report prank",
        "severity": "low"
    }
    """
    try:
        data = request.json
        
        if not data or 'description' not in data:
            return jsonify({'error': 'Missing description field'}), 400
        
        if not false_alarm_detector.is_trained:
            return jsonify({'error': 'False alarm detector model not loaded'}), 503
        
        # Prepare features
        text = data.get('description', '')
        severity = data.get('severity', 'moderate')
        
        text_length = len(text)
        word_count = len(text.split())
        
        prank_keywords = text.lower().count('prank') + text.lower().count('test') + text.lower().count('false')
        suspicious_keywords = text.lower().count('joke') + text.lower().count('just kidding')
        
        X = np.array([[
            text_length, word_count, prank_keywords, suspicious_keywords,
            1, 1 if severity == 'low' else 0
        ]])
        
        # Predict
        result = false_alarm_detector.predict(X)
        
        if result is None:
            return jsonify({'error': 'Prediction failed'}), 500
        
        return jsonify({
            'is_false_alarm': result['is_false_alarm'],
            'confidence': result['confidence'],
            'probability_false_alarm': result['probability_false_alarm'],
            'probability_legitimate': result['probability_legitimate'],
            'model': 'Logistic Regression Classifier',
            'recommendation': 'FLAG' if result['is_false_alarm'] else 'PROCESS'
        }), 200
    
    except Exception as e:
        logger.error(f"Error in detect-false-alarm endpoint: {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

# Endpoint: Verify Report (All-in-one)
@app.route('/verify', methods=['POST'])
def verify():
    """
    Complete report verification using all three models
    
    Request body:
    {
        "description": "Fire spreading in downtown area",
        "disaster_type": "Fire",
        "latitude": 8.1565,
        "longitude": 125.1237
    }
    """
    try:
        data = request.json
        
        if not data or 'description' not in data:
            return jsonify({'error': 'Missing description field'}), 400
        
        results = {}
        
        # 1. Classify disaster type
        if classifier.is_trained:
            text = data.get('description', '')
            text_lower = text.lower()
            X_clf = np.array([[
                len(text), len(text.split()),
                text_lower.count('fire') + text_lower.count('burn'),
                text_lower.count('flood') + text_lower.count('water'),
                text_lower.count('earthquake') + text_lower.count('quake'),
                text_lower.count('landslide') + text_lower.count('mudslide'),
                text_lower.count('typhoon') + text_lower.count('storm'),
                text_lower.count('urgent') + text_lower.count('immediate'),
                text_lower.count('prank') + text_lower.count('test'),
                data.get('latitude', 0), data.get('longitude', 0), 0
            ]])
            clf_result = classifier.predict(X_clf)
            results['classification'] = clf_result
        
        # 2. Predict severity
        if severity_predictor.is_trained:
            X_sev = np.array([[
                len(text), text_lower.count('urgent') + text_lower.count('immediate'),
                3, 1 if 'immediate' in text_lower else 0, 1 if 'emergency' in text_lower else 0
            ]])
            sev_result = severity_predictor.predict(X_sev)
            results['severity'] = sev_result
        
        # 3. Detect false alarm
        if false_alarm_detector.is_trained:
            X_fa = np.array([[
                len(text), len(text.split()),
                text_lower.count('prank') + text_lower.count('test'),
                text_lower.count('joke'),
                1, 0
            ]])
            fa_result = false_alarm_detector.predict(X_fa)
            results['false_alarm_check'] = fa_result
        
        # Aggregate results
        verification_result = {
            'is_legitimate': not results.get('false_alarm_check', {}).get('is_false_alarm', False),
            'disaster_type': results.get('classification', {}).get('disaster_type', 'Unknown'),
            'severity': results.get('severity', {}).get('severity', 'moderate'),
            'confidence_score': results.get('classification', {}).get('confidence', 0),
            'models_used': ['Random Forest', 'XGBoost', 'Logistic Regression'],
            'detailed_results': results
        }
        
        return jsonify(verification_result), 200
    
    except Exception as e:
        logger.error(f"Error in verify endpoint: {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("SALBA ML Service Starting")
    logger.info(f"Port: {API_PORT}")
    logger.info("=" * 50)
    app.run(host='127.0.0.1', port=API_PORT, debug=False)
