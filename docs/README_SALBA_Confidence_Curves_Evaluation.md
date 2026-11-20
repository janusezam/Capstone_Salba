# SALBA AI Model Confidence Curve Evaluation (Precision–Confidence, Recall–Confidence, and F1–Confidence Curves)
## Chapter 4, Section 4.5 Supplemental Visual & Numerical Evaluation

**Capstone Project:** *SALBA: An AI-Assisted Emergency Reporting and Rescue Coordination Platform for Malaybalay City*  
**Evaluation Style:** AgriSmart Figure 4-5 Three-Panel Scientific Presentation (`(a) Precision–Confidence Curve`, `(b) Recall–Confidence Curve`, `(c) F1–Confidence Curve`)  
**Data Integrity Statement:** All curves, thresholds, and metrics in this report were computed directly from the actual trained SALBA v2 model artifacts (`salba-ml-service/models/v2/*.pkl`) and the independent held-out event test datasets (`salba_corpus.csv`, `split == 'test'`). Zero production models or datasets were modified, and no synthetic approximations were used.

---

## 1. Deliverable Inventory (Figures, Vector PDFs, CSV Datasets & Script)

### 1.1 High-Resolution Figures (300 DPI PNG & Vector PDF)
| Figure ID | Evaluated Model & Task | 300 DPI PNG File | Vector PDF File |
| :--- | :--- | :--- | :--- |
| **Figure 4-5** | **Random Forest Classifier**<br>*(Disaster Type Classification, $n_{\text{test}} = 9,300$)* | [Figure_4_5_RF_Disaster_Type_Confidence_Curves.png](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_5_RF_Disaster_Type_Confidence_Curves.png) | [Figure_4_5_RF_Disaster_Type_Confidence_Curves.pdf](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_5_RF_Disaster_Type_Confidence_Curves.pdf) |
| **Figure 4-6** | **XGBoost Classifier**<br>*(Severity-Level Prediction, $n_{\text{test}} = 12,593$)* | [Figure_4_6_XGBoost_Severity_Confidence_Curves.png](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_6_XGBoost_Severity_Confidence_Curves.png) | [Figure_4_6_XGBoost_Severity_Confidence_Curves.pdf](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_6_XGBoost_Severity_Confidence_Curves.pdf) |
| **Figure 4-7** | **Logistic Regression (Baseline)**<br>*(False Alarm Detection, $n_{\text{test}} = 21,404$)* | [Figure_4_7_LogReg_False_Alarm_Confidence_Curves.png](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_7_LogReg_False_Alarm_Confidence_Curves.png) | [Figure_4_7_LogReg_False_Alarm_Confidence_Curves.pdf](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_7_LogReg_False_Alarm_Confidence_Curves.pdf) |
| **Figure 4-8** | **Calibrated HistGradientBoosting (Deployed v2)**<br>*(False Alarm Detection, $n_{\text{test}} = 21,404$)* | [Figure_4_8_HistGB_False_Alarm_Confidence_Curves.png](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_8_HistGB_False_Alarm_Confidence_Curves.png) | [Figure_4_8_HistGB_False_Alarm_Confidence_Curves.pdf](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_8_HistGB_False_Alarm_Confidence_Curves.pdf) |

### 1.2 Underlying Numerical Curve Data (CSV & JSON)
Each CSV file contains the exact `confidence_threshold` ($0.000$ to $1.000$ in steps of $0.005$, 201 thresholds per curve), `precision`, `recall`, `f1_score`, `support`, `class_or_average`, and `evaluation_type`:
- **Random Forest (Disaster Type — 1,407 rows):** [rf_disaster_type_confidence_curves.csv](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/curve_data/rf_disaster_type_confidence_curves.csv)
- **XGBoost (Severity Level — 1,206 rows):** [xgboost_severity_confidence_curves.csv](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/curve_data/xgboost_severity_confidence_curves.csv)
- **Logistic Regression Baseline (False Alarm — 804 rows):** [logreg_false_alarm_confidence_curves.csv](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/curve_data/logreg_false_alarm_confidence_curves.csv)
- **Deployed HistGradientBoosting (False Alarm — 804 rows):** [histgb_false_alarm_confidence_curves.csv](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/curve_data/histgb_false_alarm_confidence_curves.csv)
- **Consolidated Peak Metrics Summary (JSON):** [confidence_curves_summary.json](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/curve_data/confidence_curves_summary.json)
- **Reproducible Evaluation Script:** [generate_confidence_curves.py](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/generate_confidence_curves.py)

