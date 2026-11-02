import app
from utils.preprocessing import find_nearest_barangay, MALAYBALAY_BARANGAYS

print(f"Total Malaybalay Barangays Registered: {len(MALAYBALAY_BARANGAYS)}")

# Test 1: Dalwangan (north Sayre highway)
lat_dal, lng_dal = 8.2160, 125.0780
b_dal = find_nearest_barangay(lat_dal, lng_dal)
r_dal = app.evaluate_report_v2({'description': '', 'disasterType': 'Landslide', 'latitude': lat_dal, 'longitude': lng_dal})
print(f"1. Dalwangan Landslide: resolved to '{b_dal}' | severity: {r_dal['severity']['level']} (conf: {r_dal['severity']['confidence']})")

# Test 2: Busdi (Upper Pulangi boundary)
lat_bus, lng_bus = 8.3512, 125.2934
b_bus = find_nearest_barangay(lat_bus, lng_bus)
r_bus = app.evaluate_report_v2({'description': '', 'disasterType': 'Flood', 'latitude': lat_bus, 'longitude': lng_bus})
print(f"2. Busdi Flood: resolved to '{b_bus}' | severity: {r_bus['severity']['level']} (conf: {r_bus['severity']['confidence']})")

# Test 3: San Jose (Sawaga Riverbank Flood)
lat_sj, lng_sj = 8.1554, 125.1323
r_sj = app.evaluate_report_v2({'description': '', 'disasterType': 'Flood', 'latitude': lat_sj, 'longitude': lng_sj})
print(f"3. San Jose Flood (Sawaga River corridor): severity: {r_sj['severity']['level']} (conf: {r_sj['severity']['confidence']})")

# Test 4: Barangay 4 Poblacion (Flat Urban core - Landslide should be Moderate, NOT High!)
lat_b4, lng_b4 = 8.1545, 125.1272
r_b4 = app.evaluate_report_v2({'description': '', 'disasterType': 'Landslide', 'latitude': lat_b4, 'longitude': lng_b4})
print(f"4. Brgy 4 Poblacion Landslide (Flat Urban core): severity: {r_b4['severity']['level']} (conf: {r_b4['severity']['confidence']})")

# Test 5: Barangay 9 Public Market (Dense Commercial - Fire should be High Risk!)
lat_b9, lng_b9 = 8.1567, 125.1285
r_b9 = app.evaluate_report_v2({'description': '', 'disasterType': 'Fire', 'latitude': lat_b9, 'longitude': lng_b9})
print(f"5. Brgy 9 Market Fire (Commercial Dense corridor): severity: {r_b9['severity']['level']} (conf: {r_b9['severity']['confidence']})")
