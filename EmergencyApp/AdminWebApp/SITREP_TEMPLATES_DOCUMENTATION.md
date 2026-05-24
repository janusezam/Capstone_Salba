# SITREP Templates - CDRRMO Format

## Overview
Situation Reports (SITREPs) are official disaster impact assessment documents used by the City Disaster Risk Reduction and Management Office (CDRRMO) to document and communicate the status of disaster response operations.

---

## Template 1: Flooding/Landslide SITREP (Comprehensive Format)

### Header Section
- **Report ID**: Unique identifier
- **SITREP Number**: Sequential numbering (1, 2, 3...)
- **Date/Time**: When report was prepared
- **Incident Type**: Flooding, Landslide, Typhoon, Earthquake, Fire, Other
- **Prepared By**: Admin name and signature
- **Approved By**: CDRRMO Coordinator official signature

### 1. SITUATION OVERVIEW
Brief narrative describing:
- Current weather conditions
- Disaster development status
- Areas affected
- Ongoing threats

**Example**:
> "Continuous moderate to heavy rainfall since 2:00 AM today has caused flooding in low-lying areas. Landslide risks detected in upland barangays. Currently experiencing Level 3 alert status in 5 barangays."

### 2. AFFECTED POPULATION
Organized by barangay:

| Barangay | Families | Persons | Status |
|----------|----------|---------|--------|
| Tingla | 145 | 625 | Evacuated |
| Salong | 89 | 412 | Partially Evacuated |
| Managok | 234 | 1,120 | Monitored |
| Kimalon | 67 | 298 | Advisory |

**Totals**:
- Total Affected Families: 535
- Total Affected Persons: 2,455

### 3. IDP CENTERS
Internal Displacement Person centers:

| Location | Barangay | Families | Individuals | Status |
|----------|----------|----------|-------------|--------|
| Tingla MS | Tingla | 145 | 625 | Open |
| Salong Covered Court | Salong | 89 | 412 | Open |
| Kimalon Gymnasium | Kimalon | 0 | 0 | On-Standby |

### 4. CASUALTIES
- **Dead**: 0
- **Injured**: 3
- **Missing**: 0

### 5. DAMAGE ASSESSMENT

#### Property Damage
- **Houses Destroyed**: 12
- **Houses Partially Damaged**: 67
- **Agricultural Areas** (hectares):
  - Crops Damaged: 45 hectares
  - Livestock Lost: 234 head of cattle
- **Infrastructure Damage**:
  - Road segments impassable: 3
  - Bridges damaged: 1
  - Water/Electric lines affected: Multiple areas
  - School facilities: 2 schools used as evacuation centers

### 6. LIFELINES STATUS

| Infrastructure | Status | Description |
|----------------|--------|-------------|
| **Roads** | Partially Passable | Salawagan road impassable; bypass routes operational |
| **Electricity** | Partially Functional | Power outage in Tingla and Salong; restoration ongoing |
| **Water Supply** | Limited | Water pumping station operational at 60% capacity |
| **Communication** | Functional | All cell towers operational; internet normal |

### 7. ADMINISTRATIVE ACTIONS
- [ ] Suspension of Classes
  - Remarks: _________________
- [ ] Suspension of Work
  - Remarks: _________________
- [ ] Declaration of Calamity
  - Remarks: _________________

### 8. ACTIONS TAKEN
1. Evacuated 1,145 persons from high-risk areas (02:30 AM)
2. Activated 3 IDP centers with food and water supplies (03:15 AM)
3. Deployed Search & Rescue teams to Kimalon (04:00 AM)
4. Coordinated with Health Office for medical assistance (04:30 AM)
5. Issued flood advisories via SMS to all residents (Ongoing)

### 9. RELIEF ASSISTANCE DISTRIBUTED
- **Food Packs Distributed**: 450 packs
- **Water Jugs Distributed**: 280 jugs
- **Blankets Distributed**: 350 pieces
- **Medicines Provided**: Analgesics, antibiotics, anti-diarrheal supplies
- **Other Items**: 45 cots, 30 tarps, hygiene kits

---

## Template 2: Lifelines Status Detail Report

