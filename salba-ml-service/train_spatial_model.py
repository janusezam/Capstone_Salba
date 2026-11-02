#!/usr/bin/env python3
"""
train_spatial_model.py - Train and calibrate the dedicated Malaybalay Spatial Intelligence
Severity Model for One-Tap SOS and geographically-grounded emergency triage.

Inputs:
  - data/malaybalay_disaster_reports_enhanced.csv
  - utils/preprocessing.py (46 barangays, river corridors, Sayre Highway, hazard zones, CDRRMO hotspots)

Outputs:
  - models/v2/spatial_severity_model.pkl
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix, cohen_kappa_score
from sklearn.utils.class_weight import compute_sample_weight

from utils.preprocessing import (
    MALAYBALAY_BARANGAYS, HAZARD_ZONES, HOTSPOT_COUNTS,
    haversine, find_nearest_barangay, find_nearest_hazard_zone
)

DATA_PATH = os.path.join(ROOT, 'data', 'malaybalay_disaster_reports_enhanced.csv')
OUT_PATH = os.path.join(ROOT, 'models', 'v2', 'spatial_severity_model.pkl')

SAWAGA_CORRIDOR = [
    (8.1750, 125.1150),  # Kalasungay
    (8.1515, 125.1304),  # Sumpong
    (8.1554, 125.1323),  # San Jose
    (8.1388, 125.1272),  # Casisang
    (8.1580, 125.1212),  # Bangcud
]
PULANGI_CORRIDOR = [
    (8.0820, 125.1580),  # Linabo
    (8.1485, 125.1402),  # Violeta
    (8.0750, 125.1420),  # Simaya
    (8.0650, 125.1950),  # Sinanglanan
    (8.0280, 125.1450),  # Apo Macote
]
SAYRE_HIGHWAY = [
    (8.2160, 125.0780),  # Dalwangan
    (8.1750, 125.1150),  # Kalasungay
    (8.1575, 125.1278),  # Poblacion
    (8.1388, 125.1272),  # Casisang
    (8.1472, 125.1180),  # Aglayan
    (8.1580, 125.1212),  # Bangcud
]

BARANGAY_ELEVATION = {
    "Cabangahan": 1050, "Imbayao": 1150, "Dalwangan": 950, "Kabalabag": 900, "Canayan": 750, "Patpat": 800,
    "Barangay 1": 620, "Barangay 2": 620, "Barangay 3": 620, "Barangay 4": 620, "Barangay 5": 620,
    "Barangay 6": 620, "Barangay 7": 615, "Barangay 8": 615, "Barangay 9": 620, "Barangay 10": 620, "Barangay 11": 620,
    "Malaybalay Proper": 620, "Sumpong": 600, "Casisang": 590, "San Jose": 580, "Bangcud": 550, "Aglayan": 540,
    "Violeta": 510, "Linabo": 390, "Simaya": 380, "Sinanglanan": 370, "Apo Macote": 340, "Santo Niño": 410,
    "Kalasungay": 680, "Busdi": 850, "Kulaman": 780, "Zamboanguita": 820
}

TYPES = ['Earthquake', 'Fire', 'Flood', 'Landslide', 'Typhoon']
SEVERITY_CLASSES = ['low', 'moderate', 'high', 'critical']

def min_dist(lat, lng, corridor):
    return min(haversine(lat, lng, pt[0], pt[1]) for pt in corridor)

def extract_features(lat, lng, disaster_type, cluster_count=1, barangay=None):
    d_type = str(disaster_type or 'Flood').capitalize()
    if d_type not in TYPES:
        d_type = 'Flood'
    brgy = str(barangay or find_nearest_barangay(lat, lng))
    
    d_sawaga = min_dist(lat, lng, SAWAGA_CORRIDOR)
    d_pulangi = min_dist(lat, lng, PULANGI_CORRIDOR)
    d_highway = min_dist(lat, lng, SAYRE_HIGHWAY)
    
    risk, dist_hazard = find_nearest_hazard_zone(lat, lng, disaster_type=d_type)
    risk_enc = 3 if risk == 'HIGH' else (2 if risk == 'MEDIUM' else 1)
    
    hist_count = HOTSPOT_COUNTS.get((brgy, d_type), 15)
    is_hotspot = 1 if hist_count >= 25 else 0
    
    is_urban = 1 if any(b['barangay'] == brgy and b.get('type') == 'Urban' for b in MALAYBALAY_BARANGAYS) else 0
    elev = BARANGAY_ELEVATION.get(brgy, 600)
    
    lat_norm = (lat - 8.00) / 0.45
    lng_norm = (lng - 125.00) / 0.40
    
    nearby = max(1, int(cluster_count))
    type_vec = [1 if d_type == t else 0 for t in TYPES]
    
    return [
        lat_norm, lng_norm,
        d_sawaga, d_pulangi, d_highway,
        dist_hazard, risk_enc,
        hist_count, is_hotspot,
        is_urban, elev / 1000.0,
        nearby
    ] + type_vec

FEATURE_NAMES = [
    'lat_norm', 'lng_norm',
    'dist_sawaga_km', 'dist_pulangi_km', 'dist_sayre_highway_km',
    'dist_hazard_km', 'hazard_risk_level',
    'historical_incident_count', 'is_hotspot',
    'is_urban', 'elevation_km',
    'cluster_count',
    'type_Earthquake', 'type_Fire', 'type_Flood', 'type_Landslide', 'type_Typhoon'
]

def main():
    print("=" * 70)
    print("TRAINING MALAYBALAY SPATIAL SEVERITY INTELLIGENCE MODEL (v2)")
    print("=" * 70)
    
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} reports from {DATA_PATH}")
    
    X = []
    y = []
    sev_map = {c: i for i, c in enumerate(SEVERITY_CLASSES)}
    
    for _, row in df.iterrows():
        lat = float(row['latitude'])
        lng = float(row['longitude'])
        d_type = str(row['disaster_type'])
        cluster = 1
        brgy = row.get('barangay')
        feat = extract_features(lat, lng, d_type, cluster_count=cluster, barangay=brgy)
        X.append(feat)
        y.append(sev_map[str(row['severity'])])
        
    X = np.array(X)
    y = np.array(y)
    
    print(f"Feature matrix: {X.shape[0]} rows x {X.shape[1]} features")
    print("Severity distribution:", dict(zip(SEVERITY_CLASSES, np.bincount(y).tolist())))
    
    # 5-Fold Stratified Cross Validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    sample_weights = compute_sample_weight('balanced', y)
    
    rf = RandomForestClassifier(
        n_estimators=300, max_depth=10, min_samples_leaf=2,
        class_weight='balanced', random_state=42, n_jobs=-1
    )
    
    # Evaluate with Cross Validation
    preds_oof = np.zeros(len(y), dtype=int)
    probas_oof = np.zeros((len(y), len(SEVERITY_CLASSES)))
    
    for train_idx, val_idx in cv.split(X, y):
        w_tr = compute_sample_weight('balanced', y[train_idx])
        rf_fold = RandomForestClassifier(
            n_estimators=300, max_depth=10, min_samples_leaf=2,
            class_weight='balanced', random_state=42, n_jobs=-1
        )
        cal_fold = CalibratedClassifierCV(rf_fold, cv=3, method='isotonic')
        cal_fold.fit(X[train_idx], y[train_idx], sample_weight=w_tr)
        probas_oof[val_idx] = cal_fold.predict_proba(X[val_idx])
        preds_oof[val_idx] = probas_oof[val_idx].argmax(axis=1)
        
    acc = accuracy_score(y, preds_oof)
    f1 = f1_score(y, preds_oof, average='macro')
    kappa = cohen_kappa_score(y, preds_oof, weights='quadratic')
    
    print("\n--- 5-FOLD CALIBRATED SPATIAL MODEL METRICS ---")
    print(f"Accuracy:         {acc:.4f} ({acc*100:.2f}%)")
    print(f"Macro-F1:         {f1:.4f}")
    print(f"Quadratic Kappa:  {kappa:.4f}")
    print("\nClassification Report:")
    print(classification_report(y, preds_oof, target_names=SEVERITY_CLASSES))
    print("Confusion Matrix:")
    print(confusion_matrix(y, preds_oof))
    
    # Fit final production model on full data with calibration
    print("\nFitting final calibrated production model...")
    final_rf = RandomForestClassifier(
        n_estimators=350, max_depth=10, min_samples_leaf=2,
        class_weight='balanced', random_state=42, n_jobs=-1
    )
    final_calibrated = CalibratedClassifierCV(final_rf, cv=5, method='isotonic')
    final_calibrated.fit(X, y, sample_weight=sample_weights)
    
    pkg = {
        'model': final_calibrated,
        'classes': SEVERITY_CLASSES,
        'feature_names': FEATURE_NAMES,
        'extract_features_fn_code': 'extract_features(lat, lng, disaster_type, cluster_count, barangay)',
        'trained_at': datetime.now().isoformat(),
        'metrics': {
            'accuracy': float(acc),
            'macro_f1': float(f1),
            'quadratic_kappa': float(kappa)
        }
    }
    
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    joblib.dump(pkg, OUT_PATH, compress=3)
    print(f"[OK] Calibrated Spatial Model saved successfully to: {OUT_PATH}")

if __name__ == '__main__':
    main()
