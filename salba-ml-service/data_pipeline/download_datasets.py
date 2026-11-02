#!/usr/bin/env python3
"""
download_datasets.py - Download REAL, human-annotated public crisis datasets for SALBA.

Sources (all public, no login required):
  1. Appen / Figure Eight "Multilingual Disaster Response Messages"
     https://huggingface.co/datasets/community-datasets/disaster_response_messages
     ~26k real SMS / social / news messages (Haiti 2010, Chile, Pakistan floods...)
     36 human-annotated binary labels (fire, floods, earthquake, storm, medical_help,
     search_and_rescue, death, request, direct_report, related ...).
  2. QCRI CrisisBench (all languages)  - Alam et al. (2021), CC BY-NC-SA 4.0
     https://huggingface.co/datasets/QCRI/CrisisBench-all-lang
     ~166k informativeness + ~142k humanitarian labeled crisis tweets
     (consolidates CrisisLex, CrisisNLP, SWDM13, ISCRAM13, DSM, CrisisMMD, AIDR).
     NOTE: CrisisBench already contains CrisisLexT26 (Olteanu et al., 2015), including
     the PHILIPPINE events 2012_Philipinnes_floods, 2012_Typhoon_Pablo,
     2013_Bohol_earthquake, 2013_Manila_floods, 2013_Typhoon_Yolanda, plus
     2014 Typhoon Hagupit/Ruby, so CrisisLexT26 is not downloaded separately
     (that would only create duplicates).

Output: data/raw/<source>/...

Usage:
    python data_pipeline/download_datasets.py
"""

import os
import sys
import time
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, 'data', 'raw')

HF = 'https://huggingface.co/api/datasets'

APPEN_FILES = {
    f'appen_{split}.parquet': f'{HF}/community-datasets/disaster_response_messages/parquet/default/{split}/0.parquet'
    for split in ('train', 'validation', 'test')
}

CRISISBENCH_FILES = {}
for cfg in ('humanitarian', 'informativeness'):
    for split in ('train', 'dev', 'test'):
        CRISISBENCH_FILES[f'crisisbench_{cfg}_{split}.parquet'] = (
            f'{HF}/QCRI/CrisisBench-all-lang/parquet/{cfg}/{split}/0.parquet'
        )



def download(url, dest, retries=3):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print(f'  [skip] {os.path.basename(dest)} (already downloaded)')
        return True
    for attempt in range(1, retries + 1):
        try:
            with requests.get(url, stream=True, timeout=120, allow_redirects=True) as r:
                r.raise_for_status()
                tmp = dest + '.part'
                with open(tmp, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        f.write(chunk)
                os.replace(tmp, dest)
            print(f'  [ok]   {os.path.basename(dest)} ({os.path.getsize(dest) / 1e6:.1f} MB)')
            return True
        except Exception as e:  # noqa: BLE001
            print(f'  [retry {attempt}/{retries}] {os.path.basename(dest)}: {e}')
            time.sleep(2 * attempt)
    print(f'  [FAIL] {url}')
    return False


def main():
    groups = [
        ('appen', APPEN_FILES),
        ('crisisbench', CRISISBENCH_FILES),
    ]
    failures = 0
    for name, files in groups:
        out_dir = os.path.join(RAW_DIR, name)
        os.makedirs(out_dir, exist_ok=True)
        print(f'\n== {name} ({len(files)} files) ==')
        for fname, url in files.items():
            if not download(url, os.path.join(out_dir, fname)):
                failures += 1
    print(f'\nDone. Failures: {failures}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
