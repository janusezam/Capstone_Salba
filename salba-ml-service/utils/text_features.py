"""
utils/text_features.py - Multilingual (English / Tagalog / Cebuano-Bisaya / Binukid)
text feature engineering for SALBA ML models.

Why this exists
---------------
The previous models only saw text *length* and a few English keyword counts, so they
could not tell "sunog" (fire) from "baha" (flood). This module gives the models:

  1. Word TF-IDF (1-2 grams)  -> learns real vocabulary from human-labeled crisis data
  2. Char TF-IDF (3-5 grams, word-bounded) -> robust to typos / Bisaya-Tagalog affixes
     ("nagbaha", "binabaha", "nasunog", "tbang")
  3. Crisis LEXICON features (dense counts) -> CROSS-LINGUAL BRIDGE.
     English training data teaches the model that `lex_fire` means Fire; because
     "sunog", "kalayo", "hapuy" also increment `lex_fire`, the knowledge transfers to
     Filipino reports even though the public datasets are mostly English.

All keyword matching is TOKEN/WORD-BOUNDARY based (fixes the old substring bugs such as
"uncontrolled" matching "controlled" or "contest" matching "test").
"""

import re
import numpy as np
from scipy import sparse
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.feature_extraction.text import TfidfVectorizer

# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------
_URL_RE = re.compile(r'https?://\S+|www\.\S+')
_MENTION_RE = re.compile(r'@\w+')
_RT_RE = re.compile(r'^\s*rt\s+', re.IGNORECASE)
_REPEAT_RE = re.compile(r'(.)\1{2,}')          # "tabangggg" -> "tabangg"
_NON_TEXT_RE = re.compile(r"[^a-z0-9ñ\s'!?-]")
_WS_RE = re.compile(r'\s+')
_TOKEN_RE = re.compile(r"[a-zñ]+(?:-[a-zñ]+)*")

AUTO_NOTE_RE = re.compile(r'^\s*(fire|flood|earthquake|landslide|typhoon)\s*-\s*', re.IGNORECASE)


def normalize_text(text):
    """Lowercase + strip URLs/mentions/RT/hashtags symbols + squash repeated letters."""
    if text is None:
        return ''
    t = str(text)
    if t.lower() in ('nan', 'none', 'null'):
        return ''
    t = _URL_RE.sub(' ', t)
    t = _MENTION_RE.sub(' ', t)
    t = _RT_RE.sub(' ', t)
    t = t.replace('#', ' ').lower()
    t = _REPEAT_RE.sub(r'\1\1', t)
    t = _NON_TEXT_RE.sub(' ', t)
    return _WS_RE.sub(' ', t).strip()


def is_meaningful_text(raw_text, barangay=None):
    """False for empty notes and for the app's auto-generated '<Type> - <Barangay>' notes."""
    t = str(raw_text or '').strip()
    if not t or t.lower() in ('nan', 'none', 'null'):
        return False
    if AUTO_NOTE_RE.match(t) and len(t.split()) <= 6:
        return False
    if barangay and t.lower() == str(barangay).strip().lower():
        return False
    return len(normalize_text(t)) >= 3


def tokenize(text):
    return _TOKEN_RE.findall(text)