---

## 2. Evaluation Methodology & Mathematical Formulation

### 2.1 One-versus-Rest (OvR) Threshold Evaluation Across $[0.00, 1.00]$
For each test instance $i \in \{1, \dots, N\}$ and target class $c \in \{1, \dots, C\}$, the trained classifier outputs a calibrated posterior probability $p_{i,c} = P(Y_i = c \mid X_i)$ such that $\sum_{c=1}^{C} p_{i,c} = 1$.

To evaluate how precision, recall, and F1-score vary continuously with the decision confidence threshold $\tau \in [0.00, 1.00]$ (evaluated across 201 evenly spaced thresholds $\tau \in \{0.000, 0.005, 0.010, \dots, 1.000\}$):
1. **Binary One-versus-Rest Indicator:** For class $c$ at threshold $\tau$, instance $i$ is predicted positive if $p_{i,c} \ge \tau$, while the ground-truth indicator is $y_{i,c} = \mathbb{I}(Y_i = c)$.
2. **Per-Class Confusion Counts at Threshold $\tau$:**
   $$\text{TP}_c(\tau) = \sum_{i=1}^{N} \mathbb{I}(y_{i,c} = 1 \land p_{i,c} \ge \tau), \quad \text{FP}_c(\tau) = \sum_{i=1}^{N} \mathbb{I}(y_{i,c} = 0 \land p_{i,c} \ge \tau), \quad \text{FN}_c(\tau) = \sum_{i=1}^{N} \mathbb{I}(y_{i,c} = 1 \land p_{i,c} < \tau)$$
3. **Per-Class Precision, Recall, and F1-Score at Threshold $\tau$:**
   $$\text{Precision}_c(\tau) = \begin{cases} \dfrac{\text{TP}_c(\tau)}{\text{TP}_c(\tau) + \text{FP}_c(\tau)} & \text{if } \text{TP}_c(\tau) + \text{FP}_c(\tau) > 0 \\[8pt] 1.0 & \text{if } \text{TP}_c(\tau) + \text{FP}_c(\tau) = 0 \end{cases}$$
   $$\text{Recall}_c(\tau) = \frac{\text{TP}_c(\tau)}{\text{TP}_c(\tau) + \text{FN}_c(\tau)}, \qquad \text{F1}_c(\tau) = \frac{2 \cdot \text{Precision}_c(\tau) \cdot \text{Recall}_c(\tau)}{\text{Precision}_c(\tau) + \text{Recall}_c(\tau)}$$
4. **Aggregate "All Classes" Curves:**
   - **Macro-Averaged Curve (`all classes` bold navy line plotted in Figures 4-5 to 4-8):**
     $$\text{Precision}_{\text{macro}}(\tau) = \frac{1}{C} \sum_{c=1}^{C} \text{Precision}_c(\tau), \quad \text{Recall}_{\text{macro}}(\tau) = \frac{1}{C} \sum_{c=1}^{C} \text{Recall}_c(\tau), \quad \text{F1}_{\text{macro}}(\tau) = \frac{1}{C} \sum_{c=1}^{C} \text{F1}_c(\tau)$$
   - **Weighted-Averaged Curve (exported in CSVs):** Weights each class curve by its empirical test support proportion $w_c = N_c / N$.

