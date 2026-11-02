#!/usr/bin/env python3
"""
train_models_v2.py - Retrain SALBA's 3 models on REAL human-annotated crisis data.

  1. Disaster TYPE        -> Random Forest            (calibrated, isotonic)
  2. SEVERITY (4-tier)    -> XGBoost                  (calibrated, isotonic)
  3. LEGITIMACY           -> Gradient Boosting (Hist) (calibrated, sigmoid)

Inputs : data/processed/salba_corpus.csv   (run data_pipeline/build_training_corpus.py)
Outputs: models/v2/*.pkl, models/v2/metadata.json, models/v2/TRAINING_REPORT.md

Honest evaluation:
  * Test set = whole held-out events (incl. 4 Philippine disasters) never seen in training.
  * Calibration set = separate held-out events (so confidence = real probability).
  * Reports macro-F1 (not just accuracy), confusion matrices, Expected Calibration Error,
    quadratic-weighted kappa for ordinal severity, and Philippine-only subset scores.
  * A Logistic Regression baseline is trained for comparison (not deployed).
"""

import os
import sys
import json
import time
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, classification_report,
                             confusion_matrix, cohen_kappa_score, brier_score_loss)
from sklearn.utils.class_weight import compute_sample_weight
import xgboost as xgb

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
from utils.text_features import TextFeaturizer  # noqa: E402

CORPUS = os.path.join(ROOT, 'data', 'processed', 'salba_corpus.csv')
OUT = os.path.join(ROOT, 'models', 'v2')
os.makedirs(OUT, exist_ok=True)

TYPE_CLASSES = ['Earthquake', 'Fire', 'Flood', 'Landslide', 'Typhoon']
SEVERITY_CLASSES = ['low', 'moderate', 'high', 'critical']     # ordinal order
SEED_WEIGHT = 15.0          # up-weight hand-written Philippine examples
MAX_PER_CLASS_TYPE = 7000
MAX_TRAIN_LEGIT = 60000
RS = 42

report_lines = []


def log(msg=''):
    print(msg)
    report_lines.append(msg)


def ece(y_true_idx, proba, n_bins=10):
    """Expected Calibration Error on top-1 confidence."""
    conf = proba.max(axis=1)
    pred = proba.argmax(axis=1)
    correct = (pred == y_true_idx).astype(float)
    bins = np.linspace(0, 1, n_bins + 1)
    e = 0.0
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            e += m.mean() * abs(correct[m].mean() - conf[m].mean())
    return float(e)


def multiclass_brier(y_idx, proba):
    onehot = np.eye(proba.shape[1])[y_idx]
    return float(np.mean(np.sum((proba - onehot) ** 2, axis=1)))


def balanced_cap(idx, labels, cap, rng):
    keep = []
    for c in np.unique(labels):
        ci = idx[labels == c]
        if len(ci) > cap:
            ci = rng.choice(ci, cap, replace=False)
        keep.append(ci)
    return np.concatenate(keep)