### Purpose
Focused assessment of critical infrastructure status for comprehensive incident management and recovery planning.

### Infrastructure Categories

#### 1. ROADS & TRANSPORTATION
- **Status Options**: Passable | Partially Passable | Impassable | No Report
- **Description**: Specific details about damage, detours, repair timeline

**Example**:
```
Status: Partially Passable
Description: Salawagan road is impassable due to landslide materials. 
Bypass via Managok road is operational but congested. Alternative route 
through Kimalon takes additional 30 minutes. Repair expected: 2-3 days
```

#### 2. ELECTRICITY SUPPLY
- **Status Options**: Functional | Partially Functional | Non-Functional | No Report
- **Description**: Outage locations, affected facilities, restoration progress

**Example**:
```
Status: Partially Functional
Description: Main distribution line down in Tingla and Salong barangays. 
Alternative power for hospitals and clinics secured via generators. 
Manual repairs started at 05:00 AM. Estimated restoration: 18:00 today
```

#### 3. WATER SUPPLY
- **Status Options**: Available | Limited | Unavailable | No Report
- **Description**: Supply locations, capacity levels, affected areas

**Example**:
```
Status: Limited
Description: Central pumping station operational at 60% due to power limitations. 
Water distribution points: 8 locations. Coordination with MWSS for emergency supply. 
Water trucking deployed to isolated barangays. Expected normalization: 2 days
```

#### 4. COMMUNICATION SYSTEMS
- **Status Options**: Functional | Limited | Non-Functional | No Report
- **Description**: Coverage, equipment status, backup systems activated

**Example**:
```
Status: Functional
Description: All cell tower sites operational. Internet services normal. 
Satellite phone communication available at EOC for emergency coordination. 
Radio communication network activated for inter-agency coordination
```

---

## How to Use These Templates

### In the SITREP Form:

**Template 1 fields fill:**
- Affected Population (by barangay)
- Casualties (dead, injured, missing)
- Damage Assessment (houses, crops, livestock)
- Administrative Actions (checkboxes)
- Relief Assistance (items distributed)

**Template 2 details fill in:**
- Each lifeline has a **Status** dropdown and **Description** textarea
- Provides detailed assessment without cluttering main form

---

## Form Submission Workflow

1. **Prepare**: Admin fills initial SITREP with Template 1 data
2. **Detail**: Adds detailed lifelines status from Template 2
3. **Save as Draft**: Form auto-saved for later editing
4. **Submit**: Final submission requires all critical fields
5. **Approve**: CDRRMO Coordinator reviews and approves
6. **Export**: System generates Word document for official records

---

## Field Validation Requirements

### Required Fields:
- Affected population (at least 1 barangay)
- Casualties data (even if zeros)
- At least 1 lifeline status provided
- SITREP prepared by (auto-captures logged-in admin)

### Optional but Recommended:
- Detailed situation overview
- IDP center information
- Specific damage assessment descriptions
- Relief assistance details

---

## Export & Sharing

Once SITREP is submitted:
- Click **"Export Word"** to generate .docx file
- Click **"Print"** for direct printing with official letterhead
- File naming: `SITREP_{ReportID}_{Date}.docx`
- Share with municipal/provincial CDRRMO for approval

---

## Recent Implementation (April 9, 2026)

### Backend
- **Model**: `backend/models/SITREP.js` - Full schema with all fields
- **Routes**: `backend/routes/sitrepRoutes.js` - CRUD operations
- **Endpoints**:
  - `POST /api/sitrep` - Create/update SITREP
  - `GET /api/sitrep/:reportId` - Fetch SITREP
  - `POST /api/sitrep/:reportId/submit` - Submit for approval

### Frontend
- **Components**: 
  - `frontend/src/components/SitrepForm.js` - 8-tab form component
  - `frontend/src/pages/SitrepPage.js` - Full-page dedicated editor
- **Features**:
  - Auto-save drafts
  - Real-time validation
  - Export to Word
  - Print-friendly
  - Admin signature tracking

### Integration
- Accessed from Ongoing Rescue details
- Button: "📄 Open SITREP Form" → Opens `/sitrep/{reportId}`
- Seamless editing with auto-save
- Professional export capabilities