# ---------------------------------------------------------------------------
# Multilingual crisis lexicon
#   tokens  : exact token matches (after normalize_text)
#   phrases : multi-word expressions matched with word boundaries
# ---------------------------------------------------------------------------
LEXICON = {
    'fire': {
        'tokens': {
            # English
            'fire', 'fires', 'blaze', 'ablaze', 'flames', 'flame', 'burning', 'burned', 'burnt',
            'wildfire', 'wildfires', 'bushfire', 'bushfires', 'smoke', 'arson', 'firefighters',
            'firefighter', 'inferno', 'engulfed', 'explosion', 'exploded',
            # Tagalog
            'sunog', 'nasusunog', 'nasunog', 'nagliliyab', 'apoy', 'usok', 'bumbero',
            # Cebuano / Bisaya
            'kalayo', 'nasunog', 'nagkalayo', 'aso', 'misiklab', 'gisunog',
            # Binukid
            'hapuy', 'hapoy',
        },
        'phrases': ['fire truck', 'bureau of fire', 'on fire', 'caught fire', 'bfp'],
    },
    'flood': {
        'tokens': {
            'flood', 'floods', 'flooded', 'flooding', 'floodwater', 'floodwaters', 'flashflood',
            'inundated', 'submerged', 'overflow', 'overflowing', 'overflowed', 'deluge',
            'waist-deep', 'knee-deep', 'chest-deep', 'neck-deep',
            # Tagalog
            'baha', 'binaha', 'binabaha', 'bumaha', 'pagbaha', 'nalubog', 'lubog', 'umaapaw',
            'tubig',
            # Cebuano
            'nagbaha', 'mibaha', 'nibaha', 'gibaha', 'lunop', 'nalunop', 'nalumos', 'suba',
            'nisaka', 'misaka',
            # Binukid
            'wahig',
        },
        'phrases': ['flash flood', 'water level', 'river overflow', 'storm surge',
                    'hanggang tuhod', 'hanggang baywang', 'abot hawak', 'kutob hawak',
                    'kutob tuhod', 'taas na ang tubig'],
    },
    'earthquake': {
        'tokens': {
            'earthquake', 'earthquakes', 'quake', 'quakes', 'tremor', 'tremors', 'aftershock',
            'aftershocks', 'seismic', 'magnitude', 'epicenter', 'shaking', 'temblor',
            # Tagalog
            'lindol', 'lumindol', 'niyanig', 'yanig', 'pagyanig',
            # Cebuano
            'linog', 'nilinog', 'milinog', 'kurog', 'nikurog', 'uyog', 'niuyog',
            # Binukid
            'linug',
        },
        'phrases': ['phivolcs', 'intensity'],
    },
    'landslide': {
        'tokens': {
            'landslide', 'landslides', 'mudslide', 'mudslides', 'rockslide', 'rockfall',
            'mudflow', 'debris', 'eroded', 'erosion', 'slope',
            # Tagalog
            'guho', 'gumuho', 'pagguho', 'nagguho',
            # Cebuano
            'dahili', 'nidahili', 'midahili', 'pagdahili', 'natabunan', 'gitabunan', 'tabon',
        },
        'phrases': ['soil collapse', 'rock fall', 'slope failure', 'ground movement',
                    'nidahili ang yuta', 'gumuho ang lupa'],
    },
    'typhoon': {
        'tokens': {
            'typhoon', 'typhoons', 'storm', 'storms', 'hurricane', 'hurricanes', 'cyclone',
            'cyclones', 'winds', 'gusts', 'gale', 'landfall', 'pagasa', 'signal', 'tornado',
            # Tagalog
            'bagyo', 'bumagyo', 'hangin', 'unos', 'ipo-ipo',
            # Cebuano
            'bagyo', 'kusog', 'hanginon', 'gibagyo', 'buhawi',
        },
        'phrases': ['strong winds', 'signal no', 'tropical depression', 'tropical storm',
                    'super typhoon', 'kusog nga hangin', 'malakas na hangin'],
    },
    # ---- severity / urgency cues ----
    'life_threat': {
        'tokens': {
            'trapped', 'stranded', 'drowning', 'drowned', 'unconscious', 'buried', 'missing',
            'dead', 'deaths', 'died', 'killed', 'casualties', 'casualty', 'fatalities', 'bodies',
            'dying', 'collapsed', 'crushed', 'rooftop', 'rooftops', 'bleeding',
            # Tagalog
            'patay', 'namatay', 'nalunod', 'naipit', 'nakulong', 'nawawala', 'naanod', 'duguan',
            # Cebuano
            'natanggong', 'naipit', 'nalumos', 'nangamatay', 'namatay', 'nawala', 'naanod',
            'nakulong', 'dugo',
        },
        'phrases': ['people trapped', 'cannot breathe', 'not breathing', 'on the roof',
                    'sa atop', 'sa bubong', 'mamatay na', 'walang malay', 'way panimuot'],
    },
    'injury': {
        'tokens': {
            'injured', 'injuries', 'injury', 'wounded', 'hurt', 'hospital', 'ambulance',
            'fracture', 'burns', 'medical', 'paramedic',
            # Tagalog / Cebuano
            'sugatan', 'nasugatan', 'samaran', 'nasamdan', 'pasyente', 'ospital', 'bun-og',
        },
        'phrases': ['need medical', 'first aid'],
    },
    'help_request': {
        'tokens': {
            'help', 'rescue', 'sos', 'urgent', 'emergency', 'evacuate', 'evacuation', 'please',
            'pls', 'plz', 'asap', 'immediately', 'need', 'needed', 'send',
            # Tagalog
            'tulong', 'tulungan', 'saklolo', 'sagipin', 'paki', 'agad', 'dali',
            # Cebuano
            'tabang', 'tabangi', 'luwasa', 'dali', 'dalia', 'palihug', 'karon',
        },
        'phrases': ['send help', 'need help', 'need rescue', 'help us', 'please help'],
    },
    'damage': {
        'tokens': {
            'damage', 'damaged', 'destroyed', 'destruction', 'collapse', 'collapsed', 'cracked',
            'cracks', 'blocked', 'impassable', 'toppled', 'uprooted', 'blown', 'washed',
            'devastated', 'outage', 'brownout',
            # Tagalog / Cebuano
            'sira', 'nasira', 'naguba', 'guba', 'giguba', 'natumba', 'natumpag', 'nabuak',
            'liki', 'naliki', 'nabali',
        },
        'phrases': ['power lines down', 'road blocked', 'house collapsed', 'roof blown'],
    },
    'downgrade': {
        'tokens': {
            'minor', 'small', 'slight', 'slightly', 'contained', 'controlled', 'subsiding',
            'receding', 'manageable', 'mild', 'safe', 'okay', 'ok', 'fine', 'cleared',
            # Tagalog / Cebuano
            'gamay', 'gamayng', 'maliit', 'konti', 'kontrolado', 'ligtas', 'okay', 'humupa',
            'nihubas', 'naayo',
        },
        'phrases': ['no damage', 'no injuries', 'no casualties', 'under control',
                    'walang nasaktan', 'walay naangol', 'walay nadaot'],
    },
    'prank': {
        'tokens': {
            'test', 'testing', 'tested', 'prank', 'joke', 'joking', 'fake', 'hoax', 'lol', 'lmao',
            'haha', 'hahaha', 'jk', 'drill', 'simulation', 'dummy', 'sample', 'mock', 'trial',
            # Tagalog / Cebuano
            'biro', 'charot', 'char', 'joke', 'lang', 'binuang', 'pangatik', 'chos', 'echos',
        },
        'phrases': ['just kidding', 'joke lang', 'test lang', 'testing lang', 'binuang lang',
                    'walang sunog', 'walay sunog', 'walang baha', 'walay baha', 'do not dispatch',
                    'please ignore', 'ignore this'],
    },
}