def evaluate(name, y_idx, proba, classes, df_test, ordinal=False):
    pred = proba.argmax(axis=1)
    res = {
        'n_test': int(len(y_idx)),
        'accuracy': float(accuracy_score(y_idx, pred)),
        'macro_f1': float(f1_score(y_idx, pred, average='macro')),
        'weighted_f1': float(f1_score(y_idx, pred, average='weighted')),
        'ece': ece(y_idx, proba),
        'brier': multiclass_brier(y_idx, proba),
    }
    if ordinal:
        res['quadratic_kappa'] = float(cohen_kappa_score(y_idx, pred, weights='quadratic'))
    log(f'\n### {name} - held-out TEST events')
    log('```')
    for k, v in res.items():
        log(f'{k:>16}: {v:.4f}' if isinstance(v, float) else f'{k:>16}: {v}')
    log('')
    log(classification_report(y_idx, pred, labels=range(len(classes)),
                              target_names=classes, zero_division=0))
    cm = confusion_matrix(y_idx, pred, labels=range(len(classes)))
    log('Confusion matrix (rows=true, cols=pred): ' + ', '.join(classes))
    for c, row in zip(classes, cm):
        log(f'{c:>12} {row.tolist()}')
    ph = df_test['is_ph'].values.astype(bool)
    if ph.sum() >= 10:
        res['ph_n'] = int(ph.sum())
        res['ph_accuracy'] = float(accuracy_score(y_idx[ph], pred[ph]))
        res['ph_macro_f1'] = float(f1_score(y_idx[ph], pred[ph], average='macro'))
        log(f'\nPhilippine subset (n={res["ph_n"]}): accuracy={res["ph_accuracy"]:.4f} '
            f'macro_f1={res["ph_macro_f1"]:.4f}')
    seed = (df_test['source'] == 'ph_seed').values
    if seed.sum() >= 3:
        res['ph_seed_n'] = int(seed.sum())
        res['ph_seed_accuracy'] = float(accuracy_score(y_idx[seed], pred[seed]))
        log(f'PH seed (Cebuano/Tagalog) subset (n={res["ph_seed_n"]}): '
            f'accuracy={res["ph_seed_accuracy"]:.4f}')
    log('```')
    return res


def baseline_lr(Xtr, ytr, wtr, Xte, yte):
    lr = LogisticRegression(max_iter=2000, C=4.0, class_weight='balanced')
    lr.fit(Xtr, ytr, sample_weight=wtr)
    p = lr.predict(Xte)
    return {'accuracy': float(accuracy_score(yte, p)),
            'macro_f1': float(f1_score(yte, p, average='macro'))}


