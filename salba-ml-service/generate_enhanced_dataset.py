#!/usr/bin/env python3
"""
generate_enhanced_dataset.py - Generate comprehensive, geographically-aware, 
and realistically-labeled disaster datasets for SALBA ML models.

Features:
- Deterministic severity rules reflecting Malaybalay CDRRMO dispatch realities
- Geographical intelligence: barangay hotspots, hazard zone risk, proximity
- One-tap SOS vs text-based nuance (accurate handling of empty notes)
- Behavioral false-alarm detection patterns
- 2,500+ balanced training and testing samples
"""

import os
import json
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

# ==========================================
# 1. GEOGRAPHICAL REFERENCE DATA
# ==========================================
MALAYBALAY_BARANGAYS = [
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
    {"barangay": "Casisang", "lat": 8.1388, "lng": 125.1272, "type": "Urban"},
    {"barangay": "Sumpong", "lat": 8.1515, "lng": 125.1304, "type": "Urban"},
    {"barangay": "San Jose", "lat": 8.1554, "lng": 125.1323, "type": "Urban"},
    {"barangay": "Bangcud", "lat": 8.1580, "lng": 125.1212, "type": "Rural"},
    {"barangay": "Aglayan", "lat": 8.1472, "lng": 125.1180, "type": "Urban"},
    {"barangay": "Violeta", "lat": 8.1485, "lng": 125.1402, "type": "Rural"},
    {"barangay": "Malaybalay Proper", "lat": 8.1575, "lng": 125.1278, "type": "Urban"},
    {"barangay": "Canayan", "lat": 8.1875, "lng": 125.1538, "type": "Rural"},
    {"barangay": "Kalasungay", "lat": 8.1750, "lng": 125.1150, "type": "Rural"},
    {"barangay": "Linabo", "lat": 8.0820, "lng": 125.1580, "type": "Rural"},
    {"barangay": "Simaya", "lat": 8.0750, "lng": 125.1420, "type": "Rural"},
    {"barangay": "Santo Niño", "lat": 8.1150, "lng": 125.1650, "type": "Rural"},
    {"barangay": "Cabangahan", "lat": 8.1583, "lng": 125.0363, "type": "Rural"}
]