LEXICON_CATEGORIES = list(LEXICON.keys())
_PHRASE_RES = {
    cat: [re.compile(r'\b' + re.escape(p) + r'\b') for p in spec['phrases']]
    for cat, spec in LEXICON.items()
}

EXTRA_FEATURES = ['has_text', 'log_n_tokens', 'exclaim_ratio', 'upper_ratio', 'question']
DENSE_FEATURE_NAMES = [f'lex_{c}' for c in LEXICON_CATEGORIES] + EXTRA_FEATURES


def lexicon_counts(norm_text):
    tokens = tokenize(norm_text)
    out = []
    for cat in LEXICON_CATEGORIES:
        vocab = LEXICON[cat]['tokens']
        c = sum(1 for tok in tokens if tok in vocab)
        c += sum(1 for rx in _PHRASE_RES[cat] if rx.search(norm_text))
        out.append(c)
    return out, len(tokens)


def dense_features(raw_texts):
    rows = []
    for raw in raw_texts:
        raw = '' if raw is None else str(raw)
        norm = normalize_text(raw)
        counts, n_tok = lexicon_counts(norm)
        letters = [ch for ch in raw if ch.isalpha()]
        upper_ratio = (sum(ch.isupper() for ch in letters) / len(letters)) if letters else 0.0
        rows.append(counts + [
            1.0 if n_tok > 0 else 0.0,
            float(np.log1p(n_tok)),
            raw.count('!') / max(1, len(raw)) * 10,
            upper_ratio,
            1.0 if '?' in raw else 0.0,
        ])
    return np.asarray(rows, dtype=np.float32)


class TextFeaturizer(BaseEstimator, TransformerMixin):
    """Word TF-IDF + char TF-IDF + dense multilingual lexicon features (sparse output)."""

    def __init__(self, word_max_features=30000, char_max_features=40000, min_df=3,
                 lexicon_weight=1.0):
        self.word_max_features = word_max_features
        self.char_max_features = char_max_features
        self.min_df = min_df
        self.lexicon_weight = lexicon_weight

    def _prep(self, X):
        return [normalize_text(x) for x in X]

    def fit(self, X, y=None):
        norm = self._prep(X)
        self.word_vec_ = TfidfVectorizer(
            ngram_range=(1, 2), min_df=self.min_df, max_features=self.word_max_features,
            sublinear_tf=True, token_pattern=r"(?u)\b[a-zñ][a-zñ'-]+\b",
        ).fit(norm)
        self.char_vec_ = TfidfVectorizer(
            analyzer='char_wb', ngram_range=(3, 5), min_df=self.min_df,
            max_features=self.char_max_features, sublinear_tf=True,
        ).fit(norm)
        dense = dense_features(X)
        self.dense_scale_ = np.maximum(dense.max(axis=0), 1.0)
        return self

    def transform(self, X):
        norm = self._prep(X)
        W = self.word_vec_.transform(norm)
        C = self.char_vec_.transform(norm)
        D = sparse.csr_matrix(dense_features(X) / self.dense_scale_ * self.lexicon_weight)
        return sparse.hstack([W, C, D], format='csr', dtype=np.float32)

    def get_feature_names_out(self, input_features=None):
        return np.concatenate([
            ['w:' + f for f in self.word_vec_.get_feature_names_out()],
            ['c:' + f for f in self.char_vec_.get_feature_names_out()],
            DENSE_FEATURE_NAMES,
        ])
