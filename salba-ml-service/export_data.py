"""
export_data.py - Export training data from MongoDB to CSV

This script connects to MongoDB and exports reports to CSV for ML training.
Run this first to create training dataset.
"""

import pymongo
import pandas as pd
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017')
DB_NAME = os.getenv('DB_NAME', 'capstoneDB')

def export_training_data():
    """Export reports from MongoDB to CSV"""
    
    print("🔌 Connecting to MongoDB...")
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    reports_collection = db['reports']
    
    # Check data availability
    total_reports = reports_collection.count_documents({})
    print(f"📊 Total reports in database: {total_reports}")
    
    if total_reports == 0:
        print("⚠️  No reports found. Please submit some reports first.")
        print("Creating sample data for demonstration...")
        create_sample_data(reports_collection)
    
    # Query reports with disaster type
    reports = list(reports_collection.find({
        'disasterType': {'$exists': True, '$ne': ''},
        'severity': {'$exists': True, '$ne': ''}
    }))
    
    print(f"📥 Found {len(reports)} reports with complete data")
    
    if len(reports) == 0:
        print("⚠️  No complete reports found")
        return
    
    # Convert to DataFrame
    data = []
    for report in reports:
        try:
            data.append({
                'report_id': str(report.get('_id', '')),
                'disaster_type': report.get('disasterType', 'Unknown'),
                'severity': report.get('severity', 'low'),
                'latitude': report.get('lat', 0),
                'longitude': report.get('lng', 0),
                'note': report.get('note', ''),
                'location_name': report.get('locationName', ''),
                'status': report.get('status', 'new'),
                'created_at': report.get('createdAt', datetime.now()),
            })
        except Exception as e:
            print(f"⚠️  Error processing report: {e}")
            continue
    
    df = pd.DataFrame(data)
    
    # Feature engineering
    print("🔧 Engineering features...")
    df['text_length'] = df['note'].str.len()
    df['word_count'] = df['note'].str.split().str.len()
    df['has_urgency_keywords'] = df['note'].str.lower().str.contains(
        'urgent|critical|emergency|immediate|severe', na=False
    ).astype(int)
    df['has_prank_keywords'] = df['note'].str.lower().str.contains(
        'test|prank|fake|hoax', na=False
    ).astype(int)
    
    # Time features
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['hour'] = df['created_at'].dt.hour
    df['month'] = df['created_at'].dt.month
    df['day_of_week'] = df['created_at'].dt.dayofweek
    
    # Save to CSV
    output_path = 'data/training_data.csv'
    df.to_csv(output_path, index=False)
    print(f"✅ Training data exported to {output_path}")
    
    # Print statistics
    print("\n📈 Dataset Statistics:")
    print(f"Total samples: {len(df)}")
    print(f"\nDisaster Type Distribution:")
    print(df['disaster_type'].value_counts())
    print(f"\nSeverity Distribution:")
    print(df['severity'].value_counts())
    
    # Save split data (for later use in notebooks)
    from sklearn.model_selection import train_test_split
    train, test = train_test_split(df, test_size=0.2, random_state=42, stratify=df['disaster_type'])
    train.to_csv('data/train_data.csv', index=False)
    test.to_csv('data/test_data.csv', index=False)
    print(f"\n✅ Train/Test split saved (80/20)")
    
    client.close()

def create_sample_data(collection):
    """Create sample reports for demonstration"""
    
    sample_reports = [
        {
            'disasterType': 'Fire',
            'severity': 'critical',
            'lat': 8.1565,
            'lng': 125.1237,
            'note': 'URGENT: Fire spreading at downtown market area',
            'locationName': 'Downtown Market',
            'status': 'acknowledged'
        },
        {
            'disasterType': 'Flood',
            'severity': 'high',
            'lat': 8.1500,
            'lng': 125.1200,
            'note': 'Heavy flooding in residential area',
            'locationName': 'Residential Zone',
            'status': 'new'
        },
        {
            'disasterType': 'Earthquake',
            'severity': 'critical',
            'lat': 8.1600,
            'lng': 125.1300,
            'note': 'Strong earthquake tremors felt',
            'locationName': 'City Center',
            'status': 'new'
        },
        {
            'disasterType': 'Landslide',
            'severity': 'high',
            'lat': 8.1400,
            'lng': 125.1150,
            'note': 'Landslide blocking main road',
            'locationName': 'Mountain Road',
            'status': 'new'
        },
        {
            'disasterType': 'Fire',
            'severity': 'high',
            'lat': 8.1550,
            'lng': 125.1250,
            'note': 'Structure fire at warehouse',
            'locationName': 'Industrial Area',
            'status': 'new'
        },
    ]
    
    collection.insert_many(sample_reports)
    print("✅ Sample data created")

if __name__ == '__main__':
    export_training_data()
