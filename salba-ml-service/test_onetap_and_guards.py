import os, sys
ROOT = r'c:\Users\Zam\OneDrive\Desktop\capstone\SALBA-CDRRMO-RESCUE-APP\salba-ml-service'
os.chdir(ROOT); sys.path.insert(0, ROOT)

from app import evaluate_report_v2

print("=" * 80)
print("TEST 1: ONE-TAP SOS GEOGRAPHIC SEVERITY IN MALAYBALAY CITY")
print("=" * 80)

onetap_tests = [
    {
        "name": "One-Tap Flood in Casisang (Sawaga River Basin Corridor)",
        "data": {
            "description": "",
            "latitude": 8.1388,
            "longitude": 125.1272,
            "disaster_type": "Flood",
            "nearby_reports_count": 1
        }
    },
    {
        "name": "One-Tap Landslide on Cabangahan Slopes (Sayre Highway Mountain Section)",
        "data": {
            "description": "",
            "latitude": 8.1583,
            "longitude": 125.0363,
            "disaster_type": "Landslide",
            "nearby_reports_count": 1
        }
    },
    {
        "name": "One-Tap Fire in Barangay 9 (Dense Public Market Commercial Core)",
        "data": {
            "description": "",
            "latitude": 8.1567,
            "longitude": 125.1285,
            "disaster_type": "Fire",
            "nearby_reports_count": 1
        }
    },
    {
        "name": "One-Tap Earthquake in Casisang (Seismic Susceptibility Zone)",
        "data": {
            "description": "",
            "latitude": 8.1388,
            "longitude": 125.1272,
            "disaster_type": "Earthquake",
            "nearby_reports_count": 1
        }
    },
    {
        "name": "One-Tap Flood in Casisang - 3 REPORT CLUSTER CORROBORATION",
        "data": {
            "description": "",
            "latitude": 8.1388,
            "longitude": 125.1272,
            "disaster_type": "Flood",
            "nearby_reports_count": 3
        }
    }
]

for test in onetap_tests:
    res = evaluate_report_v2(test['data'])
    clf = res['classification']
    sev = res['severity']
    ver = res['verification']
    ovr = res['overall']
    print(f"\nScenario: {test['name']}")
    print(f"  Type:           {clf['disaster_type']} (Confidence: {clf['confidence']:.2f})")
    print(f"  Severity:       {sev['level'].upper()} (Confidence: {sev['confidence']:.2f})")
    print(f"  Severity Probs: {sev['probabilities']}")
    print(f"  Legitimate:     {ver['is_legitimate']} (Confidence: {ver['confidence']:.2f})")
    print(f"  Recommendation: {ovr['recommendation']}")

print("\n" + "=" * 80)
print("TEST 2: SHORT EMERGENCY CITIZEN TEXTS (SAFETY SAFEGUARDS)")
print("=" * 80)

text_tests = [
    {"desc": "baha sa amo", "lat": 8.1388, "lng": 125.1272, "type": "Flood"},
    {"desc": "naay sunog", "lat": 8.1567, "lng": 125.1285, "type": "Fire"},
    {"desc": "tabang", "lat": 8.1575, "lng": 125.1278, "type": "Flood"},
    {"desc": "Grabe ang linog kusog kaayo nangliki ang mga pader sa balay diri sa Barangay 9!", "lat": 8.1567, "lng": 125.1285, "type": None},
    {"desc": "Nidahili ang yuta sa may Cabangahan highway, natabunan ang dalan dili maagian.", "lat": 8.1583, "lng": 125.0363, "type": None},
    {"desc": "nalunod akong anak sa sapa tabang palihug", "lat": 8.1388, "lng": 125.1272, "type": "Flood"},
    {"desc": "joke lang to mga sir binuang ra to ayaw ninyo tinuora haha", "lat": 8.1575, "lng": 125.1278, "type": None},
    {"desc": "Testing emergency alert sound drill only", "lat": 8.1575, "lng": 125.1278, "type": None}
]

for t in text_tests:
    res = evaluate_report_v2({
        "description": t["desc"],
        "latitude": t["lat"],
        "longitude": t["lng"],
        "disaster_type": t.get("type"),
        "nearby_reports_count": 1
    })
    clf = res['classification']
    sev = res['severity']
    ver = res['verification']
    leg_str = "LEGITIMATE" if ver['is_legitimate'] else "FALSE ALARM"
    print(f"TEXT: '{t['desc'][:45]:<47}' -> {clf['disaster_type']:<10} ({clf['confidence']:.2f}) | {sev['level']:<8} ({sev['confidence']:.2f}) | {leg_str:<11} ({ver['confidence']:.2f})")