def main():
    t0 = time.time()
    rng = np.random.RandomState(RS)
    df = pd.read_csv(CORPUS, keep_default_na=False, na_values=[''])
    df['text'] = df['text'].astype(str)
    df['is_ph'] = df['is_ph'].astype(str).str.lower().isin(['true', '1'])
    log('# SALBA ML v2 - Training Report')
    log(f'Trained: {datetime.now():%Y-%m-%d %H:%M}  |  corpus rows: {len(df):,}')
    log('\nData: QCRI CrisisBench (Alam et al. 2021, CC BY-NC-SA 4.0), Appen/Figure Eight '
        'Disaster Response Messages, SALBA Philippine seed set (hand-written).')

    # ------------------------------------------------------------------ featurizer
    log('\n## Text featurizer')
    fit_txt = df.loc[df['split'] == 'train', 'text']
    featurizer = TextFeaturizer(word_max_features=30000, char_max_features=40000, min_df=3)
    featurizer.fit(fit_txt)
    # drop huge unused attributes before pickling
    featurizer.word_vec_.stop_words_ = None
    featurizer.char_vec_.stop_words_ = None
    X_all = featurizer.transform(df['text'].tolist())
    log(f'Feature matrix: {X_all.shape[0]:,} x {X_all.shape[1]:,} '
        '(word 1-2gram TF-IDF + char 3-5gram TF-IDF + multilingual lexicon)')
    joblib.dump(featurizer, os.path.join(OUT, 'text_featurizer.pkl'), compress=3)

    split = df['split'].values
    weights_all = np.where(df['source'].values == 'ph_seed', SEED_WEIGHT, 1.0)
    metrics = {}

    # ================================================================== 1. TYPE (RF)
    log('\n## 1. Disaster TYPE classifier - Random Forest')
    m = df['disaster_type'].isin(TYPE_CLASSES).values
    y_type = df['disaster_type'].map({c: i for i, c in enumerate(TYPE_CLASSES)}).values
    tr = np.where(m & (split == 'train'))[0]
    tr = balanced_cap(tr, y_type[tr], MAX_PER_CLASS_TYPE, rng)
    ca = np.where(m & (split == 'calib'))[0]
    te = np.where(m & (split == 'test'))[0]
    y_type = np.nan_to_num(y_type.astype(float), nan=-1).astype(int)
    log(f'train={len(tr):,} calib={len(ca):,} test={len(te):,}')
    log('train class counts: ' + str(dict(zip(TYPE_CLASSES, np.bincount(y_type[tr], minlength=5).tolist()))))

    sel_type = SelectKBest(chi2, k=6000).fit(X_all[tr], y_type[tr])
    Xs = sel_type.transform(X_all)
    w_tr = compute_sample_weight('balanced', y_type[tr]) * weights_all[tr]
    rf = RandomForestClassifier(n_estimators=250, min_samples_leaf=2, max_features='sqrt',
                                n_jobs=-1, random_state=RS)
    rf.fit(Xs[tr], y_type[tr], sample_weight=w_tr)
    raw_p = rf.predict_proba(Xs[te])
    cal_type = CalibratedClassifierCV(rf, cv='prefit', method='isotonic')
    cal_type.fit(Xs[ca], y_type[ca], sample_weight=weights_all[ca])
    p = cal_type.predict_proba(Xs[te])
    log(f'ECE before calibration: {ece(y_type[te], raw_p):.4f}  ->  after: {ece(y_type[te], p):.4f}')
    metrics['type'] = evaluate('Disaster TYPE (Random Forest, calibrated)', y_type[te], p,
                               TYPE_CLASSES, df.iloc[te])
    metrics['type']['baseline_logreg'] = baseline_lr(Xs[tr], y_type[tr], w_tr, Xs[te], y_type[te])
    log(f'Baseline LogisticRegression: {metrics["type"]["baseline_logreg"]}')
    joblib.dump({'selector': sel_type, 'model': cal_type, 'classes': TYPE_CLASSES},
                os.path.join(OUT, 'type_classifier.pkl'), compress=3)

    # ================================================================== 2. SEVERITY (XGB)
    log('\n## 2. SEVERITY predictor - XGBoost')
    sev_map = {c: i for i, c in enumerate(SEVERITY_CLASSES)}
    m = df['severity'].isin(SEVERITY_CLASSES).values
    y_sev = np.nan_to_num(df['severity'].map(sev_map).values.astype(float), nan=-1).astype(int)
    tr = np.where(m & (split == 'train'))[0]
    ca = np.where(m & (split == 'calib'))[0]
    te = np.where(m & (split == 'test'))[0]
    log(f'train={len(tr):,} calib={len(ca):,} test={len(te):,}')
    log('train class counts: ' + str(dict(zip(SEVERITY_CLASSES, np.bincount(y_sev[tr], minlength=4).tolist()))))

    sel_sev = SelectKBest(chi2, k=8000).fit(X_all[tr], y_sev[tr])
    Xs = sel_sev.transform(X_all)
    w_tr = compute_sample_weight('balanced', y_sev[tr]) * weights_all[tr]
    xgb_sev = xgb.XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.08, subsample=0.85,
        colsample_bytree=0.5, min_child_weight=2, tree_method='hist',
        objective='multi:softprob', eval_metric='mlogloss', n_jobs=-1, random_state=RS,
    )
    xgb_sev.fit(Xs[tr], y_sev[tr], sample_weight=w_tr)
    raw_p = xgb_sev.predict_proba(Xs[te])
    cal_sev = CalibratedClassifierCV(xgb_sev, cv='prefit', method='isotonic')
    cal_sev.fit(Xs[ca], y_sev[ca], sample_weight=weights_all[ca])
    p = cal_sev.predict_proba(Xs[te])
    log(f'ECE before calibration: {ece(y_sev[te], raw_p):.4f}  ->  after: {ece(y_sev[te], p):.4f}')
    metrics['severity'] = evaluate('SEVERITY (XGBoost, calibrated)', y_sev[te], p,
                                   SEVERITY_CLASSES, df.iloc[te], ordinal=True)
    metrics['severity']['baseline_logreg'] = baseline_lr(Xs[tr], y_sev[tr], w_tr, Xs[te], y_sev[te])
    log(f'Baseline LogisticRegression: {metrics["severity"]["baseline_logreg"]}')
    joblib.dump({'selector': sel_sev, 'model': cal_sev, 'classes': SEVERITY_CLASSES},
                os.path.join(OUT, 'severity_model.pkl'), compress=3)

    # ================================================================== 3. LEGITIMACY (GB)
    log('\n## 3. LEGITIMACY / false-alarm detector - Gradient Boosting (HistGradientBoosting)')
    m = df['legitimate'].notna().values
    y_leg = np.nan_to_num(df['legitimate'].values.astype(float), nan=-1).astype(int)
    tr = np.where(m & (split == 'train'))[0]
    seed_tr = tr[df['source'].values[tr] == 'ph_seed']
    if len(tr) > MAX_TRAIN_LEGIT:
        tr = np.union1d(rng.choice(tr, MAX_TRAIN_LEGIT, replace=False), seed_tr)
    ca = np.where(m & (split == 'calib'))[0]
    te = np.where(m & (split == 'test'))[0]
    log(f'train={len(tr):,} calib={len(ca):,} test={len(te):,}')
    log('train class counts: ' + str({'false_alarm/noise': int((y_leg[tr] == 0).sum()),
                                      'legitimate': int((y_leg[tr] == 1).sum())}))

    sel_leg = SelectKBest(chi2, k=1200).fit(X_all[tr], y_leg[tr])
    Xs = sel_leg.transform(X_all)
    w_tr = compute_sample_weight('balanced', y_leg[tr]) * weights_all[tr]
    gb = HistGradientBoostingClassifier(max_iter=400, learning_rate=0.08, max_leaf_nodes=48,
                                        l2_regularization=1.0, random_state=RS)
    gb.fit(Xs[tr].toarray(), y_leg[tr], sample_weight=w_tr)

    class DenseWrap:  # noqa: D401 - small helper so calibration works on sparse slices
        pass

    raw_p = gb.predict_proba(Xs[te].toarray())
    cal_leg = CalibratedClassifierCV(gb, cv='prefit', method='sigmoid')
    cal_leg.fit(Xs[ca].toarray(), y_leg[ca], sample_weight=weights_all[ca])
    p = cal_leg.predict_proba(Xs[te].toarray())
    log(f'ECE before calibration: {ece(y_leg[te], raw_p):.4f}  ->  after: {ece(y_leg[te], p):.4f}')
    metrics['legitimacy'] = evaluate('LEGITIMACY (Gradient Boosting, calibrated)', y_leg[te], p,
                                     ['false_alarm', 'legitimate'], df.iloc[te])
    metrics['legitimacy']['brier_binary'] = float(brier_score_loss(y_leg[te], p[:, 1]))
    metrics['legitimacy']['baseline_logreg'] = baseline_lr(Xs[tr], y_leg[tr], w_tr, Xs[te], y_leg[te])
    log(f'Baseline LogisticRegression: {metrics["legitimacy"]["baseline_logreg"]}')
    joblib.dump({'selector': sel_leg, 'model': cal_leg, 'classes': ['false_alarm', 'legitimate'],
                 'dense': True},
                os.path.join(OUT, 'legitimacy_model.pkl'), compress=3)

    # ------------------------------------------------------------------ metadata
    meta = {
        'version': '2.0.0',
        'trained_at': datetime.now().isoformat(timespec='seconds'),
        'corpus_rows': int(len(df)),
        'type_classes': TYPE_CLASSES,
        'severity_classes': SEVERITY_CLASSES,
        'datasets': [
            'QCRI/CrisisBench-all-lang (Alam et al., 2021) CC BY-NC-SA 4.0',
            'community-datasets/disaster_response_messages (Appen / Figure Eight)',
            'SALBA Philippine seed set (data/curated/ph_seed_reports.csv)',
        ],
        'metrics': metrics,
        'train_seconds': round(time.time() - t0, 1),
    }
    with open(os.path.join(OUT, 'metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    with open(os.path.join(OUT, 'TRAINING_REPORT.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines) + '\n')
    log(f'\nDone in {time.time() - t0:.0f}s. Models saved to {OUT}')


if __name__ == '__main__':
    main()
