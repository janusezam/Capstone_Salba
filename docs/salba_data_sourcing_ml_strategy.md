# SALBA Data-Sourcing & ML Training Strategy
**Project:** SALBA – Emergency/Disaster Reporting and Rescue-Dispatch System  
**Target Agency:** City Disaster Risk Reduction and Management Office (CDRRMO), Malaybalay City, Bukidnon, Philippines  
**Models:** Random Forest, XGBoost, Gradient Boosting, Multilingual Transformer (`multilingual-e5-small` / `xlm-roberta-base`)  
**Prediction Targets:**
1. **Incident TYPE:** `Fire`, `Flood`, `Earthquake`, `Landslide`, `Typhoon`, `Medical`, `Vehicular_Accident`, `Other`
2. **SEVERITY:** `low`, `moderate`, `high`, `critical`
3. **LEGITIMACY:** `legitimate` vs. `false_alarm` (prank, test, drill, metaphorical, non-emergency)

---

## Verified Public Datasets for SALBA

The following 17 verified datasets cover Categories A through D. At least 8 are directly specific to the Philippines or include major Philippine disaster events.

| Name | URL | Category (A/B/C/D) | Size (rows) | Languages | Labels available | Maps to which SALBA model | License & citation requirement | Format | Needs registration? | Philippine relevance (1-5) | Data quality notes / caveats |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. QCRI CrisisBench (All-Lang & English)** | `https://huggingface.co/datasets/QCRI/CrisisBench-all-lang` | **A, B** | ~142,000 (humanitarian) / ~166,000 (informativeness) | English + Multilingual (consolidates CrisisLex, CrisisNLP, AIDR) | `informativeness` (informative vs. not_informative); `humanitarian` (10 classes: casualties, infrastructure damage, rescue, caution, etc.) | **Type, Severity, Legitimacy** | CC BY-NC-SA 4.0; cite Alam et al. (2021) | JSON / Parquet (Hugging Face) | No | **4/5** (Includes Typhoon Yolanda/Haiyan & Hagupit/Ruby tweets) | Human-annotated via CrowdFlower/FigureEight. Full tweet text is included directly in the HF repository—no X/Twitter API rehydration needed. |
| **2. HumAID (Human-Annotated Disaster Incidents)** | `https://crisisnlp.qcri.org/humaid_dataset.html` | **A** | 77,196 | English | 10 humanitarian classes (`injured_or_dead_people`, `requests_or_urgent_needs`, `displaced_people_and_evacuations`, `infrastructure_and_utility_damage`, etc.) | **Type, Severity** | CC BY-NC-SA 4.0; cite Alam et al. (2021) ICWSM | TSV | No (Set 1 direct; Set 2 via form/GitHub mirrors) | **3/5** (19 major global events; transferable flood/quake/fire/typhoon taxonomy) | Pre-filtered for relevant tweets only (do not use alone for false-alarm training). Full text TSVs are widely mirrored on GitHub (`jrosebr1/rescue-ripple`). |
| **3. CrisisLexT26 (26 Crisis Events)** | `https://github.com/sajao/CrisisLex` | **A, B** | ~28,000 annotated (~1,000–1,100 per event); 285k raw IDs | English, Tagalog/Taglish, Spanish, Italian | `Informativeness` (Related & informative, Related-not informative, Not related); `Information Type` (6 classes); `Source` | **Type, Legitimacy** | CC BY-NC-SA 4.0; cite Olteanu et al. (2015) | CSV | No | **5/5** (Explicitly includes `2013_Bohol_earthquake` and `2013_Typhoon_Yolanda`) | Annotated CSVs contain full tweet text. The Bohol and Yolanda subsets contain authentic Philippine English and Taglish crisis expressions. |
| **4. CrisisMMD v2.0 (Multimodal Crisis Dataset)** | `https://crisisnlp.qcri.org/crisismmd.html` | **A, B** | 16,058 tweets (18,082 images) | English | Task 1: `Informative` vs `Not informative`; Task 2: 8 Humanitarian categories; Task 3: **Damage Severity** (`Severe`, `Mild`, `Little or no damage`) | **Type, Severity, Legitimacy** | CC BY-NC-SA 4.0; cite Alam et al. (2018) | TSV / CSV + JPG | No | **3/5** (7 disasters across 2017 hurricanes, Mexico/Iraq quakes, Sri Lanka floods, CA wildfires) | One of the few datasets with explicit human-annotated **Severity** labels (`Severe`, `Mild`, `Little/None`). Use the text split even if ignoring images. |
| **5. Appen / Figure Eight Multilingual Disaster Response Messages** | `https://huggingface.co/datasets/community-datasets/disaster_response_messages` | **A, B** | ~26,248 (train/val/test combined) | English + Original language column (Haitian Creole, Spanish, etc.) | 36 binary category columns (`related`, `request`, `offer`, `medical_help`, `search_and_rescue`, `fire`, `floods`, `storm`, `earthquake`, `direct_report`) | **Type, Severity, Legitimacy** | CC0 / Public Domain (originally released by Figure Eight/Appen) | CSV / Parquet | No | **3/5** (Real SMS and social messages from Haiti 2010, Chile 2010, Pakistan 2010) | Highly valuable because messages are real **SMS emergency reports** (`direct_report=1`), matching SALBA's short citizen SOS format better than news tweets. |
| **6. Kaggle "NLP with Disaster Tweets"** | `https://www.kaggle.com/c/nlp-getting-started/data` | **B, A** | 10,876 (7,613 train / 3,263 test) | English | `keyword` (e.g., `ablaze`, `landslide`, `flood`, `siren`), `location`, `target` (`1` = real disaster, `0` = non-disaster/metaphorical) | **Legitimacy, Type** | CC0 / Public Domain (originally CrowdFlower "Disasters on Social Media") | CSV | Yes (Free Kaggle account) | **2/5** | Best baseline dataset for teaching models to distinguish literal emergencies ("Our house is ablaze") from metaphorical/non-emergency slang ("That mixtape is ablaze"). |
| **7. TREC-IS (Incident Streams)** | `http://dcs.gla.ac.uk/~richardm/TREC_IS/` | **A, B** | ~40,000–50,000 across 2018–2021 editions | English | 25 high-level information types (`Request-SearchAndRescue`, `Report-EmergingThreats`, etc.) + **Priority** (`Low`, `Medium`, `High`, `Critical`) | **Type, Severity, Legitimacy** | Academic Research License; cite McCreadie et al. (2019) | JSON | No (Tweet IDs require hydration; pre-hydrated splits on Hugging Face/GitHub) | **4/5** (Includes 2018 Typhoon Mangkhut/Ompong in the Philippines) | Maps 1-to-1 to SALBA's exact 4-tier severity schema (`Low`, `Medium`, `High`, `Critical`). Look for pre-hydrated academic mirrors on Hugging Face to avoid X API limits. |
| **8. Filipino Text Benchmarks – Dengue & Disaster Tweet Corpora (jcblaise)** | `https://github.com/jcblaisecruz02/Filipino-Text-Benchmarks` (and `https://huggingface.co/jcblaise`) | **A, B** | 5,015 (Dengue multiclass) + 18,464 (Hate/General tweets) | Tagalog, Taglish, Philippine English | 5 classes (`absent`, `dengue`, `health`, `mosquito`, `sick`) | **Type (Medical), Legitimacy, Linguistic Transfer** | MIT / GPL-3.0; cite Livelo & Cheng (2018) and Cruz & Cheng (2020) | CSV / Parquet | No | **5/5** (100% authentic Philippine informal social media text) | Essential for domain adaptation on informal Taglish spelling, contractions, and health/symptom reporting (`nilalagnat`, `ospital`, `tulong`). |
| **9. San Francisco Fire Department Calls for Service (DataSF)** | `https://data.sf.gov/Public-Safety/Fire-Call-for-Service/f7i4-96ff` | **B, A** | >6,500,000 (filterable via API to 10k–50k subset) | English (Structured dispatch metadata) | `Call Type` (Structure Fire, Medical Incident, Vehicle Accident, Landslide), `Priority`, `Final Disposition` (`False Alarm`, `Duplicate`, `No Merit`, `Fire`) | **Legitimacy, Type, Severity** | PDDL (Open Data Commons Public Domain Dedication and License) | CSV / JSON / Socrata API | No | **2/5** (US municipal dispatch, but universal NFIRS incident/false-alarm taxonomy) | Real emergency dispatch records containing ground-truth dispositions for `False Alarm` and `Unfounded` calls alongside call timing and priority codes. |
| **10. OCHA Philippines Humanitarian Data Exchange (HDX) Portal** | `https://data.humdata.org/organization/ocha-philippines` | **C, D** | ~100+ datasets (1,000 to 42,000+ rows per file) | English (Philippine barangay/municipal tabular records) | Affected families/persons, damaged houses (partially/totally), evacuation centers, casualties per barangay for major PH typhoons & quakes | **Severity (Ground Truth), Geo** | CC BY-IGO / CC BY 4.0 | CSV / XLSX / Shapefile / GeoJSON | No | **5/5** (Official NDRRMC/DSWD DROMIC data curated by UN OCHA Philippines) | Includes structured impact tables for Typhoon Odette (Rai), Pablo (Bopha), Sendong (Washi), and 2019 Mindanao Earthquakes down to municipal/barangay levels. |
| **11. EM-DAT (International Disaster Database – Philippines Subset)** | `https://public.emdat.be/` | **C** | ~700+ major Philippine disaster events (1900–2026) | English | Disaster Subgroup/Type (`Flood`, `Storm`, `Earthquake`, `Landslide`, `Fire`), Total Deaths, Injured, Affected, Homeless, Total Damage (USD) | **Severity (Ground Truth), Type** | Free for Academic / Non-Commercial use; cite CRED / UCLouvain | XLSX / CSV | Yes (Free academic account) | **5/5** (Comprehensive historical record of Mindanao and Bukidnon disasters) | Provides empirical distributions of casualties vs. affected populations in the Philippines to calibrate your tabular/structured severity thresholds. |
| **12. DesInventar Sendai (UNDRR Historical Disaster Database)** | `https://www.desinventar.net/DesInventar/` | **C** | ~15,000+ sub-national incident records | English | Event type (`Flood`, `Flash flood`, `Landslide`, `Fire`, `Strong wind`), Deaths, Injured, Missing, Houses Destroyed/Damaged, Location | **Severity (Ground Truth), Type** | Open Academic / UNDRR Terms of Use | CSV / XLS | No | **5/5** (Sub-national municipal level records sourced from OCD/NDRRMC) | Captures smaller, localized municipal incidents (flash floods, localized landslides, structural fires) that fall below EM-DAT's international reporting thresholds. |
| **13. PHIVOLCS GeoHazards & WFP ADAM Philippines Earthquake Datasets (HDX)** | `https://data.humdata.org/dataset/philippines-geohazards-data` | **C, D** | Active fault lines across PH + event-specific shakemaps/impact tables | English | Active fault traces, earthquake epicenters, depth, magnitude, intensity zones, estimated population exposed within 50km | **Geo, Severity** | CC BY-SA 4.0 / PH Government Open Data; cite DOST-PHIVOLCS & WFP ADAM | KMZ / GeoJSON / CSV | No | **5/5** (Includes Mindanao fault systems, e.g., Central Mindanao Fault near Bukidnon) | Distance from an SOS GPS coordinate to the nearest active PHIVOLCS fault line is a high-value spatial feature for earthquake legitimacy and severity. |
| **14. UPRI Project NOAH / GeoRiskPH / HazardHunterPH Hazard Layers** | `https://data.humdata.org/dataset/project-cchain` (and `https://hazardhunter.georisk.gov.ph/`) | **D** | Municipal/Barangay hazard summaries + high-res polygons | English | Flood susceptibility (`Low`, `Moderate`, `High` for 5yr/25yr/100yr return periods) and Rain-Induced Landslide susceptibility | **Geo, Legitimacy, Severity** | CC BY 4.0 (HDX CCHAIN extract) / DOST-UPRI & MGB terms | CSV / Shapefile / Web GIS | No (HDX direct; GeoRiskPH requires LGU/academic login for raw SHP) | **5/5** (Directly covers Philippine flood and landslide susceptibility) | Also check `https://github.com/UPRI-NOAH` for open validation datasets. Intersecting SOS lat/lng with flood/landslide susceptibility prevents false flood alarms on high ridges. |
| **15. Philippines Subnational Administrative Boundaries (COD-AB) Level 0–4** | `https://data.humdata.org/dataset/cod-ab-phl` | **D** | 42,046 barangays (includes all **46 barangays of Malaybalay City**) | English / Filipino place names | `ADM4_EN` (Barangay Name), `ADM4_PCODE` (PSA PSGC Code), `ADM3_EN` (`City of Malaybalay`), `ADM2_EN` (`Bukidnon`), Polygon geometry | **Geo (Spatial Join)** | CC BY-IGO (PSA / NAMRIA / OCHA FISS) | Shapefile (`.shp.zip`), GeoJSON, Geodatabase | No | **5/5** (Exact official boundaries for Malaybalay City's 46 barangays) | Updated May 2026. Use `geopandas.sjoin()` to instantaneously map any incoming `(lat, lng)` SOS ping to its exact Malaybalay barangay (e.g., *Poblacion*, *Casisang*, *Aglayan*, *Busdi*). |
| **16. Geofabrik OpenStreetMap (OSM) Philippines Extract** | `https://download.geofabrik.de/asia/philippines.html` | **D** | ~1.4 GB unzipped (clip to Bukidnon bounding box) | English / Local street & river names | Waterways (`Sawaga River`, `Pulangi River`, creeks), road network (`Sayre Highway`), building footprints, emergency facilities (hospitals, fire stations) | **Geo, Severity, Legitimacy** | ODbL 1.0 (Open Database License); cite OpenStreetMap contributors | `.osm.pbf`, `.shp.zip`, `.gpkg.zip` | No | **5/5** (Contains detailed Malaybalay City road, river, and building geometry) | Enables vital engineered spatial features: `dist_to_nearest_river_m` (for Flood), `dist_to_highway_m` (for Vehicular Accident), and `building_density_100m` (for Fire). |
| **17. Open-Meteo Historical Weather API (ERA5-Land) & CHIRPS Philippines Rainfall** | `https://open-meteo.com/en/docs/historical-weather-api` (and `https://data.humdata.org/dataset/chirps-global-precipitation`) | **D, C** | Hourly continuous grid (1950–2026) at 9km–11km resolution | Numeric / API | Hourly `precipitation`, `rain`, `soil_moisture_0_to_7cm`, `soil_moisture_7_to_28cm`, `wind_gusts_10m`, `weather_code` | **Geo, Severity, Legitimacy** | CC BY 4.0 (Open-Meteo non-commercial / Copernicus ERA5) | JSON / CSV (REST API) / GeoTIFF | No (No API key required for non-commercial use) | **5/5** (Query exact Malaybalay coordinates: `lat=8.1575, lng=125.1278`) | Real-time and historical context feature: if a citizen submits a one-tap "Flood" SOS when cumulative 24-hour rainfall is `0.0 mm` and soil moisture is low, the legitimacy model flags a likely false alarm. |

---

## 1. Label-Mapping Plan & Deriving Severity

To unify these heterogeneous datasets into SALBA's three prediction targets (`TYPE`, `SEVERITY`, `LEGITIMACY`), apply a deterministic schema mapping script prior to training.

### Target 1: Incident TYPE Mapping
Standardize onto your 8 target classes: `Fire`, `Flood`, `Earthquake`, `Landslide`, `Typhoon`, `Medical`, `Vehicular_Accident`, `Other`.

| SALBA `TYPE` | Source Dataset Labels / Keywords to Map |
| :--- | :--- |
| **`Fire`** | **Appen:** `fire=1` \| **CrisisLex/HumAID/CrisisBench:** Event names containing `wildfire`, `fire`, or tweets matching fire keywords (`sunog`, `nasusunog`, `fire truck`, `blaze`, `BFP`) \| **DataSF:** `Structure Fire`, `Outside Fire` \| **DesInventar:** `Fire`. |
| **`Flood`** | **Appen:** `floods=1` \| **CrisisLex/HumAID/CrisisBench:** Events with `flood` (`2013_Queensland_floods`, `2014_India_floods`, etc.) + Yolanda/Odette tweets mentioning `baha`, `tubig`, `overflow`, `stranded on roof`, `flashflood` \| **DesInventar:** `Flood`, `Flash flood`. |
| **`Earthquake`** | **Appen:** `earthquake=1` \| **CrisisLex/HumAID:** `2013_Bohol_earthquake`, `2015_Nepal_earthquake`, `2017_Mexico_earthquake`, etc. (`lindol`, `linog`, `aftershock`, `collapsed`) \| **DesInventar:** `Earthquake`. |
| **`Landslide`** | **Kaggle Disaster Tweets:** `keyword IN ('landslide', 'mudslide', 'avalanche')` and `target=1` \| **CrisisBench/HumAID:** Texts containing `landslide`, `mudslide`, `guho`, `nidahili ang yuta`, `rockfall`, `blocked highway` \| **DesInventar:** `Landslide`. |
| **`Typhoon`** | **Appen:** `storm=1` \| **CrisisLex/HumAID:** `2013_Typhoon_Yolanda`, `2014_Typhoon_Hagupit`, `Hurricane_*`, `Cyclone_*` (`bagyo`, `strong winds`, `storm surge`, `signal no`, `atop`, `bubong`). |
| **`Medical`** | **Appen:** `medical_help=1` or `medical_products=1` \| **Filipino Dengue Corpus:** `health=1` or `sick=1` \| **DataSF:** `Medical Incident`. |
| **`Vehicular_Accident`** | **CrisisMMD:** `Vehicle damage` (when paired with crash/collision keywords) \| **Kaggle:** `keyword IN ('crash', 'collision', 'wreckage', 'accident')` and `target=1` \| **DataSF:** `Traffic Collision`. |
| **`Other`** | **Appen/HumAID:** `other_relevant_information`, `missing_or_found_people`, `security`, `electricity`/`utility_damage` without a primary hazard trigger. |

### Target 2: LEGITIMACY Mapping (`legitimate` vs. `false_alarm`)
Because public social media datasets label "informativeness" rather than "prank calls," combine social media noise classes with dispatch false-alarm logs:
* **`legitimate` (1):**
  * **CrisisBench / CrisisLex / CrisisMMD:** `informative` / `Related and informative`.
  * **Appen:** `related = 1` AND `direct_report = 1`.
  * **Kaggle Disaster Tweets:** `target = 1`.
  * **DataSF Dispatch:** `Final Disposition` in `('Fire', 'Code 2 Transport', 'Code 3 Transport', 'Condition Corrected')`.
* **`false_alarm` (0):**
  * **Kaggle Disaster Tweets:** `target = 0` (teaches the NLP model to reject metaphorical or non-emergency uses of crisis words like *"I'm dying of laughter"* or *"This party is on fire"*).
  * **CrisisBench / CrisisLex:** `not_informative`, `Not related`, or `Off-topic`.
  * **Appen:** `related = 0`.
  * **DataSF Dispatch:** `Final Disposition` in `('False Alarm', 'No Merit', 'Unfounded', 'Cancelled')` (teaches the tabular/contextual model spatio-temporal patterns of false alarms).
  * **One-Tap SOS Contextual Negatives:** Pair synthetic/historical false one-tap reports with zero-hazard environmental states (e.g., `Flood` SOS where `rain_24h_mm == 0` and `dist_to_river_m > 1000` and `MGB_flood_susceptibility == 'Low'`).

### Target 3: Deriving 4-Tier SEVERITY (`low`, `moderate`, `high`, `critical`)
Most NLP datasets do not use a 4-tier severity label out of the box (except **TREC-IS**, which directly provides `Low`, `Medium`, `High`, `Critical`). Use a three-pronged derivation rule across text and structured datasets:

1. **Direct Mapping (TREC-IS & CrisisMMD):**
   * **TREC-IS:** `Low` $\rightarrow$ `low`; `Medium` $\rightarrow$ `moderate`; `High` $\rightarrow$ `high`; `Critical` $\rightarrow$ `critical`.
   * **CrisisMMD (Damage Severity task):** `Little or no damage` $\rightarrow$ `low`; `Mild damage` $\rightarrow$ `moderate`; `Severe damage` $\rightarrow$ `high` (upgrade to `critical` if humanitarian class is `Injured or dead people` or text contains life-threat keywords).
2. **Rule-Augmented Humanitarian Class Mapping (HumAID / CrisisBench / Appen):**
   When a dataset only provides humanitarian categories or binary urgency (`request=1`), combine the **Category Prior** with a **Lexical Escalation Trigger**:
   * **Base `critical`:** Category is `injured_or_dead_people`, `search_and_rescue`, or (`requests_or_urgent_needs` + life-threat keywords: *trapped, drowning, unconscious, bleeding, heart attack, baby/elderly stuck, neck-deep, kalayo dako na, tabang mamatay*).
   * **Base `high`:** Category is `displaced_people_and_evacuations`, `infrastructure_and_utility_damage`, or `requests_or_urgent_needs` without immediate life-threat keywords (e.g., *waist-deep water, road blocked by landslide, need evacuation*).
   * **Base `moderate`:** Category is `caution_and_advice`, `other_relevant_information` with localized hazard observation (e.g., *ankle-deep water, minor shaking felt, power outage, tree fell on street*).
   * **Base `low`:** Category is `sympathy_and_support`, `donation_and_volunteering`, general weather updates, or non-urgent inquiries.
3. **Structured Incident Quantile Mapping (HDX / NDRRMC / DesInventar / EM-DAT):**
   For non-text incident records used to train tabular severity models or calibrate priors:
   * **`critical`:** $\ge 1$ fatality, $\ge 3$ critically injured/missing, OR $\ge 50$ houses totally destroyed.
   * **`high`:** $1\text{–}2$ injured, $5\text{–}49$ houses damaged, OR $\ge 20$ families evacuated/displaced.
   * **`moderate`:** $0$ casualties, $1\text{–}4$ houses partially damaged, OR $1\text{–}19$ families affected / passable road obstruction.
   * **`low`:** $0$ casualties, $0$ structural damage, minor localized nuisance/monitoring report.

---

## 2. Top 5 Datasets to Download First (Priority Queue)

Do not download all 17 at once. Start with these 5 to build your end-to-end multi-modal (Text + Geo/Weather) training pipeline within 48 hours:

1. **Philippines Subnational Administrative Boundaries (HDX COD-AB) + Geofabrik OSM Philippines (`#15` & `#16`):**
   * *Why first:* Every SOS report in SALBA has a `(lat, lng)` coordinate, even when text is empty (one-tap SOS). Clipping these two files to Malaybalay City's 46 barangays lets you immediately engineer spatial features (`barangay_id`, `dist_to_sawaga_river`, `dist_to_sayre_highway`, `elevation/slope`) that work for **100% of reports**.
2. **QCRI CrisisBench (`#1`) on Hugging Face:**
   * *Why second:* Single cleanest download (`datasets.load_dataset("QCRI/CrisisBench-all-lang")`) giving you >140,000 human-annotated crisis texts with both `informativeness` (for Legitimacy) and `humanitarian` categories (for Type and Severity), including Philippine typhoon events, with full text already hydrated.
3. **CrisisLexT26 (`#3`) on GitHub:**
   * *Why third:* Contains the full-text CSVs for the **2013 Bohol Earthquake** and **2013 Typhoon Yolanda**, giving you authentic Philippine crisis tweets (English, Tagalog, and Bisaya place names/terms) with human informativeness and category labels.
4. **Appen Multilingual Disaster Response Messages (`#5`) on Hugging Face:**
   * *Why fourth:* Unlike Twitter datasets filled with news headlines, this dataset contains real **direct emergency SMS messages** (`direct_report=1`) labeled across 36 fine-grained tags (`fire`, `floods`, `earthquake`, `medical_help`, `search_and_rescue`, `request`). It closely mirrors citizen SOS notes.
5. **Open-Meteo Historical Weather API (`#17`) + UPRI NOAH / HDX Hazard Summaries (`#14`):**
   * *Why fifth:* Gives your Random Forest / XGBoost models the physical ground truth needed to catch false alarms and estimate flood/landslide severity in Bukidnon based on real-time/historical rainfall (`rain_1h`, `rain_24h`, `soil_moisture`) and static MGB hazard susceptibility.

---

## 3. Creating a Real Local Labeled Set (300–1,000 Rows) with Malaybalay CDRRMO

Even if 95% of your training data comes from global/national public corpora, having **300 to 1,000 real local records from Malaybalay CDRRMO** to use as a **domain-adaptation fine-tuning set and your held-out Capstone Test Set** will elevate your thesis defense from a standard ML exercise to a deployable LGU system.

### Step-by-Step Extraction & Digitization Workflow
1. **Source Documents at Malaybalay CDRRMO (Barangay 9 / City Hall Complex):**
   Request access (via a formal letter noted by your research adviser and Dean) to anonymized historical logs from 2022–2026:
   * **Radio / Walkie-Talkie & Hotline Dispatch Logbooks:** Handwritten or Excel logs recording incoming citizen calls via the CDRRMO emergency hotlines (date/time, caller barangay/sitio, brief narrative of incident, responding unit dispatched, and on-scene verification outcome).
   * **Post-Incident Situational Reports (SitReps):** Summaries of Bukidnon floods (e.g., Sawaga River or Kalasungay/Impalambong overflow), landslides along Sayre Highway (e.g., Dalwangan, Patpat, or Kalasungay sections), grass/structural fires, and vehicular accidents.
   * **False Alarm / Unfounded Entries:** Explicitly ask radio operators for logged prank calls, misdials, test pings, and unverified reports where responders arrived and found no incident.
2. **Reconstruction into SALBA Schema:**
   Digitize 500–1,000 rows into a spreadsheet with columns: `timestamp`, `barangay`, `sitio_landmark`, `approx_lat`, `approx_lng`, `raw_narrative_text` (transcribe exact wording used in logbook or SMS/Messenger reports, preserving Bisaya/Taglish terms like *"baha diri sa Purok 4"* or *"naay nadisgrasya nga motor"*), `incident_type`, `severity`, `legitimacy`.

### Concrete Annotation Rubric for `SEVERITY`
Have **two independent annotators** (e.g., two capstone team members or one member + a CDRRMO responder) independently label each local record using this strict rubric:

| Severity Level | Operational Definition (Dispatch Priority) | Concrete Physical & Situational Criteria (Match ANY criterion in row) |
| :--- | :--- | :--- |
| **`critical`** | **Immediate Life-Saving Dispatch (Priority 1)** | • **Casualties/Trapped:** $\ge 1$ person unconscious, severely bleeding, not breathing, missing in water/debris, or trapped inside a burning/collapsed structure or vehicle.<br>• **Flood:** Water depth chest-deep or higher ($>1.2\text{ m}$), rapid flash-flood current sweeping structures, or citizens stranded on rooftops.<br>• **Fire:** Active structural fire in a residential/commercial zone with high spread rate or adjacent houses catching fire.<br>• **Landslide/Quake:** Complete blockage of primary highway (e.g., Sayre Highway) with vehicles buried/hit, or major building collapse. |
| **`high`** | **Urgent Rescue / Containment Dispatch (Priority 2)** | • **Casualties:** $1\text{–}2$ conscious injured persons requiring ambulance transport (fractures, lacerations, smoke inhalation) but vital signs stable.<br>• **Flood:** Knee-to-waist-deep water ($0.5\text{–}1.2\text{ m}$) entering homes; preventive evacuation of vulnerable residents (elderly, infants, PWDs) required.<br>• **Fire:** Contained single-structure fire (no trapped occupants), electrical post transformer explosion, or rapidly spreading grass/agricultural fire near residences.<br>• **Landslide:** Partial road blockage on major thoroughfare or soil collapse threatening a nearby house foundation. |
| **`moderate`** | **Standard Field Assessment / Assistance (Priority 3)** | • **Casualties:** Minor scrapes/bruises only; no immediate ambulance transport required.<br>• **Flood:** Ankle-to-shin-deep street flooding ($<0.5\text{ m}$), overflowing drainage canal, no water inside living spaces.<br>• **Fire:** Small rubbish/brush fire away from structures, smoke sighting without visible flames.<br>• **Landslide/Typhoon:** Fallen tree or utility pole blocking a barangay road, minor rockfall, or damaged roof sheets (*yero*) with occupants safe. |
| **`low`** | **Monitoring / Non-Urgent Log (Priority 4)** | • **All Types:** Early warning observation only (e.g., *"kusog ang ulan ug taas na ang tubig sa suba"* / river level rising but within banks, mild earthquake tremor felt with zero damage, request for general advisory/information, or post-event cleanup request). |

### Measuring Inter-Annotator Agreement (Cohen's Kappa)
To prove dataset rigor to your panel:
1. Have Annotator A and Annotator B label the same 300+ rows independently without seeing each other's labels.
2. Compute **Unweighted Cohen's Kappa ($\kappa$)** for `TYPE` and `LEGITIMACY`, and **Quadratic Weighted Cohen's Kappa ($\kappa_w$)** for `SEVERITY` (since Severity is ordinal: confusing `critical` with `low` is much worse than confusing `critical` with `high`):
   $$\kappa = \frac{p_o - p_e}{1 - p_e}$$
   ```python
   from sklearn.metrics import cohen_kappa_score

   kappa_type = cohen_kappa_score(ann_a_type, ann_b_type)
   kappa_sev_weighted = cohen_kappa_score(ann_a_sev, ann_b_sev, weights='quadratic')
   ```
3. Target $\kappa \ge 0.75$ (substantial to almost perfect agreement). For any rows where Annotator A and B disagree, hold a reconciliation session with a third adjudicator (or CDRRMO officer) to assign the final gold label.

---

## 4. Multilingual NLP (Cebuano/Tagalog/Binukid) & Leakage-Free Pipeline Design

### Handling Code-Switched Bislish/Taglish & Binukid in Classical ML vs. Transformers
Citizens in Malaybalay write short, noisy strings with dropped vowels and mixed morphology (e.g., *"Tabang! Dako kaayo ang baha diri sa brgy poblacion, kutob na sa hawak ang tubig pls rescue"* or *"Sunog sa merkado dapit!"*).

1. **Feature Engineering for Random Forest / XGBoost / Gradient Boosting:**
   * **Combine Word + Character N-Gram TF-IDF:** Word-level TF-IDF fails on misspelled mobile text (*"bha"*, *"tbaang"*, *"lndslide"*) and agglutinative Cebuano/Tagalog prefixes (*"nagbaha"*, *"binabaha"*, *"mibaha"*). Use `FeatureUnion` combining:
     * Word n-grams `(1, 2)` with `min_df=3`.
     * **Character n-grams (`analyzer='char_wb'`, `ngram_range=(3, 5)`)**: This captures root morphemes (`baha`, `sunog`, `linog`, `tabang`, `tulong`, `dugo`, `trap`) regardless of prefixes, suffixes, or typos.
   * **Curated Local Crisis Lexicon Gazetteer (Dense Numeric Features):** Create a lightweight dictionary of ~150 high-signal Bukidnon/Cebuano/Tagalog/Binukid crisis roots grouped by hazard and urgency:
     * *Cebuano/Bisaya:* `sunog`, `kalayo`, `aso` (smoke), `baha`, `lunop` (flood), `linog` (quake), `dahili` / `nidahili` (landslide), `bagyo`, `hangin`, `bangga` / `disgrasya` (accident), `tabang` (help), `luwasa` (rescue), `natanggong` / `na-trap` (trapped), `samaran` (injured), `patay` (dead).
     * *Tagalog:* `sunog`, `baha`, `lindol`, `guho`, `bagyo`, `aksidente`, `tulong`, `saklolo`, `sugatan`.
     * *Binukid (Indigenous Bukidnon terms where applicable):* `wahig` (water/river flood context), `hapuy` (fire), `linug` (earthquake), `tabang`.
     * Pass binary/count indicators of these lexicon hits directly into XGBoost alongside TF-IDF SVD components and geospatial features.
   * **Handling One-Tap SOS (Empty Text):** Add an explicit boolean feature `has_text` (`0` or `1`) and `text_length_chars`. When `has_text == 0`, tree models naturally route splits through GPS hazard susceptibility (`MGB_flood_level`, `MGB_landslide_level`), proximity (`dist_to_river`, `dist_to_highway`), current weather (`rain_1h_mm`, `wind_gusts`), and temporal cluster density (`sos_pings_within_500m_last_15min`).

2. **Controlled Translation & Code-Switch Augmentation (Train Split Only!):**
   * Take a stratified sample (e.g., 5,000 rows) of short, direct-report English texts from **Appen** and **CrisisBench** *after* splitting into train/test (only augment the training split).
   * Translate them into **Cebuano**, **Tagalog**, and **natural code-switched Bislish/Taglish** using NLLB-200 (`facebook/nllb-200-distilled-600M`, which supports `ceb_Latn` and `tgl_Latn`) or batch LLM prompting, explicitly instructing the translator to preserve conversational SMS brevity.
   * For your transformer comparison, fine-tune **`intfloat/multilingual-e5-small`** or **`xlm-roberta-base`** (or extract their 384/768-dim sentence embeddings to feed directly into XGBoost).

### Preventing Data Leakage When Combining Datasets
Public crisis datasets (especially CrisisLex, CrisisNLP, HumAID, and CrisisBench) share overlapping tweets from the same global disasters, and retweets create near-identical strings. If a tweet appears in your training set and its retweet appears in your test set, your accuracy will be artificially inflated.

1. **Normalize Before Deduplication:**
   Strip URLs (`http\S+`), `@mentions`, `RT` prefixes, punctuation, and lowercase all text.
2. **MinHash / Cosine Near-Deduplication:**
   Remove exact normalized duplicates AND near-duplicates (Jaccard similarity $> 0.85$ on 4-gram shingles, or TF-IDF cosine similarity $> 0.90$). Keep only one canonical instance per near-duplicate cluster.
3. **GroupKFold by Disaster Event / Incident ID:**
   Never use a naive random `train_test_split` across combined crisis datasets. Group records by `event_name` (or by 6-hour spatio-temporal windows for local logs) using `StratifiedGroupKFold` so that event-specific proper nouns (e.g., *"Tacloban"*, *"Bohol"*, *"Nepal"*) cannot leak event identity into the test set.
4. **Strict Local Holdout:**
   Keep a dedicated test split of **real Malaybalay/Philippine rows** that is never touched during hyperparameter tuning or translation augmentation. Report both Cross-Validation scores on the combined corpus and Zero/Few-Shot evaluation on the Malaybalay holdout set.

---

## 5. Ethical & Legal Compliance (Philippine Data Privacy Act of 2012 / RA 10173)

Because SALBA processes emergency reports involving human casualties, personal phone numbers, and exact home GPS coordinates in Malaybalay City, your methodology chapter and system architecture must demonstrate compliance with **Republic Act No. 10173 (Data Privacy Act of 2012)** and its Implementing Rules and Regulations (IRR):

1. **Distinction Between Personal Information (PI) and Sensitive Personal Information (SPI):**
   * Under **Section 3(g) and 3(l) of RA 10173**, a citizen's full name, phone number, device MAC/IMEI, and exact home GPS coordinates constitute **Personal Information**, while information about an individual's **health, medical condition, or injuries** in an emergency report constitutes **Sensitive Personal Information (SPI)**.
2. **Lawful Criteria for Processing in Live Operations vs. Academic Research:**
   * **Live CDRRMO Deployment:** Processing is lawful under **Section 12(e)** (necessary to respond to national/local emergency or to comply with the functions of public authority) and **Section 13(e)** (necessary for medical treatment or protection of life and health of the data subject).
   * **Academic ML Training (Your Capstone):** Under **Section 4(d)** and NPC Advisory Guidelines on Research, personal data processed for scientific or statistical research is permissible **provided that the data is anonymized prior to ML ingestion** and is not used to make automated decisions against an individual without human-in-the-loop oversight.
3. **Mandatory Anonymization & PII Scrubbing Pipeline (Before Model Training):**
   Before saving any CDRRMO logbook or social media text into your training CSVs or GitHub repository:
   * **Regex & NER Scrubbing:** Replace all Philippine mobile numbers (`(\+63|0)9\d{9}` $\rightarrow$ `<PHONE>`), full person names ($\rightarrow$ `<PERSON>`), and exact house/lot numbers with generic placeholders. Keep barangay, purok, and public landmark names (`Barangay Casisang`, `Sawaga Bridge`) as they are vital geospatial context, not PII.
   * **Coordinate Fuzzing for Public Repo:** Never push raw residential `(lat, lng)` coordinates of victims to a public GitHub repo. Round or jitter training coordinates by $\pm 50\text{–}100\text{ meters}$ or aggregate to Purok/Barangay centroids in public artifacts.
4. **LGU Data Sharing & Non-Disclosure:**
   Have your capstone group sign a simple **Data Undertaking / Non-Disclosure Agreement (NDA)** with Malaybalay CDRRMO stating that raw historical logbooks will be stored in an encrypted local folder, accessed only by the researchers, and deleted or returned upon completion of the capstone defense.
5. **Human-in-the-Loop Safeguard (Avoiding Automated Harm):**
   Explicitly state in your thesis that SALBA's `LEGITIMACY` (`false_alarm`) classifier **never automatically deletes or blocks an incoming SOS call**. Instead, it flags suspected false alarms in a lower-priority queue on the CDRRMO dispatcher dashboard while still displaying the ping for human verification, eliminating the catastrophic risk of a false negative during a real life-threatening emergency.