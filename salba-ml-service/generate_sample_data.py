#!/usr/bin/env python3
"""
generate_sample_data.py - Create sample disaster dataset for training
No external dependencies needed - uses only built-in Python modules
"""

import csv
import json
from datetime import datetime, timedelta
import random

# Sample disaster data
DISASTERS = ['Fire', 'Flood', 'Earthquake', 'Landslide', 'Typhoon']
SEVERITIES = ['low', 'moderate', 'high', 'critical']

# Sample locations in Bukidnon
LOCATIONS = [
    (8.1575, 125.1276),  # Malaybalay
    (8.2500, 125.2000),  # Various locations
    (8.1000, 125.0500),
    (8.3000, 125.3000),
    (8.0500, 124.9500),
]

URGENCY_KEYWORDS = ['urgent', 'critical', 'emergency', 'immediate', 'severe']
PRANK_KEYWORDS = ['prank', 'test', 'fake', 'hoax', 'false']

def generate_sample_reports(count=100):
    """Generate sample disaster reports"""
    reports = []
    base_date = datetime.now() - timedelta(days=30)
    
    disaster_descriptions = {
        'Fire': [
            'Large fire burning on hillside',
            'House fire with multiple structures burning',
            'Forest fire spreading rapidly',
            'Fire near residential area',
            'Uncontrolled fire outbreak'
        ],
        'Flood': [
            'Heavy flooding in downtown area',
            'Water overflowing into streets',
            'Severe flooding and landslides',
            'Flash flood warning',
            'Rivers overflowing banks'
        ],
        'Earthquake': [
            'Earthquake tremors felt',
            'Major earthquake reported',
            'Strong quake building damage',
            'Serious earthquake alert',
            'Tremor with aftershocks'
        ],
        'Landslide': [
            'Mudslide on hillside',
            'Large landslide blocking road',
            'Hillside collapse reported',
            'Ground movement detected',
            'Serious landslide event'
        ],
        'Typhoon': [
            'Typhoon approaching region',
            'Strong typhoon winds reported',
            'Severe tropical storm',
            'Typhoon damage assessment',
            'High wind speeds dangerous'
        ]
    }
    
    for i in range(count):
        disaster_type = random.choice(DISASTERS)
        lat, lng = random.choice(LOCATIONS)
        report_date = base_date + timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
        
        description = random.choice(disaster_descriptions[disaster_type])
        
        # Add urgency keywords to some reports
        if random.random() > 0.7:
            description += ' ' + random.choice(URGENCY_KEYWORDS)
        
        # Some reports might have prank indicators
        is_prank = random.random() < 0.15
        if is_prank:
            description = random.choice(PRANK_KEYWORDS) + ' ' + description
        
        report = {
            'description': description,
            'disaster_type': disaster_type,
            'severity': random.choice(SEVERITIES),
            'latitude': lat + random.uniform(-0.05, 0.05),
            'longitude': lng + random.uniform(-0.05, 0.05),
            'created_at': report_date.isoformat(),
            'text_length': len(description),
            'word_count': len(description.split()),
            'has_urgency_keywords': 1 if any(kw in description.lower() for kw in URGENCY_KEYWORDS) else 0,
            'has_prank_keywords': 1 if any(kw in description.lower() for kw in PRANK_KEYWORDS) else 0,
        }
        reports.append(report)
    
    return reports

def save_to_csv(reports, filename):
    """Save reports to CSV file"""
    if not reports:
        print(f"❌ No reports to save")
        return False
    
    keys = reports[0].keys()
    
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(reports)
        print(f"✅ Saved {len(reports)} reports to {filename}")
        return True
    except Exception as e:
        print(f"❌ Error saving to {filename}: {e}")
        return False

def main():
    print("=" * 60)
    print("📊 GENERATING SAMPLE DISASTER DATA")
    print("=" * 60)
    
    # Generate sample data
    print("\n🔨 Creating 100 sample disaster reports...")
    reports = generate_sample_reports(100)
    
    # Create training dataset
    print("\n💾 Saving training data...")
    save_to_csv(reports, 'data/training_data.csv')
    
    # Create 80/20 split
    random.shuffle(reports)
    split_point = int(len(reports) * 0.8)
    train_data = reports[:split_point]
    test_data = reports[split_point:]
    
    print(f"\n📋 Splitting data: {len(train_data)} train, {len(test_data)} test")
    save_to_csv(train_data, 'data/train_data.csv')
    save_to_csv(test_data, 'data/test_data.csv')
    
    # Print statistics
    print("\n" + "=" * 60)
    print("📈 DATASET STATISTICS")
    print("=" * 60)
    
    disaster_counts = {}
    severity_counts = {}
    for report in reports:
        disaster_counts[report['disaster_type']] = disaster_counts.get(report['disaster_type'], 0) + 1
        severity_counts[report['severity']] = severity_counts.get(report['severity'], 0) + 1
    
    print("\n🔥 Disaster Types:")
    for disaster, count in sorted(disaster_counts.items()):
        print(f"  {disaster}: {count} ({count/len(reports)*100:.1f}%)")
    
    print("\n⚠️  Severity Levels:")
    for severity, count in sorted(severity_counts.items()):
        print(f"  {severity}: {count} ({count/len(reports)*100:.1f}%)")
    
    prank_count = sum(1 for r in reports if r['has_prank_keywords'])
    print(f"\n😜 Reports with prank keywords: {prank_count}")
    
    print("\n✅ Sample data ready for training!")
    print("=" * 60)

if __name__ == '__main__':
    main()
