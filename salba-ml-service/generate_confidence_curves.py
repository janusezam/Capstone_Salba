#!/usr/bin/env python3
"""
generate_confidence_curves.py
Generates publication-quality Precision-Confidence, Recall-Confidence, and F1-Confidence
curves (AgriSmart Figure 4-5 scientific presentation style) and exports underlying CSV data
from the actual trained SALBA v2 models and independent held-out test datasets.

Zero production models or datasets are modified.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

os.environ['MPLCONFIGDIR'] = os.path.join(os.environ.get('TEMP', '/tmp'), 'mpl_salba_cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_ROOT = os.path.join(ROOT, 'salba-ml-service')
sys.path.insert(0, ML_ROOT)

FIG_DIR = os.path.join(ROOT, 'docs', 'figures')
DATA_DIR = os.path.join(FIG_DIR, 'curve_data')
os.makedirs(FIG_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

CORPUS_PATH = os.path.join(ML_ROOT, 'data', 'processed', 'salba_corpus.csv')
V2_DIR = os.path.join(ML_ROOT, 'models', 'v2')

THRESHOLDS = np.round(np.linspace(0.00, 1.00, 201), 4)  # 0.000, 0.005, ..., 1.000

# Publication color palettes (colorblind-safe & high-contrast academic colors)
PALETTE_TYPE = {
    'Earthquake': '#D95F02',  # Rust Orange
    'Fire': '#E41A1C',        # Crimson Red
    'Flood': '#1F78B4',       # Ocean Blue
    'Landslide': '#8C510A',   # Earth Brown
    'Typhoon': '#6A3D9A',     # Deep Purple
}

PALETTE_SEV = {
    'Low': '#2B83BA',         # Calm Blue
    'Moderate': '#4DAF4A',    # Emerald Green
    'High': '#FF7F00',        # Amber Orange
    'Critical': '#D7191C',    # Urgent Red
}

PALETTE_LEG = {
    'False Alarm (0)': '#E41A1C',          # Red
    'Legitimate Emergency (1)': '#1F78B4', # Blue
}

AGG_COLOR = '#0B2545'  # Bold Dark Navy for "all classes" aggregate curve


def compute_ovr_curves(y_true_idx, proba, class_labels, positive_class_idx=None):
    """
    Computes One-versus-Rest (OvR) Precision, Recall, and F1 across THRESHOLDS [0.00, 1.00]
    for each class and macro/weighted aggregates.
    
    Convention at threshold tau:
      - Positive prediction for class c: proba[:, c] >= tau
      - TP = sum((y_true == c) & (proba[:, c] >= tau))
      - FP = sum((y_true != c) & (proba[:, c] >= tau))
      - FN = sum((y_true == c) & (proba[:, c] < tau))
      - Precision = TP / (TP + FP) if (TP + FP) > 0 else 1.0
      - Recall    = TP / (TP + FN) if (TP + FN) > 0 else 0.0
      - F1        = 2 * P * R / (P + R) if (P + R) > 0 else 0.0
    """
    n_samples, n_classes = proba.shape
    supports = np.array([(y_true_idx == c).sum() for c in range(n_classes)], dtype=float)
    weights = supports / supports.sum()

    per_class = {label: {'precision': [], 'recall': [], 'f1': [], 'support': int(supports[c])}
                 for c, label in enumerate(class_labels)}

    for c, label in enumerate(class_labels):
        y_bin = (y_true_idx == c)
        p_col = proba[:, c]
        n_pos = supports[c]

        for tau in THRESHOLDS:
            pred_pos = (p_col >= tau)
            tp = float(np.sum(y_bin & pred_pos))
            fp = float(np.sum((~y_bin) & pred_pos))
            fn = float(n_pos - tp)

            if tp + fp > 0:
                prec = tp / (tp + fp)
            else:
                # Standard Precision-Confidence convention: when threshold exceeds max predicted
                # probability (0 predictions made, 0 false positives), precision approaches 1.0
                prec = 1.0

            rec = (tp / n_pos) if n_pos > 0 else 0.0
            f1 = (2.0 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

            per_class[label]['precision'].append(prec)
            per_class[label]['recall'].append(rec)
            per_class[label]['f1'].append(f1)

        per_class[label]['precision'] = np.array(per_class[label]['precision'])
        per_class[label]['recall'] = np.array(per_class[label]['recall'])
        per_class[label]['f1'] = np.array(per_class[label]['f1'])

        best_i = int(np.argmax(per_class[label]['f1']))
        per_class[label]['best_f1'] = float(per_class[label]['f1'][best_i])
        per_class[label]['best_thresh'] = float(THRESHOLDS[best_i])
        per_class[label]['prec_at_best_f1'] = float(per_class[label]['precision'][best_i])
        per_class[label]['rec_at_best_f1'] = float(per_class[label]['recall'][best_i])

    # Macro-average and Weighted-average curves across all classes at each threshold
    macro_prec = np.mean([per_class[l]['precision'] for l in class_labels], axis=0)
    macro_rec = np.mean([per_class[l]['recall'] for l in class_labels], axis=0)
    macro_f1 = np.mean([per_class[l]['f1'] for l in class_labels], axis=0)

    weighted_prec = np.sum([per_class[l]['precision'] * weights[i] for i, l in enumerate(class_labels)], axis=0)
    weighted_rec = np.sum([per_class[l]['recall'] * weights[i] for i, l in enumerate(class_labels)], axis=0)
    weighted_f1 = np.sum([per_class[l]['f1'] * weights[i] for i, l in enumerate(class_labels)], axis=0)

    # Search optimal threshold in [0.05, 0.95] to avoid trivial tau=0 boundary artifacts
    valid_mask = (THRESHOLDS >= 0.01) & (THRESHOLDS <= 0.99)
    valid_indices = np.where(valid_mask)[0]

    best_macro_idx = int(valid_indices[np.argmax(macro_f1[valid_indices])])
    best_weighted_idx = int(valid_indices[np.argmax(weighted_f1[valid_indices])])

    agg = {
        'macro': {
            'precision': macro_prec,
            'recall': macro_rec,
            'f1': macro_f1,
            'best_f1': float(macro_f1[best_macro_idx]),
            'best_thresh': float(THRESHOLDS[best_macro_idx]),
            'prec_at_best_f1': float(macro_prec[best_macro_idx]),
            'rec_at_best_f1': float(macro_rec[best_macro_idx]),
        },
        'weighted': {
            'precision': weighted_prec,
            'recall': weighted_rec,
            'f1': weighted_f1,
            'best_f1': float(weighted_f1[best_weighted_idx]),
            'best_thresh': float(THRESHOLDS[best_weighted_idx]),
            'prec_at_best_f1': float(weighted_prec[best_weighted_idx]),
            'rec_at_best_f1': float(weighted_rec[best_weighted_idx]),
        }
    }

    if positive_class_idx is not None:
        pos_label = class_labels[positive_class_idx]
        pos_f1 = per_class[pos_label]['f1']
        best_pos_idx = int(valid_indices[np.argmax(pos_f1[valid_indices])])
        agg['positive_class'] = {
            'label': pos_label,
            'precision': per_class[pos_label]['precision'],
            'recall': per_class[pos_label]['recall'],
            'f1': pos_f1,
            'best_f1': float(pos_f1[best_pos_idx]),
            'best_thresh': float(THRESHOLDS[best_pos_idx]),
            'prec_at_best_f1': float(per_class[pos_label]['precision'][best_pos_idx]),
            'rec_at_best_f1': float(per_class[pos_label]['recall'][best_pos_idx]),
        }

    return per_class, agg


def export_curves_to_csv(per_class, agg, class_labels, csv_path, model_name):
    """Exports all threshold curve values (0.00 to 1.00) to a structured CSV file."""
    rows = []
    for tau_idx, tau in enumerate(THRESHOLDS):
        for label in class_labels:
            rows.append({
                'model': model_name,
                'class_or_average': label,
                'evaluation_type': 'one_vs_rest_class',
                'support': per_class[label]['support'],
                'confidence_threshold': float(tau),
                'precision': round(float(per_class[label]['precision'][tau_idx]), 6),
                'recall': round(float(per_class[label]['recall'][tau_idx]), 6),
                'f1_score': round(float(per_class[label]['f1'][tau_idx]), 6),
            })
        rows.append({
            'model': model_name,
            'class_or_average': 'all_classes_macro_avg',
            'evaluation_type': 'macro_average',
            'support': sum(per_class[l]['support'] for l in class_labels),
            'confidence_threshold': float(tau),
            'precision': round(float(agg['macro']['precision'][tau_idx]), 6),
            'recall': round(float(agg['macro']['recall'][tau_idx]), 6),
            'f1_score': round(float(agg['macro']['f1'][tau_idx]), 6),
        })
        rows.append({
            'model': model_name,
            'class_or_average': 'all_classes_weighted_avg',
            'evaluation_type': 'weighted_average',
            'support': sum(per_class[l]['support'] for l in class_labels),
            'confidence_threshold': float(tau),
            'precision': round(float(agg['weighted']['precision'][tau_idx]), 6),
            'recall': round(float(agg['weighted']['recall'][tau_idx]), 6),
            'f1_score': round(float(agg['weighted']['f1'][tau_idx]), 6),
        })
    df_out = pd.DataFrame(rows)
    df_out.to_csv(csv_path, index=False)
    return df_out


def plot_three_panel_figure(per_class, agg, class_labels, palette, fig_title,
                            png_path, pdf_path, agg_mode='macro', binary_pos_note=None):
    """
    Renders a 3-panel publication-quality figure in AgriSmart Figure 4-5 style:
      (a) Precision-Confidence Curve
      (b) Recall-Confidence Curve
      (c) F1-Confidence Curve
    Exports 300 DPI PNG and vector PDF.
    """
    plt.rcParams.update({
        'font.family': 'sans-serif',
        'font.sans-serif': ['DejaVu Sans', 'Arial', 'Helvetica'],
        'font.size': 10,
        'axes.titlesize': 12,
        'axes.titleweight': 'bold',
        'axes.labelsize': 10.5,
        'axes.labelweight': 'bold',
        'xtick.labelsize': 9.5,
        'ytick.labelsize': 9.5,
        'legend.fontsize': 8.5,
        'figure.titlesize': 13.5,
        'figure.titleweight': 'bold',
    })

    fig, axes = plt.subplots(1, 3, figsize=(18.0, 5.6), dpi=300)
    fig.patch.set_facecolor('white')

    agg_data = agg[agg_mode]
    best_f1 = agg_data['best_f1']
    best_th = agg_data['best_thresh']
    prec_at_best = agg_data['prec_at_best_f1']
    rec_at_best = agg_data['rec_at_best_f1']

    panels = [
        ('precision', '(a) Precision–Confidence Curve', 'Precision', prec_at_best),
        ('recall', '(b) Recall–Confidence Curve', 'Recall', rec_at_best),
        ('f1', '(c) F1–Confidence Curve', 'F1-Score', best_f1),
    ]

    for ax_idx, (metric_key, panel_title, y_label, val_at_best) in enumerate(panels):
        ax = axes[ax_idx]
        ax.set_facecolor('#FAFAFA')
        ax.grid(True, which='major', linestyle='--', linewidth=0.6, color='#D0D5DD', alpha=0.85)
        ax.set_axisbelow(True)

        # Plot each individual class curve
        for label in class_labels:
            color = palette.get(label, '#555555')
            c_best_f1 = per_class[label]['best_f1']
            c_best_th = per_class[label]['best_thresh']
            if metric_key == 'f1':
                leg_label = f"{label} (max F1={c_best_f1:.2f} @ {c_best_th:.2f})"
            else:
                leg_label = f"{label} (n={per_class[label]['support']:,})"

            ax.plot(
                THRESHOLDS,
                per_class[label][metric_key],
                label=leg_label,
                color=color,
                linewidth=1.75,
                alpha=0.88,
            )

        # Plot bold aggregate "all classes" curve (AgriSmart / YOLO scientific style)
        if metric_key == 'precision':
            agg_label = f"all classes {prec_at_best:.2f} at {best_th:.2f}"
        elif metric_key == 'recall':
            agg_label = f"all classes { agg_data['recall'][0]:.2f} at 0.00 ({rec_at_best:.2f} @ {best_th:.2f})"
        else:
            agg_label = f"all classes {best_f1:.2f} at {best_th:.2f}"

        ax.plot(
            THRESHOLDS,
            agg_data[metric_key],
            label=agg_label,
            color=AGG_COLOR,
            linewidth=3.2,
            zorder=5,
        )

        # Vertical dashed reference line & marker at optimal F1 confidence threshold
        ax.axvline(
            x=best_th,
            color='#1D4ED8',
            linestyle='--',
            linewidth=1.35,
            alpha=0.85,
            zorder=4,
        )
        ax.scatter(
            [best_th],
            [val_at_best],
            color='#DC2626',
            edgecolor='white',
            s=65,
            linewidth=1.5,
            zorder=6,
        )

        # Annotate optimal threshold point on the F1 panel (and operating point on P/R panels)
        if metric_key == 'f1':
            annot_text = f"Max Macro F1 = {best_f1:.4f}\n@ Confidence = {best_th:.2f}"
            xytext_offset = (best_th - 0.36 if best_th > 0.55 else best_th + 0.06,
                             max(0.15, min(0.88, val_at_best - 0.16)))
            ax.annotate(
                annot_text,
                xy=(best_th, val_at_best),
                xytext=xytext_offset,
                fontsize=8.5,
                fontweight='bold',
                color='#0B2545',
                bbox=dict(boxstyle='round,pad=0.35', facecolor='#EFF6FF', edgecolor='#1D4ED8', lw=1.0),
                arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0.15', color='#1D4ED8', lw=1.2),
                zorder=7,
            )
        else:
            annot_text = f"{y_label} = {val_at_best:.2f}\n@ {best_th:.2f}"
            xytext_offset = (best_th - 0.32 if best_th > 0.55 else best_th + 0.06,
                             max(0.12, min(0.88, val_at_best - 0.18)))
            ax.annotate(
                annot_text,
                xy=(best_th, val_at_best),
                xytext=xytext_offset,
                fontsize=8.0,
                color='#1E293B',
                bbox=dict(boxstyle='round,pad=0.25', facecolor='white', edgecolor='#94A3B8', lw=0.8, alpha=0.92),
                arrowprops=dict(arrowstyle='->', color='#475569', lw=1.0),
                zorder=7,
            )

        ax.set_title(panel_title, pad=10, color='#0F172A')
        ax.set_xlabel('Confidence Threshold', labelpad=7, color='#1E293B')
        ax.set_ylabel(y_label, labelpad=7, color='#1E293B')
        ax.set_xlim(0.0, 1.0)
        ax.set_ylim(0.0, 1.03)
        ax.set_xticks(np.linspace(0.0, 1.0, 6))
        ax.set_yticks(np.linspace(0.0, 1.0, 6))

        for spine in ('top', 'right'):
            ax.spines[spine].set_visible(False)
        for spine in ('left', 'bottom'):
            ax.spines[spine].set_color('#475569')
            ax.spines[spine].set_linewidth(1.1)

        loc = 'lower left' if metric_key in ('precision', 'recall') else 'lower center'
        if metric_key == 'recall':
            loc = 'lower left'
        elif metric_key == 'precision':
            loc = 'lower right'
        legend = ax.legend(loc=loc, frameon=True, facecolor='white', edgecolor='#CBD5E1', framealpha=0.94)
        legend.set_zorder(8)

    if binary_pos_note:
        fig.suptitle(f"{fig_title}\n{binary_pos_note}", y=1.02, color='#0F172A')
    else:
        fig.suptitle(fig_title, y=1.00, color='#0F172A')

    plt.tight_layout()
    fig.savefig(png_path, dpi=300, bbox_inches='tight', facecolor='white')
    fig.savefig(pdf_path, format='pdf', bbox_inches='tight', facecolor='white')
    plt.close(fig)


def main():
    print("Loading SALBA v2 corpus and trained model artifacts...")
    df = pd.read_csv(CORPUS_PATH, keep_default_na=False, na_values=[''])
    df['text'] = df['text'].astype(str)
    split = df['split'].values
    weights_all = np.where(df['source'].values == 'ph_seed', 15.0, 1.0)

    featurizer = joblib.load(os.path.join(V2_DIR, 'text_featurizer.pkl'))
    type_pkg = joblib.load(os.path.join(V2_DIR, 'type_classifier.pkl'))
    sev_pkg = joblib.load(os.path.join(V2_DIR, 'severity_model.pkl'))
    leg_pkg = joblib.load(os.path.join(V2_DIR, 'legitimacy_model.pkl'))

    X_all = featurizer.transform(df['text'].tolist())
    summary = {}

    # =========================================================================
    # MODEL 1: RANDOM FOREST - DISASTER TYPE CLASSIFICATION
    # =========================================================================
    print("\n1. Evaluating Random Forest Classifier (Disaster Type Classification)...")
    type_classes = ['Earthquake', 'Fire', 'Flood', 'Landslide', 'Typhoon']
    m_type = df['disaster_type'].isin(type_classes).values
    y_type = np.nan_to_num(df['disaster_type'].map({c: i for i, c in enumerate(type_classes)}).values.astype(float), nan=-1).astype(int)
    te_type = np.where(m_type & (split == 'test'))[0]

    Xs_type_te = type_pkg['selector'].transform(X_all[te_type])
    proba_type = type_pkg['model'].predict_proba(Xs_type_te)
    y_type_te = y_type[te_type]

    pc_type, agg_type = compute_ovr_curves(y_type_te, proba_type, type_classes)
    export_curves_to_csv(
        pc_type, agg_type, type_classes,
        os.path.join(DATA_DIR, 'rf_disaster_type_confidence_curves.csv'),
        'RandomForest_DisasterType_v2'
    )
    plot_three_panel_figure(
        pc_type, agg_type, type_classes, PALETTE_TYPE,
        'SALBA Disaster Type Classification (Calibrated Random Forest, n_test = 9,300)',
        os.path.join(FIG_DIR, 'Figure_4_5_RF_Disaster_Type_Confidence_Curves.png'),
        os.path.join(FIG_DIR, 'Figure_4_5_RF_Disaster_Type_Confidence_Curves.pdf'),
        agg_mode='macro'
    )

    pred_type_argmax = proba_type.argmax(axis=1)
    summary['random_forest_type'] = {
        'n_test': int(len(y_type_te)),
        'argmax_accuracy': float(accuracy_score(y_type_te, pred_type_argmax)),
        'argmax_macro_f1': float(f1_score(y_type_te, pred_type_argmax, average='macro')),
        'argmax_weighted_f1': float(f1_score(y_type_te, pred_type_argmax, average='weighted')),
        'curve_macro_best_f1': agg_type['macro']['best_f1'],
        'curve_macro_best_thresh': agg_type['macro']['best_thresh'],
        'curve_macro_prec_at_best': agg_type['macro']['prec_at_best_f1'],
        'curve_macro_rec_at_best': agg_type['macro']['rec_at_best_f1'],
        'curve_weighted_best_f1': agg_type['weighted']['best_f1'],
        'curve_weighted_best_thresh': agg_type['weighted']['best_thresh'],
        'per_class': {
            c: {
                'support': pc_type[c]['support'],
                'best_f1': pc_type[c]['best_f1'],
                'best_thresh': pc_type[c]['best_thresh'],
                'prec_at_best_f1': pc_type[c]['prec_at_best_f1'],
                'rec_at_best_f1': pc_type[c]['rec_at_best_f1'],
            } for c in type_classes
        }
    }

    # =========================================================================
    # MODEL 2: XGBOOST - SEVERITY-LEVEL PREDICTION
    # =========================================================================
    print("2. Evaluating XGBoost Classifier (Severity-Level Prediction)...")
    sev_raw_classes = ['low', 'moderate', 'high', 'critical']
    sev_display_classes = ['Low', 'Moderate', 'High', 'Critical']
    m_sev = df['severity'].isin(sev_raw_classes).values
    y_sev = np.nan_to_num(df['severity'].map({c: i for i, c in enumerate(sev_raw_classes)}).values.astype(float), nan=-1).astype(int)
    te_sev = np.where(m_sev & (split == 'test'))[0]

    Xs_sev_te = sev_pkg['selector'].transform(X_all[te_sev])
    proba_sev = sev_pkg['model'].predict_proba(Xs_sev_te)
    y_sev_te = y_sev[te_sev]

    pc_sev, agg_sev = compute_ovr_curves(y_sev_te, proba_sev, sev_display_classes)
    export_curves_to_csv(
        pc_sev, agg_sev, sev_display_classes,
        os.path.join(DATA_DIR, 'xgboost_severity_confidence_curves.csv'),
        'XGBoost_Severity_v2'
    )
    plot_three_panel_figure(
        pc_sev, agg_sev, sev_display_classes, PALETTE_SEV,
        'SALBA Severity-Level Prediction (Calibrated XGBoost Classifier, n_test = 12,593)',
        os.path.join(FIG_DIR, 'Figure_4_6_XGBoost_Severity_Confidence_Curves.png'),
        os.path.join(FIG_DIR, 'Figure_4_6_XGBoost_Severity_Confidence_Curves.pdf'),
        agg_mode='macro'
    )

    pred_sev_argmax = proba_sev.argmax(axis=1)
    summary['xgboost_severity'] = {
        'n_test': int(len(y_sev_te)),
        'argmax_accuracy': float(accuracy_score(y_sev_te, pred_sev_argmax)),
        'argmax_macro_f1': float(f1_score(y_sev_te, pred_sev_argmax, average='macro')),
        'argmax_weighted_f1': float(f1_score(y_sev_te, pred_sev_argmax, average='weighted')),
        'curve_macro_best_f1': agg_sev['macro']['best_f1'],
        'curve_macro_best_thresh': agg_sev['macro']['best_thresh'],
        'curve_macro_prec_at_best': agg_sev['macro']['prec_at_best_f1'],
        'curve_macro_rec_at_best': agg_sev['macro']['rec_at_best_f1'],
        'curve_weighted_best_f1': agg_sev['weighted']['best_f1'],
        'curve_weighted_best_thresh': agg_sev['weighted']['best_thresh'],
        'per_class': {
            c: {
                'support': pc_sev[c]['support'],
                'best_f1': pc_sev[c]['best_f1'],
                'best_thresh': pc_sev[c]['best_thresh'],
                'prec_at_best_f1': pc_sev[c]['prec_at_best_f1'],
                'rec_at_best_f1': pc_sev[c]['rec_at_best_f1'],
            } for c in sev_display_classes
        }
    }

    # =========================================================================
    # MODEL 3A: LOGISTIC REGRESSION (BASELINE FALSE ALARM DETECTOR)
    # =========================================================================
    print("3A. Evaluating Logistic Regression Baseline (False Alarm Detection)...")
    leg_display_classes = ['False Alarm (0)', 'Legitimate Emergency (1)']
    m_leg = df['legitimate'].notna().values
    y_leg = np.nan_to_num(df['legitimate'].values.astype(float), nan=-1).astype(int)
    rng = np.random.RandomState(42)
    tr_leg = np.where(m_leg & (split == 'train'))[0]
    seed_tr = tr_leg[df['source'].values[tr_leg] == 'ph_seed']
    if len(tr_leg) > 60000:
        tr_leg = np.union1d(rng.choice(tr_leg, 60000, replace=False), seed_tr)
    te_leg = np.where(m_leg & (split == 'test'))[0]

    Xs_leg_tr = leg_pkg['selector'].transform(X_all[tr_leg])
    Xs_leg_te_sparse = leg_pkg['selector'].transform(X_all[te_leg])
    w_tr_leg = compute_sample_weight('balanced', y_leg[tr_leg]) * weights_all[tr_leg]

    # Exact configuration from train_models_v2.py line 131
    lr_model = LogisticRegression(max_iter=2000, C=4.0, class_weight='balanced', random_state=42)
    lr_model.fit(Xs_leg_tr, y_leg[tr_leg], sample_weight=w_tr_leg)
    proba_lr = lr_model.predict_proba(Xs_leg_te_sparse)
    y_leg_te = y_leg[te_leg]

    pc_lr, agg_lr = compute_ovr_curves(y_leg_te, proba_lr, leg_display_classes, positive_class_idx=0)
    export_curves_to_csv(
        pc_lr, agg_lr, leg_display_classes,
        os.path.join(DATA_DIR, 'logreg_false_alarm_confidence_curves.csv'),
        'LogisticRegression_FalseAlarm_Baseline'
    )
    plot_three_panel_figure(
        pc_lr, agg_lr, leg_display_classes, PALETTE_LEG,
        'SALBA False Alarm Detection (Logistic Regression Baseline, n_test = 21,404)',
        os.path.join(FIG_DIR, 'Figure_4_7_LogReg_False_Alarm_Confidence_Curves.png'),
        os.path.join(FIG_DIR, 'Figure_4_7_LogReg_False_Alarm_Confidence_Curves.pdf'),
        agg_mode='macro',
        binary_pos_note='Binary Classes: False Alarm (Class 0, n=6,692) vs. Legitimate Emergency (Class 1, n=14,712)'
    )

    pred_lr_argmax = proba_lr.argmax(axis=1)
    summary['logistic_regression_false_alarm'] = {
        'n_test': int(len(y_leg_te)),
        'argmax_accuracy': float(accuracy_score(y_leg_te, pred_lr_argmax)),
        'argmax_macro_f1': float(f1_score(y_leg_te, pred_lr_argmax, average='macro')),
        'argmax_weighted_f1': float(f1_score(y_leg_te, pred_lr_argmax, average='weighted')),
        'curve_macro_best_f1': agg_lr['macro']['best_f1'],
        'curve_macro_best_thresh': agg_lr['macro']['best_thresh'],
        'curve_macro_prec_at_best': agg_lr['macro']['prec_at_best_f1'],
        'curve_macro_rec_at_best': agg_lr['macro']['rec_at_best_f1'],
        'curve_weighted_best_f1': agg_lr['weighted']['best_f1'],
        'curve_weighted_best_thresh': agg_lr['weighted']['best_thresh'],
        'per_class': {
            c: {
                'support': pc_lr[c]['support'],
                'best_f1': pc_lr[c]['best_f1'],
                'best_thresh': pc_lr[c]['best_thresh'],
                'prec_at_best_f1': pc_lr[c]['prec_at_best_f1'],
                'rec_at_best_f1': pc_lr[c]['rec_at_best_f1'],
            } for c in leg_display_classes
        }
    }

    # =========================================================================
    # MODEL 3B: DEPLOYED HISTGRADIENTBOOSTING (PRODUCTION FALSE ALARM MODEL)
    # =========================================================================
    print("3B. Evaluating Deployed Calibrated HistGradientBoosting (False Alarm Detection)...")
    Xs_leg_te_dense = Xs_leg_te_sparse.toarray()
    proba_hgb = leg_pkg['model'].predict_proba(Xs_leg_te_dense)

    pc_hgb, agg_hgb = compute_ovr_curves(y_leg_te, proba_hgb, leg_display_classes, positive_class_idx=0)
    export_curves_to_csv(
        pc_hgb, agg_hgb, leg_display_classes,
        os.path.join(DATA_DIR, 'histgb_false_alarm_confidence_curves.csv'),
        'HistGradientBoosting_FalseAlarm_Deployed_v2'
    )
    plot_three_panel_figure(
        pc_hgb, agg_hgb, leg_display_classes, PALETTE_LEG,
        'SALBA False Alarm Detection (Deployed Calibrated HistGradientBoosting v2, n_test = 21,404)',
        os.path.join(FIG_DIR, 'Figure_4_8_HistGB_False_Alarm_Confidence_Curves.png'),
        os.path.join(FIG_DIR, 'Figure_4_8_HistGB_False_Alarm_Confidence_Curves.pdf'),
        agg_mode='macro',
        binary_pos_note='Binary Classes: False Alarm (Class 0, n=6,692) vs. Legitimate Emergency (Class 1, n=14,712)'
    )

    pred_hgb_argmax = proba_hgb.argmax(axis=1)
    summary['histgb_deployed_false_alarm'] = {
        'n_test': int(len(y_leg_te)),
        'argmax_accuracy': float(accuracy_score(y_leg_te, pred_hgb_argmax)),
        'argmax_macro_f1': float(f1_score(y_leg_te, pred_hgb_argmax, average='macro')),
        'argmax_weighted_f1': float(f1_score(y_leg_te, pred_hgb_argmax, average='weighted')),
        'curve_macro_best_f1': agg_hgb['macro']['best_f1'],
        'curve_macro_best_thresh': agg_hgb['macro']['best_thresh'],
        'curve_macro_prec_at_best': agg_hgb['macro']['prec_at_best_f1'],
        'curve_macro_rec_at_best': agg_hgb['macro']['rec_at_best_f1'],
        'curve_weighted_best_f1': agg_hgb['weighted']['best_f1'],
        'curve_weighted_best_thresh': agg_hgb['weighted']['best_thresh'],
        'per_class': {
            c: {
                'support': pc_hgb[c]['support'],
                'best_f1': pc_hgb[c]['best_f1'],
                'best_thresh': pc_hgb[c]['best_thresh'],
                'prec_at_best_f1': pc_hgb[c]['prec_at_best_f1'],
                'rec_at_best_f1': pc_hgb[c]['rec_at_best_f1'],
            } for c in leg_display_classes
        }
    }

    summary_path = os.path.join(DATA_DIR, 'confidence_curves_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    print("\n=== ALL FIGURES AND CSV FILES GENERATED SUCCESSFULLY ===")
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
