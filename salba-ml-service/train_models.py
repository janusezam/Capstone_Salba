"""
train_models.py - Train ML models on disaster data

This script trains three models:
1. Disaster Type Classifier (Random Forest)
2. Severity Predictor (XGBoost)
3. False Alarm Detector (Logistic Regression)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score, 
    precision_score, recall_score, f1_score
)
import xgboost as xgb
import joblib
import os
from utils.preprocessing import preprocess_features, get_feature_names, encode_targets, save_encoders

print("="*60)
print("🤖 SALBA ML Model Training")
print("="*60)

# Load training data
data_path = 'data/train_data.csv'
if not os.path.exists(data_path):
    print("⚠️  Training data not found. Run 'python export_data.py' first")
    exit(1)

print("\n📥 Loading training data...")
df_train = pd.read_csv(data_path)
print(f"✅ Loaded {len(df_train)} training samples")

# Preprocess
print("\n🔧 Preprocessing features...")
df_train = preprocess_features(df_train)
df_train, encoders = encode_targets(df_train)
save_encoders(encoders)

# Features
feature_cols = get_feature_names()
feature_cols_type_fa = [f for f in feature_cols if f != 'disaster_type_encoded']

X_train_type_fa = df_train[feature_cols_type_fa]
X_train_sev = df_train[feature_cols]

y_type = df_train['disaster_type_encoded']
y_severity = df_train['severity_encoded']
y_false_alarm = df_train['is_false_alarm']

print(f"✅ Features prepared: {len(feature_cols)} features (severity), {len(feature_cols_type_fa)} features (classifier/false alarm)")

# ============================================
# 1. DISASTER TYPE CLASSIFIER
# ============================================
print("\n" + "="*60)
print("1️⃣  Training Disaster Type Classifier (Random Forest)")
print("="*60)

X_train_type, X_test_type, y_train_type, y_test_type = train_test_split(
    X_train_type_fa, y_type, test_size=0.2, random_state=42, stratify=y_type
)

classifier = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)

print("🔄 Training...")
classifier.fit(X_train_type, y_train_type)

# Evaluate
y_pred_type = classifier.predict(X_test_type)
acc_type = accuracy_score(y_test_type, y_pred_type)
print(f"\n✅ Accuracy: {acc_type:.4f}")
print("\nClassification Report:")
print(classification_report(
    y_test_type, 
    y_pred_type, 
    target_names=encoders['disaster_type'].classes_
))

# Save
joblib.dump(classifier, 'models/disaster_classifier.pkl')
print("💾 Model saved to models/disaster_classifier.pkl")

# Feature importance
importances = classifier.feature_importances_
top_features = np.argsort(importances)[-5:][::-1]
print("\n🔥 Top 5 Important Features:")
for i, idx in enumerate(top_features, 1):
    print(f"   {i}. {feature_cols[idx]}: {importances[idx]:.4f}")

# ============================================
# 2. SEVERITY PREDICTOR
# ============================================
print("\n" + "="*60)
print("2️⃣  Training Severity Predictor (XGBoost)")
print("="*60)

X_train_sev, X_test_sev, y_train_sev, y_test_sev = train_test_split(
    X_train_sev, y_severity, test_size=0.2, random_state=42, stratify=y_severity
)

severity_model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42,
    n_jobs=-1
)

print("🔄 Training...")
severity_model.fit(X_train_sev, y_train_sev, verbose=False)

# Evaluate
y_pred_sev = severity_model.predict(X_test_sev)
acc_sev = accuracy_score(y_test_sev, y_pred_sev)
print(f"\n✅ Accuracy: {acc_sev:.4f}")
print("\nClassification Report:")
print(classification_report(
    y_test_sev,
    y_pred_sev,
    target_names=encoders['severity'].classes_
))

# Save
joblib.dump(severity_model, 'models/severity_predictor.pkl')
print("💾 Model saved to models/severity_predictor.pkl")

# ============================================
# 3. FALSE ALARM DETECTOR
# ============================================
print("\n" + "="*60)
print("3️⃣  Training False Alarm Detector (Logistic Regression)")
print("="*60)

X_train_fa, X_test_fa, y_train_fa, y_test_fa = train_test_split(
    X_train_type_fa, y_false_alarm, test_size=0.2, random_state=42
)

false_alarm_model = LogisticRegression(
    random_state=42,
    max_iter=1000,
    n_jobs=-1
)

print("🔄 Training...")
false_alarm_model.fit(X_train_fa, y_train_fa)

# Evaluate
y_pred_fa = false_alarm_model.predict(X_test_fa)
acc_fa = accuracy_score(y_test_fa, y_pred_fa)
prec_fa = precision_score(y_test_fa, y_pred_fa, zero_division=0)
rec_fa = recall_score(y_test_fa, y_pred_fa, zero_division=0)
f1_fa = f1_score(y_test_fa, y_pred_fa, zero_division=0)

print(f"\n✅ Accuracy: {acc_fa:.4f}")
print(f"   Precision: {prec_fa:.4f}")
print(f"   Recall: {rec_fa:.4f}")
print(f"   F1-Score: {f1_fa:.4f}")

# Save
joblib.dump(false_alarm_model, 'models/false_alarm_detector.pkl')
print("💾 Model saved to models/false_alarm_detector.pkl")

# ============================================
# SUMMARY
# ============================================
print("\n" + "="*60)
print("📊 MODEL TRAINING SUMMARY")
print("="*60)
print(f"\n1. Disaster Type Classifier")
print(f"   - Model: Random Forest")
print(f"   - Accuracy: {acc_type:.2%}")
print(f"   - Samples: {len(X_train_type)} train, {len(X_test_type)} test")

print(f"\n2. Severity Predictor")
print(f"   - Model: XGBoost")
print(f"   - Accuracy: {acc_sev:.2%}")
print(f"   - Samples: {len(X_train_sev)} train, {len(X_test_sev)} test")

print(f"\n3. False Alarm Detector")
print(f"   - Model: Logistic Regression")
print(f"   - Accuracy: {acc_fa:.2%}")
print(f"   - Precision: {prec_fa:.2%}")
print(f"   - Recall: {rec_fa:.2%}")
print(f"   - Samples: {len(X_train_fa)} train, {len(X_test_fa)} test")

print("\n✅ All models trained and saved!")
print("\n🚀 Run 'python app.py' to start the Flask API server")
