import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Configuration
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/capstoneDB')
DB_NAME = 'capstoneDB'

# Flask Configuration
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
DEBUG = FLASK_ENV == 'development'

# ML Model Paths
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models_saved')
CLASSIFIER_MODEL = os.path.join(MODEL_DIR, 'disaster_classifier.pkl')
SEVERITY_MODEL = os.path.join(MODEL_DIR, 'severity_predictor.pkl')
FALSE_ALARM_MODEL = os.path.join(MODEL_DIR, 'false_alarm_detector.pkl')

# Feature Configuration
DISASTER_TYPES = ['Fire', 'Flood', 'Earthquake', 'Landslide', 'Typhoon']
SEVERITY_LEVELS = ['critical', 'high', 'moderate', 'low']

# Training Configuration
MIN_SAMPLES_FOR_TRAINING = 100
TRAIN_TEST_SPLIT = 0.8
RANDOM_STATE = 42

# API Configuration
API_PORT = 5001
API_HOST = '0.0.0.0'

# Node.js Backend Configuration
NODE_BACKEND_URL = os.getenv('NODE_BACKEND_URL', 'http://localhost:5000')
