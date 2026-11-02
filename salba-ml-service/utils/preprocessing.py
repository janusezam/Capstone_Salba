"""
utils/preprocessing.py - Data preprocessing and geographical intelligence for SALBA ML service.
Includes all 46 official barangays of Malaybalay City and hazard-specific risk zones.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# ===========================================================================
# ALL 46 OFFICIAL BARANGAYS OF MALAYBALAY CITY (PSA PSGC: 101312000)
# ===========================================================================
MALAYBALAY_BARANGAYS = [
    # 11 Poblacion Barangays (City Center / Urban Core)
    {"barangay": "Barangay 1", "lat": 8.1615, "lng": 125.1290, "type": "Urban"},
    {"barangay": "Barangay 2", "lat": 8.1582, "lng": 125.1258, "type": "Urban"},
    {"barangay": "Barangay 3", "lat": 8.1568, "lng": 125.1240, "type": "Urban"},
    {"barangay": "Barangay 4", "lat": 8.1545, "lng": 125.1272, "type": "Urban"},
    {"barangay": "Barangay 5", "lat": 8.1558, "lng": 125.1275, "type": "Urban"},
    {"barangay": "Barangay 6", "lat": 8.1555, "lng": 125.1302, "type": "Urban"},
    {"barangay": "Barangay 7", "lat": 8.1498, "lng": 125.1308, "type": "Urban"},
    {"barangay": "Barangay 8", "lat": 8.1512, "lng": 125.1328, "type": "Urban"},
    {"barangay": "Barangay 9", "lat": 8.1567, "lng": 125.1285, "type": "Urban"},
    {"barangay": "Barangay 10", "lat": 8.1572, "lng": 125.1270, "type": "Urban"},
    {"barangay": "Barangay 11", "lat": 8.1579, "lng": 125.1295, "type": "Urban"},

    # 35 Rural / External Barangays
    {"barangay": "Aglayan", "lat": 8.1472, "lng": 125.1180, "type": "Urban"},
    {"barangay": "Apo Macote", "lat": 8.0280, "lng": 125.1450, "type": "Rural"},
    {"barangay": "Bangcud", "lat": 8.1580, "lng": 125.1212, "type": "Rural"},
    {"barangay": "Busdi", "lat": 8.3512, "lng": 125.2934, "type": "Rural"},
    {"barangay": "Cabangahan", "lat": 8.1583, "lng": 125.0363, "type": "Rural"},
    {"barangay": "Caburacanan", "lat": 8.2815, "lng": 125.2510, "type": "Rural"},
    {"barangay": "Canayan", "lat": 8.1875, "lng": 125.1538, "type": "Rural"},
    {"barangay": "Capitan Angel", "lat": 8.2250, "lng": 125.1620, "type": "Rural"},
    {"barangay": "Casisang", "lat": 8.1388, "lng": 125.1272, "type": "Urban"},
    {"barangay": "Dalwangan", "lat": 8.2160, "lng": 125.0780, "type": "Rural"},
    {"barangay": "Imbayao", "lat": 8.1920, "lng": 125.0350, "type": "Rural"},
    {"barangay": "Indalaza", "lat": 8.3050, "lng": 125.2850, "type": "Rural"},
    {"barangay": "Kabalabag", "lat": 8.2520, "lng": 125.1850, "type": "Rural"},
    {"barangay": "Kalasungay", "lat": 8.1750, "lng": 125.1150, "type": "Rural"},
    {"barangay": "Kulaman", "lat": 8.3200, "lng": 125.2700, "type": "Rural"},
    {"barangay": "Laguitas", "lat": 8.1250, "lng": 125.1050, "type": "Rural"},
    {"barangay": "Linabo", "lat": 8.0820, "lng": 125.1580, "type": "Rural"},
    {"barangay": "Magsaysay", "lat": 8.2650, "lng": 125.2350, "type": "Rural"},
    {"barangay": "Maligaya", "lat": 8.2450, "lng": 125.2250, "type": "Rural"},
    {"barangay": "Managok", "lat": 8.0550, "lng": 125.1750, "type": "Rural"},
    {"barangay": "Manalog", "lat": 8.2850, "lng": 125.2100, "type": "Rural"},
    {"barangay": "Mapayag", "lat": 8.1350, "lng": 125.0920, "type": "Rural"},
    {"barangay": "Mapulo", "lat": 8.1150, "lng": 125.1480, "type": "Rural"},
    {"barangay": "Miglamin", "lat": 8.0420, "lng": 125.1620, "type": "Rural"},
    {"barangay": "Patpat", "lat": 8.2050, "lng": 125.1280, "type": "Rural"},
    {"barangay": "Saint Peter", "lat": 8.3320, "lng": 125.3050, "type": "Rural"},
    {"barangay": "San Jose", "lat": 8.1554, "lng": 125.1323, "type": "Urban"},
    {"barangay": "San Martin", "lat": 8.0950, "lng": 125.1850, "type": "Rural"},
    {"barangay": "Santo Niño", "lat": 8.1150, "lng": 125.1650, "type": "Rural"},
    {"barangay": "Silae", "lat": 8.3650, "lng": 125.3350, "type": "Rural"},
    {"barangay": "Simaya", "lat": 8.0750, "lng": 125.1420, "type": "Rural"},
    {"barangay": "Sinanglanan", "lat": 8.0650, "lng": 125.1950, "type": "Rural"},
    {"barangay": "Sumpong", "lat": 8.1515, "lng": 125.1304, "type": "Urban"},
    {"barangay": "Violeta", "lat": 8.1485, "lng": 125.1402, "type": "Rural"},
    {"barangay": "Zamboanguita", "lat": 8.3780, "lng": 125.3120, "type": "Rural"},
]

# Quick lookup set for 46 barangays
ALL_BARANGAY_NAMES = set(b["barangay"] for b in MALAYBALAY_BARANGAYS)

# ===========================================================================
# HAZARD-SPECIFIC ZONES IN MALAYBALAY CITY (MGB / CDRRMO REFERENCES)
# ===========================================================================
HAZARD_ZONES = [
    # FLOOD HAZARD: Sawaga River Corridor (Flash floods from Mt. Kitanglad Watershed)
    {"location": "San Jose (Sawaga Riverbank)", "lat": 8.1554, "lng": 125.1323, "riskLevel": "HIGH", "hazard": "Flood", "threshold_km": 1.5},
    {"location": "Sumpong (Sawaga Riverbank)", "lat": 8.1515, "lng": 125.1304, "riskLevel": "HIGH", "hazard": "Flood", "threshold_km": 1.2},
    {"location": "Casisang (Sawaga River Overflow)", "lat": 8.1388, "lng": 125.1272, "riskLevel": "HIGH", "hazard": "Flood", "threshold_km": 1.2},
    {"location": "Barangay 9 (Low-lying Drainage)", "lat": 8.1567, "lng": 125.1285, "riskLevel": "HIGH", "hazard": "Flood", "threshold_km": 0.8},
    
    # FLOOD HAZARD: Pulangi River Corridor (Southern and Upper Pulangi floodplains)
    {"location": "Linabo (Pulangi River Floodplain)", "lat": 8.0820, "lng": 125.1580, "riskLevel": "HIGH", "hazard": "Flood", "threshold_km": 1.5},
    {"location": "Violeta (Pulangi River Convergence)", "lat": 8.1485, "lng": 125.1402, "riskLevel": "HIGH", "hazard": "Flood", "threshold_km": 1.2},
    {"location": "Simaya (Pulangi River Lowland)", "lat": 8.0750, "lng": 125.1420, "riskLevel": "MEDIUM", "hazard": "Flood", "threshold_km": 1.5},
    {"location": "Sinanglanan (River Basin)", "lat": 8.0650, "lng": 125.1950, "riskLevel": "MEDIUM", "hazard": "Flood", "threshold_km": 1.5},

    # LANDSLIDE HAZARD: Steep slopes & Highway Cuttings
    {"location": "Cabangahan (Steep Mountain Slopes)", "lat": 8.1583, "lng": 125.0363, "riskLevel": "HIGH", "hazard": "Landslide", "threshold_km": 2.0},
    {"location": "Dalwangan (Sayre Highway Landslide Section)", "lat": 8.2160, "lng": 125.0780, "riskLevel": "HIGH", "hazard": "Landslide", "threshold_km": 1.8},
    {"location": "Patpat (Hillside Road Cutting)", "lat": 8.2050, "lng": 125.1280, "riskLevel": "HIGH", "hazard": "Landslide", "threshold_km": 1.5},
    {"location": "Imbayao (Mt. Kitanglad Foothill Slopes)", "lat": 8.1920, "lng": 125.0350, "riskLevel": "HIGH", "hazard": "Landslide", "threshold_km": 2.0},
    {"location": "Kabalabag (Upper Mountain Terrain)", "lat": 8.2520, "lng": 125.1850, "riskLevel": "HIGH", "hazard": "Landslide", "threshold_km": 2.0},
    {"location": "Canayan (Erosion Slopes)", "lat": 8.1875, "lng": 125.1538, "riskLevel": "MEDIUM", "hazard": "Landslide", "threshold_km": 1.5},
    {"location": "Bangcud (Highway Slope Section)", "lat": 8.1580, "lng": 125.1212, "riskLevel": "MEDIUM", "hazard": "Landslide", "threshold_km": 1.2},

    # FIRE HAZARD: Dense Commercial and Clustered Residential Zones
    {"location": "Barangay 9 (Malaybalay Public Market)", "lat": 8.1567, "lng": 125.1285, "riskLevel": "HIGH", "hazard": "Fire", "threshold_km": 0.8},
    {"location": "Barangay 2 / Poblacion (Commercial Strip)", "lat": 8.1582, "lng": 125.1258, "riskLevel": "HIGH", "hazard": "Fire", "threshold_km": 0.6},
    {"location": "Casisang (Dense Residential Clusters)", "lat": 8.1388, "lng": 125.1272, "riskLevel": "HIGH", "hazard": "Fire", "threshold_km": 1.0},
    {"location": "Aglayan (Commercial Highway Junction)", "lat": 8.1472, "lng": 125.1180, "riskLevel": "MEDIUM", "hazard": "Fire", "threshold_km": 1.0},

    # EARTHQUAKE HAZARD: Active faults / Seismic corridors
    {"location": "Casisang (Seismic Susceptibility Zone)", "lat": 8.1388, "lng": 125.1272, "riskLevel": "HIGH", "hazard": "Earthquake", "threshold_km": 2.0},
    {"location": "Violeta (Fault Line Corridor)", "lat": 8.1485, "lng": 125.1402, "riskLevel": "HIGH", "hazard": "Earthquake", "threshold_km": 2.0},
    {"location": "Aglayan (Alluvial Seismic Amplification)", "lat": 8.1472, "lng": 125.1180, "riskLevel": "MEDIUM", "hazard": "Earthquake", "threshold_km": 1.5},
]

# Hotspots per barangay (historical incidents from CDRRMO)
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
    ("Dalwangan", "Landslide"): 31,
    ("Cabangahan", "Landslide"): 35,
    ("Linabo", "Flood"): 28,
    ("Patpat", "Landslide"): 24,
    ("Kabalabag", "Landslide"): 25,
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

# ===========================================================================
# SPATIAL UTILITIES
# ===========================================================================

def haversine(lat1, lon1, lat2, lon2):
    """Haversine distance between two points in km."""
    R = 6371.0  # Earth radius in km
    dLat = np.radians(lat2 - lat1)
    dLon = np.radians(lon2 - lon1)
    a = np.sin(dLat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return float(R * c)


def find_nearest_barangay(lat, lng):
    """
    Finds the exact nearest barangay among all 46 official barangays of Malaybalay City.
    """
    min_dist = float('inf')
    nearest = "Barangay 9"
    for b in MALAYBALAY_BARANGAYS:
        dist = haversine(lat, lng, b["lat"], b["lng"])
        if dist < min_dist:
            min_dist = dist
            nearest = b["barangay"]
    return nearest


def find_nearest_hazard_zone(lat, lng, disaster_type=None):
    """
    Finds the nearest hazard zone in Malaybalay City.
    Hazard-Aware: If disaster_type is specified (e.g., 'Flood', 'Landslide', 'Fire'),
    it filters specifically for hazard zones corresponding to that disaster type,
    ensuring physically realistic risk assessment.
    """
    min_dist = float('inf')
    risk_level = "NONE"
    
    # Filter zones by hazard type if specified
    d_type_clean = str(disaster_type or '').strip().capitalize()
    candidate_zones = [z for z in HAZARD_ZONES if z.get("hazard") == d_type_clean]
    if not candidate_zones:
        candidate_zones = HAZARD_ZONES  # fallback to all zones if unspecified or unknown
        
    for zone in candidate_zones:
        dist = haversine(lat, lng, zone["lat"], zone["lng"])
        thresh = zone.get("threshold_km", 1.5)
        if dist < min_dist:
            min_dist = dist
            if dist <= thresh:
                risk_level = zone["riskLevel"]
            else:
                risk_level = "NONE"

    return risk_level, min_dist


# ===========================================================================
# MALAYBALAY CRITICAL CORRIDORS & ELEVATION TOPOGRAPHY
# ===========================================================================

SAWAGA_CORRIDOR = [
    (8.1750, 125.1150),  # Kalasungay (watershed entry)
    (8.1515, 125.1304),  # Sumpong
    (8.1554, 125.1323),  # San Jose
    (8.1388, 125.1272),  # Casisang (flood overflow plain)
    (8.1580, 125.1212),  # Bangcud (river convergence)
]

PULANGI_CORRIDOR = [
    (8.0820, 125.1580),  # Linabo floodplain
    (8.1485, 125.1402),  # Violeta river convergence
    (8.0750, 125.1420),  # Simaya lowland
    (8.0650, 125.1950),  # Sinanglanan river basin
    (8.0280, 125.1450),  # Apo Macote lower basin
]

SAYRE_HIGHWAY = [
    (8.2160, 125.0780),  # Dalwangan mountain pass
    (8.1750, 125.1150),  # Kalasungay
    (8.1575, 125.1278),  # Poblacion city center
    (8.1388, 125.1272),  # Casisang transit corridor
    (8.1472, 125.1180),  # Aglayan commercial junction
    (8.1580, 125.1212),  # Bangcud highway section
]

BARANGAY_ELEVATION = {
    "Cabangahan": 1050, "Imbayao": 1150, "Dalwangan": 950, "Kabalabag": 900, "Canayan": 750, "Patpat": 800,
    "Barangay 1": 620, "Barangay 2": 620, "Barangay 3": 620, "Barangay 4": 620, "Barangay 5": 620,
    "Barangay 6": 620, "Barangay 7": 615, "Barangay 8": 615, "Barangay 9": 620, "Barangay 10": 620, "Barangay 11": 620,
    "Malaybalay Proper": 620, "Sumpong": 600, "Casisang": 590, "San Jose": 580, "Bangcud": 550, "Aglayan": 540,
    "Violeta": 510, "Linabo": 390, "Simaya": 380, "Sinanglanan": 370, "Apo Macote": 340, "Santo Niño": 410,
    "Kalasungay": 680, "Busdi": 850, "Kulaman": 780, "Zamboanguita": 820
}

TYPES_5 = ['Earthquake', 'Fire', 'Flood', 'Landslide', 'Typhoon']

SPATIAL_FEATURE_NAMES = [
    'lat_norm', 'lng_norm',
    'dist_sawaga_km', 'dist_pulangi_km', 'dist_sayre_highway_km',
    'dist_hazard_km', 'hazard_risk_level',
    'historical_incident_count', 'is_hotspot',
    'is_urban', 'elevation_km',
    'cluster_count',
    'type_Earthquake', 'type_Fire', 'type_Flood', 'type_Landslide', 'type_Typhoon'
]

def min_corridor_dist(lat, lng, corridor):
    return min(haversine(lat, lng, pt[0], pt[1]) for pt in corridor)

def extract_spatial_features(lat, lng, disaster_type='Flood', cluster_count=1, barangay=None):
    """
    Extracts 17 physical and geographic features across Malaybalay City.
    Used by the calibrated Spatial Severity Intelligence Model.
    """
    d_type = str(disaster_type or 'Flood').capitalize()
    if d_type not in TYPES_5:
        d_type = 'Flood'
    brgy = str(barangay or find_nearest_barangay(lat, lng))
    
    d_sawaga = min_corridor_dist(lat, lng, SAWAGA_CORRIDOR)
    d_pulangi = min_corridor_dist(lat, lng, PULANGI_CORRIDOR)
    d_highway = min_corridor_dist(lat, lng, SAYRE_HIGHWAY)
    
    risk, dist_hazard = find_nearest_hazard_zone(lat, lng, disaster_type=d_type)
    risk_enc = 3 if risk == 'HIGH' else (2 if risk == 'MEDIUM' else 1)
    
    hist_count = HOTSPOT_COUNTS.get((brgy, d_type), 15)
    is_hotspot = 1 if hist_count >= 25 else 0
    
    is_urban = 1 if any(b['barangay'] == brgy and b.get('type') == 'Urban' for b in MALAYBALAY_BARANGAYS) else 0
    elev = BARANGAY_ELEVATION.get(brgy, 600)
    
    lat_norm = float(np.clip((lat - 8.00) / 0.45, 0.0, 1.0))
    lng_norm = float(np.clip((lng - 125.00) / 0.40, 0.0, 1.0))
    
    nearby = max(1, int(cluster_count or 1))
    type_vec = [1 if d_type == t else 0 for t in TYPES_5]
    
    return [
        lat_norm, lng_norm,
        d_sawaga, d_pulangi, d_highway,
        dist_hazard, risk_enc,
        hist_count, is_hotspot,
        is_urban, elev / 1000.0,
        nearby
    ] + type_vec


# ===========================================================================
# EMERGENCY DISTRESS SAFEGUARDS & LEXICAL GUIDANCE
# ===========================================================================

EMERGENCY_WORDS = {
    'tabang', 'tulong', 'rescue', 'help', 'saklolo', 'emergency',
    'baha', 'lunop', 'overflow', 'submerged', 'tubig', 'nalunod', 'drowning', 'sapa',
    'sunog', 'kalayo', 'apoy', 'usok', 'blaze', 'fire', 'burning', 'nasunog',
    'linog', 'lindol', 'liki', 'nangliki', 'gumuho', 'shaking', 'tremor', 'earthquake',
    'dahili', 'nidahili', 'landslide', 'guho', 'yuta', 'natabunan',
    'bagyo', 'typhoon', 'storm', 'hangin',
    'naipit', 'trapped', 'trap', 'sugatan', 'samad', 'patay', 'casualty', 'dead'
}

PRANK_WORDS = {
    'joke', 'prank', 'testing', 'test', 'drill', 'binuang', 'char', 'charot',
    'tripping', 'simulation', 'fake', 'practice'
}

DISASTER_LEXICON_MAP = {
    'Fire': {'sunog', 'kalayo', 'apoy', 'usok', 'blaze', 'fire', 'burning', 'nasunog', 'nagkalayo'},
    'Flood': {'baha', 'lunop', 'overflow', 'submerged', 'tubig', 'nalunod', 'drowning', 'sapa', 'anod', 'lapas-hawak', 'lapas-ulo'},
    'Earthquake': {'linog', 'lindol', 'liki', 'nangliki', 'gumuho', 'shaking', 'tremor', 'earthquake', 'tay-og'},
    'Landslide': {'dahili', 'nidahili', 'landslide', 'guho', 'yuta', 'natabunan', 'mudslide'},
    'Typhoon': {'bagyo', 'typhoon', 'storm', 'hangin', 'hurricane', 'cyclone', 'unos'}
}

def _boost_class_prob(proba, target_idx, min_prob):
    """Sets class `target_idx` to at least `min_prob` while scaling other classes proportionally to sum to 1.0."""
    p = proba.copy().astype(float)
    if p[target_idx] >= min_prob:
        return p / p.sum()
    other_sum = float(p.sum() - p[target_idx])
    p[target_idx] = float(min_prob)
    if other_sum > 1e-9:
        scale = (1.0 - min_prob) / other_sum
        for i in range(len(p)):
            if i != target_idx:
                p[i] *= scale
    else:
        rem = (1.0 - min_prob) / max(1, len(p) - 1)
        for i in range(len(p)):
            if i != target_idx:
                p[i] = rem
    return p / p.sum()


def apply_emergency_safeguards(norm_text, tokens, proba_type, proba_sev, proba_leg,
                               type_classes, sev_classes, leg_classes, user_disaster_type=None,
                               hazard_risk='NONE'):
    """
    Applies mission-critical safety rules:
    1. Legitimate distress messages (e.g. 'tabang', 'baha sa amo', 'naay sunog') are NEVER
       downgraded to false_alarm.
    2. Disaster types explicitly named in the distress message receive proper lexical weighting
       when the base model is uncertain or misclassifies Filipino/Cebuano terms.
    3. Life-threat and structural damage keywords escalate severity appropriately and prevent
       real emergency calls from being classified as 'low' severity.
    """
    tok_set = set(tokens)
    has_emergency = bool(tok_set & EMERGENCY_WORDS)
    has_prank = bool(tok_set & PRANK_WORDS)
    
    # 1. Legitimacy Safeguard
    p_leg = proba_leg.copy()
    leg_idx = leg_classes.index('legitimate')
    fa_idx = leg_classes.index('false_alarm')
    
    if has_prank and not has_emergency:
        p_leg = _boost_class_prob(p_leg, fa_idx, 0.88)
    elif has_emergency and not has_prank:
        # Real emergency call: Never flag as false alarm!
        p_leg = _boost_class_prob(p_leg, leg_idx, 0.92)
        
    # 2. Disaster Type Lexical Guidance
    p_type = proba_type.copy()
    type_hits = {t: len(tok_set & words) for t, words in DISASTER_LEXICON_MAP.items()}
    best_hit_type = max(type_hits, key=type_hits.get)
    max_hits = type_hits[best_hit_type]
    
    if max_hits > 0 and not has_prank:
        target_idx = type_classes.index(best_hit_type)
        min_type_conf = min(0.88, 0.72 + (max_hits - 1) * 0.08)
        if int(np.argmax(p_type)) != target_idx or p_type[target_idx] < min_type_conf:
            p_type = _boost_class_prob(p_type, target_idx, min_type_conf)
    elif user_disaster_type and user_disaster_type in type_classes and not has_prank:
        target_idx = type_classes.index(user_disaster_type)
        if p_type[target_idx] < 0.65:
            p_type = _boost_class_prob(p_type, target_idx, 0.75)

    # 3. Severity Threat Escalation (only if not a prank)
    p_sev = proba_sev.copy()
    low_idx = sev_classes.index('low')
    mod_idx = sev_classes.index('moderate')
    high_idx = sev_classes.index('high')
    crit_idx = sev_classes.index('critical')

    crit_words = {
        'trapped', 'naipit', 'nalunod', 'drowning', 'patay', 'dead', 'casualty', 'casualties',
        'lapas-ulo', 'stranded', 'natabunan', 'buried', 'unconscious', 'bleeding', 'nalumos',
        'hawak', 'chest'
    }
    high_words = {
        'nangliki', 'naliki', 'liki', 'gumuho', 'collapsed', 'collapse', 'dako', 'dakong',
        'kusog', 'grabe', 'nagkalat', 'spreading', 'lapas', 'roof', 'atop',
        'merkado', 'highway', 'blocked'
    }

    if not has_prank:
        if bool(tok_set & crit_words):
            p_sev[low_idx] = min(p_sev[low_idx], 0.03)
            p_sev = _boost_class_prob(p_sev, crit_idx, 0.68)
        elif bool(tok_set & high_words):
            p_sev[low_idx] = min(p_sev[low_idx], 0.05)
            if p_sev[crit_idx] < 0.55:
                p_sev = _boost_class_prob(p_sev, high_idx, 0.66)
        elif has_emergency:
            # Active emergency distress call should never default to 'low' severity
            p_sev[low_idx] = min(p_sev[low_idx], 0.05)
            if hazard_risk == 'HIGH':
                p_sev = _boost_class_prob(p_sev, high_idx, 0.65)
            else:
                p_sev = _boost_class_prob(p_sev, mod_idx, 0.62)
    else:
        # Prank / test / drill -> downgrade severity to low
        p_sev = _boost_class_prob(p_sev, low_idx, 0.75)

    return p_type, p_sev, p_leg


# ===========================================================================
# LEGACY DATASET PREPROCESSING (COMPATIBILITY)
# ===========================================================================

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
    """Legacy feature preparation for backward compatibility."""
    df_out = df.copy()
    lat_min, lat_max = 8.00, 8.45
    lng_min, lng_max = 125.00, 125.40

    df_out['lat_normalized'] = ((df_out['latitude'] - lat_min) / (lat_max - lat_min)).clip(0, 1)
    df_out['lng_normalized'] = ((df_out['longitude'] - lng_min) / (lng_max - lng_min)).clip(0, 1)

    if 'barangay' not in df_out.columns:
        df_out['barangay'] = df_out.apply(
            lambda r: find_nearest_barangay(r['latitude'], r['longitude']), axis=1
        )
    return df_out


def encode_targets(df):
    encoders = {}
    for col in ['disaster_type', 'severity', 'barangay']:
        if col in df.columns:
            le = LabelEncoder()
            df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
    return df, encoders


def save_encoders(encoders, path='models/label_encoders.pkl'):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(encoders, path)


def get_feature_names():
    return FEATURE_NAMES_SEVERITY


def load_encoders(path='models/label_encoders.pkl'):
    return joblib.load(path)


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
