#!/usr/bin/env python3
"""
build_training_corpus.py - Merge real public crisis datasets + the Philippine seed set into
one leakage-safe training corpus for SALBA's three models.

Label mapping follows docs/salba_data_sourcing_ml_strategy.md (Section 1).

  disaster_type : Fire | Flood | Earthquake | Landslide | Typhoon
                  - CrisisBench: from the human-curated EVENT name (e.g. 2013_bohol_earthquake)
                    + class 'physical_landslide'; only on-topic rows (no sympathy/donation/noise)
                  - Appen: exactly one of fire / floods / earthquake / storm == 1
  severity      : low | moderate | high | critical
                  - derived from HUMAN-annotated humanitarian categories
                    (injured_or_dead_people -> critical, requests_or_needs -> high, ...)
                    with a life-threat lexical escalation (trapped, drowning, ...)
                  - Appen: death / search_and_rescue / missing_people -> critical, etc.
  legitimate    : 1 = real emergency-relevant report, 0 = noise / non-emergency / prank
                  - CrisisBench informativeness (informative vs not_informative)
                  - Appen `related`
                  - Philippine seed set (prank / test / metaphor / misdial rows)

Split strategy (prevents the leakage that inflated the old 95%+ accuracies):
  * Whole EVENTS are held out for test and calibration (cross-event generalisation),
    incl. 4 Philippine events kept entirely in TEST.
  * Texts are normalised + de-duplicated; if a text exists in test it is removed from
    train/calib (kills retweet leakage).

Output: data/processed/salba_corpus.csv

Usage:
    python data_pipeline/build_training_corpus.py
"""

import os
import re
import sys
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from utils.text_features import normalize_text, lexicon_counts, LEXICON_CATEGORIES  # noqa: E402

RAW = os.path.join(ROOT, 'data', 'raw')
OUT_DIR = os.path.join(ROOT, 'data', 'processed')
SEED_FILE = os.path.join(ROOT, 'data', 'curated', 'ph_seed_reports.csv')
RNG = np.random.RandomState(42)

KEEP_LANGS = {'en', 'tl', 'ceb', 'und', 'na', 'nan', '', 'none'}

# ---------------------------------------------------------------- event -> split
TEST_EVENTS = {
    # Philippine events (entirely unseen during training)
    '2013_bohol_earthquake', '2012_philipinnes_floods', '2013_manila_floods',
    '2012_philippines_typhoon-pablo',
    # International events
    'california_wildfires', 'mexico_earthquake', 'srilanka_floods', 'hurricane_maria',
    '2013_colorado_floods', '2012_guatemala_earthquake',
}
CALIB_EVENTS = {
    '2013_brazil_nightclub-fire', '2014_california_earthquake', '2013_queensland_floods',
    'hurricane_irma', '2015_vanuatu_cyclone-pam', '2013_pakistan_earthquake',
    '2013_queensland_floods-ontopic',
}
# events too unique to hold out whole -> use the dataset's official row split
ROW_SPLIT_EVENTS = {'2014-2015_worldwide_landslides', 'disaster_events'}
PH_EVENT_RE = re.compile(r'philip|phillip|bohol|manila|pablo|yolanda|hagupit|ruby')


def event_to_type(event):
    e = str(event).lower()
    if 'tornado' in e:
        return None
    if 'landslide' in e:
        return 'Landslide'
    if 'earthquake' in e or 'quake' in e:
        return 'Earthquake'
    if 'flood' in e or 'sardinia' in e:
        return 'Flood'
    if any(k in e for k in ('typhoon', 'hurricane', 'cyclone', 'sandy', 'odile')):
        return 'Typhoon'
    if any(k in e for k in ('wildfire', 'bushfire', 'nightclub-fire')):
        return 'Fire'
    return None


TYPE_OFFTOPIC_CLASSES = {
    'not_humanitarian', 'donation_and_volunteering', 'sympathy_and_support',
    'response_efforts', 'personal_update', 'disease_related', 'terrorism_related',
}

