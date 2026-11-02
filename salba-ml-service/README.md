# SALBA ML Service v2 (Calibrated & Spatially Aware)

Production Machine Learning triage service for disaster classification, severity prediction, false alarm detection, and multi-report cluster escalation. Tailored specifically for **CDRRMO Malaybalay City, Bukidnon, Philippines**.

> [!NOTE]
> For the complete capstone-ready technical report, dataset sourcing breakdown, and panel defense Q&A, refer to:  
> **[`docs/SALBA_ML_V2_RETRAINING_DOCUMENTATION.md`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/SALBA_ML_V2_RETRAINING_DOCUMENTATION.md)**

---

## 🚀 Quick Start

From `salba-ml-service/`:

```powershell
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 2. Run the production Flask API (Port 5001)
python app.py
```

### Run Verification Test Suites
```powershell
# Test multilingual NLP inference (Cebuano/Bisaya, Tagalog, English, pranks)
.\venv\Scripts\python.exe test_inference.py

# Test Malaybalay City 46-barangay coordinates & hazard corridors
.\venv\Scripts\python.exe test_malaybalay_spatial.py
```

---

## 🧠 Key Features in Version 2

- **163,052 Real Disaster Training Records:** Trained on QCRI CrisisBench (50+ global & Philippine disaster events), Appen Disaster SMS Messages, and hand-curated Cebuano/Bisaya distress phrases.
- **Agglutinative Multilingual Featurizer:** Word + Subword Character (`char_wb`) TF-IDF to catch Philippine prefixes/infixes (*nagbaha*, *binabaha*, *nasunog*, *nidahili*) and mobile typos.
- **Isotonic & Sigmoid Probability Calibration:** Eliminates misleading confidence scores; outputs mathematically trustworthy probability distributions.
- **Malaybalay Spatial Intelligence:** 46 official PSA barangay coordinates and buffer matrices for the Sawaga River, Pulangi River, and Cabangahan landslide slopes.
- **Dynamic Cluster Corroboration:** Automatically escalates isolated `moderate` reports to `high` (2 reports) or `critical` (3+ reports within 2km / 30 mins), even for zero-text One-Tap SOS submissions.

---

## 📡 API Endpoints

- `POST /api/ml/evaluate-report-fast` - Primary unified endpoint (Classification + Severity + Legitimacy + Cluster Escalation in a single pass)
- `POST /api/ml/classify` - Predict disaster type (`Earthquake`, `Fire`, `Flood`, `Landslide`, `Typhoon`)
- `POST /api/ml/severity` - Predict severity (`low`, `moderate`, `high`, `critical`)
- `POST /api/ml/verify` - Predict legitimacy (`legitimate` vs `false_alarm`)
- `GET /api/ml/health` - Health check & model status

---

## 📂 Active Model Artifacts (`models/v2/`)

- `models/v2/text_featurizer.pkl` - Word & character multilingual TF-IDF + crisis lexicon vectorizer
- `models/v2/type_classifier.pkl` - Calibrated Random Forest (84.04% Accuracy, 86.36% Macro-F1)
- `models/v2/severity_model.pkl` - Calibrated XGBoost (61.65% Accuracy, 0.5527 Quadratic Kappa)
- `models/v2/legitimacy_model.pkl` - Calibrated HistGradientBoosting (77.92% Acc, 91.67% PH Seed Acc)
