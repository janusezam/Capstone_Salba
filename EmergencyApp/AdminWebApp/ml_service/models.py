import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import xgboost as xgb
import logging
import os
from config import MODEL_DIR, RANDOM_STATE, TRAIN_TEST_SPLIT, DISASTER_TYPES

logger = logging.getLogger(__name__)

# Create models directory if it doesn't exist
os.makedirs(MODEL_DIR, exist_ok=True)

class DisasterClassifier:
    """Random Forest for Disaster Type Classification"""
    
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.is_trained = False
    
    def train(self, X, y):
        """Train Random Forest classifier"""
        try:
            # Encode labels
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=1-TRAIN_TEST_SPLIT, random_state=RANDOM_STATE
            )
            
            # Train model
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=RANDOM_STATE,
                n_jobs=-1
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            logger.info(f"Disaster Classifier trained - Accuracy: {accuracy:.4f}")
            logger.info(f"Train set size: {len(X_train)}, Test set size: {len(X_test)}")
            
            self.is_trained = True
            return {
                'accuracy': float(accuracy),
                'train_size': len(X_train),
                'test_size': len(X_test),
                'model': 'Random Forest'
            }
        
        except Exception as e:
            logger.error(f"Error training disaster classifier: {e}")
            return None
    
    def predict(self, X):
        """Predict disaster type"""
        if self.model is None:
            return None
        
        try:
            prediction = self.model.predict(X)[0]
            probability = np.max(self.model.predict_proba(X))
            return {
                'disaster_type': self.label_encoder.inverse_transform([prediction])[0],
                'confidence': float(probability)
            }
        except Exception as e:
            logger.error(f"Error predicting disaster type: {e}")
            return None
    
    def save(self):
        """Save model to disk"""
        try:
            joblib.dump(self.model, 'models_saved/disaster_classifier.pkl')
            joblib.dump(self.label_encoder, 'models_saved/disaster_classifier_encoder.pkl')
            logger.info("Disaster classifier saved")
        except Exception as e:
            logger.error(f"Error saving classifier: {e}")
    
    def load(self):
        """Load model from disk"""
        try:
            self.model = joblib.load('models_saved/disaster_classifier.pkl')
            self.label_encoder = joblib.load('models_saved/disaster_classifier_encoder.pkl')
            self.is_trained = True
            logger.info("Disaster classifier loaded")
        except Exception as e:
            logger.error(f"Error loading classifier: {e}")


class SeverityPredictor:
    """XGBoost for Severity Level Prediction"""
    
    def __init__(self):
        self.model = None
        self.is_trained = False
    
    def train(self, X, y):
        """Train XGBoost severity predictor"""
        try:
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=1-TRAIN_TEST_SPLIT, random_state=RANDOM_STATE
            )
            
            # Train model
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=RANDOM_STATE,
                n_jobs=-1
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            logger.info(f"Severity Predictor trained - Accuracy: {accuracy:.4f}")
            logger.info(f"Train set size: {len(X_train)}, Test set size: {len(X_test)}")
            
            self.is_trained = True
            return {
                'accuracy': float(accuracy),
                'train_size': len(X_train),
                'test_size': len(X_test),
                'model': 'XGBoost'
            }
        
        except Exception as e:
            logger.error(f"Error training severity predictor: {e}")
            return None
    
    def predict(self, X):
        """Predict severity level"""
        if self.model is None:
            return None
        
        try:
            severity_map = {0: 'low', 1: 'moderate', 2: 'high', 3: 'critical'}
            prediction = self.model.predict(X)[0]
            probability = np.max(self.model.predict_proba(X))
            
            return {
                'severity': severity_map[prediction],
                'confidence': float(probability),
                'level': int(prediction)
            }
        except Exception as e:
            logger.error(f"Error predicting severity: {e}")
            return None
    
    def save(self):
        """Save model to disk"""
        try:
            joblib.dump(self.model, 'models_saved/severity_predictor.pkl')
            logger.info("Severity predictor saved")
        except Exception as e:
            logger.error(f"Error saving severity predictor: {e}")
    
    def load(self):
        """Load model from disk"""
        try:
            self.model = joblib.load('models_saved/severity_predictor.pkl')
            self.is_trained = True
            logger.info("Severity predictor loaded")
        except Exception as e:
            logger.error(f"Error loading severity predictor: {e}")


class FalseAlarmDetector:
    """Logistic Regression for False Alarm Detection"""
    
    def __init__(self):
        self.model = None
        self.is_trained = False
    
    def train(self, X, y):
        """Train Logistic Regression false alarm detector"""
        try:
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=1-TRAIN_TEST_SPLIT, random_state=RANDOM_STATE
            )
            
            # Train model
            self.model = LogisticRegression(
                max_iter=1000,
                random_state=RANDOM_STATE,
                n_jobs=-1
            )
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, zero_division=0)
            recall = recall_score(y_test, y_pred, zero_division=0)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            
            logger.info(f"False Alarm Detector trained - Accuracy: {accuracy:.4f}, Precision: {precision:.4f}, Recall: {recall:.4f}, F1: {f1:.4f}")
            logger.info(f"Train set size: {len(X_train)}, Test set size: {len(X_test)}")
            
            self.is_trained = True
            return {
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1),
                'train_size': len(X_train),
                'test_size': len(X_test),
                'model': 'Logistic Regression'
            }
        
        except Exception as e:
            logger.error(f"Error training false alarm detector: {e}")
            return None
    
    def predict(self, X):
        """Predict if report is false alarm"""
        if self.model is None:
            return None
        
        try:
            prediction = self.model.predict(X)[0]
            probability = self.model.predict_proba(X)[0]
            
            return {
                'is_false_alarm': bool(prediction),
                'confidence': float(probability[prediction]),
                'probability_false_alarm': float(probability[1]),
                'probability_legitimate': float(probability[0])
            }
        except Exception as e:
            logger.error(f"Error predicting false alarm: {e}")
            return None
    
    def save(self):
        """Save model to disk"""
        try:
            joblib.dump(self.model, 'models_saved/false_alarm_detector.pkl')
            logger.info("False alarm detector saved")
        except Exception as e:
            logger.error(f"Error saving false alarm detector: {e}")
    
    def load(self):
        """Load model from disk"""
        try:
            self.model = joblib.load('models_saved/false_alarm_detector.pkl')
            self.is_trained = True
            logger.info("False alarm detector loaded")
        except Exception as e:
            logger.error(f"Error loading false alarm detector: {e}")
