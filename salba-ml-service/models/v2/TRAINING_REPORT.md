# SALBA ML v2 - Training Report
Trained: 2026-10-30 22:42  |  corpus rows: 163,052

Data: QCRI CrisisBench (Alam et al. 2021, CC BY-NC-SA 4.0), Appen/Figure Eight Disaster Response Messages, SALBA Philippine seed set (hand-written).

## Text featurizer
Feature matrix: 163,052 x 70,016 (word 1-2gram TF-IDF + char 3-5gram TF-IDF + multilingual lexicon)

## 1. Disaster TYPE classifier - Random Forest
train=22,994 calib=9,747 test=9,300
train class counts: {'Earthquake': 7000, 'Fire': 1811, 'Flood': 7000, 'Landslide': 183, 'Typhoon': 7000}
ECE before calibration: 0.0488  ->  after: 0.0383

### Disaster TYPE (Random Forest, calibrated) - held-out TEST events
```
          n_test: 9300
        accuracy: 0.8404
        macro_f1: 0.8636
     weighted_f1: 0.8370
             ece: 0.0383
           brier: 0.2477

              precision    recall  f1-score   support

  Earthquake       0.99      0.84      0.91      1982
        Fire       0.98      0.97      0.98      1182
       Flood       0.97      0.59      0.73      2584
   Landslide       0.81      0.95      0.88       130
     Typhoon       0.71      0.98      0.82      3422

    accuracy                           0.84      9300
   macro avg       0.89      0.87      0.86      9300
weighted avg       0.88      0.84      0.84      9300

Confusion matrix (rows=true, cols=pred): Earthquake, Fire, Flood, Landslide, Typhoon
  Earthquake [1664, 6, 7, 2, 303]
        Fire [1, 1147, 0, 0, 34]
       Flood [3, 8, 1527, 17, 1029]
   Landslide [3, 0, 1, 123, 3]
     Typhoon [10, 8, 40, 9, 3355]

Philippine subset (n=2758): accuracy=0.5841 macro_f1=0.5630
PH seed (Cebuano/Tagalog) subset (n=16): accuracy=0.6875
```
Baseline LogisticRegression: {'accuracy': 0.7603225806451613, 'macro_f1': 0.7598084947681618}

## 2. SEVERITY predictor - XGBoost
train=64,527 calib=11,495 test=12,593
train class counts: {'low': 13088, 'moderate': 37360, 'high': 10042, 'critical': 4037}
ECE before calibration: 0.0750  ->  after: 0.0268

### SEVERITY (XGBoost, calibrated) - held-out TEST events
```
          n_test: 12593
        accuracy: 0.6165
        macro_f1: 0.5920
     weighted_f1: 0.6099
             ece: 0.0268
           brier: 0.5143
 quadratic_kappa: 0.5527

              precision    recall  f1-score   support

         low       0.71      0.54      0.61      3649
    moderate       0.58      0.80      0.67      4592
        high       0.66      0.46      0.54      3776
    critical       0.46      0.65      0.54       576

    accuracy                           0.62     12593
   macro avg       0.60      0.61      0.59     12593
weighted avg       0.64      0.62      0.61     12593

Confusion matrix (rows=true, cols=pred): low, moderate, high, critical
         low [1966, 1308, 315, 60]
    moderate [361, 3677, 505, 49]
        high [422, 1278, 1743, 333]
    critical [13, 108, 78, 377]

Philippine subset (n=2758): accuracy=0.6501 macro_f1=0.4463
PH seed (Cebuano/Tagalog) subset (n=16): accuracy=0.6250
```
Baseline LogisticRegression: {'accuracy': 0.4716112125784166, 'macro_f1': 0.43868661295919975}

## 3. LEGITIMACY / false-alarm detector - Gradient Boosting (HistGradientBoosting)
train=60,036 calib=20,499 test=21,404
train class counts: {'false_alarm/noise': 24021, 'legitimate': 36015}
ECE before calibration: 0.0363  ->  after: 0.0355

### LEGITIMACY (Gradient Boosting, calibrated) - held-out TEST events
```
          n_test: 21404
        accuracy: 0.7792
        macro_f1: 0.7409
     weighted_f1: 0.7782
             ece: 0.0355
           brier: 0.3126

              precision    recall  f1-score   support

 false_alarm       0.65      0.63      0.64      6692
  legitimate       0.83      0.85      0.84     14712

    accuracy                           0.78     21404
   macro avg       0.74      0.74      0.74     21404
weighted avg       0.78      0.78      0.78     21404

Confusion matrix (rows=true, cols=pred): false_alarm, legitimate
 false_alarm [4225, 2467]
  legitimate [2260, 12452]

Philippine subset (n=2933): accuracy=0.7992 macro_f1=0.5631
PH seed (Cebuano/Tagalog) subset (n=24): accuracy=0.9167
```
Baseline LogisticRegression: {'accuracy': 0.7071108204074005, 'macro_f1': 0.6948106774816515}
