#!/usr/bin/env python3
"""
Training script for SALBA ML models
Trains Random Forest, XGBoost, and Logistic Regression on historical disaster data
"""

import sys
import logging
from data_loader import DataLoader
from models import DisasterClassifier, SeverityPredictor, FalseAlarmDetector
from config import MIN_SAMPLES_FOR_TRAINING

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    logger.info("=" * 50)
    logger.info("SALBA ML Model Training Started")
    logger.info("=" * 50)
    
    # Load data
    logger.info("\n1. Loading historical disaster reports from MongoDB...")
    data_loader = DataLoader()
    reports = data_loader.load_reports()
    
    if len(reports) < MIN_SAMPLES_FOR_TRAINING:
        logger.error(f"Insufficient data. Have {len(reports)} reports, need {MIN_SAMPLES_FOR_TRAINING}")
        sys.exit(1)
    
    logger.info(f"Successfully loaded {len(reports)} reports")
    
    # Train Disaster Classifier (Random Forest)
    logger.info("\n2. Training Disaster Classifier (Random Forest)...")
    try:
        X_classifier, y_classifier = data_loader.prepare_features(reports)
        if X_classifier is not None:
            classifier = DisasterClassifier()
            result = classifier.train(X_classifier, y_classifier)
            if result:
                logger.info(f"✓ Classifier trained successfully")
                logger.info(f"  - Model: {result['model']}")
                logger.info(f"  - Accuracy: {result['accuracy']:.4f}")
                classifier.save()
            else:
                logger.error("Failed to train classifier")
        else:
            logger.error("Failed to prepare classifier features")
    except Exception as e:
        logger.error(f"Error in classifier training: {e}")
    
    # Train Severity Predictor (XGBoost)
    logger.info("\n3. Training Severity Predictor (XGBoost)...")
    try:
        X_severity, y_severity = data_loader.prepare_severity_features(reports)
        if X_severity is not None:
            predictor = SeverityPredictor()
            result = predictor.train(X_severity, y_severity)
            if result:
                logger.info(f"✓ Severity predictor trained successfully")
                logger.info(f"  - Model: {result['model']}")
                logger.info(f"  - Accuracy: {result['accuracy']:.4f}")
                predictor.save()
            else:
                logger.error("Failed to train severity predictor")
        else:
            logger.error("Failed to prepare severity features")
    except Exception as e:
        logger.error(f"Error in severity predictor training: {e}")
    
    # Train False Alarm Detector (Logistic Regression)
    logger.info("\n4. Training False Alarm Detector (Logistic Regression)...")
    try:
        X_false_alarm, y_false_alarm = data_loader.prepare_false_alarm_features(reports)
        if X_false_alarm is not None:
            detector = FalseAlarmDetector()
            result = detector.train(X_false_alarm, y_false_alarm)
            if result:
                logger.info(f"✓ False alarm detector trained successfully")
                logger.info(f"  - Model: {result['model']}")
                logger.info(f"  - Accuracy: {result['accuracy']:.4f}")
                logger.info(f"  - Precision: {result['precision']:.4f}")
                logger.info(f"  - Recall: {result['recall']:.4f}")
                logger.info(f"  - F1-Score: {result['f1_score']:.4f}")
                detector.save()
            else:
                logger.error("Failed to train false alarm detector")
        else:
            logger.error("Failed to prepare false alarm features")
    except Exception as e:
        logger.error(f"Error in false alarm detector training: {e}")
    
    logger.info("\n" + "=" * 50)
    logger.info("Training Complete!")
    logger.info("Models saved to models_saved/ directory")
    logger.info("=" * 50)

if __name__ == '__main__':
    main()