HUMANITARIAN_TO_SEVERITY = {
    'injured_or_dead_people': 'critical',
    'missing_and_found_people': 'critical',
    'requests_or_needs': 'high',
    'displaced_and_evacuations': 'high',
    'infrastructure_and_utilities_damage': 'high',
    'affected_individual': 'high',
    'physical_landslide': 'high',
    'caution_and_advice': 'moderate',
    'other_relevant_information': 'moderate',
    'personal_update': 'low',
    'response_efforts': 'low',
    'donation_and_volunteering': 'low',
    'sympathy_and_support': 'low',
}

_PHONE_RE = re.compile(r'(\+?63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}|\+?\d[\d\s-]{8,}\d')
_EMAIL_RE = re.compile(r'\S+@\S+\.\S+')
_LIFE_IDX = LEXICON_CATEGORIES.index('life_threat')


def scrub_pii(text):
    """RA 10173: remove phone numbers / e-mails before anything is stored."""
    t = _EMAIL_RE.sub('<EMAIL>', str(text))
    return _PHONE_RE.sub('<PHONE>', t)


def has_life_threat(text):
    counts, _ = lexicon_counts(normalize_text(text))
    return counts[_LIFE_IDX] > 0


# ---------------------------------------------------------------- loaders
def split_for_event(event, official_split):
    e = str(event).lower()
    if e in TEST_EVENTS:
        return 'test'
    if e in CALIB_EVENTS:
        return 'calib'
    if e in ROW_SPLIT_EVENTS:
        return {'train': 'train', 'dev': 'calib', 'test': 'test'}[official_split]
    return 'train'


def load_crisisbench():
    frames = []
    for cfg in ('humanitarian', 'informativeness'):
        for split in ('train', 'dev', 'test'):
            path = os.path.join(RAW, 'crisisbench', f'crisisbench_{cfg}_{split}.parquet')
            df = pd.read_parquet(path)
            df['lang'] = df['lang'].astype(str).str.lower()
            df = df[df['lang'].isin(KEEP_LANGS)].copy()
            df['split'] = [split_for_event(e, split) for e in df['event']]
            df['cfg'] = cfg
            frames.append(df[['text', 'event', 'source', 'lang', 'class_label', 'split', 'cfg']])
    df = pd.concat(frames, ignore_index=True)

    rows = []
    for r in df.itertuples(index=False):
        d_type = sev = legit = None
        if r.cfg == 'humanitarian':
            if r.class_label == 'physical_landslide':
                d_type = 'Landslide'
            elif r.class_label not in TYPE_OFFTOPIC_CLASSES:
                d_type = event_to_type(r.event)
            sev = HUMANITARIAN_TO_SEVERITY.get(r.class_label)
            if sev == 'high' and r.class_label == 'requests_or_needs' and has_life_threat(r.text):
                sev = 'critical'
        else:
            legit = 1 if r.class_label == 'informative' else 0
            if legit == 1:
                d_type = event_to_type(r.event)
        rows.append({
            'text': r.text, 'source': f'crisisbench:{r.source}', 'event': r.event,
            'lang': r.lang, 'split': r.split, 'disaster_type': d_type,
            'severity': sev, 'legitimate': legit,
        })
    out = pd.DataFrame(rows)
    print(f'  CrisisBench rows: {len(out):,}')
    return out