### 2.2 Why Threshold-Based OvR Peak F1 Differs Slightly from Standard `argmax` Table Metrics
In Chapter 4 Tables 4-9 through 4-12, standard multi-class classification metrics are calculated using the **mutually exclusive maximum-probability rule (`argmax`)**, where every test instance is assigned to exactly one class: $\hat{y}_i = \arg\max_{c} p_{i,c}$.

By contrast, in **Precision–Confidence, Recall–Confidence, and F1–Confidence curves**, predictions are evaluated across a continuous sweep of a fixed confidence cutoff $\tau \in [0.00, 1.00]$:
- At **low thresholds ($\tau < 1/C$)**, multiple classes can simultaneously satisfy $p_{i,c} \ge \tau$, maximizing recall while lowering precision.
- At **high thresholds ($\tau > 0.50$)**, only high-certainty predictions satisfy $p_{i,c} \ge \tau$, while ambiguous samples below $\tau$ are abstained from, increasing precision while reducing recall.
- For **binary classification ($C = 2$, where $p_{i,0} + p_{i,1} = 1$)**, evaluating at $\tau = 0.50$ is mathematically identical to `argmax`. However, when class priors or decision boundaries are asymmetric, shifting $\tau$ away from $0.50$ (e.g., $\tau^* = 0.33$ for Logistic Regression or $\tau^* = 0.35$ for HistGradientBoosting) optimizes the trade-off between false positives and false negatives, yielding a higher peak threshold-based F1-score than the fixed $\tau = 0.50$ `argmax` operating point.

Table 1 below reconciles the standard `argmax` metrics reported in Chapter 4 Tables 4-9 to 4-12 with the threshold-optimized peak F1 metrics obtained from the confidence curves:

