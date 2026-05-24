import pandas as pd
import numpy as np
from pymongo import MongoClient
from config import MONGO_URL, DB_NAME, DISASTER_TYPES, MIN_SAMPLES_FOR_TRAINING
import logging

logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self):
        self.client = MongoClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.reports_collection = self.db['reports']
    
    def load_reports(self):
        """Load all reports from MongoDB"""
        try:
            reports = list(self.reports_collection.find({
                'disasterType': {'$exists': True, '$ne': ''},
                'latitude': {'$exists': True},
                'longitude': {'$exists': True}
            }))
            logger.info(f"Loaded {len(reports)} reports from MongoDB")
            return reports
        except Exception as e:
            logger.error(f"Error loading reports: {e}")
            return []
    
    def prepare_features(self, reports):
        """Convert reports to feature vectors"""
        if not reports:
            logger.warning("No reports provided for feature preparation")
            return None
        
        features = []
        labels = []
        
        for report in reports:
            try:
                # Extract features
                text = report.get('description', '') or ''
                disaster_type = report.get('disasterType', '')
                severity = report.get('severity', 'moderate')
                latitude = report.get('latitude', 0)
                longitude = report.get('longitude', 0)
                
                # Text-based features
                text_lower = text.lower()
                text_length = len(text)
                word_count = len(text.split())
                
                # Disaster type keywords
                fire_keywords = text_lower.count('fire') + text_lower.count('burn') + text_lower.count('flame')
                flood_keywords = text_lower.count('flood') + text_lower.count('water') + text_lower.count('wave')
                earthquake_keywords = text_lower.count('earthquake') + text_lower.count('quake') + text_lower.count('tremor')
                landslide_keywords = text_lower.count('landslide') + text_lower.count('mudslide') + text_lower.count('slope')
                typhoon_keywords = text_lower.count('typhoon') + text_lower.count('storm') + text_lower.count('wind')
                
                # Urgency indicators
                urgency_keywords = text_lower.count('urgent') + text_lower.count('immediate') + text_lower.count('critical')
                prank_keywords = text_lower.count('prank') + text_lower.count('test') + text_lower.count('false')
                
                feature_vector = [
                    text_length,
                    word_count,
                    fire_keywords,
                    flood_keywords,
                    earthquake_keywords,
                    landslide_keywords,
                    typhoon_keywords,
                    urgency_keywords,
                    prank_keywords,
                    latitude,
                    longitude,
                    1 if severity == 'critical' else 0,  # is_critical
                ]
                
                if disaster_type in DISASTER_TYPES:
                    features.append(feature_vector)
                    labels.append(disaster_type)
            
            except Exception as e:
                logger.warning(f"Error processing report: {e}")
                continue
        
        if not features:
            logger.warning("No valid features extracted")
            return None
        
        df = pd.DataFrame(features, columns=[
            'text_length', 'word_count', 'fire_keywords', 'flood_keywords',
            'earthquake_keywords', 'landslide_keywords', 'typhoon_keywords',
            'urgency_keywords', 'prank_keywords', 'latitude', 'longitude', 'is_critical'
        ])
        
        return df, labels
    
    def prepare_severity_features(self, reports):
        """Prepare features for severity prediction"""
        if not reports:
            return None
        
        features = []
        labels = []
        
        for report in reports:
            try:
                text = report.get('description', '') or ''
                severity = report.get('severity', 'moderate')
                disaster_type = report.get('disasterType', '')
                
                # Urgency indicators
                urgency_keywords = text.lower().count('urgent') + text.lower().count('immediate') + text.lower().count('critical')
                text_length = len(text)
                
                # Disaster type severity baseline
                severity_baseline = {
                    'Fire': 3,
                    'Earthquake': 4,
                    'Flood': 2,
                    'Landslide': 2,
                    'Typhoon': 3
                }.get(disaster_type, 2)
                
                feature_vector = [
                    text_length,
                    urgency_keywords,
                    severity_baseline,
                    1 if 'immediate' in text.lower() else 0,
                    1 if 'emergency' in text.lower() else 0,
                ]
                
                severity_map = {'critical': 3, 'high': 2, 'moderate': 1, 'low': 0}
                if severity in severity_map:
                    features.append(feature_vector)
                    labels.append(severity_map[severity])
            
            except Exception as e:
                logger.warning(f"Error processing severity report: {e}")
                continue
        
        if not features:
            return None
        
        df = pd.DataFrame(features, columns=[
            'text_length', 'urgency_keywords', 'severity_baseline',
            'has_immediate', 'has_emergency'
        ])
        
        return df, labels
    
    def prepare_false_alarm_features(self, reports):
        """Prepare features for false alarm detection"""
        if not reports:
            return None
        
        features = []
        labels = []
        
        for report in reports:
            try:
                text = report.get('description', '') or ''
                severity = report.get('severity', 'moderate')
                
                # Count user's previous reports (simulated - would need to count in DB)
                user_reports = 1  # Placeholder
                
                # False alarm indicators
                prank_keywords = text.lower().count('prank') + text.lower().count('test') + text.lower().count('false')
                suspicious_keywords = text.lower().count('joke') + text.lower().count('just kidding')
                
                text_length = len(text)
                word_count = len(text.split())
                
                feature_vector = [
                    text_length,
                    word_count,
                    prank_keywords,
                    suspicious_keywords,
                    user_reports,
                    1 if severity == 'low' else 0,
                ]
                
                # Label: 1 if marked as false alarm OR has prank keywords, 0 otherwise
                is_false_alarm = 1 if (report.get('isFalseAlarm', False) or prank_keywords > 0 or suspicious_keywords > 0) else 0
                
                features.append(feature_vector)
                labels.append(is_false_alarm)
            
            except Exception as e:
                logger.warning(f"Error processing false alarm report: {e}")
                continue
        
        if not features:
            return None
        
        df = pd.DataFrame(features, columns=[
            'text_length', 'word_count', 'prank_keywords', 'suspicious_keywords',
            'user_report_count', 'is_low_severity'
        ])
        
        return df, labels