def load_appen():
    frames = []
    for split, mapped in (('train', 'train'), ('validation', 'calib'), ('test', 'test')):
        df = pd.read_parquet(os.path.join(RAW, 'appen', f'appen_{split}.parquet'))
        df['split'] = mapped
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    df = df[df['related'].isin([0, 1])]

    type_cols = {'fire': 'Fire', 'floods': 'Flood', 'earthquake': 'Earthquake', 'storm': 'Typhoon'}
    rows = []
    for _, r in df.iterrows():
        legit = int(r['related'])
        d_type = sev = None
        if legit == 1:
            hits = [t for c, t in type_cols.items() if r[c] == 1]
            d_type = hits[0] if len(hits) == 1 else None
            if r['death'] or r['search_and_rescue'] or r['missing_people']:
                sev = 'critical'
            elif (r['medical_help'] or r['buildings'] or r['infrastructure_related']
                  or r['refugees'] or (r['request'] and (r['water'] or r['food'] or r['shelter']))):
                sev = 'critical' if has_life_threat(r['message']) else 'high'
            elif r['request'] or r['direct_report'] or r['weather_related'] or r['aid_related']:
                sev = 'moderate'
            else:
                sev = 'low'
        rows.append({
            'text': r['message'], 'source': f'appen:{r["genre"]}', 'event': 'appen_drm',
            'lang': 'en', 'split': r['split'], 'disaster_type': d_type,
            'severity': sev, 'legitimate': legit,
        })
    out = pd.DataFrame(rows)
    print(f'  Appen rows: {len(out):,}')
    return out


def load_seed():
    df = pd.read_csv(SEED_FILE)
    df['legitimate'] = df['legitimate'].astype(int)
    # stratified 60/20/20 split on (legit, type)
    df['strat'] = df['legitimate'].astype(str) + '_' + df['disaster_type'].fillna('none')
    splits = []
    for _, g in df.groupby('strat'):
        idx = RNG.permutation(len(g))
        n = len(g)
        n_test = max(1, int(round(n * 0.2)))
        n_cal = max(1, int(round(n * 0.2))) if n >= 4 else 0
        lab = np.array(['train'] * n, dtype=object)
        lab[idx[:n_test]] = 'test'
        lab[idx[n_test:n_test + n_cal]] = 'calib'
        g = g.copy()
        g['split'] = lab
        splits.append(g)
    df = pd.concat(splits)
    out = pd.DataFrame({
        'text': df['text'], 'source': 'ph_seed', 'event': 'ph_seed', 'lang': df['lang'],
        'split': df['split'],
        'disaster_type': df['disaster_type'].where(df['disaster_type'].notna(), None),
        'severity': df['severity'].where(df['severity'].notna(), None),
        'legitimate': df['legitimate'],
    })
    print(f'  PH seed rows: {len(out):,}')
    return out


def first_valid(s):
    s = s.dropna()
    return s.iloc[0] if len(s) else None


def main():
    print('Loading sources...')
    df = pd.concat([load_crisisbench(), load_appen(), load_seed()], ignore_index=True)
    df['text'] = df['text'].astype(str).map(scrub_pii)
    df['key'] = df['text'].map(normalize_text)
    df = df[df['key'].str.len() >= 3]

    # leakage guard: a text keeps only its highest-priority split (test > calib > train)
    prio = {'test': 0, 'calib': 1, 'train': 2}
    df['prio'] = df['split'].map(prio)
    best = df.groupby('key')['prio'].transform('min')
    df = df[df['prio'] == best]

    # merge duplicates of the same text (e.g. same tweet in humanitarian + informativeness)
    agg = df.groupby(['key', 'split'], sort=False).agg(
        text=('text', 'first'), source=('source', 'first'), event=('event', 'first'),
        lang=('lang', 'first'), disaster_type=('disaster_type', first_valid),
        severity=('severity', first_valid), legitimate=('legitimate', first_valid),
    ).reset_index()
    agg['is_ph'] = agg['event'].astype(str).str.lower().str.contains(PH_EVENT_RE) | (agg['source'] == 'ph_seed')

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, 'salba_corpus.csv')
    agg.drop(columns=['key']).to_csv(out_path, index=False)

    print(f'\nSaved {len(agg):,} de-duplicated rows -> {out_path}')
    for col in ('disaster_type', 'severity', 'legitimate'):
        print(f'\n{col}:')
        print(pd.crosstab(agg[col].fillna('-'), agg['split']))
    print('\nPhilippine rows per split:')
    print(agg[agg['is_ph']].groupby('split').size())


if __name__ == '__main__':
    main()
