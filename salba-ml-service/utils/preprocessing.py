"""
utils/preprocessing.py - Data preprocessing utilities
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib

def preprocess_features(df):
    """Prepare features for ML models"""
    
    df_processed = df.copy()
    
    # Handle both 'note' and 'description' column names
    text_col = 'description' if 'description' in df_processed.columns else 'note'
    
    # Text-based features
    df_processed['text_length'] = df_processed[text_col].fillna('').str.len()
    df_processed['word_count'] = df_processed[text_col].fillna('').str.split().str.len()
    df_processed['has_urgency'] = df_processed[text_col].fillna('').str.lower().str.contains(
        'urgent|critical|emergency|immediate', na=False
    ).astype(int)
    
    # Location features (normalize)
    df_processed['lat_normalized'] = (df_processed['latitude'] - df_processed['latitude'].mean()) / df_processed['latitude'].std()
    df_processed['lng_normalized'] = (df_processed['longitude'] - df_processed['longitude'].mean()) / df_processed['longitude'].std()
    
    # Time features
    df_processed['created_at'] = pd.to_datetime(df_processed['created_at'])
    df_processed['hour'] = df_processed['created_at'].dt.hour
    df_processed['month'] = df_processed['created_at'].dt.month
    df_processed['day_of_week'] = df_processed['created_at'].dt.dayofweek
    
    # Fill missing values
    df_processed = df_processed.fillna(0)
    
    return df_processed

def get_feature_names():
    """Return list of feature names for models"""
    return [
        'text_length',
        'word_count',
        'has_urgency',
        'lat_normalized',
        'lng_normalized',
        'hour',
        'month',
        'day_of_week'
    ]

def encode_targets(df):
    """Encode target variables and return encoders"""
    
    encoders = {}
    
    # Encode disaster type
    le_type = LabelEncoder()
    df['disaster_type_encoded'] = le_type.fit_transform(df['disaster_type'])
    encoders['disaster_type'] = le_type
    
    # Encode severity
    le_severity = LabelEncoder()
    df['severity_encoded'] = le_severity.fit_transform(df['severity'])
    encoders['severity'] = le_severity
    
    # Encode status (for false alarm detection)
    # Handle both 'status' and 'has_prank_keywords' column names
    if 'status' in df.columns:
        df['is_false_alarm'] = (df['status'].str.lower() == 'false_alarm').astype(int)
    elif 'has_prank_keywords' in df.columns:
        df['is_false_alarm'] = df['has_prank_keywords'].astype(int)
    else:
        df['is_false_alarm'] = 0
    
    return df, encoders

def save_encoders(encoders, path='models/label_encoders.pkl'):
    """Save label encoders for later use"""
    joblib.dump(encoders, path)
    print(f"✅ Encoders saved to {path}")

def load_encoders(path='models/label_encoders.pkl'):
    """Load label encoders"""
    return joblib.load(path)
