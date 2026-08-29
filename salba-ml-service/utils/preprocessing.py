"""
utils/preprocessing.py - Data preprocessing and feature engineering for SALBA ML service
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# Geographical Reference Data for Malaybalay
MALAYBALAY_BARANGAYS = [
    {"barangay": "Barangay 1", "lat": 8.1615, "lng": 125.1290},
    {"barangay": "Barangay 2", "lat": 8.1582, "lng": 125.1258},
    {"barangay": "Barangay 3", "lat": 8.1568, "lng": 125.1240},
    {"barangay": "Barangay 4", "lat": 8.1545, "lng": 125.1272},
    {"barangay": "Barangay 5", "lat": 8.1558, "lng": 125.1275},
    {"barangay": "Barangay 6", "lat": 8.1555, "lng": 125.1302},
    {"barangay": "Barangay 7", "lat": 8.1498, "lng": 125.1308},
    {"barangay": "Barangay 8", "lat": 8.1512, "lng": 125.1328},
    {"barangay": "Barangay 9", "lat": 8.1567, "lng": 125.1285},
    {"barangay": "Barangay 10", "lat": 8.1572, "lng": 125.1270},
    {"barangay": "Barangay 11", "lat": 8.1579, "lng": 125.1295},
    {"barangay": "Casisang", "lat": 8.1388, "lng": 125.1272},
    {"barangay": "Sumpong", "lat": 8.1515, "lng": 125.1304},
    {"barangay": "San Jose", "lat": 8.1554, "lng": 125.1323},
    {"barangay": "Bangcud", "lat": 8.1580, "lng": 125.1212},
    {"barangay": "Aglayan", "lat": 8.1472, "lng": 125.1180},
    {"barangay": "Violeta", "lat": 8.1485, "lng": 125.1402},
    {"barangay": "Malaybalay Proper", "lat": 8.1575, "lng": 125.1278},
    {"barangay": "Canayan", "lat": 8.1875, "lng": 125.1538},
    {"barangay": "Kalasungay", "lat": 8.1750, "lng": 125.1150},
    {"barangay": "Linabo", "lat": 8.0820, "lng": 125.1580},
    {"barangay": "Simaya", "lat": 8.0750, "lng": 125.1420},
    {"barangay": "Santo Niño", "lat": 8.1150, "lng": 125.1650},
    {"barangay": "Cabangahan", "lat": 8.1583, "lng": 125.0363}
]

HOTSPOT_COUNTS = {
    ("Casisang", "Earthquake"): 33,
    ("San Jose", "Flood"): 32,
    ("Barangay 10", "Flood"): 32,
    ("Violeta", "Earthquake"): 32,
    ("Aglayan", "Earthquake"): 30,
    ("Violeta", "Landslide"): 30,
    ("San Jose", "Earthquake"): 29,
    ("Bangcud", "Landslide"): 29,
    ("San Jose", "Fire"): 29,
    ("Barangay 10", "Earthquake"): 29,
    ("Casisang", "Landslide"): 29,
    ("San Jose", "Landslide"): 28,
    ("Aglayan", "Fire"): 28,
    ("Barangay 11", "Flood"): 27,
    ("Violeta", "Fire"): 27,
    ("Malaybalay Proper", "Flood"): 27,
    ("Bangcud", "Earthquake"): 26,
    ("Barangay 11", "Earthquake"): 26,
    ("Barangay 11", "Fire"): 26,
    ("Bangcud", "Fire"): 26,
    ("Sumpong", "Landslide"): 26,
    ("Barangay 10", "Fire"): 25,
    ("Casisang", "Fire"): 25,
    ("Barangay 9", "Fire"): 25,
    ("Malaybalay Proper", "Earthquake"): 24,
    ("Barangay 9", "Earthquake"): 24,
    ("Sumpong", "Fire"): 24,
    ("Aglayan", "Landslide"): 23,
    ("Sumpong", "Earthquake"): 23,
    ("Bangcud", "Flood"): 23,
    ("Sumpong", "Flood"): 22,
    ("Barangay 10", "Landslide"): 22,
    ("Malaybalay Proper", "Fire"): 22,
    ("Malaybalay Proper", "Landslide"): 21,
    ("Barangay 9", "Flood"): 19,
    ("Aglayan", "Flood"): 18,
    ("Casisang", "Flood"): 18,
    ("Barangay 11", "Landslide"): 16,
    ("Violeta", "Flood"): 13,
    ("Barangay 9", "Landslide"): 12
}

HAZARD_ZONES = [
    {"location": "Cabangahan", "lat": 8.1583, "lng": 125.0363, "riskLevel": "HIGH"},
    {"location": "Barangay 9", "lat": 8.1567, "lng": 125.1285, "riskLevel": "HIGH"},
    {"location": "San Jose", "lat": 8.1554, "lng": 125.1323, "riskLevel": "HIGH"},
    {"location": "Casisang", "lat": 8.1388, "lng": 125.1272, "riskLevel": "HIGH"},
    {"location": "Violeta", "lat": 8.1485, "lng": 125.1402, "riskLevel": "HIGH"},
    {"location": "Aglayan", "lat": 8.1472, "lng": 125.1180, "riskLevel": "MEDIUM"},
    {"location": "Sumpong", "lat": 8.1515, "lng": 125.1304, "riskLevel": "MEDIUM"},
    {"location": "Bangcud", "lat": 8.1580, "lng": 125.1212, "riskLevel": "MEDIUM"},
    {"location": "Malaybalay Proper", "lat": 8.1575, "lng": 125.1278, "riskLevel": "LOW"}
]

URGENCY_KEYWORDS = [
    'urgent', 'critical', 'emergency', 'immediate', 'life threat', 'spreading',
    'huge', 'trapped', 'unconscious', 'casualties', 'injured', 'massive', 'rapid',
    'severe', 'danger', 'collapse', 'destroy', 'burning'
]

DOWNGRADE_KEYWORDS = [
    'small', 'minor', 'controlled', 'trash', 'drill', 'contained', 'diminishing',
    'subsiding', 'slight', 'low risk', 'manageable', 'little'
]

PRANK_KEYWORDS = [
    'test', 'prank', 'joke', 'fake', 'hoax', 'lol', 'jk', 'drill', 'simulation',
    'dummy', 'sample', 'testing', 'mock', 'trial'
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dLat = np.radians(lat2 - lat1)
    dLon = np.radians(lon2 - lon1)
    a = np.sin(dLat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

def find_nearest_barangay(lat, lng):
    min_dist = float('inf')
    nearest = "Malaybalay Proper"
    for b in MALAYBALAY_BARANGAYS:
        dist = haversine(lat, lng, b["lat"], b["lng"])
        if dist < min_dist:
            min_dist = dist
            nearest = b["barangay"]
    return nearest

def find_nearest_hazard_zone(lat, lng):
    min_dist = float('inf')
    risk_level = "NONE"
    for zone in HAZARD_ZONES:
        dist = haversine(lat, lng, zone["lat"], zone["lng"])
        if dist < min_dist:
            min_dist = dist
            risk_level = zone["riskLevel"] if dist <= 1.5 else "NONE"
    return risk_level, min_dist

# Feature Names Constants
FEATURE_NAMES_CLASSIFIER = [
    'text_length', 'word_count', 'has_user_note',
    'has_urgency', 'note_urgency_score', 'note_downgrade_score', 'has_prank_keywords',
    'lat_normalized', 'lng_normalized', 'barangay_encoded',
    'is_hotspot', 'historical_incident_count',
    'hazard_zone_risk_encoded', 'hazard_zone_distance_km',
    'hour', 'month', 'day_of_week'
]

FEATURE_NAMES_SEVERITY = [
    'text_length', 'word_count', 'has_user_note',
    'has_urgency', 'note_urgency_score', 'note_downgrade_score', 'has_prank_keywords',
    'lat_normalized', 'lng_normalized', 'barangay_encoded',
    'is_hotspot', 'historical_incident_count',
    'hazard_zone_risk_encoded', 'hazard_zone_distance_km',
    'hour', 'month', 'day_of_week',
    'disaster_type_encoded'
]

FEATURE_NAMES_FALSE_ALARM = [
    'text_length', 'word_count', 'has_user_note',
    'has_urgency', 'note_urgency_score', 'note_downgrade_score', 'has_prank_keywords',
    'lat_normalized', 'lng_normalized', 'barangay_encoded',
    'is_hotspot', 'historical_incident_count',
    'hazard_zone_risk_encoded', 'hazard_zone_distance_km',
    'hour', 'month', 'day_of_week'
]

def preprocess_features(df, encoders=None):
    """Prepare comprehensive features from DataFrame for ML training and evaluation"""
    df_out = df.copy()
    
    text_col = 'report_text' if 'report_text' in df_out.columns else ('description' if 'description' in df_out.columns else 'note')
    text_series = df_out[text_col].fillna('').astype(str)
    
    # 1. Text indicators
    df_out['text_length'] = text_series.str.len()
    df_out['word_count'] = text_series.str.split().str.len()
    
    if 'has_user_note' not in df_out.columns:
        df_out['has_user_note'] = (df_out['text_length'] > 0).astype(int)
        
    lower_texts = text_series.str.lower()
    
    df_out['has_urgency'] = lower_texts.apply(
        lambda t: 1 if any(kw in t for kw in URGENCY_KEYWORDS) else 0
    )
    df_out['note_urgency_score'] = lower_texts.apply(
        lambda t: sum(1 for kw in URGENCY_KEYWORDS if kw in t)
    )
    df_out['note_downgrade_score'] = lower_texts.apply(
        lambda t: sum(1 for kw in DOWNGRADE_KEYWORDS if kw in t)
    )
    df_out['has_prank_keywords'] = lower_texts.apply(
        lambda t: 1 if any(kw in t for kw in PRANK_KEYWORDS) else 0
    )
    
    # 2. Location & Barangay
    lat_min, lat_max = 8.05, 8.25
    lng_min, lng_max = 125.00, 125.25
    
    df_out['lat_normalized'] = (df_out['latitude'] - lat_min) / (lat_max - lat_min)
    df_out['lng_normalized'] = (df_out['longitude'] - lng_min) / (lng_max - lng_min)
    df_out['lat_normalized'] = df_out['lat_normalized'].clip(0, 1)
    df_out['lng_normalized'] = df_out['lng_normalized'].clip(0, 1)
    
    if 'barangay' not in df_out.columns:
        df_out['barangay'] = df_out.apply(
            lambda r: find_nearest_barangay(r['latitude'], r['longitude']), axis=1
        )
        
    # Hazard zone proximity if not present
    if 'hazard_zone_risk' not in df_out.columns or 'hazard_zone_distance_km' not in df_out.columns:
        hz_results = df_out.apply(
            lambda r: find_nearest_hazard_zone(r['latitude'], r['longitude']), axis=1
        )
        df_out['hazard_zone_risk'] = [r[0] for r in hz_results]
        df_out['hazard_zone_distance_km'] = [r[1] for r in hz_results]
        
    # Hotspot calculation if not present
    if 'is_hotspot' not in df_out.columns or 'historical_incident_count' not in df_out.columns:
        d_type_col = 'disaster_type' if 'disaster_type' in df_out.columns else 'disasterType'
        df_out['historical_incident_count'] = df_out.apply(
            lambda r: HOTSPOT_COUNTS.get((r['barangay'], r.get(d_type_col, 'Flood')), 15), axis=1
        )
        df_out['is_hotspot'] = (df_out['historical_incident_count'] >= 25).astype(int)
        
    risk_map = {'NONE': 0, 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
    df_out['hazard_zone_risk_encoded'] = df_out['hazard_zone_risk'].map(lambda x: risk_map.get(str(x).upper(), 0))
    
    # 3. Temporal
    ts_col = 'created_at' if 'created_at' in df_out.columns else ('timestamp' if 'timestamp' in df_out.columns else None)
    if ts_col and ts_col in df_out.columns:
        ts = pd.to_datetime(df_out[ts_col])
        df_out['hour'] = ts.dt.hour
        df_out['month'] = ts.dt.month
        df_out['day_of_week'] = ts.dt.dayofweek
    else:
        now = pd.Timestamp.now()
        df_out['hour'] = now.hour
        df_out['month'] = now.month
        df_out['day_of_week'] = now.dayofweek
        
    return df_out

def encode_targets(df):
    """Fit label encoders for disaster_type, severity, barangay"""
    encoders = {}
    
    # Disaster Type
    le_disaster = LabelEncoder()
    df['disaster_type_encoded'] = le_disaster.fit_transform(df['disaster_type'])
    encoders['disaster_type'] = le_disaster
    
    # Severity
    le_severity = LabelEncoder()
    df['severity_encoded'] = le_severity.fit_transform(df['severity'])
    encoders['severity'] = le_severity
    
    # Barangay
    le_barangay = LabelEncoder()
    df['barangay_encoded'] = le_barangay.fit_transform(df['barangay'])
    encoders['barangay'] = le_barangay
    
    return df, encoders

def save_encoders(encoders, path='models/label_encoders.pkl'):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(encoders, path)
    print(f"Encoders saved to {path}")

def get_feature_names():
    return FEATURE_NAMES_SEVERITY

def load_encoders(path='models/label_encoders.pkl'):
    return joblib.load(path)