# Hotspots per barangay (historical incidents)
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
    {"location": "Cabangahan", "lat": 8.1583, "lng": 125.0363, "riskLevel": "HIGH", "types": ["Typhoon", "Landslide"]},
    {"location": "Barangay 9", "lat": 8.1567, "lng": 125.1285, "riskLevel": "HIGH", "types": ["Typhoon", "Flood"]},
    {"location": "San Jose", "lat": 8.1554, "lng": 125.1323, "riskLevel": "HIGH", "types": ["Flood", "Landslide"]},
    {"location": "Casisang", "lat": 8.1388, "lng": 125.1272, "riskLevel": "HIGH", "types": ["Flood", "Earthquake"]},
    {"location": "Violeta", "lat": 8.1485, "lng": 125.1402, "riskLevel": "HIGH", "types": ["Landslide", "Earthquake"]},
    {"location": "Aglayan", "lat": 8.1472, "lng": 125.1180, "riskLevel": "MEDIUM", "types": ["Fire", "Flood"]},
    {"location": "Sumpong", "lat": 8.1515, "lng": 125.1304, "riskLevel": "MEDIUM", "types": ["Flood", "Landslide"]},
    {"location": "Bangcud", "lat": 8.1580, "lng": 125.1212, "riskLevel": "MEDIUM", "types": ["Landslide"]},
    {"location": "Malaybalay Proper", "lat": 8.1575, "lng": 125.1278, "riskLevel": "LOW", "types": ["Fire"]}
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dLat = np.radians(lat2 - lat1)
    dLon = np.radians(lon2 - lon1)
    a = np.sin(dLat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

def get_nearest_hazard_zone(lat, lng):
    min_dist = float('inf')
    closest_zone = None
    for zone in HAZARD_ZONES:
        dist = haversine(lat, lng, zone["lat"], zone["lng"])
        if dist < min_dist:
            min_dist = dist
            closest_zone = zone
    return closest_zone, min_dist

# ==========================================
# 2. DETERMINISTIC SEVERITY & LEGITIMACY RULES
# ==========================================
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

def calculate_text_indicators(text):
    if not text or not isinstance(text, str):
        return 0, 0, 0
    
    lower = text.lower()
    urgency_score = sum(1 for kw in URGENCY_KEYWORDS if kw in lower)
    downgrade_score = sum(1 for kw in DOWNGRADE_KEYWORDS if kw in lower)
    prank_score = sum(1 for kw in PRANK_KEYWORDS if kw in lower)
    
    return urgency_score, downgrade_score, prank_score

def determine_severity_and_legitimacy(disaster_type, barangay, lat, lng, text="", has_user_note=True, nearby_reports_count=1):
    urgency_score, downgrade_score, prank_score = calculate_text_indicators(text)
    
    hist_count = HOTSPOT_COUNTS.get((barangay, disaster_type), 15)
    is_hotspot = 1 if hist_count >= 25 else 0
    
    closest_zone, zone_dist = get_nearest_hazard_zone(lat, lng)
    hazard_risk = closest_zone["riskLevel"] if zone_dist <= 1.5 else "NONE"
    
    # 1. False Alarm Assessment
    is_false_alarm = 0
    if prank_score > 0:
        is_false_alarm = 1
    
    # 2. Severity Assessment
    # One-tap SOS without user notes default to moderate initially unless in high hotspot / multiple reporters
    if not has_user_note or len(text.strip()) == 0 or text.strip() == barangay or text.startswith(disaster_type + " - " + barangay):
        if nearby_reports_count >= 3:
            severity = 'critical'
        elif hazard_risk == 'HIGH' and is_hotspot and disaster_type in ['Fire', 'Typhoon', 'Flood']:
            severity = 'critical'
        elif is_hotspot or hazard_risk in ['HIGH', 'MEDIUM']:
            severity = 'high' if disaster_type in ['Fire', 'Typhoon'] else 'moderate'
        else:
            severity = 'moderate'
    else:
        # User provided specific description
        if prank_score > 0:
            severity = 'low'
        elif urgency_score >= 2 or 'trapped' in text.lower() or 'casualties' in text.lower() or 'massive' in text.lower():
            severity = 'critical'
        elif downgrade_score >= 2 or 'small' in text.lower() or 'trash' in text.lower():
            severity = 'low'
        elif downgrade_score == 1:
            severity = 'moderate'
        elif urgency_score == 1:
            severity = 'high'
        elif nearby_reports_count >= 3:
            severity = 'critical'
        elif hazard_risk == 'HIGH' and is_hotspot:
            severity = 'high' if disaster_type != 'Fire' else 'critical'
        elif is_hotspot:
            severity = 'high' if disaster_type in ['Fire', 'Flood', 'Landslide', 'Typhoon'] else 'moderate'
        else:
            base_map = {
                'Fire': 'high',
                'Typhoon': 'high',
                'Flood': 'moderate',
                'Landslide': 'moderate',
                'Earthquake': 'moderate',
                'Medical': 'high'
            }
            severity = base_map.get(disaster_type, 'moderate')

    return severity, is_false_alarm, hist_count, is_hotspot, hazard_risk, zone_dist

# ==========================================
# 3. CORPUS OF REALISTIC TEXT PHRASES
# ==========================================
DESCRIPTIONS = {
    'Fire': {
        'critical': [
            "Massive structure fire spreading to adjacent residential houses URGENT HELP",
            "Huge blaze engulfing commercial warehouse people trapped inside",
            "Forest fire moving rapidly towards community high wind spreading flames",
            "Multiple houses on fire with children trapped send rescue immediately",
            "Gas station explosion and uncontrolled fire spreading fast"
        ],
        'high': [
            "House fire with heavy black smoke visible from street",
            "Uncontrolled fire outbreak in residential neighborhood",
            "Electrical fire spreading across building roof",
            "Fire breaking out in commercial store, smoke filling area",
            "Kitchen fire ignited wall spreading to second floor"
        ],
        'moderate': [
            "Smoke and flames seen from vacant lot",
            "Small brush fire burning near perimeter fence",
            "Overheated electrical transformer sparking and caught small fire",
            "Bonfire unattended spreading slightly to dry grass",
            "Smoke coming from residential backyard"
        ],
        'low': [
            "Small trash can fire already contained by neighbors",
            "Minor burning of garbage contained in metal drum",
            "Small grass fire controlled with garden hose",
            "Test fire safety drill conducted at school grounds",
            "Small camp fire burning out safely"
        ]
    },
    'Flood': {
        'critical': [
            "Flash flood water rising to second floor residents trapped on roofs",
            "River overflowing rapidly sweeping away vehicles people stranded",
            "Torrential floodwater chest deep currents strong rescue boat needed",
            "Dam overflowing sudden massive surge of water entering all homes",
            "Severe flooding elderly residents unable to evacuate trapped inside"
        ],
        'high': [
            "Floodwater already waist deep entering living rooms",
            "Heavy continuous rain caused river to overflow into streets",
            "Street submerged under 3 feet of water cars stalling",
            "Floodwaters entering homes rapidly after heavy downpour",
            "Main drainage backed up causing severe street flooding"
        ],
        'moderate': [
            "Flood entering yard after heavy rain knee deep water",
            "Water rising slowly near our house gutter overflowing",
            "Street flooding making road impassable for small vehicles",
            "Creek water level high reaching road shoulder",
            "Moderate water accumulation on low-lying purok road"
        ],
        'low': [
            "Minor street puddle after light shower subsiding quickly",
            "Slight water buildup on roadside drainage working fine",
            "Small puddles formed in driveway no property threat",
            "Puddle of rain water drying up slowly",
            "Minor drainage overflow contained on street side"
        ]
    },
    'Earthquake': {
        'critical': [
            "Major violent earthquake building collapsed people trapped under rubble",
            "Severe seismic shaking cracked bridge collapsed school wall",
            "Destructive ground shaking multiple structures damaged people injured",
            "Intense earthquake caused severe structural failure in commercial building",
            "Strong tremor caused building facade collapse road cracked open"
        ],
        'high': [
            "Strong earthquake alarmed residents cracked walls and shattered windows",
            "Heavy shaking felt for 30 seconds items fell from shelves cracks on road",
            "Strong ground motion caused ceiling damage and deep wall cracks",
            "Vigorous shaking caused power outage and superficial structure damage",
            "Strong tremor caused panic visible fissures in concrete pavement"
        ],
        'moderate': [
            "Buildings shaking for several seconds hanging lights swinging",
            "Noticeable tremor felt by people indoors doors rattling",
            "Moderate earthquake felt across barangay no visible damage",
            "Ground shaking felt for 10 seconds slight vibration",
            "Earthquake tremors felt alarmed neighbors stepped outside"
        ],
        'low': [
            "Minor tremor felt faintly by few people at rest",
            "Very slight vibration barely noticeable no damage",
            "Small tremor recorded mild shaking",
            "Brief mild rumble felt on second floor only",
            "Slight shake noticed no issues reported"
        ]
    },
    'Landslide': {
        'critical': [
            "Massive hillside collapse buried 2 houses people trapped",
            "Large rockslide crushed vehicles and blocked main highway completely",
            "Huge mudslide continuing to move towards village emergency evacuation needed",
            "Catastrophic slope failure covered residential road casualties feared",
            "Steep mountain slide swept away structures active soil movement"
        ],
        'high': [
            "Heavy rain triggered landslide near homes blocking access road",
            "Soil and large boulders falling from hillside into road",
            "Road covered by landslide debris heavy equipment needed to clear",
            "Hillside erosion threatening foundation of roadside homes",
            "Mudflow blocked purok entrance soil continuing to loosen"
        ],
        'moderate': [
            "Landslide blocking one lane of road soil slowly sliding",
            "Small mudslide on hillside after continuous rainfall",
            "Slope erosion noticed near drainage ditch",
            "Soil displacement along highway shoulder rocks scattered",
            "Minor soil slide blocking footpath"
        ],
        'low': [
            "Minor soil runoff along road gutter no blockage",
            "Small gravel and soil fell from slope safely cleared",
            "Slight surface soil slippage on grassy bank",
            "Few rocks rolled down roadside ditch",
            "Small soil erosion in vacant lot no hazard"
        ]
    },
    'Typhoon': {
        'critical': [
            "Violent super typhoon winds ripping off roofs trees falling on houses",
            "Severe tropical storm with destructive winds power lines down fires starting",
            "Category 4 winds tearing apart structures flying debris dangerous",
            "Extreme storm surge combined with gale force winds devastating coastal/river area",
            "Catastrophic typhoon damage roofs blown away people injured"
        ],
        'high': [
            "Strong typhoon winds blowing off tin roofs and toppling electric posts",
            "Severe tropical storm heavy rain combined with damaging gusts",
            "Fierce winds causing trees to fall across main roads and houses",
            "Typhoon signal 3 destructive winds continuous heavy rainfall",
            "Dangerous wind gusts breaking tree branches and smashing windows"
        ],
        'moderate': [
            "Typhoon approaching region moderate continuous rains and gusty winds",
            "Strong wind and intermittent rain small branches broken",
            "Tropical depression bringing steady rainfall and breezy conditions",
            "Moderate storm winds blowing loose signs and tarpaulins",
            "Rainy weather with occasional strong gusts"
        ],
        'low': [
            "Passing light rain shower with mild breeze",
            "Overcast skies and light drizzle no strong winds",
            "Gentle rain without gusty winds",
            "Light precipitation weather clearing up",
            "Mild windy weather with occasional light rain"
        ]
    }
}

# ==========================================
# 4. GENERATE COMPLETE DATASET
# ==========================================
def generate_dataset():
    print("Generating comprehensive Malaybalay disaster dataset...")
    records = []
    base_date = datetime(2025, 1, 1)
    
    # 1. First, process the existing 1000 reports from malaybalay_disaster_reports_1000.csv with corrected labels
    existing_file = 'data/malaybalay_disaster_reports_1000.csv'
    if os.path.exists(existing_file):
        df_old = pd.read_csv(existing_file)
        print(f"Loaded {len(df_old)} existing reports to re-label deterministically...")
        for _, row in df_old.iterrows():
            d_type = str(row['disaster_type']).strip()
            if d_type not in DESCRIPTIONS:
                d_type = 'Flood'
            
            b_name = str(row['barangay']).strip()
            lat = float(row['latitude'])
            lng = float(row['longitude'])
            text = str(row['report_text']).strip()
            
            # Re-evaluate severity and legitimacy
            sev, is_fa, hist_count, is_hotspot, hazard_risk, zone_dist = determine_severity_and_legitimacy(
                d_type, b_name, lat, lng, text=text, has_user_note=True
            )
            
            ts = pd.to_datetime(row['timestamp']).isoformat()
            
            urg, down, prank = calculate_text_indicators(text)
            
            records.append({
                'report_id': f"REP-EXT-{len(records)+1:04d}",
                'report_text': text,
                'disaster_type': d_type,
                'severity': sev,
                'latitude': lat,
                'longitude': lng,
                'barangay': b_name,
                'created_at': ts,
                'has_user_note': 1,
                'text_length': len(text),
                'word_count': len(text.split()),
                'has_urgency': 1 if urg > 0 else 0,
                'note_urgency_score': urg,
                'note_downgrade_score': down,
                'has_prank_keywords': 1 if prank > 0 else 0,
                'is_false_alarm': is_fa,
                'is_hotspot': is_hotspot,
                'historical_incident_count': hist_count,
                'hazard_zone_risk': hazard_risk,
                'hazard_zone_distance_km': round(zone_dist, 2)
            })

    print(f"Generated {len(records)} re-labeled reports from historical records.")
    
    # 2. Add 1,500 additional diverse scenarios:
    # - 500 One-Tap SOS (no user notes)
    # - 600 Detailed text emergency reports across all severities
    # - 200 False alarms / Prank / Test drills / Non-emergencies
    # - 200 Cluster reports & multi-user escalations
    
    # A. One-Tap SOS alerts (DisasterSOS one-tap)
    for _ in range(500):
        b_info = random.choice(MALAYBALAY_BARANGAYS)
        b_name = b_info["barangay"]
        lat = b_info["lat"] + random.uniform(-0.003, 0.003)
        lng = b_info["lng"] + random.uniform(-0.003, 0.003)
        d_type = random.choice(['Fire', 'Flood', 'Earthquake', 'Landslide', 'Typhoon'])
        
        # One-tap format: note is auto-generated default or empty
        text = f"{d_type} - {b_name}" if random.random() > 0.5 else ""
        
        sev, is_fa, hist_count, is_hotspot, hazard_risk, zone_dist = determine_severity_and_legitimacy(
            d_type, b_name, lat, lng, text=text, has_user_note=False
        )
        
        days_offset = random.randint(0, 400)
        ts = (base_date + timedelta(days=days_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))).isoformat()
        
        records.append({
            'report_id': f"REP-ONETAP-{len(records)+1:04d}",
            'report_text': text,
            'disaster_type': d_type,
            'severity': sev,
            'latitude': lat,
            'longitude': lng,
            'barangay': b_name,
            'created_at': ts,
            'has_user_note': 0,
            'text_length': len(text),
            'word_count': len(text.split()),
            'has_urgency': 0,
            'note_urgency_score': 0,
            'note_downgrade_score': 0,
            'has_prank_keywords': 0,
            'is_false_alarm': 0,
            'is_hotspot': is_hotspot,
            'historical_incident_count': hist_count,
            'hazard_zone_risk': hazard_risk,
            'hazard_zone_distance_km': round(zone_dist, 2)
        })

    # B. Detailed text reports across all severities
    for d_type in DESCRIPTIONS:
        for target_sev in ['critical', 'high', 'moderate', 'low']:
            phrases = DESCRIPTIONS[d_type][target_sev]
            for phrase in phrases:
                # Repeat each phrase in 6 different barangays
                sampled_barangays = random.sample(MALAYBALAY_BARANGAYS, 6)
                for b_info in sampled_barangays:
                    b_name = b_info["barangay"]
                    lat = b_info["lat"] + random.uniform(-0.004, 0.004)
                    lng = b_info["lng"] + random.uniform(-0.004, 0.004)
                    
                    sev, is_fa, hist_count, is_hotspot, hazard_risk, zone_dist = determine_severity_and_legitimacy(
                        d_type, b_name, lat, lng, text=phrase, has_user_note=True
                    )
                    
                    days_offset = random.randint(0, 400)
                    ts = (base_date + timedelta(days=days_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))).isoformat()
                    urg, down, prank = calculate_text_indicators(phrase)
                    
                    records.append({
                        'report_id': f"REP-TEXT-{len(records)+1:04d}",
                        'report_text': phrase,
                        'disaster_type': d_type,
                        'severity': sev,
                        'latitude': lat,
                        'longitude': lng,
                        'barangay': b_name,
                        'created_at': ts,
                        'has_user_note': 1,
                        'text_length': len(phrase),
                        'word_count': len(phrase.split()),
                        'has_urgency': 1 if urg > 0 else 0,
                        'note_urgency_score': urg,
                        'note_downgrade_score': down,
                        'has_prank_keywords': 1 if prank > 0 else 0,
                        'is_false_alarm': is_fa,
                        'is_hotspot': is_hotspot,
                        'historical_incident_count': hist_count,
                        'hazard_zone_risk': hazard_risk,
                        'hazard_zone_distance_km': round(zone_dist, 2)
                    })

    # C. False Alarms, Pranks, and Drill Scenarios
    PRANK_PHRASES = [
        "test emergency alert system please ignore",
        "testing the app and button response",
        "lol this is just a prank fire",
        "drill simulation drill only do not dispatch",
        "joke lang walang sunog testing lang",
        "sample test report for capstone evaluation",
        "prank call fake alarm haha",
        "system test drill for cdrrmo rescuers",
        "dummy alert testing gps coordinates",
        "fake report test only"
    ]
    for _ in range(200):
        b_info = random.choice(MALAYBALAY_BARANGAYS)
        b_name = b_info["barangay"]
        lat = b_info["lat"] + random.uniform(-0.005, 0.005)
        lng = b_info["lng"] + random.uniform(-0.005, 0.005)
        d_type = random.choice(['Fire', 'Flood', 'Earthquake', 'Landslide', 'Typhoon'])
        phrase = random.choice(PRANK_PHRASES)
        
        days_offset = random.randint(0, 400)
        ts = (base_date + timedelta(days=days_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))).isoformat()
        
        hist_count = HOTSPOT_COUNTS.get((b_name, d_type), 15)
        is_hotspot = 1 if hist_count >= 25 else 0
        closest_zone, zone_dist = get_nearest_hazard_zone(lat, lng)
        hazard_risk = closest_zone["riskLevel"] if zone_dist <= 1.5 else "NONE"
        
        records.append({
            'report_id': f"REP-FA-{len(records)+1:04d}",
            'report_text': phrase,
            'disaster_type': d_type,
            'severity': 'low',
            'latitude': lat,
            'longitude': lng,
            'barangay': b_name,
            'created_at': ts,
            'has_user_note': 1,
            'text_length': len(phrase),
            'word_count': len(phrase.split()),
            'has_urgency': 0,
            'note_urgency_score': 0,
            'note_downgrade_score': 1,
            'has_prank_keywords': 1,
            'is_false_alarm': 1,
            'is_hotspot': is_hotspot,
            'historical_incident_count': hist_count,
            'hazard_zone_risk': hazard_risk,
            'hazard_zone_distance_km': round(zone_dist, 2)
        })

    # D. Multi-reporter Cluster Incidents (Escalated to Critical)
    for _ in range(200):
        b_info = random.choice(MALAYBALAY_BARANGAYS)
        b_name = b_info["barangay"]
        lat = b_info["lat"] + random.uniform(-0.001, 0.001)
        lng = b_info["lng"] + random.uniform(-0.001, 0.001)
        d_type = random.choice(['Fire', 'Flood', 'Earthquake', 'Landslide'])
        
        phrase = random.choice(DESCRIPTIONS[d_type]['high'] + DESCRIPTIONS[d_type]['critical'])
        
        sev, is_fa, hist_count, is_hotspot, hazard_risk, zone_dist = determine_severity_and_legitimacy(
            d_type, b_name, lat, lng, text=phrase, has_user_note=True, nearby_reports_count=4
        )
        
        days_offset = random.randint(0, 400)
        ts = (base_date + timedelta(days=days_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))).isoformat()
        urg, down, prank = calculate_text_indicators(phrase)
        
        records.append({
            'report_id': f"REP-CLUSTER-{len(records)+1:04d}",
            'report_text': phrase,
            'disaster_type': d_type,
            'severity': 'critical',  # Cluster of 3+ unique reporters guarantees critical
            'latitude': lat,
            'longitude': lng,
            'barangay': b_name,
            'created_at': ts,
            'has_user_note': 1,
            'text_length': len(phrase),
            'word_count': len(phrase.split()),
            'has_urgency': 1 if urg > 0 else 0,
            'note_urgency_score': urg,
            'note_downgrade_score': down,
            'has_prank_keywords': 0,
            'is_false_alarm': 0,
            'is_hotspot': is_hotspot,
            'historical_incident_count': hist_count,
            'hazard_zone_risk': hazard_risk,
            'hazard_zone_distance_km': round(zone_dist, 2)
        })

    df = pd.DataFrame(records)
    
    # Shuffle dataframe
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    out_file = 'data/malaybalay_disaster_reports_enhanced.csv'
    df.to_csv(out_file, index=False)
    print(f"\nSaved {len(df)} records to {out_file}")
    
    # Save 80/20 train/test split
    split_idx = int(len(df) * 0.8)
    df_train = df.iloc[:split_idx]
    df_test = df.iloc[split_idx:]
    
    df_train.to_csv('data/train_data.csv', index=False)
    df_test.to_csv('data/test_data.csv', index=False)
    print(f"Saved {len(df_train)} train samples to data/train_data.csv")
    print(f"Saved {len(df_test)} test samples to data/test_data.csv")
    
    # Statistics
    print("\nDataset Statistics:")
    print("Disaster Type Distribution:\n", df['disaster_type'].value_counts())
    print("\nSeverity Distribution:\n", df['severity'].value_counts())
    print("\nFalse Alarm Distribution:\n", df['is_false_alarm'].value_counts())
    print("\nOne-Tap vs Text Distribution:\n", df['has_user_note'].value_counts())

if __name__ == '__main__':
    generate_dataset()
