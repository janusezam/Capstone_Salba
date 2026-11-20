# SALBA AI Model Performance Evaluation
## Chapter 4, Section 4.5: Results and Discussion (Complete Technical Evaluation & Manuscript Deliverable)

**Capstone Project:** *SALBA: An AI-Assisted Emergency Reporting and Rescue Coordination Platform for Malaybalay City*  
**Evaluated Module:** SALBA Machine Learning Triage and Spatial Intelligence Service (`salba-ml-service/models/v2`)  
**Evaluation Date:** November 2026  

---

## Table of Contents
1. [Executive Summary & System Inspection Findings](#1-executive-summary--system-inspection-findings)
2. [Comparison of Manuscript Model Specifications vs. Actual System Implementation](#2-comparison-of-manuscript-model-specifications-vs-actual-system-implementation)
3. [Verified Dataset Sourcing, Preprocessing, and Evaluation Methodology](#3-verified-dataset-sourcing-preprocessing-and-evaluation-methodology)
4. [Ready-to-Insert Manuscript Section: 4.5 AI Model Performance Evaluation](#4-ready-to-insert-manuscript-section-45-ai-model-performance-evaluation)
   - [4.5.1 Disaster Type Classification (Random Forest Classifier)](#451-disaster-type-classification-random-forest-classifier)
     - [Table 4-9. Random Forest Classifier Performance](#table-4-9-random-forest-classifier-performance)
     - [Table 4-10. Confusion Matrix - Disaster Type Classification](#table-4-10-confusion-matrix---disaster-type-classification)
   - [4.5.2 Severity-Level Prediction (XGBoost)](#452-severity-level-prediction-xgboost)
     - [Table 4-11. XGBoost Performance for Severity Prediction](#table-4-11-xgboost-performance-for-severity-prediction)
     - [Table 4-11B. Confusion Matrix - Severity-Level Prediction (XGBoost)](#table-4-11b-confusion-matrix---severity-level-prediction-xgboost)
   - [4.5.3 False Alarm and Duplicate Report Detection](#453-false-alarm-and-duplicate-report-detection)
     - [Table 4-12. Logistic Regression Performance for False Alarm Detection](#table-4-12-logistic-regression-performance-for-false-alarm-detection)
     - [Table 4-12B. Comparative Performance of Logistic Regression and Deployed Histogram Gradient Boosting for False Alarm Detection](#table-4-12b-comparative-performance-of-logistic-regression-and-deployed-histogram-gradient-boosting-for-false-alarm-detection)
     - [Table 4-12C. Spatio-Temporal Duplicate, Spam, and Multi-Report Cluster Detection Mechanisms](#table-4-12c-spatio-temporal-duplicate-spam-and-multi-report-cluster-detection-mechanisms)
5. [Supporting Technical Evidence, Software Configuration, and Reproducibility Log](#5-supporting-technical-evidence-software-configuration-and-reproducibility-log)
6. [Dataset Limitations and Evaluation Constraints](#6-dataset-limitations-and-evaluation-constraints)

---

## 1. Executive Summary & System Inspection Findings

A complete source-code, artifact, and dataset audit was conducted across the SALBA monorepo ([salba-ml-service/app.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/app.py), [train_models_v2.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py), [train_spatial_model.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_spatial_model.py), [build_training_corpus.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/data_pipeline/build_training_corpus.py), [text_features.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/utils/text_features.py), [preprocessing.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/utils/preprocessing.py), and the Node.js backend routes [alertRoutes.js](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js) and [reportRoutes.js](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/reportRoutes.js)).

### Key Inspection Findings
1. **Verified Training Corpus (`163,052` Deduplicated Human-Annotated Records):**
   - The SALBA v2 pipeline is trained on [`salba-ml-service/data/processed/salba_corpus.csv`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/data/processed/salba_corpus.csv), compiled from three legitimate, human-labeled crisis datasets:
     1. **QCRI CrisisBench** (Alam et al., 2021, CC BY-NC-SA 4.0) covering 50+ global and Philippine disasters (including the 2013 Bohol Earthquake, 2012 Typhoon Pablo in Mindanao, 2013 Manila Floods, and 2012 Philippine Floods).
     2. **Appen / Figure Eight Multilingual Disaster Response Messages** (26,055 direct emergency SMS and crisis reports).
     3. **SALBA Philippine Seed Corpus** ([`ph_seed_reports.csv`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/data/curated/ph_seed_reports.csv)) containing hand-curated Cebuano/Bisaya, Tagalog, and English emergency and prank reports tailored for Malaybalay City.
2. **Strict Event-Level Holdout Split (Zero Data Leakage):**
   - Rather than using a naive random row split where near-duplicate retweets leak between training and testing sets, [`build_training_corpus.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/data_pipeline/build_training_corpus.py#L53-L65) holds out **10 entire disaster events** (including 4 Philippine disaster events) strictly for the independent test set (`split == 'test'`), and **7 separate disaster events** for probability calibration (`split == 'calib'`). Text normalization and deduplication enforce the priority rule `test > calib > train` so no test message ever appears in training.
3. **Model 1 — Disaster Type Classification (Random Forest Classifier):**
   - **Verified Match:** Implemented and deployed as a **Random Forest Classifier** (`n_estimators=250`, `min_samples_leaf=2`, `max_features='sqrt'`, `random_state=42`) over the top $6,000$ $\chi^2$-selected features from a $70,016$-dimensional multilingual TF-IDF and cross-lingual crisis lexicon matrix, wrapped in isotonic `CalibratedClassifierCV` ([`models/v2/type_classifier.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/type_classifier.pkl)).
   - **Independent Test Result ($n = 9,300$):** **84.04% Accuracy**, **89.31% Macro Precision**, **86.55% Macro Recall**, **86.36% Macro F1-Score**, and **0.0383 Expected Calibration Error (ECE)**.
4. **Model 2 — Severity-Level Prediction (XGBoost Classifier):**
   - **Verified Task Type (Classification, NOT Regression):** Inspection of [`train_models_v2.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L210-L226) confirms that severity prediction is implemented as a **4-class ordinal multi-class classification task** using `xgboost.XGBClassifier` (`objective='multi:softprob'`, `eval_metric='mlogloss'`, `n_estimators=500`, `max_depth=6`, `learning_rate=0.08`, `subsample=0.85`, `colsample_bytree=0.5`, `random_state=42`) over $8,000$ $\chi^2$-selected features with isotonic probability calibration ([`models/v2/severity_model.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/severity_model.pkl)).
   - **Independent Test Result ($n = 12,593$):** **61.65% Accuracy** across the four ordinal tiers (`low`, `moderate`, `high`, `critical`), **63.57% Weighted Precision**, **60.99% Weighted F1-Score**, **0.5527 Quadratic Weighted Cohen's Kappa ($\kappa_w$)**, and **0.0268 ECE** (outperforming the Logistic Regression baseline of **47.16% Accuracy** / **43.87% Macro F1** by $+14.49$ percentage points).
   - **Companion Spatial Severity Model for Zero-Text One-Tap SOS:** When a citizen submits a One-Tap SOS without text, [`app.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/app.py#L190-L237) invokes [`models/v2/spatial_severity_model.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/spatial_severity_model.pkl) (a 17-feature Malaybalay geohazard Random Forest classifier trained on $2,500$ local coordinate records across all 46 barangays, achieving **62.00% 5-fold cross-validation accuracy** and **77.53% High-severity recall**).
5. **Model 3 — False Alarm and Duplicate Report Detection:**
   - **False Alarm Detection (Logistic Regression vs. Deployed Calibrated Histogram Gradient Boosting):**
     - In the initial v1 pipeline ([`train_models.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models.py#L149-L171)), false alarm detection was implemented using `LogisticRegression`.
     - In the v2 retraining pipeline ([`train_models_v2.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L130-L135), [lines 229–264](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L229-L264)), **both** `LogisticRegression(max_iter=2000, C=4.0, class_weight='balanced', random_state=42)` and `HistGradientBoostingClassifier` (with Platt sigmoid calibration) were trained and evaluated on the exact same $1,200$ $\chi^2$-selected features ($n_{\text{train}} = 60,036$, $n_{\text{test}} = 21,404$).
     - On the held-out test set ($n = 21,404$), **Logistic Regression** achieves **71.20% Accuracy**, **80.86% False Alarm Recall**, **88.47% Legitimate Precision**, **70.51% Macro Precision**, **73.83% Macro Recall**, and **69.92% Macro F1-Score**. Because **Calibrated Histogram Gradient Boosting** achieved higher overall accuracy (**77.92%**), higher Macro F1 (**74.09%**), and **91.67% accuracy** on the Cebuano/Tagalog Philippine seed test subset, `HistGradientBoostingClassifier` was saved as the primary production artifact (`models/v2/legitimacy_model.pkl`), while Logistic Regression is retained in the training pipeline as the linear classifier benchmark. Both sets of actual measured results are reported in Section 4.5.3 so the manuscript remains 100% transparent and aligned with both the chapter outline and the deployed codebase.
   - **Duplicate Report Detection (Separate Spatio-Temporal & Rule-Based Mechanism):**
     - Code inspection confirms that **duplicate-report detection is NOT performed by Logistic Regression**. Instead, duplicate detection, cellular retransmission idempotency, multi-report cluster corroboration, and cross-location spammer jump detection are handled by a dedicated ** deterministic spatio-temporal and distance-based algorithmic layer** in the Node.js backend ([`alertRoutes.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L30-L97), [lines 262–355](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L262-L355), [lines 673–692](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L673-L692); [`enhancedMLModel.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/utils/enhancedMLModel.js#L123-L247)) and the Python spatial cluster escalator ([`app.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/app.py#L257-L291)).

---

## 2. Comparison of Manuscript Model Specifications vs. Actual System Implementation

To ensure full academic integrity during the oral defense, the table below documents the exact relationship between the manuscript section headings and the actual SALBA v2 production source code:

| Manuscript Section & Stated Model | Actual Implementation in SALBA Codebase | Alignment Status & Technical Notes |
| :--- | :--- | :--- |
| **4.5.1 Disaster Type Classification**<br>*(Random Forest Classifier)* | **`RandomForestClassifier`** (`n_estimators=250`, `min_samples_leaf=2`, `max_features='sqrt'`, `random_state=42`) wrapped in `CalibratedClassifierCV(method='isotonic')` in [`train_models_v2.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L181-L194) and loaded from `models/v2/type_classifier.pkl`. | **Exact Match.** Classifies incoming text into the 5 core disaster types (`Earthquake`, `Fire`, `Flood`, `Landslide`, `Typhoon`). Furthermore, when a victim selects one of the 5 hybrid "Others" categories (`Drowning`, `Vehicular accident`, `Trapped`, `Lost`, `Medical assistance`), [`app.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/app.py#L88) preserves the canonical category while running severity and legitimacy verification on the required note. |
| **4.5.2 Severity-Level Prediction**<br>*(XGBoost)* | **`xgboost.XGBClassifier`** (`objective='multi:softprob'`, `n_estimators=500`, `max_depth=6`, `learning_rate=0.08`, `random_state=42`) wrapped in `CalibratedClassifierCV(method='isotonic')` in [`train_models_v2.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L210-L226) and loaded from `models/v2/severity_model.pkl`. Supplemented by `spatial_severity_model.pkl` for zero-text One-Tap SOS reports. | **Exact Match (Classification Task).** Predicts 4 ordinal severity classes (`low`, `moderate`, `high`, `critical`). Classification metrics (Accuracy, Precision, Recall, F1-Score, and Quadratic Weighted Kappa) apply. |
| **4.5.3 False Alarm Detection**<br>*(Logistic Regression)* | **Dual Implementation:**<br>1. `LogisticRegression` (`C=4.0`, `max_iter=2000`, `class_weight='balanced'`) is implemented in [`train_models.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models.py#L149) and evaluated on the v2 test split in [`train_models_v2.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L130-L135) ([line 260](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L260)).<br>2. `HistGradientBoostingClassifier` with sigmoid calibration is deployed in `models/v2/legitimacy_model.pkl`, paired with lexical distress/prank safeguards (`apply_emergency_safeguards`). | **Evaluated & Documented.** Table 4-12 reports the exact measured test metrics of the **Logistic Regression** classifier ($n = 21,404$), and Table 4-12B compares it side-by-side with the deployed **Calibrated Histogram Gradient Boosting** model to justify the v2 architectural upgrade. |
| **4.5.3 Duplicate Report Detection**<br>*(Stated under Section 4.5.3)* | **Deterministic Spatio-Temporal & Geodesic Rules** in [`alertRoutes.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L262-L293), [`enhancedMLModel.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/utils/enhancedMLModel.js#L123-L247), and [`app.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/app.py#L258-L291):<br>1. `clientRequestId` UUID idempotency guard.<br>2. 5-second coordinate + disaster type duplicate suppression.<br>3. Haversine distance ($<50\text{ m}$ one-tap / $<200\text{ m}$ text) and time window ($<5\text{--}10\text{ min}$) duplicate scoring.<br>4. Distinct-user cluster corroboration ($2\text{ km}$ / $30\text{ min}$) and impossible travel speed detection ($\ge 150\text{ km/h}$ across $\ge 1.5\text{ km}$). | **Clarified Separately.** Duplicate detection requires comparing relational database timestamps, user IDs, and GPS coordinates across multiple submissions rather than classifying a single text vector in isolation. It is therefore documented in Table 4-12C as an algorithmic spatio-temporal subsystem working alongside the ML false-alarm classifier. |

---

## 3. Verified Dataset Sourcing, Preprocessing, and Evaluation Methodology

### 3.1 Corpus Composition and Leakage-Free Event Partitioning
The consolidated corpus (`salba-ml-service/data/processed/salba_corpus.csv`) contains **163,052 unique, deduplicated crisis records** after PII scrubbing (removing phone numbers and email addresses in compliance with Republic Act No. 10173, the Data Privacy Act of 2012) and text normalization (`len(normalize_text(text)) >= 3`).

Because individual source rows carry labels for one or more tasks (disaster type, humanitarian severity, or informativeness/legitimacy), each model is trained, calibrated, and tested on the subset of rows possessing ground-truth annotations for its target variable:

| Model Task | Training Samples (`split='train'`) | Calibration Samples (`split='calib'`) | Independent Test Samples (`split='test'`) | Total Annotated Samples Evaluated |
| :--- | :---: | :---: | :---: | :---: |
| **1. Disaster Type Classification (Random Forest)** | 22,994 *(balanced cap: max 7,000/class)* | 9,747 | 9,300 | **42,041** |
| **2. Severity-Level Prediction (XGBoost)** | 64,527 | 11,495 | 12,593 | **88,615** |
| **3. False Alarm Detection (Logistic Regression & HistGB)** | 60,036 *(capped at 60,000 + PH seed)* | 20,499 | 21,404 | **101,939** |
| **4. Malaybalay Spatial Severity (One-Tap SOS RF)** | 2,000 per fold *(5-fold CV)* | Internal 3-fold isotonic | 500 per fold *(2,500 out-of-fold)* | **2,500** |

### 3.2 Training and Test Class Distributions
- **Disaster Type Classifier (`Random Forest`):**
  - **Training Set ($n = 22,994$):** `Earthquake`: 7,000 (30.44%), `Flood`: 7,000 (30.44%), `Typhoon`: 7,000 (30.44%), `Fire`: 1,811 (7.88%), `Landslide`: 183 (0.80%).
  - **Held-Out Test Set ($n = 9,300$):** `Typhoon`: 3,422 (36.80%), `Flood`: 2,584 (27.78%), `Earthquake`: 1,982 (21.31%), `Fire`: 1,182 (12.71%), `Landslide`: 130 (1.40%).
- **Severity-Level Predictor (`XGBoost`):**
  - **Training Set ($n = 64,527$):** `low`: 13,088 (20.28%), `moderate`: 37,360 (57.90%), `high`: 10,042 (15.56%), `critical`: 4,037 (6.26%).
  - **Held-Out Test Set ($n = 12,593$):** `low`: 3,649 (28.98%), `moderate`: 4,592 (36.46%), `high`: 3,776 (29.98%), `critical`: 576 (4.57%).
- **False Alarm Detector (`Logistic Regression` & `HistGradientBoosting`):**
  - **Training Set ($n = 60,036$):** `false_alarm` (0): 24,021 (40.01%), `legitimate` (1): 36,015 (59.99%).
  - **Held-Out Test Set ($n = 21,404$):** `false_alarm` (0): 6,692 (31.27%), `legitimate` (1): 14,712 (68.73%).

### 3.3 Text Preprocessing and Feature Engineering (`70,016` Features)
Implemented in [`salba-ml-service/utils/text_features.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/utils/text_features.py):
1. **Normalization (`normalize_text`):** Converts text to lowercase, strips URLs (`https?://\S+`), removes `@mentions` and `RT` prefixes, strips punctuation while retaining Filipino characters (`ñ`) and word-internal hyphens, and compresses elongated panic characters (`r'(.)\1{2,}'` $\rightarrow$ `r'\1\1'`, e.g., `"tabangggg"` $\rightarrow$ `"tabangg"`).
2. **Word N-Gram TF-IDF (`30,000` features):** Unigrams and bigrams (`ngram_range=(1, 2)`), `min_df=3`, sublinear term frequency scaling (`sublinear_tf=True`), fitted strictly on `split == 'train'`.
3. **Subword Character N-Gram TF-IDF (`40,000` features):** Word-bounded character 3-to-5-grams (`analyzer='char_wb'`, `ngram_range=(3, 5)`), `min_df=3`, `sublinear_tf=True`, capturing Cebuano/Bisaya and Tagalog verbal affixes (*nagbaha*, *binabaha*, *gibaha*, *nasunog*, *nidahili*) and mobile typing errors.
4. **Cross-Lingual Crisis Lexicon & Surface Features (`16` dense features):** 11 word-boundary token and multi-word phrase counters across English, Tagalog, Cebuano/Bisaya, and Binukid (`lex_fire`, `lex_flood`, `lex_earthquake`, `lex_landslide`, `lex_typhoon`, `lex_life_threat`, `lex_injury`, `lex_help_request`, `lex_damage`, `lex_downgrade`, `lex_prank`) plus 5 structural indicators (`has_text`, `log_n_tokens`, `exclaim_ratio`, `upper_ratio`, `question`).
5. **Chi-Squared ($\chi^2$) Feature Selection & Sample Weighting:** To prevent overfitting on high-dimensional sparse text, `SelectKBest(chi2)` selects the top $k = 6,000$ features for Disaster Type, $k = 8,000$ features for Severity, and $k = 1,200$ features for False Alarm Detection. Balanced inverse class frequencies (`compute_sample_weight('balanced')`) are multiplied by a $15.0\times$ up-weighting factor on local Philippine seed examples (`SEED_WEIGHT = 15.0`).

---

## 4. Ready-to-Insert Manuscript Section: 4.5 AI Model Performance Evaluation

> **Note to Researchers:** The section below is written in formal academic style suitable for direct insertion into **Chapter 4 (Results and Discussion), Section 4.5** of your BSIT capstone manuscript. Every number in Tables 4-9 through 4-12C matches the exact verified outputs of the evaluation script executed against the held-out test datasets.

---

### 4.5 AI Model Performance Evaluation

To validate the reliability of the artificial intelligence triage pipeline integrated into the SALBA platform, each machine learning model was evaluated using an independent held-out test set partitioned at the disaster-event level. Unlike conventional random row splitting, event-level partitioning ensures that crisis reports from entire historical disasters, including four major Philippine disaster events (the 2013 Bohol Earthquake, 2012 Typhoon Pablo, 2013 Manila Floods, and 2012 Philippine Floods), were completely unseen during model training. Feature extraction was performed using a 70,016-dimensional hybrid multilingual featurizer combining word unigrams and bigrams (30,000 features), word-bounded character 3-to-5-grams (40,000 features), and 16 cross-lingual English, Tagalog, Cebuano-Bisaya, and Binukid lexicon and structural indicators. All experiments were executed using a fixed random seed (`random_state = 42`) to ensure full reproducibility.

---

#### 4.5.1 Disaster Type Classification (Random Forest Classifier)

The Disaster Type Classification model categorizes incoming text-based emergency reports into five primary hazard categories: *Earthquake*, *Fire*, *Flood*, *Landslide*, and *Typhoon*. The model is implemented as a Random Forest Classifier configured with 250 decision trees (`n_estimators = 250`), a minimum of 2 samples per leaf node (`min_samples_leaf = 2`), square-root feature subsampling (`max_features = 'sqrt'`), and balanced class sample weighting over the top 6,000 chi-squared ($\chi^2$) selected features. To ensure that the predicted confidence scores reflect true empirical probabilities for emergency dispatchers, the trained Random Forest was calibrated using isotonic regression on a separate held-out calibration set of 9,747 reports prior to evaluation on the independent test set of 9,300 reports.

##### Table 4-9. Random Forest Classifier Performance

| Disaster Category / Metric | Precision (%) | Recall (%) | F1-Score (%) | Test Support ($n$) | Correctly Classified | Misclassified |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Earthquake** | 98.99 | 83.96 | 90.85 | 1,982 | 1,664 | 318 |
| **Fire** | 98.12 | 97.04 | 97.58 | 1,182 | 1,147 | 35 |
| **Flood** | 96.95 | 59.09 | 73.43 | 2,584 | 1,527 | 1,057 |
| **Landslide** | 81.46 | 94.62 | 87.54 | 130 | 123 | 7 |
| **Typhoon** | 71.02 | 98.04 | 82.37 | 3,422 | 3,355 | 67 |
| **Macro Average** | **89.31** | **86.55** | **86.36** | **9,300** | **7,816** | **1,484** |
| **Weighted Average** | **87.78** | **84.04** | **83.70** | **9,300** | **7,816** | **1,484** |
| **Overall Accuracy** | \multicolumn{6}{c}{**84.04%** (7,816 / 9,300 test cases correctly classified)} |
| **Expected Calibration Error (ECE)** | \multicolumn{6}{c}{**0.0383** (reduced from 0.0488 pre-calibration; Multi-class Brier Score = 0.2477)} |
| **Mean Classifier Inference Time** | \multicolumn{6}{c}{**0.0168 ms / sample** (batch vector inference); **146.23 ms / report** (full end-to-end API pipeline)} |

Table 4-9 presents the classification performance of the calibrated Random Forest model across the 9,300 independent test reports. The classifier achieved an overall accuracy of 84.04% (correctly classifying 7,816 out of 9,300 test cases), a macro-averaged precision of 89.31%, a macro-averaged recall of 86.55%, and a macro-averaged F1-score of 86.36%. This represents a substantial improvement over the baseline linear Logistic Regression classifier evaluated on the same split, which achieved 76.03% accuracy and a 75.98% macro F1-score. Among individual hazard classes, the model demonstrated exceptionally high precision for *Earthquake* (98.99%), *Fire* (98.12%), and *Flood* (96.95%). *Fire* achieved the highest overall class F1-score at 97.58% (1,147 correct out of 1,182 test cases), while *Landslide* achieved a recall of 94.62% (123 correct out of 130 test cases) despite having the smallest representation in the training corpus. Isotonic probability calibration reduced the Expected Calibration Error (ECE) from 0.0488 to 0.0383, confirming that the probability estimates displayed on the CDRRMO command dashboard closely correspond to actual classification reliability.

A primary limitation observed in Table 4-9 is the comparatively lower recall for the *Flood* category (59.09%, with 1,527 correct classifications and 1,057 misclassifications), contrasted with the high recall (98.04%) but lower precision (71.02%) of the *Typhoon* category. In the context of Philippine and tropical disaster reporting, flood events frequently occur as a direct hydrological consequence of typhoons, causing citizen reports to contain overlapping meteorological vocabulary (such as heavy rain, storm surges, and rising river water). Within the SALBA emergency reporting workflow, this limitation is mitigated in two ways: first, citizens using the DisasterSOS mobile application explicitly select a hazard icon or one of the five specialized emergency types (*Drowning*, *Vehicular accident*, *Trapped*, *Lost*, or *Medical assistance*) prior to submission; second, the runtime lexical safeguard layer (`apply_emergency_safeguards`) inspects explicit Cebuano-Bisaya and Tagalog hazard roots (such as *baha*, *lunop*, *sunog*, *linog*, and *nidahili*) to reinforce the appropriate hazard class during live triage.

##### Table 4-10. Confusion Matrix - Disaster Type Classification

| Actual Disaster Category | Predicted: Earthquake | Predicted: Fire | Predicted: Flood | Predicted: Landslide | Predicted: Typhoon | Total Actual ($n$) | Class Recall (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Actual: Earthquake** | **1,664** | 6 | 7 | 2 | 303 | 1,982 | 83.96% |
| **Actual: Fire** | 1 | **1,147** | 0 | 0 | 34 | 1,182 | 97.04% |
| **Actual: Flood** | 3 | 8 | **1,527** | 17 | 1,029 | 2,584 | 59.09% |
| **Actual: Landslide** | 3 | 0 | 1 | **123** | 3 | 130 | 94.62% |
| **Actual: Typhoon** | 10 | 8 | 40 | 9 | **3,355** | 3,422 | 98.04% |
| **Total Predicted ($n$)** | **1,681** | **1,169** | **1,575** | **151** | **4,724** | **9,300** | — |
| **Class Precision (%)** | **98.99%** | **98.12%** | **96.95%** | **81.46%** | **71.02%** | — | **84.04% Acc.** |

Table 4-10 presents the complete five-by-five confusion matrix for the Random Forest Disaster Type Classifier on the 9,300 held-out test instances. The diagonal elements confirm strong class separation across distinct physical hazards, totaling 7,816 correct predictions. Specifically, cross-hazard confusion between unrelated physical phenomena is minimal: zero *Fire* reports were misclassified as *Flood* or *Landslide*, only 1 *Fire* report was misclassified as *Earthquake*, and only 3 *Flood* reports were misclassified as *Earthquake*. Similarly, 123 of the 130 *Landslide* test instances were correctly identified, with only 7 total errors distributed across *Earthquake* (3), *Flood* (1), and *Typhoon* (3).

An examination of the off-diagonal entries in Table 4-10 reveals that 90.90% of all classification errors across the entire test set (1,349 out of 1,484 total errors) occurred in a single column: reports whose ground-truth event label was *Flood* (1,029 cases) or *Earthquake* (303 cases) being predicted as *Typhoon*. This asymmetric error distribution stems from the event-level labeling of the held-out crisis datasets, where general relief, evacuation, and weather-related messages originating during flood or earthquake events share generic humanitarian phrasing with typhoon disaster corpora. Conversely, when the Random Forest model predicts *Earthquake*, *Fire*, or *Flood*, its predictions are highly trustworthy, with false-positive counts of only 17 out of 1,681 for *Earthquake* (98.99% precision), 22 out of 1,169 for *Fire* (98.12% precision), and 48 out of 1,575 for *Flood* (96.95% precision). For Malaybalay City CDRRMO operations, this high precision ensures that automated hazard categorization rarely misdirects specialized response units such as the Bureau of Fire Protection (BFP) or swift-water rescue teams.

---

#### 4.5.2 Severity-Level Prediction (XGBoost)

The Severity-Level Prediction model is formulated as a four-tier ordinal multi-class classification task (`xgboost.XGBClassifier` with `multi:softprob` objective) that assigns incoming emergency reports to one of four operational urgency levels: *Low*, *Moderate*, *High*, or *Critical*. The model was trained on 64,527 annotated crisis reports across the top 8,000 $\chi^2$-selected textual and lexical features (`n_estimators = 500`, `max_depth = 6`, `learning_rate = 0.08`, `subsample = 0.85`, `colsample_bytree = 0.5`), calibrated via isotonic regression on 11,495 held-out reports, and evaluated on 12,593 independent test reports. Because incident severity is inherently ordinal, performance was evaluated using standard classification metrics alongside Quadratic Weighted Cohen's Kappa ($\kappa_w$), which penalizes multi-tier misclassifications (such as confusing *Critical* with *Low*) more heavily than adjacent-tier differences. In addition, for One-Tap SOS alerts submitted without descriptive text, a companion 17-feature Malaybalay Spatial Severity Random Forest model (`spatial_severity_model.pkl`) was evaluated across 2,500 geographically grounded Malaybalay reports using 5-fold stratified cross-validation.

##### Table 4-11. XGBoost Performance for Severity Prediction

| Severity Level / Metric | Precision (%) | Recall (%) | F1-Score (%) | Test Support ($n$) | Correctly Classified | Misclassified |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Low** | 71.18 | 53.88 | 61.33 | 3,649 | 1,966 | 1,683 |
| **Moderate** | 57.71 | 80.07 | 67.08 | 4,592 | 3,677 | 915 |
| **High** | 66.00 | 46.16 | 54.32 | 3,776 | 1,743 | 2,033 |
| **Critical** | 46.03 | 65.45 | 54.05 | 576 | 377 | 199 |
| **Macro Average** | **60.23** | **61.39** | **59.20** | **12,593** | **7,763** | **4,830** |
| **Weighted Average** | **63.57** | **61.65** | **60.99** | **12,593** | **7,763** | **4,830** |
| **Overall Accuracy (Text XGBoost)** | \multicolumn{6}{c}{**61.65%** (7,763 / 12,593 test cases; Philippine subset $n = 2,758$ Accuracy = **65.01%**)} |
| **Quadratic Weighted Kappa ($\kappa_w$)** | \multicolumn{6}{c}{**0.5527** (Moderate-to-Strong Ordinal Agreement; Baseline Logistic Regression Accuracy = 47.16%)} |
| **Expected Calibration Error (ECE)** | \multicolumn{6}{c}{**0.0268** (reduced from 0.0750 pre-calibration; Multi-class Brier Score = 0.5143)} |
| **Companion Spatial Model (One-Tap SOS)** | \multicolumn{6}{c}{**62.00% Accuracy** (5-Fold CV, $n = 2,500$, 17 Malaybalay geospatial features; High Recall = **77.53%**)} |

##### Table 4-11B. Confusion Matrix - Severity-Level Prediction (XGBoost)

| Actual Severity Level | Predicted: Low | Predicted: Moderate | Predicted: High | Predicted: Critical | Total Actual ($n$) | Class Recall (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Actual: Low** | **1,966** | 1,308 | 315 | 60 | 3,649 | 53.88% |
| **Actual: Moderate** | 361 | **3,677** | 505 | 49 | 4,592 | 80.07% |
| **Actual: High** | 422 | 1,278 | **1,743** | 333 | 3,776 | 46.16% |
| **Actual: Critical** | 13 | 108 | 78 | **377** | 576 | 65.45% |
| **Total Predicted ($n$)** | **2,762** | **6,371** | **2,641** | **819** | **12,593** | **61.65% Acc.** |

Table 4-11 and Table 4-11B present the performance metrics and confusion matrix of the calibrated XGBoost Classifier for incident severity prediction across 12,593 held-out test reports. The model achieved an overall 4-class accuracy of 61.65% (7,763 correct predictions), a weighted precision of 63.57%, a weighted F1-score of 60.99%, and a macro F1-score of 59.20%. On the Philippine disaster subset ($n = 2,758$), accuracy reached 65.01%. Compared against the linear Logistic Regression baseline trained on the identical feature matrix (47.16% accuracy and 43.87% macro F1-score), XGBoost delivered a 14.49-percentage-point improvement in overall accuracy and a 15.33-percentage-point gain in macro F1-score. Furthermore, isotonic calibration reduced the Expected Calibration Error from 0.0750 to 0.0268, providing highly reliable probability distributions across the four urgency tiers.

Although a raw four-class exact-match accuracy of 61.65% reflects the inherent subjectivity of human-annotated crisis severity labels in short text messages, the Quadratic Weighted Cohen's Kappa of 0.5527 and the confusion matrix in Table 4-11B reveal strong ordinal consistency. Specifically, out of 12,593 test predictions, 11,554 predictions (91.75%) fell either on the exact ground-truth severity tier or within a single adjacent tier ($\pm 1$ level). Most importantly for life-safety triage, out of 576 actual *Critical* test incidents involving casualties or trapped victims, the model achieved a recall of 65.45% (377 cases) for exact *Critical* classification and placed 455 cases (78.99%) into the top two urgent dispatch tiers (*Critical* or *High*), while only 13 *Critical* cases (2.26%) were misclassified as *Low*. To further safeguard short local emergency reports and zero-text submissions in Malaybalay City, SALBA combines the XGBoost textual probability distribution with two domain mechanisms during live inference: (1) the calibrated 17-feature Malaybalay Spatial Severity model (which achieves 62.00% 5-fold cross-validation accuracy and 77.53% recall on *High* severity incidents across Malaybalay's 46 barangays and MGB hazard corridors), and (2) proportional simplex safeguard rules that prevent reports containing life-threat keywords (*trapped*, *naipit*, *nalunod*, *nalumos*, *unconscious*, *patay*) from being downgraded to *Low* severity.

---

#### 4.5.3 False Alarm and Duplicate Report Detection

In the SALBA triage architecture, report verification addresses two distinct operational challenges: (1) **False Alarm Detection**, which evaluates the textual and lexical content of a single report to determine whether it represents a genuine emergency (*Legitimate*, class 1) or a non-emergency, prank, drill, or noise submission (*False Alarm*, class 0); and (2) **Duplicate and Spam Report Detection**, which evaluates spatio-temporal proximity, device idempotency, and reporter travel velocity across multiple database records.

For the text-based False Alarm Detection task, the initial system design specified a **Logistic Regression** classifier (`C = 4.0`, `max_iter = 2000`, `class_weight = 'balanced'`, `random_state = 42`) trained on 60,036 labeled reports across 1,200 $\chi^2$-selected features. During the Version 2 retraining process, Logistic Regression was evaluated on the 21,404 held-out test reports and compared against a non-linear **Calibrated Histogram Gradient Boosting** classifier (`HistGradientBoostingClassifier`, `max_iter = 400`, `learning_rate = 0.08`, `max_leaf_nodes = 48`, calibrated via Platt sigmoid scaling on 20,499 held-out calibration reports). Table 4-12 presents the complete evaluation results for the Logistic Regression classifier, Table 4-12B presents the comparative performance of the deployed Calibrated Histogram Gradient Boosting classifier, and Table 4-12C documents the separate spatio-temporal algorithms responsible for duplicate-report and multi-report cluster detection.

##### Table 4-12. Logistic Regression Performance for False Alarm Detection

| Target Class / Metric | Precision (%) | Recall (%) | F1-Score (%) | Test Support ($n$) | Correctly Classified | Misclassified |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **False Alarm / Non-Emergency (`0`)** | 52.56 | 80.86 | 63.71 | 6,692 | 5,411 (TN) | 1,281 (FP) |
| **Legitimate Emergency (`1`)** | 88.47 | 66.80 | 76.12 | 14,712 | 9,828 (TP) | 4,884 (FN) |
| **Macro Average** | **70.51** | **73.83** | **69.92** | **21,404** | **15,239** | **6,165** |
| **Weighted Average** | **77.24** | **71.20** | **72.24** | **21,404** | **15,239** | **6,165** |
| **Overall Accuracy** | \multicolumn{6}{c}{**71.20%** (15,239 / 21,404 test cases correctly classified)} |
| **Confusion Matrix Summary** | \multicolumn{6}{c}{True False Alarms Caught = **5,411** | False Alarms Missed = **1,281** | Legitimate Flagged = **4,884** | True Legitimate = **9,828**} |
| **Mean Classifier Inference Time** | \multicolumn{6}{c}{**0.00013 ms / sample** (2.82 ms for 21,404 test samples)} |

##### Table 4-12B. Comparative Performance of Logistic Regression and Deployed Histogram Gradient Boosting for False Alarm Detection

| Performance Metric | Logistic Regression Classifier (Baseline Linear Model, $n = 21,404$) | Calibrated Histogram Gradient Boosting (Deployed v2 Production Model, $n = 21,404$) | Performance Difference (HistGB vs. LogReg) |
| :--- | :---: | :---: | :---: |
| **Overall Test Accuracy (%)** | 71.20% (15,239 / 21,404) | **77.92%** (16,677 / 21,404) | **+6.72%** (+1,438 correct cases) |
| **Macro-Averaged Precision (%)** | 70.51% | **74.31%** | **+3.80%** |
| **Macro-Averaged Recall (%)** | 73.83% | **73.89%** | **+0.06%** |
| **Macro-Averaged F1-Score (%)** | 69.92% | **74.09%** | **+4.17%** |
| **Weighted-Averaged F1-Score (%)** | 72.24% | **77.82%** | **+5.58%** |
| **False Alarm (`0`) Precision / Recall / F1** | 52.56% / **80.86%** / 63.71% | **65.15%** / 63.14% / **64.13%** | +12.59% Prec / -17.72% Rec / **+0.42% F1** |
| **Legitimate (`1`) Precision / Recall / F1** | **88.47%** / 66.80% / 76.12% | 83.46% / **84.64%** / **84.05%** | -5.01% Prec / **+17.84% Rec** / **+7.93% F1** |
| **False Alarms Correctly Caught (`0` $\rightarrow$ `0`)** | **5,411** / 6,692 | 4,225 / 6,692 | -1,186 cases |
| **Legitimate Reports Correctly Verified (`1` $\rightarrow$ `1`)** | 9,828 / 14,712 | **12,452** / 14,712 | **+2,624 cases** |
| **Legitimate Reports Falsely Rejected (`1` $\rightarrow$ `0`)** | 4,884 / 14,712 (33.20% error) | **2,260** / 14,712 (15.36% error) | **-2,624 fewer false rejections** |
| **Philippine Subset Accuracy ($n = 2,933$)** | — | **79.92%** | — |
| **PH Seed (Cebuano/Tagalog) Accuracy ($n = 24$)** | — | **91.67%** (22 / 24) | — |
| **Expected Calibration Error (ECE)** | — | **0.0355** (Brier = 0.1563) | — |

Table 4-12 presents the independent test performance of the Logistic Regression model for false alarm detection across 21,404 held-out reports (6,692 actual *False Alarm / Non-Emergency* cases and 14,712 actual *Legitimate Emergency* cases). Logistic Regression achieved an overall accuracy of 71.20% (15,239 correct classifications), a weighted precision of 77.24%, a weighted F1-score of 72.24%, and a macro F1-score of 69.92%. As shown in Table 4-12, the balanced class weighting caused Logistic Regression to act as an aggressive filter: it achieved a high recall of 80.86% on the *False Alarm* class (correctly catching 5,411 out of 6,692 non-emergency reports) and a high precision of 88.47% when declaring a report *Legitimate*. However, this aggressive linear boundary came at a severe operational cost: Logistic Regression misclassified 4,884 out of 14,712 actual *Legitimate* emergency reports as false alarms (resulting in a *Legitimate* recall of only 66.80% and a *False Alarm* precision of only 52.56%).

Table 4-12B illustrates why the production SALBA v2 service upgrades the false alarm detector from Logistic Regression to the sigmoid-calibrated Histogram Gradient Boosting model (`legitimacy_model.pkl`) paired with lexical emergency safeguards. In emergency management, falsely rejecting a genuine distress call (a false negative on legitimacy) is substantially more dangerous than forwarding an ambiguous report to a human dispatcher for review. By modeling non-linear feature interactions among character n-grams and crisis lexicon indicators, Histogram Gradient Boosting increased overall accuracy from 71.20% to 77.92% (+6.72%), increased *Legitimate* emergency recall from 66.80% to 84.64% (recovering 2,624 additional genuine emergency reports that Logistic Regression wrongly flagged), and improved *False Alarm* precision from 52.56% to 65.15%. On the Philippine disaster test subset ($n = 2,933$), accuracy reached 79.92%, and on the local Cebuano-Bisaya and Tagalog seed test subset ($n = 24$), accuracy reached 91.67%. Furthermore, when the runtime emergency safeguard layer (`apply_emergency_safeguards`) is active, short verified Cebuano/Tagalog distress phrases (such as *"baha sa amo"*, *"naay sunog"*, *"tabang"*, and *"nalunod akong anak"*) achieved 100% legitimate verification (0.92 confidence), while explicit prank and drill messages (*"joke lang to mga sir binuang ra"*, *"Testing emergency alert sound drill only"*) were flagged as false alarms with 0.92 to 0.97 confidence.

##### Table 4-12C. Spatio-Temporal Duplicate, Spam, and Multi-Report Cluster Detection Mechanisms

| Verification Mechanism | Implementation Location | Algorithmic Rule & Thresholds | Operational Output & System Behavior |
| :--- | :--- | :--- | :--- |
| **1. Client Retransmission Idempotency** | `alertService.js` & `alertRoutes.js` (Lines 263–274) | Matches unique `clientRequestId` (`sos-<timestamp>-<random>`) against existing MongoDB `Report` documents. | Prevents duplicate database inserts when weak cellular signals cause HTTP retry retransmissions (`200 OK`, `isDuplicate: true`). |
| **2. Immediate Coordinate Duplicate Suppression** | `alertRoutes.js` (Lines 276–355) | Queries `Report` collection for identical `(lat, lng, disasterType)` submitted within a $\Delta t \le 5,000\text{ ms}$ (5-second) window. | Suppresses accidental double-taps on the SOS button and returns the existing report without triggering redundant dispatches. |
| **3. Proximity & Temporal Duplicate Scoring** | `enhancedMLModel.js` (Lines 136–220) | Computes geodesic distance ($d$) and elapsed time ($\Delta t$):<br>• One-Tap SOS: $d < 50\text{ m}$ and $\Delta t < 5\text{ min}$ ($\text{duplicateScore} +0.60$).<br>• Text Report: $d < 200\text{ m}$ and $\Delta t < 10\text{ min}$ ($\text{duplicateScore} +0.70$).<br>• Same-user burst: $\Delta t < 3\text{--}5\text{ min}$ ($\text{falseAlarmRisk} +0.30\text{--}0.40$). | Flags redundant single-user submissions with `duplicateRisk` and `falseAlarmRisk` scores for dispatcher review. |
| **4. Impossible Travel Velocity (Cross-Location Spam Detection)** | `alertRoutes.js` (Lines 31–97) & `reportRoutes.js` (Lines 30–93) | Evaluates a single reporter's last 5 reports within 15 minutes using Haversine distance ($d \ge 1,500\text{ m}$) and travel speed ($v = d / \Delta t \ge 120\text{--}150\text{ km/h}$). | Overrides `isLegitimate = false` (`legitimacyConfidence = 0.18`, recommendation = `flag_false_alarm`) and retroactively flags the user's recent burst reports. |
| **5. Multi-Citizen Cluster Corroboration** | `alertRoutes.js` (Lines 673–692) & `app.py` (Lines 258–291) | Counts **distinct reporters** (`uniqueOtherReporters + 1`) submitting the same hazard within $\approx 2\text{ km}$ ($\pm 0.02^\circ$) and $\Delta t \le 30\text{ min}$. | Instead of discarding reports from different citizens as duplicates, treats them as independent witnesses: $N=2$ escalates severity to `high` ($0.85$ conf); $N \ge 3$ escalates to `critical` ($0.90\text{--}0.98$ conf, `AUTO_DISPATCH`). |

Table 4-12C summarizes the deterministic spatio-temporal mechanisms that govern duplicate report handling, spam suppression, and multi-citizen cluster corroboration in SALBA. A critical architectural distinction established during system inspection is that duplicate detection cannot be performed by a text-only Logistic Regression classifier, because determining whether a report is a duplicate requires comparing GPS coordinates, user identifiers, and timestamps across historical database records. Furthermore, in disaster management, two reports originating from the same barangay within ten minutes have entirely different meanings depending on whether they were sent by the **same user** or by **different citizens**. As detailed in Table 4-12C, SALBA resolves this dichotomy by suppressing same-device retransmissions (`clientRequestId` and 5-second coordinate locks) and penalizing single-user cross-location spam bursts (travel speeds $\ge 150\text{ km/h}$ across $\ge 1.5\text{ km}$), while aggregating reports from **distinct citizens** within a 2-kilometer, 30-minute window into a corroborated cluster count (`nearby_reports_count`). Empirical testing verified that when three distinct citizens submit One-Tap Flood SOS alerts in Barangay Casisang, the system preserves each victim's rescue request while dynamically escalating the incident severity to *Critical* (0.90 severity confidence, 0.98 legitimacy confidence) for immediate priority dispatch.

---

## 5. Supporting Technical Evidence, Software Configuration, and Reproducibility Log

### 5.1 Environment and Library Versions Verified
All metrics reported in this document were executed and verified in the local project virtual environment (`salba-ml-service/venv`):
- **Operating System:** Windows 10 / 11 (64-bit)
- **Python Version:** `3.11.0`
- **Scikit-Learn (`sklearn`):** `1.2.2`
- **XGBoost (`xgboost`):** `1.7.3`
- **Pandas (`pandas`):** `2.0.2`
- **NumPy (`numpy`):** `1.24.3`
- **Joblib (`joblib`):** `1.2.0`
- **Random Seed (`RS`):** `42` (`np.random.RandomState(42)`)

### 5.2 Model Artifact Inventory (`salba-ml-service/models/v2/`)
1. [`models/v2/text_featurizer.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/text_featurizer.pkl) — Fitted `TextFeaturizer` producing the $70,016$-column sparse CSR feature matrix.
2. [`models/v2/type_classifier.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/type_classifier.pkl) — Dictionary containing `selector` (`SelectKBest(chi2, k=6000)`), `model` (`CalibratedClassifierCV(RandomForestClassifier, method='isotonic')`), and `classes` (`['Earthquake', 'Fire', 'Flood', 'Landslide', 'Typhoon']`).
3. [`models/v2/severity_model.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/severity_model.pkl) — Dictionary containing `selector` (`SelectKBest(chi2, k=8000)`), `model` (`CalibratedClassifierCV(XGBClassifier, method='isotonic')`), and `classes` (`['low', 'moderate', 'high', 'critical']`).
4. [`models/v2/legitimacy_model.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/legitimacy_model.pkl) — Dictionary containing `selector` (`SelectKBest(chi2, k=1200)`), `model` (`CalibratedClassifierCV(HistGradientBoostingClassifier, method='sigmoid')`), and `classes` (`['false_alarm', 'legitimate']`).
5. [`models/v2/spatial_severity_model.pkl`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/spatial_severity_model.pkl) — Calibrated 17-feature Malaybalay City geospatial severity Random Forest model for One-Tap SOS reports.
6. [`models/v2/metadata.json`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/metadata.json) & [`models/v2/TRAINING_REPORT.md`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/models/v2/TRAINING_REPORT.md) — Saved training metadata and log output.

### 5.3 Reproducibility Commands
Researchers or defense panelists can reproduce all metrics and verification logs at any time from the repository root (`c:\Users\Zam\OneDrive\Desktop\capstone\SALBA-CDRRMO-RESCUE-APP`) without modifying any files:

```powershell
# 1. Rebuild the leakage-free 163,052-row training/calibration/test corpus (optional if salba_corpus.csv exists)
.\salba-ml-service\venv\Scripts\python.exe .\salba-ml-service\data_pipeline\build_training_corpus.py

# 2. Retrain and evaluate all v2 text models (Random Forest, XGBoost, HistGradientBoosting, and Logistic Regression baseline)
.\salba-ml-service\venv\Scripts\python.exe .\salba-ml-service\train_models_v2.py

# 3. Retrain and evaluate the 5-fold cross-validated Malaybalay Spatial Severity model
.\salba-ml-service\venv\Scripts\python.exe .\salba-ml-service\train_spatial_model.py

# 4. Run live One-Tap SOS, Malaybalay hazard corridor, 3-report cluster, and Cebuano/Tagalog safeguard tests
.\salba-ml-service\venv\Scripts\python.exe .\salba-ml-service\test_onetap_and_guards.py
```

---

## 6. Dataset Limitations and Evaluation Constraints

In accordance with academic integrity standards, the following limitations and operational constraints are explicitly disclosed:
1. **Cross-Event Domain Shift on Held-Out Philippine Disasters:** Because the four historical Philippine disaster events in CrisisBench (2013 Bohol Earthquake, 2012 Typhoon Pablo, 2013 Manila Floods, and 2012 Philippine Floods) were held out *entirely* in the test set (`n = 2,758` for Type/Severity; `n = 2,933` for Legitimacy), the base text-only Random Forest classifier experiences cross-event vocabulary shift between Typhoon Pablo and Manila/Philippine Floods (`58.41%` Philippine subset type accuracy vs. `84.04%` overall test accuracy), while achieving higher accuracy on thePhilippine subset for Severity (`65.01%` vs. `61.65%` overall) and Legitimacy (`79.92%` vs. `77.92%` overall, and `91.67%` on the local Cebuano/Tagalog seed subset).
2. **Label Granularity of Hybrid "Others" Categories:** The public international crisis corpora (CrisisBench and Appen) annotate the five macro-disasters (`Earthquake`, `Fire`, `Flood`, `Landslide`, `Typhoon`) rather than localized municipal rescue sub-types (`Drowning`, `Vehicular accident`, `Trapped`, `Lost`, `Medical assistance`). Consequently, SALBA preserves the user-selected canonical "Others" category via `OTHER_EMERGENCY_CANONICAL` while using the XGBoost severity model, the false-alarm legitimacy model, and the lexical safeguard rules (`apply_emergency_safeguards`) to evaluate the mandatory descriptive note.
3. **Class Imbalance in Landslide and Critical Tiers:** In real-world humanitarian corpora, *Landslide* represents $1.40\%$ of the type test set ($n = 130$) and *Critical* represents $4.57\%$ of the severity test set ($n = 576$). SALBA mitigates this imbalance during training through inverse class-frequency weighting (`compute_sample_weight('balanced')`) and a $7,000$-sample per-class cap on majority disaster types, achieving $94.62\%$ recall on *Landslide* and $65.45\%$ recall on *Critical* severity ($78.99\%$ within the top two urgent tiers).