#### Table 1. Reconciliation of Standard `argmax` Classification Metrics vs. Threshold-Based Peak Confidence Curve Metrics
| Model & Task | Test Samples ($n_{\text{test}}$) | Standard `argmax` Accuracy | Standard `argmax` Macro F1 | Curve Peak Macro F1 ($\max_{\tau} \text{F1}_{\text{macro}}$) | Optimal Macro Confidence Threshold ($\tau^*$) | Macro Precision at $\tau^*$ | Macro Recall at $\tau^*$ | Curve Peak Weighted F1 ($\tau^*_w$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Random Forest (Disaster Type)** | 9,300 | 84.04% | 0.8636 (86.36%) | **0.8690 (86.90%)** | **0.495** ($\approx 0.49$) | 0.9068 (90.68%) | 0.8614 (86.14%) | 0.8373 @ $\tau=0.430$ |
| **2. XGBoost (Severity Prediction)** | 12,593 | 61.65% | 0.5920 (59.20%) | **0.6098 (60.98%)** | **0.305** ($\approx 0.30$) | 0.5561 (55.61%) | 0.7017 (70.17%) | 0.6269 @ $\tau=0.305$ |
| **3A. Logistic Regression (False Alarm Baseline)** | 21,404 | 71.20% | 0.6992 (69.92%) | **0.7136 (71.36%)** | **0.330** ($0.33$) | 0.6491 (64.91%) | 0.8506 (85.06%) | 0.7611 @ $\tau=0.240$ |
| **3B. HistGradientBoosting (Deployed v2 False Alarm)** | 21,404 | 77.92% | 0.7409 (74.09%) | **0.7526 (75.26%)** | **0.350** ($0.35$) | 0.6927 (69.27%) | 0.8251 (82.51%) | 0.7897 @ $\tau=0.350$ |

---

## 3. Model-by-Model Confidence Curves, Peak Metrics & Academic Interpretations

---

### 3.1 Random Forest Classifier — Disaster Type Classification (Figure 4-5)

![Figure 4-5: Random Forest Disaster Type Confidence Curves](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_5_RF_Disaster_Type_Confidence_Curves.png)

#### Per-Class & Aggregate Peak F1 Summary Table (Random Forest, $n_{\text{test}} = 9,300$)
| Disaster Class / Aggregate | Test Support ($n$) | Peak F1-Score | Optimal Confidence Threshold ($\tau^*$) | Precision at $\tau^*$ | Recall at $\tau^*$ | Standard `argmax` F1 (Table 4-9) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Earthquake** | 1,982 | **0.9173 (91.73%)** | **0.330** | 0.9883 (98.83%) | 0.8557 (85.57%) | 0.9085 (90.85%) |
| **Fire** | 1,182 | **0.9761 (97.61%)** | **0.480** | 0.9845 (98.45%) | 0.9679 (96.79%) | 0.9758 (97.58%) |
| **Flood** | 2,584 | **0.7435 (74.35%)** | **0.305** | 0.9484 (94.84%) | 0.6115 (61.15%) | 0.7343 (73.43%) |
| **Landslide** | 130 | **0.9167 (91.67%)** | **0.605** | 0.9030 (90.30%) | 0.9308 (93.08%) | 0.8754 (87.54%) |
| **Typhoon** | 3,422 | **0.8241 (82.41%)** | **0.545** | 0.7243 (72.43%) | 0.9559 (95.59%) | 0.8237 (82.37%) |
| **All Classes (Macro Average)** | **9,300** | **0.8690 (86.90%)** | **0.495** | **0.9068 (90.68%)** | **0.8614 (86.14%)** | **0.8636 (86.36%)** |
| **All Classes (Weighted Average)** | **9,300** | **0.8373 (83.73%)** | **0.430** | 0.8693 (86.93%) | 0.8442 (84.42%) | 0.8370 (83.70%) |

#### Thesis-Ready Academic Interpretation (Figure 4-5)
> **Figure 4-5 illustrates** the Precision–Confidence, Recall–Confidence, and F1–Confidence curves of the isotonic-calibrated Random Forest Classifier across the 9,300 held-out disaster type test reports covering *Earthquake*, *Fire*, *Flood*, *Landslide*, and *Typhoon*. In panel (a), precision rises rapidly as the confidence threshold increases from 0.00 to 0.35, with *Earthquake*, *Fire*, and *Flood* exceeding 94.8% precision above a threshold of 0.31 and approaching 1.00 at high confidence levels. In panel (b), recall remains broad and stable across low-to-moderate confidence thresholds—particularly for *Fire* and *Typhoon*, which maintain recall above 95% up to a threshold of 0.55—before declining sharply only when the threshold exceeds 0.80. In panel (c), the macro-averaged F1–Confidence curve across all five hazard classes exhibits a wide, flat plateau between thresholds of 0.25 and 0.65, reaching its maximum macro F1-score of **0.8690 (86.90%)** at an optimal confidence threshold of **0.495** ($\approx 0.49$), where macro precision is **0.9068 (90.68%)** and macro recall is **0.8614 (86.14%)**. Individual hazard categories achieve peak F1-scores of **0.9761** at $\tau = 0.480$ for *Fire*, **0.9173** at $\tau = 0.330$ for *Earthquake*, **0.9167** at $\tau = 0.605$ for *Landslide*, **0.8241** at $\tau = 0.545$ for *Typhoon*, and **0.7435** at $\tau = 0.305$ for *Flood*. The close alignment between the threshold-optimized macro F1-score (86.90% at $\tau = 0.495$) and the standard multi-class `argmax` macro F1-score reported in Table 4-9 (86.36%) confirms that the model's isotonic probability calibration centers the decision boundary near 0.50 without overconfidence. For SALBA's emergency reporting and rescue coordination workflow in Malaybalay City, this wide F1 plateau ensures that automated hazard categorization remains stable and highly precise across normal operating thresholds, allowing CDRRMO dispatchers to route specialized units such as the Bureau of Fire Protection or swift-water rescue teams with minimal risk of hazard misclassification.

---

### 3.2 XGBoost Classifier — Severity-Level Prediction (Figure 4-6)

![Figure 4-6: XGBoost Severity Confidence Curves](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_6_XGBoost_Severity_Confidence_Curves.png)

#### Per-Class & Aggregate Peak F1 Summary Table (XGBoost, $n_{\text{test}} = 12,593$)
| Severity Class / Aggregate | Test Support ($n$) | Peak F1-Score | Optimal Confidence Threshold ($\tau^*$) | Precision at $\tau^*$ | Recall at $\tau^*$ | Standard `argmax` F1 (Table 4-11) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Low** | 3,649 | **0.6849 (68.49%)** | **0.255** | 0.6378 (63.78%) | 0.7394 (73.94%) | 0.6133 (61.33%) |
| **Moderate** | 4,592 | **0.6828 (68.28%)** | **0.535** | 0.6458 (64.58%) | 0.7243 (72.43%) | 0.6708 (67.08%) |
| **High** | 3,776 | **0.5926 (59.26%)** | **0.255** | 0.5691 (56.91%) | 0.6181 (61.81%) | 0.5432 (54.32%) |
| **Critical** | 576 | **0.5488 (54.88%)** | **0.325** | 0.4605 (46.05%) | 0.6788 (67.88%) | 0.5405 (54.05%) |
| **All Classes (Macro Average)** | **12,593** | **0.6098 (60.98%)** | **0.305** | **0.5561 (55.61%)** | **0.7017 (70.17%)** | **0.5920 (59.20%)** |
| **All Classes (Weighted Average)** | **12,593** | **0.6269 (62.69%)** | **0.305** | 0.5835 (58.35%) | 0.7131 (71.31%) | 0.6099 (60.99%) |

#### Thesis-Ready Academic Interpretation (Figure 4-6)
> **Figure 4-6 illustrates** the Precision–Confidence, Recall–Confidence, and F1–Confidence curves of the isotonic-calibrated XGBoost Classifier for four-tier ordinal severity prediction (*Low*, *Moderate*, *High*, and *Critical*) evaluated across 12,593 independent test reports. Panel (a) shows a smooth, monotonic increase in precision across the full probability range for all four severity tiers, demonstrating well-calibrated probability estimates (ECE = 0.0268) where higher confidence thresholds consistently yield higher predictive purity. Panel (b) demonstrates the expected inverse recall trajectory: because probability mass in a four-class ordinal problem is distributed across adjacent urgency levels (with a base uniform prior of $1/4 = 0.25$), recall remains high between thresholds of 0.00 and 0.35 before tapering smoothly between 0.40 and 0.85. Consequently, as shown in panel (c), the macro-averaged F1–Confidence curve reaches its peak value of **0.6098 (60.98%)** at a confidence threshold of **0.305** ($\approx 0.30$), achieving a macro recall of **0.7017 (70.17%)** and a macro precision of **0.5561 (55.61%)**, outperforming the unthresholded `argmax` macro F1-score of 0.5920 (59.20%) reported in Table 4-11 by +1.78 percentage points. At the individual class level, *Low* peaks at **0.6849** ($\tau = 0.255$), *Moderate* peaks at **0.6828** ($\tau = 0.535$), *High* peaks at **0.5926** ($\tau = 0.255$), and *Critical* peaks at **0.5488** ($\tau = 0.325$, where critical recall reaches **67.88%**). In the operational context of SALBA's rescue coordination, an optimal threshold near $\tau = 0.305$ for multi-class textual severity is highly advantageous for life-safety triage: it prioritizes high recall (70.17% macro recall) so that potentially severe or critical emergencies are not missed due to brief citizen descriptions, while the platform's Malaybalay spatial hazard fusion and multi-report cluster corroboration further elevate confidence before triggering `AUTO_DISPATCH`.

---

### 3.3 Logistic Regression Baseline — False Alarm Detection (Figure 4-7)

![Figure 4-7: Logistic Regression False Alarm Confidence Curves](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_7_LogReg_False_Alarm_Confidence_Curves.png)

#### Per-Class & Aggregate Peak F1 Summary Table (Logistic Regression Baseline, $n_{\text{test}} = 21,404$)
| Target Class / Aggregate | Test Support ($n$) | Peak F1-Score | Optimal Confidence Threshold ($\tau^*$) | Precision at $\tau^*$ | Recall at $\tau^*$ | Standard `argmax` ($\tau=0.50$) F1 (Table 4-12) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **False Alarm (Class `0`, Positive Class for Filtering)** | 6,692 | **0.6502 (65.02%)** | **0.615** | 0.5868 (58.68%) | 0.7291 (72.91%) | 0.6371 (63.71%) |
| **Legitimate Emergency (Class `1`, Positive Class for Triage)** | 14,712 | **0.8495 (84.95%)** | **0.190** | 0.7879 (78.79%) | 0.9216 (92.16%) | 0.7612 (76.12%) |
| **All Classes (Macro Average)** | **21,404** | **0.7136 (71.36%)** | **0.330** | **0.6491 (64.91%)** | **0.8506 (85.06%)** | **0.6992 (69.92%)** |
| **All Classes (Weighted Average)** | **21,404** | **0.7611 (76.11%)** | **0.240** | 0.7082 (70.82%) | 0.8925 (89.25%) | 0.7224 (72.24%) |

#### Thesis-Ready Academic Interpretation (Figure 4-7)
> **Figure 4-7 illustrates** the Precision–Confidence, Recall–Confidence, and F1–Confidence curves of the baseline Logistic Regression classifier for binary false-alarm detection evaluated on 21,404 held-out test reports (6,692 *False Alarm* instances, class 0, and 14,712 *Legitimate Emergency* instances, class 1). Because the Logistic Regression baseline was trained with balanced inverse class weights (`class_weight = 'balanced'`) on an imbalanced corpus where legitimate emergencies outnumber false alarms by more than 2.2 to 1, its raw probability outputs are shifted toward the minority *False Alarm* class. This behavior is clearly visible across panels (a), (b), and (c): at the default binary cutoff of $\tau = 0.50$ (corresponding to Table 4-12), the *False Alarm* recall is high (80.86%), but *Legitimate Emergency* recall drops to 66.80% (F1 = 0.7612), causing 4,884 real emergencies to be falsely flagged. By examining the full threshold spectrum in panel (c), the *False Alarm* curve reaches its optimal F1-score of **0.6502 (65.02%)** at a higher threshold of **$\tau = 0.615$** (where false-alarm precision improves from 52.56% to 58.68%), whereas the *Legitimate Emergency* curve peaks at **0.8495 (84.95%)** at a lower threshold of **$\tau = 0.190$** (recovering **92.16%** of all genuine emergencies). The combined macro-averaged F1–Confidence curve peaks at **0.7136 (71.36%)** at a confidence threshold of **$\tau = 0.330$** (compared to 0.6992 at the default $\tau = 0.50$ decision boundary). For SALBA's emergency reporting operations, Figure 4-7 demonstrates that if a linear Logistic Regression model is used for false-alarm filtering, requiring a stricter confidence threshold ($\tau \ge 0.615$) before flagging a report as a false alarm is essential to prevent genuine citizen distress calls from being suppressed.

---

### 3.4 Deployed Calibrated Histogram Gradient Boosting — False Alarm Detection (Figure 4-8)

> **Verification of Deployed Production Model:** Inspection of [`salba-ml-service/app.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/app.py#L52) and [`train_models_v2.py`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models_v2.py#L245-L264) confirms that **Sigmoid-Calibrated Histogram Gradient Boosting (`HistGradientBoostingClassifier`)** is the currently deployed production model in `models/v2/legitimacy_model.pkl`. Its curves are presented in Figure 4-8 to clearly distinguish its performance from the Logistic Regression baseline in Figure 4-7.

![Figure 4-8: Deployed HistGradientBoosting False Alarm Confidence Curves](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/docs/figures/Figure_4_8_HistGB_False_Alarm_Confidence_Curves.png)

#### Per-Class & Aggregate Peak F1 Summary Table (Deployed Calibrated HistGradientBoosting, $n_{\text{test}} = 21,404$)
| Target Class / Aggregate | Test Support ($n$) | Peak F1-Score | Optimal Confidence Threshold ($\tau^*$) | Precision at $\tau^*$ | Recall at $\tau^*$ | Standard `argmax` ($\tau=0.50$) F1 (Table 4-12B) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **False Alarm (Class `0`)** | 6,692 | **0.6544 (65.44%)** | **0.400** | 0.6091 (60.91%) | 0.7070 (70.70%) | 0.6413 (64.13%) |
| **Legitimate Emergency (Class `1`)** | 14,712 | **0.8519 (85.19%)** | **0.325** | 0.7919 (79.19%) | 0.9216 (92.16%) | 0.8405 (84.05%) |
| **All Classes (Macro Average)** | **21,404** | **0.7526 (75.26%)** | **0.350** | **0.6927 (69.27%)** | **0.8251 (82.51%)** | **0.7409 (74.09%)** |
| **All Classes (Weighted Average)** | **21,404** | **0.7897 (78.97%)** | **0.350** | 0.7347 (73.47%) | 0.8546 (85.46%) | 0.7782 (77.82%) |

#### Thesis-Ready Academic Interpretation (Figure 4-8)
> **Figure 4-8 illustrates** the Precision–Confidence, Recall–Confidence, and F1–Confidence curves of the deployed production false-alarm detection model—a Platt sigmoid-calibrated Histogram Gradient Boosting classifier (`legitimacy_model.pkl`)—evaluated across the same 21,404 held-out test reports. Compared directly against the Logistic Regression baseline in Figure 4-7, the non-linear gradient-boosted trees and Platt sigmoid calibration produce substantially superior probability separation and curve stability. In panel (a), *False Alarm* precision at moderate thresholds ($\tau = 0.40\text{ to }0.50$) rises to 60.91%–65.15% (versus 48.10%–52.56% for Logistic Regression), while in panel (b), *Legitimate Emergency* recall remains arched high above the diagonal, retaining **84.64%** recall even at $\tau = 0.50$ and **92.16%** recall at $\tau = 0.325$. In panel (c), both class F1 curves peak within a narrow, well-aligned threshold band ($\tau = 0.325$ for *Legitimate Emergency* at **F1 = 0.8519**, and $\tau = 0.400$ for *False Alarm* at **F1 = 0.6544**), rather than diverging to opposite extremes of the threshold axis as observed in Logistic Regression ($\tau = 0.190$ vs. $\tau = 0.615$). The macro-averaged F1–Confidence curve achieves a peak F1-score of **0.7526 (75.26%)** at a confidence threshold of **$\tau = 0.350$** (with macro precision of **69.27%** and macro recall of **82.51%**), and maintains a broad plateau above 0.7400 across the entire interval from $\tau = 0.25$ to $\tau = 0.52$. For SALBA's emergency dispatch operations in Malaybalay City, this high, flat F1 plateau confirms that the deployed Histogram Gradient Boosting detector reliably separates prank and non-emergency noise from real citizen distress calls without requiring fragile threshold tuning, while recovering 2,624 more genuine emergency reports at the standard 0.50 operating point than the linear baseline.

---

## 4. How to Regenerate All Figures and CSV Data

To reproduce all four 300 DPI PNG figures, vector PDFs, CSV tables, and JSON summaries from the trained SALBA v2 artifacts at any time, run:

```powershell
.\salba-ml-service\venv\Scripts\python.exe .\salba-ml-service\generate_confidence_curves.py
```
