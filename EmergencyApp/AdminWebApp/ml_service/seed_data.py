"""
Seed MongoDB with sample disaster reports for ML training
"""

from pymongo import MongoClient
from datetime import datetime, timedelta
import random

# Sample disaster descriptions
SAMPLE_REPORTS = [
    {"description": "Heavy fire spreading rapidly through residential area", "type": "Fire", "severity": "critical"},
    {"description": "Fire in downtown commercial district", "type": "Fire", "severity": "high"},
    {"description": "Small fire near community center", "type": "Fire", "severity": "moderate"},
    
    {"description": "Major flooding with water waist deep in streets", "type": "Flood", "severity": "critical"},
    {"description": "Flash flooding reported in low-lying areas", "type": "Flood", "severity": "high"},
    {"description": "Mild flooding near river banks", "type": "Flood", "severity": "moderate"},
    
    {"description": "Powerful earthquake with 7.5 magnitude shaking buildings violently", "type": "Earthquake", "severity": "critical"},
    {"description": "Moderate earthquake felt across region", "type": "Earthquake", "severity": "high"},
    {"description": "Minor tremor reported", "type": "Earthquake", "severity": "low"},
    
    {"description": "Landslide occurring on mountainside threatening villages", "type": "Landslide", "severity": "critical"},
    {"description": "Mudslide blocking main highway", "type": "Landslide", "severity": "high"},
    {"description": "Small soil erosion on hill slope", "type": "Landslide", "severity": "low"},
    
    {"description": "Typhoon approaching with hurricane force winds", "type": "Typhoon", "severity": "critical"},
    {"description": "Tropical storm with heavy rains and strong winds", "type": "Typhoon", "severity": "high"},
    {"description": "Tropical depression bringing rainfall", "type": "Typhoon", "severity": "moderate"},
    
    # False alarm / prank reports
    {"description": "This is just a prank test report", "type": "Fire", "severity": "low", "is_false_alarm": True},
    {"description": "Just kidding about the fire - it was a test", "type": "Flood", "severity": "low", "is_false_alarm": True},
    {"description": "Prank earthquake report for testing", "type": "Earthquake", "severity": "low", "is_false_alarm": True},
    {"description": "False alarm test - no actual landslide", "type": "Landslide", "severity": "low", "is_false_alarm": True},
    {"description": "This is a test report not a real typhoon", "type": "Typhoon", "severity": "low", "is_false_alarm": True},
]

def seed_database():
    """Seed MongoDB with sample reports"""
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017')
        db = client['salba_db']
        reports_collection = db['reports']
        
        # Clear existing reports
        reports_collection.delete_many({})
        print("Cleared existing reports")
        
        # Insert sample reports
        latitudes = [8.1, 8.2, 8.15, 8.25, 8.05]
        longitudes = [125.1, 125.15, 125.2, 125.05, 125.25]
        
        inserted_count = 0
        for i in range(150):  # Create 150 sample reports
            report = random.choice(SAMPLE_REPORTS)
            
            doc = {
                "description": report["description"],
                "disasterType": report["type"],
                "severity": report["severity"],
                "latitude": random.choice(latitudes) + random.uniform(-0.1, 0.1),
                "longitude": random.choice(longitudes) + random.uniform(-0.1, 0.1),
                "status": random.choice(["Pending", "Ongoing", "Resolved"]),
                "createdAt": datetime.now() - timedelta(days=random.randint(0, 30)),
                "userId": {
                    "name": f"User {i % 10}",
                    "email": f"user{i % 10}@example.com",
                    "phone": f"555-000{i % 10}"
                }
            }
            
            # Add false alarm flag if applicable
            if report.get("is_false_alarm"):
                doc["isFalseAlarm"] = True
            
            reports_collection.insert_one(doc)
            inserted_count += 1
        
        print(f"✓ Successfully seeded {inserted_count} sample reports")
        
        # Show summary
        count = reports_collection.count_documents({})
        print(f"✓ Total reports in database: {count}")
        
        # Show breakdown by type
        for dtype in ["Fire", "Flood", "Earthquake", "Landslide", "Typhoon"]:
            count = reports_collection.count_documents({"disasterType": dtype})
            print(f"  - {dtype}: {count}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        return False

if __name__ == '__main__':
    print("Seeding MongoDB with sample disaster reports...")
    if seed_database():
        print("\n✓ Database seeding complete!")
        print("You can now run: python train.py")
    else:
        print("\n✗ Database seeding failed")
