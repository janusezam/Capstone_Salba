#!/usr/bin/env python3
"""
train_models_real_data.py - Train high-accuracy SALBA ML models using the enhanced dataset
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedShuffleSplit
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib
import os
from datetime import datetime

from utils.preprocessing import (
    preprocess_features, encode_targets, save_encoders,
    FEATURE_NAMES_CLASSIFIER, FEATURE_NAMES_SEVERITY, FEATURE_NAMES_FALSE_ALARM
)

# Ensure models directory exists
os.makedirs('models', exist_ok=True)

print("=" * 70)
print("SALBA ML MODEL TRAINING (GEOGRAPHICALLY-AWARE REAL DATASET)")
print("=" * 70)

# 1. Load dataset
data_file = 'data/malaybalay_disaster_reports_enhanced.csv'
if not os.path.exists(data_file):
    print("Enhanced dataset not found. Running generator first...")
    from generate_enhanced_dataset import generate_dataset
    generate_dataset()

print("\nLoading dataset...")
df = pd.read_csv(data_file)
print(f"Loaded {len(df)} disaster reports")

# 2. Preprocess & Encode
print("\nPreprocessing features & encoding targets...")
df = preprocess_features(df)
df, encoders = encode_targets(df)
save_encoders(encoders)

# Features & Targets
X_clf = df[FEATURE_NAMES_CLASSIFIER]
X_sev = df[FEATURE_NAMES_SEVERITY]
X_fa = df[FEATURE_NAMES_FALSE_ALARM]

y_disaster = df['disaster_type_encoded']
y_severity = df['severity_encoded']
y_alarm = df['is_false_alarm']

# Train/Test Split (80/20 Stratified)
X_train_clf, X_test_clf, y_train_disaster, y_test_disaster = train_test_split(
    X_clf, y_disaster, test_size=0.2, random_state=42, stratify=y_disaster
)

X_train_sev, X_test_sev, y_train_sev, y_test_sev = train_test_split(
    X_sev, y_severity, test_size=0.2, random_state=42, stratify=y_severity
)

X_train_fa, X_test_fa, y_train_fa, y_test_fa = train_test_split(
    X_fa, y_alarm, test_size=0.2, random_state=42, stratify=y_alarm
)

print(f"Train split: {len(X_train_clf)} samples | Test split: {len(X_test_clf)} samples")

# ==========================================
# 1. DISASTER TYPE CLASSIFIER (Random Forest)
# ==========================================
print("\n" + "=" * 70)
print("1. TRAINING DISASTER TYPE CLASSIFIER (Random Forest)")
print("=" * 70)

model_disaster = RandomForestClassifier(
    n_estimators=250,
    max_depth=16,
    min_samples_split=4,
    random_state=42,
    n_jobs=-1
)
model_disaster.fit(X_train_clf, y_train_disaster)
y_pred_disaster = model_disaster.predict(X_test_clf)
acc_disaster = accuracy_score(y_test_disaster, y_pred_disaster)
f1_disaster = f1_score(y_test_disaster, y_pred_disaster, average='weighted')

print(f"Accuracy: {acc_disaster:.4f} ({acc_disaster*100:.2f}%) | Weighted F1: {f1_disaster:.4f}")
print("\nClassification Report:")
print(classification_report(y_test_disaster, y_pred_disaster, target_names=encoders['disaster_type'].classes_))

joblib.dump(model_disaster, 'models/disaster_classifier.pkl')
print("Model saved to models/disaster_classifier.pkl")

# ==========================================
# 2. SEVERITY PREDICTOR (XGBoost / Gradient Boosting)
# ==========================================
print("\n" + "=" * 70)
print("2. TRAINING SEVERITY PREDICTOR (XGBoost Classifier)")
print("=" * 70)

model_severity = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.08,
    subsample=0.85,
    colsample_bytree=0.85,
    random_state=42,
    n_jobs=-1
)
model_severity.fit(X_train_sev, y_train_sev)
y_pred_sev = model_severity.predict(X_test_sev)
acc_sev = accuracy_score(y_test_sev, y_pred_sev)
f1_sev = f1_score(y_test_sev, y_pred_sev, average='weighted')

print(f"Accuracy: {acc_sev:.4f} ({acc_sev*100:.2f}%) | Weighted F1: {f1_sev:.4f}")
print("\nClassification Report:")
print(classification_report(y_test_sev, y_pred_sev, target_names=encoders['severity'].classes_))

# Feature importances for severity
importances = model_severity.feature_importances_
top_idx = np.argsort(importances)[::-1][:8]
print("\nTop 8 Influential Features for Severity:")
for i, idx in enumerate(top_idx, 1):
    print(f"   {i}. {FEATURE_NAMES_SEVERITY[idx]}: {importances[idx]:.4f}")

joblib.dump(model_severity, 'models/severity_predictor.pkl')
print("Model saved to models/severity_predictor.pkl")

# ==========================================
# 3. FALSE ALARM DETECTOR (Gradient Boosting)
# ==========================================
print("\n" + "=" * 70)
print("3. TRAINING FALSE ALARM DETECTOR (Gradient Boosting Classifier)")
print("=" * 70)

model_alarm = GradientBoostingClassifier(
    n_estimators=150,
    max_depth=4,
    learning_rate=0.1,
    random_state=42
)
model_alarm.fit(X_train_fa, y_train_fa)
y_pred_alarm = model_alarm.predict(X_test_fa)
acc_alarm = accuracy_score(y_test_fa, y_pred_alarm)
f1_alarm = f1_score(y_test_fa, y_pred_alarm, zero_division=0)

print(f"Accuracy: {acc_alarm:.4f} ({acc_alarm*100:.2f}%) | F1-Score: {f1_alarm:.4f}")
print("\nClassification Report:")
print(classification_report(y_test_fa, y_pred_alarm, target_names=['Legitimate', 'False Alarm']))

joblib.dump(model_alarm, 'models/false_alarm_detector.pkl')
print("Model saved to models/false_alarm_detector.pkl")

print("\n" + "=" * 70)
print("ALL MODELS SUCCESSFULLY TRAINED AND SAVED!")
print("=" * 70)
print(f"Summary:")
print(f"   1. Disaster Classifier:  {acc_disaster*100:.2f}% accuracy")
print(f"   2. Severity Predictor:   {acc_sev*100:.2f}% accuracy")
print(f"   3. False Alarm Detector: {acc_alarm*100:.2f}% accuracy")
print(f"\nTrained on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
