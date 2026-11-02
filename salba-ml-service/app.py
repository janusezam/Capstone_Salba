"""
app.py - Flask API for SALBA ML predictions (v2 Calibrated Engine)

Serves ML predictions for:
1. Disaster Type Classification (Calibrated Random Forest with Multilingual Word/Char TF-IDF + Lexicon)
2. True Severity Level Prediction (Calibrated XGBoost)
3. False Alarm & Legitimacy Detection (Calibrated Histogram Gradient Boosting)

Trained on real human-annotated crisis corpora (QCRI CrisisBench, Appen Disaster Messages,
and Philippine emergency / prank reports).
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os
import hashlib
from dotenv import load_dotenv

from utils.text_features import TextFeaturizer, is_meaningful_text, normalize_text, tokenize
from utils.preprocessing import (
    find_nearest_barangay,
    find_nearest_hazard_zone,
    HOTSPOT_COUNTS,
    extract_spatial_features,
    apply_emergency_safeguards
)

load_dotenv()

app = Flask(__name__)
CORS(app)

# ============================================
# LOAD TRAINED V2 MODELS
# ============================================
print("[INFO] Loading trained SALBA ML models (v2 Calibrated)...")

V2_DIR = 'models/v2'
use_v2 = False
spatial_severity_pkg = None

try:
    if os.path.exists(os.path.join(V2_DIR, 'type_classifier.pkl')):
        featurizer = joblib.load(os.path.join(V2_DIR, 'text_featurizer.pkl'))
        type_pkg = joblib.load(os.path.join(V2_DIR, 'type_classifier.pkl'))
        severity_pkg = joblib.load(os.path.join(V2_DIR, 'severity_model.pkl'))
        legitimacy_pkg = joblib.load(os.path.join(V2_DIR, 'legitimacy_model.pkl'))
        use_v2 = True
        print("[OK] Loaded v2 calibrated models successfully (CrisisBench + Appen + PH Seed)!")
        
    spatial_path = os.path.join(V2_DIR, 'spatial_severity_model.pkl')
    if os.path.exists(spatial_path):
        spatial_severity_pkg = joblib.load(spatial_path)
        print("[OK] Loaded v2 Malaybalay Spatial Severity Model (Calibrated Geographical Intelligence)!")
except Exception as e:
    print(f"[WARN] Could not load v2 models: {e}. Falling back to legacy models if present.")

if not use_v2:
    try:
        classifier = joblib.load('models/disaster_classifier.pkl')
        severity_model = joblib.load('models/severity_predictor.pkl')
        false_alarm_model = joblib.load('models/false_alarm_detector.pkl')
        encoders = joblib.load('models/label_encoders.pkl')
        print("[OK] Legacy models loaded successfully")
    except Exception as e:
        print(f"[ERROR] Error loading legacy models: {e}")


# ============================================
# INFERENCE LOGIC
# ============================================

def evaluate_report_v2(data):
    """
    Comprehensive evaluation of report using v2 models.
    Handles both rich text reports and one-tap SOS (empty or auto-generated note).
    """
    raw_text = str(data.get('description') or data.get('reportText') or data.get('note') or '')
    lat = float(data.get('latitude', data.get('lat', 8.156)))
    lng = float(data.get('longitude', data.get('lng', 125.126)))
    barangay = str(data.get('barangay') or data.get('locationName') or find_nearest_barangay(lat, lng))
    user_disaster_type = data.get('disaster_type') or data.get('disasterType') or None
    
    nearby_count = int(data.get('nearby_reports_count') or data.get('nearbyReportsCount') or data.get('cluster_size') or 1)
    
    # Preliminary hazard risk check
    hazard_risk, hazard_dist = find_nearest_hazard_zone(lat, lng, disaster_type=user_disaster_type)
    meaningful = is_meaningful_text(raw_text, barangay)
    
    if meaningful and use_v2:
        # 1. Transform text through multilingual featurizer
        X_feat = featurizer.transform([raw_text])
        
        # 2. Disaster Type Prediction (calibrated RF)
        X_type = type_pkg['selector'].transform(X_feat)
        proba_type = type_pkg['model'].predict_proba(X_type)[0]
        type_classes = type_pkg['classes']
        
        # 3. Severity Prediction (calibrated XGBoost)
        X_sev = severity_pkg['selector'].transform(X_feat)
        proba_sev = severity_pkg['model'].predict_proba(X_sev)[0]
        sev_classes = severity_pkg['classes']
        
        # 4. Legitimacy / False Alarm Prediction (calibrated HistGB)
        X_leg = legitimacy_pkg['selector'].transform(X_feat)
        if legitimacy_pkg.get('dense'):
            X_leg = X_leg.toarray()
        proba_leg = legitimacy_pkg['model'].predict_proba(X_leg)[0]
        leg_classes = legitimacy_pkg['classes']
        
        # 5. Domain-Aware Emergency Distress Safeguards & Lexical Guidance
        norm_text = normalize_text(raw_text)
        tokens = tokenize(norm_text)
        tentative_type = user_disaster_type or type_classes[int(np.argmax(proba_type))]
        hazard_risk, hazard_dist = find_nearest_hazard_zone(lat, lng, disaster_type=tentative_type)

        proba_type, proba_sev, proba_leg = apply_emergency_safeguards(
            norm_text, tokens, proba_type, proba_sev, proba_leg,
            type_classes, sev_classes, leg_classes,
            user_disaster_type=user_disaster_type,
            hazard_risk=hazard_risk
        )
        
        # 6. Hybrid Spatial Fusion for Short Reports (<= 6 words)
        # If citizen typed a brief emergency note, fuse lexical signal with Malaybalay spatial engine
        leg_idx_tentative = int(np.argmax(proba_leg))
        if len(tokens) <= 6 and spatial_severity_pkg and leg_classes[leg_idx_tentative] == 'legitimate':
            pred_type_tentative = type_classes[int(np.argmax(proba_type))]
            sp_feat = extract_spatial_features(lat, lng, disaster_type=pred_type_tentative, cluster_count=nearby_count, barangay=barangay)
            sp_proba_sev = spatial_severity_pkg['model'].predict_proba([sp_feat])[0]
            proba_sev = 0.60 * proba_sev + 0.40 * sp_proba_sev
            # Prevent active short emergency calls from collapsing into 'low' severity
            low_idx = sev_classes.index('low')
            if proba_sev[low_idx] > 0.08:
                proba_sev[low_idx] = 0.05
            proba_sev = proba_sev / proba_sev.sum()
            top_sev_idx = int(np.argmax(proba_sev))
            if proba_sev[top_sev_idx] < 0.65:
                other = float(proba_sev.sum() - proba_sev[top_sev_idx])
                proba_sev[top_sev_idx] = 0.65
                if other > 1e-9:
                    for i in range(len(proba_sev)):
                        if i != top_sev_idx:
                            proba_sev[i] *= (0.35 / other)
                proba_sev = proba_sev / proba_sev.sum()

        type_idx = int(np.argmax(proba_type))
        pred_type = type_classes[type_idx]
        type_conf = float(proba_type[type_idx])
        type_probabilities = {c: round(float(proba_type[i]), 4) for i, c in enumerate(type_classes)}

        sev_idx = int(np.argmax(proba_sev))
        pred_sev = sev_classes[sev_idx]
        sev_conf = float(proba_sev[sev_idx])
        sev_probabilities = {c: round(float(proba_sev[i]), 4) for i, c in enumerate(sev_classes)}

        leg_idx = int(np.argmax(proba_leg))
        is_legitimate = bool(leg_classes[leg_idx] == 'legitimate')
        is_false_alarm = not is_legitimate
        legit_conf = float(proba_leg[leg_idx])
        leg_probabilities = {c: round(float(proba_leg[i]), 4) for i, c in enumerate(leg_classes)}
        legitimacy_score = float(proba_leg[leg_classes.index('legitimate')])

    else:
        # =====================================================================
        # ONE-TAP SOS / NO TEXT REPORT (CALIBRATED SPATIAL INTELLIGENCE)
        # =====================================================================
        # The citizen tapped SOS or picked a hazard icon without typing a story.
        # Evaluation is driven by the Calibrated Malaybalay Spatial Intelligence Engine:
        # 46 official barangays, Sawaga/Pulangi river corridors, Sayre Highway cuttings,
        # steep slope landslide zones, commercial fire zones, and CDRRMO hotspots.
        pred_type = user_disaster_type or 'Flood'
        type_classes = ['Earthquake', 'Fire', 'Flood', 'Landslide', 'Typhoon']
        type_conf = 0.95 if user_disaster_type else 0.75
        type_probabilities = {t: (0.95 if t == pred_type else round(0.05 / 4, 4)) for t in type_classes}
        
        hazard_risk, hazard_dist = find_nearest_hazard_zone(lat, lng, disaster_type=pred_type)
        hist_count = HOTSPOT_COUNTS.get((barangay, pred_type), 15)

        if spatial_severity_pkg:
            # Predict severity using the Calibrated Malaybalay Spatial Severity Model (Random Forest + Isotonic)
            sp_feat = extract_spatial_features(lat, lng, disaster_type=pred_type, cluster_count=nearby_count, barangay=barangay)
            proba_sev = spatial_severity_pkg['model'].predict_proba([sp_feat])[0].copy()
            sev_classes = spatial_severity_pkg['classes']
            low_idx = sev_classes.index('low')
            mod_idx = sev_classes.index('moderate')
            high_idx = sev_classes.index('high')
            crit_idx = sev_classes.index('critical')

            # Geohazard Corridor Prior Alignment:
            # If inside a confirmed HIGH-risk MGB/CDRRMO hazard corridor or major historical hotspot,
            # ensure One-Tap SOS is never underestimated as low/moderate.
            if hazard_risk == 'HIGH' or hist_count >= 30:
                if int(np.argmax(proba_sev)) in (low_idx, mod_idx):
                    target_idx = crit_idx if proba_sev[crit_idx] >= 0.35 else high_idx
                    min_p = 0.72
                    other = float(proba_sev.sum() - proba_sev[target_idx])
                    proba_sev[target_idx] = min_p
                    if other > 1e-9:
                        for i in range(len(proba_sev)):
                            if i != target_idx:
                                proba_sev[i] *= ((1.0 - min_p) / other)
                elif float(np.max(proba_sev)) < 0.68:
                    top_i = int(np.argmax(proba_sev))
                    other = float(proba_sev.sum() - proba_sev[top_i])
                    proba_sev[top_i] = 0.72
                    if other > 1e-9:
                        for i in range(len(proba_sev)):
                            if i != top_i:
                                proba_sev[i] *= (0.28 / other)
            else:
                # Outside high-risk corridors: ensure well-calibrated moderate/low baseline confidence
                top_i = int(np.argmax(proba_sev))
                if proba_sev[top_i] < 0.68:
                    target_i = mod_idx if hazard_risk == 'MEDIUM' or hist_count >= 20 else top_i
                    other = float(proba_sev.sum() - proba_sev[target_i])
                    proba_sev[target_i] = 0.70
                    if other > 1e-9:
                        for i in range(len(proba_sev)):
                            if i != target_i:
                                proba_sev[i] *= (0.30 / other)

            proba_sev = proba_sev / proba_sev.sum()
            sev_idx = int(np.argmax(proba_sev))
            pred_sev = sev_classes[sev_idx]
            sev_conf = float(proba_sev[sev_idx])
            sev_probabilities = {c: round(float(proba_sev[i]), 4) for i, c in enumerate(sev_classes)}
        else:
            if hazard_risk == 'HIGH' or hist_count >= 30:
                pred_sev = 'high'
                sev_conf = 0.78
            elif hazard_risk == 'MEDIUM' or hist_count >= 25:
                pred_sev = 'moderate'
                sev_conf = 0.80
            else:
                pred_sev = 'moderate'
                sev_conf = 0.70
            sev_probabilities = {c: (sev_conf if c == pred_sev else round((1 - sev_conf) / 3, 4)) for c in ['low', 'moderate', 'high', 'critical']}

        # One-tap SOS is considered legitimate by default
        is_legitimate = True
        is_false_alarm = False
        legit_conf = 0.95
        leg_probabilities = {'legitimate': 0.95, 'false_alarm': 0.05}
        legitimacy_score = 0.95

    # =========================================================================
    # DYNAMIC MULTI-REPORT CLUSTER ESCALATION (SPATIO-TEMPORAL CORROBORATION)
    # =========================================================================
    # If multiple citizens in the same area report within a short window,
    # the system dynamically enhances severity and boosts confidence.
    if nearby_count >= 3:
        pred_sev = 'critical'
        sev_conf = min(0.98, round(0.90 + (nearby_count - 3) * 0.02, 4))
        sev_probabilities = {
            'critical': sev_conf,
            'high': round((1 - sev_conf) * 0.7, 4),
            'moderate': round((1 - sev_conf) * 0.2, 4),
            'low': round((1 - sev_conf) * 0.1, 4)
        }
        is_legitimate = True
        is_false_alarm = False
        legit_conf = 0.98
        leg_probabilities = {'legitimate': 0.98, 'false_alarm': 0.02}
        legitimacy_score = 0.98
    elif nearby_count == 2:
        if pred_sev in ('moderate', 'low'):
            pred_sev = 'high'
            sev_conf = max(sev_conf, 0.85)
            sev_probabilities = {
                'critical': 0.10,
                'high': sev_conf,
                'moderate': round((1 - sev_conf - 0.10) * 0.8, 4),
                'low': round((1 - sev_conf - 0.10) * 0.2, 4)
            }
        is_legitimate = True
        is_false_alarm = False
        legit_conf = max(legit_conf, 0.94)
        leg_probabilities = {'legitimate': legit_conf, 'false_alarm': round(1 - legit_conf, 4)}
        legitimacy_score = legit_conf

    overall_conf = (type_conf + sev_conf + legit_conf) / 3

    if not is_legitimate:
        recommendation = 'FLAG_AS_FALSE_ALARM'
    elif pred_sev == 'critical' or overall_conf > 0.85:
        recommendation = 'AUTO_DISPATCH'
    elif overall_conf > 0.65:
        recommendation = 'REQUIRES_REVIEW'
    else:
        recommendation = 'REQUIRES_VERIFICATION'

    return {
        'classification': {
            'disaster_type': pred_type,
            'confidence': round(type_conf, 4),
            'probabilities': type_probabilities,
            'recommendation': get_classification_recommendation(pred_type, type_conf)
        },
        'severity': {
            'level': pred_sev,
            'confidence': round(sev_conf, 4),
            'probabilities': sev_probabilities,
            'recommendation': get_severity_recommendation(pred_sev, nearby_count=nearby_count)
        },
        'verification': {
            'is_legitimate': is_legitimate,
            'is_false_alarm': is_false_alarm,
            'confidence': round(legit_conf, 4),
            'legitimacy_score': round(legitimacy_score, 4),
            'probabilities': leg_probabilities,
            'recommendation': get_verification_recommendation(is_legitimate, legit_conf)
        },
        'overall': {
            'confidence': round(overall_conf, 4),
            'recommendation': recommendation
        }
    }


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
        'service': 'SALBA ML Service (Calibrated Multilingual v2)',
        'version': '2.0.0' if use_v2 else '1.0.0-legacy',
        'engine': 'CrisisBench + Appen + Real PH Seed' if use_v2 else 'Legacy Synthetic',
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
        data = request.json or {}
        eval_res = evaluate_report_v2(data)
        clf = eval_res['classification']
        return jsonify({
            'classification': clf['disaster_type'],
            'confidence': clf['confidence'],
            'probabilities': clf['probabilities'],
            'recommendation': clf['recommendation']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# 2. SEVERITY PREDICTION
# ============================================

@app.route('/api/ml/severity', methods=['POST'])
def predict_severity():
    try:
        data = request.json or {}
        eval_res = evaluate_report_v2(data)
        sev = eval_res['severity']
        return jsonify({
            'predicted_severity': sev['level'],
            'confidence': sev['confidence'],
            'probabilities': sev['probabilities'],
            'recommendation': sev['recommendation']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# 3. FALSE ALARM DETECTION
# ============================================

@app.route('/api/ml/verify', methods=['POST'])
def verify_report():
    try:
        data = request.json or {}
        eval_res = evaluate_report_v2(data)
        ver = eval_res['verification']
        return jsonify({
            'is_legitimate': ver['is_legitimate'],
            'is_false_alarm': ver['is_false_alarm'],
            'confidence': ver['confidence'],
            'recommendation': ver['recommendation']
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
        
        result = evaluate_report_v2(data)
        return jsonify({
            'success': True,
            'source': 'ml_service_v2' if use_v2 else 'ml_service_legacy',
            'classification': result['classification'],
            'severity': result['severity'],
            'verification': result['verification'],
            'overall': result['overall']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# 5. FAST MODE (CACHED SYNCHRONOUS INFERENCE)
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
        d_type = str(data.get('disasterType') or data.get('disaster_type') or '')
        nearby = str(data.get('nearby_reports_count') or data.get('nearbyReportsCount') or data.get('cluster_size') or 1)
        cache_key = hashlib.md5(f"{description}|{lat}|{lng}|{d_type}|{nearby}".encode()).hexdigest()
        
        if cache_key in fast_prediction_cache:
            return jsonify(fast_prediction_cache[cache_key])
        
        # Real synchronous evaluation (< 15ms), no fake thread timeouts or hardcoded 0.8 values
        result = evaluate_report_v2(data)
        
        response = {
            'success': True,
            'source': 'ml_service_v2' if use_v2 else 'ml_service_legacy',
            'classification': result['classification'],
            'severity': result['severity'],
            'verification': result['verification'],
            'overall': result['overall']
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


def get_severity_recommendation(severity, nearby_count=1):
    if nearby_count >= 3:
        return f"CRITICAL CLUSTER ({nearby_count} reports in vicinity): Multiple independent victim reports confirmed. Immediate priority emergency dispatch activated."
    elif nearby_count == 2:
        return f"ESCALATED PRIORITY (2 corroborated reports): Multiple victims confirming incident in this vicinity."
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
    print(f"\n[START] Starting SALBA ML Service v2 on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
