# SALBA SYSTEM: PARTICIPANT BETA TESTING PACKAGE
**Comprehensive Guided Testing Activity, Test Execution Forms, and Post-Test Questionnaire**

---

> [!IMPORTANT]  
> **SAFETY NOTICE & SIMULATION WARNING**  
> This beta testing package is for **simulated testing of the SALBA (CDRRMO Emergency Rescue System)** only.  
> **DO NOT** submit actual emergency requests or report real-life life-threatening events during this beta test session. All test data, addresses, and scenarios provided in this document are controlled test data created exclusively for system evaluation.

---

## TABLE OF CONTENTS
1. [Overview & Core Mission](#1-overview--core-mission)
2. [Your Beta Test Flow](#2-your-beta-test-flow)
3. [Test Result Definitions (Pass / Fail / Blocked / N/A)](#3-test-result-definitions)
4. [Role-Specific Missions & Simulated Scenarios](#4-role-specific-missions--simulated-scenarios)
   - [Scenario A: Citizen Emergency SOS & Report Tracking](#scenario-a-citizen-emergency-sos--report-tracking)
   - [Scenario B: CDRRMO Admin Incident Verification, AI Review & Dispatch](#scenario-b-cdrrmo-admin-incident-verification-ai-review--dispatch)
   - [Scenario C: Emergency Rescuer Dispatch & Incident Resolution](#scenario-c-emergency-rescuer-dispatch--incident-resolution)
   - [Scenario D: Multi-Role End-to-End Emergency Handoff](#scenario-d-multi-role-end-to-end-emergency-handoff)
5. [Step-by-Step Test Execution Forms](#5-step-by-step-test-execution-forms)
   - [Execution Form A: Citizen Role (DisasterSOS App)](#execution-form-a-citizen-role-disastersos-app)
   - [Execution Form B: CDRRMO Administrator Role (Admin Web Dashboard)](#execution-form-b-cdrrmo-administrator-role-admin-web-dashboard)
   - [Execution Form C: Rescuer Role (RescuerApp)](#execution-form-c-rescuer-role-rescuerapp)
   - [Execution Form D: Multi-Role End-to-End Handoff Workflow](#execution-form-d-multi-role-end-to-end-handoff-workflow)
6. [Tester Observation & Issue Log](#6-tester-observation--issue-log)
7. [Beta Test Completion Checklist](#7-beta-test-completion-checklist)
8. [Post-Test Beta Testing Questionnaire](#8-post-test-beta-testing-questionnaire)
9. [Appendix: System Quality & UAT Evaluation Instrument](#9-appendix-system-quality--uat-evaluation-instrument)

---

## 1. OVERVIEW & CORE MISSION

Welcome to the **SALBA (System for Emergency Alert, Dispatch, and Response)** Beta Testing Program.

### Core Mission
Your overall mission as a participant is to perform a simulated emergency response workflow using SALBA, verifying that emergency alerts, AI classification, dispatching, real-time tracking, status updates, photo proof, and administrative SITREP reports function seamlessly across all roles.

### Implemented System Roles:
1. **Citizen / Resident (DisasterSOS Mobile App)**: Submits simulated emergency reports (Flood, Fire, Landslide, Typhoon, Medical), attaches photos, and tracks real-time response status.
2. **CDRRMO Administrator (EmergencyApp Admin Web Dashboard)**: Receives real-time incident alerts, reviews AI-generated severity assessments, inspects GIS map locations, dispatches available emergency rescuers, and generates Situation Reports (SITREP).
3. **Emergency Responder (RescuerApp Mobile App)**: Receives dispatch assignments, navigates to scene location, updates status (*En Route*, *Arrived / On Scene*), captures resolution photo evidence, and marks incident as *Resolved*.

---

## 2. YOUR BETA TEST FLOW

Follow this step-by-step flow from the beginning to the end of your testing session:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Receive Your Assigned System Role & Login Credentials │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Read Your Assigned Simulated Emergency Scenario      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Review the Controlled Test Data Provided in Table    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Follow the Step-by-Step Test Execution Table         │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Check [ Pass ] or [ Fail ] After Each Step           │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Record Any Unexpected Behavior in the Observation Log│
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Verify Completion Checklist Criteria                 │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Complete the Post-Test Beta Questionnaire           │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Submit Completed Form to the Test Coordinator        │
└─────────────────────────────────────────────────────────┘
```

---

## 3. TEST RESULT DEFINITIONS

When executing each test step, record your results using the following criteria:

*   **PASS (`[✓] Pass`)**: You performed the action and the expected system outcome appeared correctly on screen.
*   **FAIL (`[✓] Fail`)**: You performed the action, but the system output differed from expected results or caused an onscreen error.
*   **BLOCKED (`[✓] Blocked`)**: You could not attempt or finish the step due to a preceding failure or network outage.
*   **N/A (`[✓] N/A`)**: The step does not apply to your assigned role or testing configuration.

---

## 4. ROLE-SPECIFIC MISSIONS & SIMULATED SCENARIOS

### Scenario A: Citizen Emergency SOS & Report Tracking
* **Role**: Citizen / Resident
* **App**: DisasterSOS (Mobile App)
* **Mission**: Submit a simulated emergency alert using the controlled test data provided below, observe status confirmation, and track real-time response progress.
* **Starting Condition**: App installed on test device, logged in with Citizen test account.

**Controlled Test Data for Scenario A:**
| Field Name | Provided Test Value |
| :--- | :--- |
| **Emergency Type** | Flood Emergency |
| **Location / Barangay** | Barangay Alapang, La Trinidad (Pin location on map) |
| **Incident Description** | Severe flash flood water rising up to waist height near Creek side. 3 family members stranded. |
| **Number Affected** | 3 persons |
| **Photo Attachment** | Sample flood image (provided in test device gallery) |
| **Date / Time** | Current test timestamp |

---

### Scenario B: CDRRMO Admin Incident Verification, AI Review & Dispatch
* **Role**: CDRRMO Administrator / Operator
* **App**: SALBA Web Admin Dashboard (Browser)
* **Mission**: Receive the incoming simulated incident alert, review the AI severity recommendation badge, verify incident placement on GIS map, dispatch an available responder unit, monitor live tracking, and generate a Situation Report (SITREP).
* **Starting Condition**: Logged into Admin Web Dashboard on test computer.

**Controlled Test Data for Scenario B:**
| Field Name | Provided Test Value |
| :--- | :--- |
| **Target Incident** | Incoming "Flood Emergency" at Barangay Alapang |
| **AI Assessment Verification** | Severity Score: Critical / High; Category: Flood |
| **Assigned Rescuer Unit** | Rescuer Team 1 (Alpha Unit) |
| **Administrative Note** | "Dispatched Alpha Unit with inflatable boat and medical kit." |
| **SITREP Output** | Generate & Download official CDRRMO Situation PDF Report |

---

### Scenario C: Emergency Rescuer Dispatch & Incident Resolution
* **Role**: Emergency Responder / Rescue Team
* **App**: RescuerApp (Mobile App)
* **Mission**: Receive real-time notification of assigned emergency, acknowledge dispatch, update status to *En Route* and *Arrived (On Scene)*, capture resolution photo evidence, and submit incident resolution.
* **Starting Condition**: App installed on test device, logged in with Rescuer account (Rescuer Team 1).

**Controlled Test Data for Scenario C:**
| Field Name | Provided Test Value |
| :--- | :--- |
| **Assigned Dispatch Alert** | Flood Emergency - Barangay Alapang |
| **Status Actions** | Acknowledge -> Set to *En Route* -> Set to *Arrived / On Scene* |
| **Resolution Action** | Take photo proof using Resolution Camera Screen |
| **Resolution Summary** | "Rescued 3 stranded individuals. Evacuated safely to Alapang Covered Court." |

---

### Scenario D: Multi-Role End-to-End Emergency Handoff
* **Roles Involved**: Citizen ➔ CDRRMO Administrator ➔ Emergency Responder ➔ CDRRMO Administrator
* **Mission**: Perform a complete, seamless multi-user emergency response handoff cycle across all three apps simultaneously.

**Handoff Sequence Table:**
```
STAGE 1 (Citizen): Submits Emergency Report via DisasterSOS App
       ↓ (Real-Time Socket/Push Alert)
STAGE 2 (Admin): Receives alert, verifies AI score, dispatches Rescuer Team via Admin Web Dashboard
       ↓ (Real-Time Push Notification)
STAGE 3 (Responder): Accepts dispatch in RescuerApp, updates to En Route & On Scene, captures photo proof, marks Resolved
       ↓ (Real-Time Socket Event)
STAGE 4 (Admin): Receives resolution update in Admin Web Dashboard, reviews photo evidence, generates official SITREP
```

---

## 5. STEP-BY-STEP TEST EXECUTION FORMS

### Execution Form A: Citizen Role (DisasterSOS App)

**Tester Name**: __________________________  
**Device Model**: _________________________  
**Date & Time**: __________________________  

| Step # | Action (What You Need to Do) | Expected Result (What You Should See) | Result | Notes / Observed Behavior |
| :---: | :--- | :--- | :---: | :--- |
| **A1** | Launch **DisasterSOS** mobile application on test device. | App opens cleanly to Login screen without crashing. | `[ ] Pass`<br>`[ ] Fail` | |
| **A2** | Log in using assigned Citizen credentials (`citizen_test@salba.gov.ph`). | App authenticates successfully and displays the Main Home Dashboard. | `[ ] Pass`<br>`[ ] Fail` | |
| **A3** | Tap the main **Emergency SOS / Report** button on the home screen. | Emergency Reporting form modal/screen opens showing incident options. | `[ ] Pass`<br>`[ ] Fail` | |
| **A4** | Select **"Flood"** as emergency type from dropdown/icon options. | Flood icon/category is highlighted and selected. | `[ ] Pass`<br>`[ ] Fail` | |
| **A5** | Confirm map location pin at **Barangay Alapang** or tap to adjust. | Map marker pin updates to desired test coordinate. | `[ ] Pass`<br>`[ ] Fail` | |
| **A6** | Enter description text: *"Severe flash flood water rising up to waist height. 3 stranded."* | Text inputs accurately without keyboard lag or clipping. | `[ ] Pass`<br>`[ ] Fail` | |
| **A7** | (Optional) Tap **Attach Photo** and select test flood image from gallery. | Thumbnail of photo displays correctly attached in form. | `[ ] Pass`<br>`[ ] Fail` | |
| **A8** | Tap **SUBMIT EMERGENCY REPORT**. | Screen displays confirmation message: *"Emergency Report Submitted Successfully"*. | `[ ] Pass`<br>`[ ] Fail` | |
| **A9** | Navigate to **Report History / Status Tracker** tab. | Submitted report appears with initial status **"Pending Review"** (Yellow badge). | `[ ] Pass`<br>`[ ] Fail` | |
| **A10** | Keep status screen open while Administrator dispatches rescuer. | Status updates automatically to **"Rescuer Assigned"** (Blue badge) without manual refresh. | `[ ] Pass`<br>`[ ] Fail` | |
| **A11** | Observe status when rescuer updates status to En Route & Arrived. | Timeline progress bar advances smoothly to **"En Route"** and **"Arrived"**. | `[ ] Pass`<br>`[ ] Fail` | |
| **A12** | Observe status when rescuer marks incident as Resolved. | Final status updates to **"Resolved"** (Green badge) with resolution details. | `[ ] Pass`<br>`[ ] Fail` | |

---

### Execution Form B: CDRRMO Administrator Role (Admin Web Dashboard)

**Tester Name**: __________________________  
**Browser / OS**: _________________________  
**Date & Time**: __________________________  

| Step # | Action (What You Need to Do) | Expected Result (What You Should See) | Result | Notes / Observed Behavior |
| :---: | :--- | :--- | :---: | :--- |
| **B1** | Open Web Browser and navigate to SALBA Admin URL (`http://localhost:3000` or assigned test URL). | Admin login screen loads with CDRRMO logo and fields. | `[ ] Pass`<br>`[ ] Fail` | |
| **B2** | Log in using Admin test credentials (`admin@salba.gov.ph`). | Main CDRRMO Command Center Dashboard loads showing live GIS map and incident list. | `[ ] Pass`<br>`[ ] Fail` | |
| **B3** | Wait for Citizen report submission (or refresh incident feed). | Critical Alert notification pops up with audible alert and new incident card appears on list & map. | `[ ] Pass`<br>`[ ] Fail` | |
| **B4** | Click on the new **Flood Emergency** incident card in the incoming list. | Incident Details Modal opens showing citizen description, photo preview, and map pin. | `[ ] Pass`<br>`[ ] Fail` | |
| **B5** | Inspect the **AI Classification & Severity** badge on the incident details. | AI assessment displays severity score (e.g., *Critical/High*) and predicted type (*Flood*). | `[ ] Pass`<br>`[ ] Fail` | |
| **B6** | Click **Assign / Dispatch Rescuer** button inside incident panel. | Rescuer assignment dropdown lists available active rescue units. | `[ ] Pass`<br>`[ ] Fail` | |
| **B7** | Select **"Rescuer Team 1 (Alpha Unit)"** and click **CONFIRM DISPATCH**. | System confirms dispatch. Incident status changes to **"Assigned / Dispatched"**. | `[ ] Pass`<br>`[ ] Fail` | |
| **B8** | Observe the live Interactive Rescue Map. | Rescuer marker appears on map and live route line (polyline) connects rescuer to incident. | `[ ] Pass`<br>`[ ] Fail` | |
| **B9** | Observe status updates as Rescuer updates app (*En Route* ➔ *On Scene* ➔ *Resolved*). | Incident card badge updates dynamically in real-time without page reload. | `[ ] Pass`<br>`[ ] Fail` | |
| **B10** | Click on resolved incident card to view resolution summary and photo proof. | Resolution photo captured by rescuer displays clearly in details panel. | `[ ] Pass`<br>`[ ] Fail` | |
| **B11** | Click **Generate SITREP** button in top navigation / incident view. | SITREP Generator modal loads pre-filled with incident metrics and timestamps. | `[ ] Pass`<br>`[ ] Fail` | |
| **B12** | Review SITREP fields and click **DOWNLOAD SITREP PDF**. | Formal CDRRMO Situation Report PDF downloads successfully to test computer. | `[ ] Pass`<br>`[ ] Fail` | |

---

### Execution Form C: Rescuer Role (RescuerApp)

**Tester Name**: __________________________  
**Device Model**: _________________________  
**Date & Time**: __________________________  

| Step # | Action (What You Need to Do) | Expected Result (What You Should See) | Result | Notes / Observed Behavior |
| :---: | :--- | :--- | :---: | :--- |
| **C1** | Launch **RescuerApp** mobile application on responder test device. | Login screen loads smoothly. | `[ ] Pass`<br>`[ ] Fail` | |
| **C2** | Log in using Rescuer credentials (`rescuer1@salba.gov.ph`). | Rescuer Dashboard opens showing responder status (Active/Available). | `[ ] Pass`<br>`[ ] Fail` | |
| **C3** | Wait for dispatch assignment from Administrator. | Audio notification & banner pop-up appears: *"New Emergency Assigned: Flood - Brgy. Alapang"*. | `[ ] Pass`<br>`[ ] Fail` | |
| **C4** | Tap assignment notification or open incident details card. | Incident detail screen displays incident location, map marker, citizen note, and phone contact button. | `[ ] Pass`<br>`[ ] Fail` | |
| **C5** | Tap **ACKNOWLEDGE / ACCEPT DISPATCH**. | Dispatch accepted confirmation appears. Status changes to **"Acknowledged"**. | `[ ] Pass`<br>`[ ] Fail` | |
| **C6** | Tap **EN ROUTE TO SCENE** status button. | Status updates to **"En Route"**. GPS location tracking activates to stream coordinates to Admin. | `[ ] Pass`<br>`[ ] Fail` | |
| **C7** | Tap **NAVIGATE** button to open route view. | Map screen displays optimal navigation path from current location to Brgy. Alapang. | `[ ] Pass`<br>`[ ] Fail` | |
| **C8** | Upon arriving at simulated scene, tap **ARRIVED / ON SCENE**. | Status updates to **"Arrived / On Scene"**. System logs arrival timestamp. | `[ ] Pass`<br>`[ ] Fail` | |
| **C9** | After completing response, tap **COMPLETE / RESOLVE INCIDENT**. | Resolution camera screen activates automatically. | `[ ] Pass`<br>`[ ] Fail` | |
| **C10** | Snap resolution proof photo using camera interface and tap **USE PHOTO**. | Photo preview displays with option to add text notes. | `[ ] Pass`<br>`[ ] Fail` | |
| **C11** | Enter resolution note: *"3 stranded persons safely evacuated to shelter"* and tap **SUBMIT RESOLUTION**. | System confirms resolution submission and updates incident status to **"Resolved"**. | `[ ] Pass`<br>`[ ] Fail` | |
| **C12** | Return to Rescuer Dashboard main screen. | Dashboard returns to **"Available / Ready for Dispatch"** state. | `[ ] Pass`<br>`[ ] Fail` | |

---

### Execution Form D: Multi-Role End-to-End Handoff Workflow

**Testing Team Members**:  
- Citizen Tester: __________________________  
- Admin Tester: ___________________________  
- Rescuer Tester: _________________________  

| Stage # | System Role | Action Description | Handoff Verification Criterion | Result |
| :---: | :--- | :--- | :--- | :---: |
| **Stage 1** | **Citizen** | Submits Emergency Report (*Typhoon / Landslide*) on DisasterSOS app. | Alert notification arrives on Admin Web Dashboard within **< 3 seconds**. | `[ ] Pass`<br>`[ ] Fail` |
| **Stage 2** | **Admin** | Reviews AI recommendation and dispatches Rescuer Team 1 on Admin Web App. | RescuerApp receives push notification within **< 3 seconds**. | `[ ] Pass`<br>`[ ] Fail` |
| **Stage 3** | **Rescuer** | Accepts dispatch, updates status to *En Route* ➔ *Arrived* ➔ *Resolved* with photo proof. | Live GPS & status changes reflect in real time on both Admin Web Map and Citizen App. | `[ ] Pass`<br>`[ ] Fail` |
| **Stage 4** | **Admin** | Inspects resolution photo in Admin Web App and generates CDRRMO SITREP PDF. | Official PDF report compiles accurately with all timestamps and resolution proof. | `[ ] Pass`<br>`[ ] Fail` |

---

## 6. TESTER OBSERVATION & ISSUE LOG

If you encounter any unexpected behavior, layout issue, lag, or failure during your test execution, record the details in the log table below.

| Item # | Scenario / Step # | What Happened? (Observed Behavior) | What Did You Expect to Happen? | Could You Continue Testing? | Screenshot / Video File Name |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **1** | | | | `[ ] Yes  [ ] No` | |
| **2** | | | | `[ ] Yes  [ ] No` | |
| **3** | | | | `[ ] Yes  [ ] No` | |
| **4** | | | | `[ ] Yes  [ ] No` | |
| **5** | | | | `[ ] Yes  [ ] No` | |

---

## 7. BETA TEST COMPLETION CHECKLIST

Before submitting your testing packet to the research team, confirm that you have completed all mandatory items:

- `[ ]` **I performed all test steps assigned to my system role.**
- `[ ]` **I recorded [ Pass ] or [ Fail ] results for every executed step.**
- `[ ]` **I documented any unexpected problems or errors in the Observation Log.**
- `[ ]` **I participated in / observed the complete simulated emergency response workflow.**
- `[ ]` **I filled out the Post-Test Beta Testing Questionnaire (Section 8).**
- `[ ]` **I submitted this completed testing document to the Test Coordinator.**

---

## 8. POST-TEST BETA TESTING QUESTIONNAIRE

> Please answer the following questions based on your experience during the SALBA beta testing session.

### PART I: PARTICIPANT INFORMATION
1. **Assigned System Role**:  
   `[ ] Citizen / Resident`  
   `[ ] CDRRMO Administrator / Operator`  
   `[ ] Emergency Responder / Rescuer`  
2. **Testing Device / Environment**: `[ ] Android Phone` `[ ] iPhone / iOS` `[ ] Web Browser (Desktop/Laptop)`

---

### PART II: EXPERIENCE EVALUATION (5-Point Likert Scale)
*Rating Scale: 1 = Strongly Disagree | 2 = Disagree | 3 = Neutral | 4 = Agree | 5 = Strongly Agree*

| # | Evaluation Statement | 1 | 2 | 3 | 4 | 5 |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | **Task Completion**: I was able to successfully complete all emergency workflow tasks assigned to my role. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **2** | **Ease of Use**: The interface buttons, forms, and screens were easy to understand and navigate. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **3** | **Real-Time Feedback**: SALBA provided clear and immediate onscreen feedback after every action I performed. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **4** | **System Responsiveness**: Emergency alerts, notifications, and status updates arrived without noticeable delay. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **5** | **Workflow Clarity**: The sequence of emergency reporting ➔ dispatch ➔ resolution was logical and clear. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **6** | **Information Accuracy**: Map locations, status badges, and incident details displayed accurately on screen. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **7** | **System Reliability**: The application operated stably without unexpected crashes or freezing during testing. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| **8** | **Overall Experience**: SALBA effectively supports emergency alert, dispatch, and rescue operations. | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

---

### PART III: OPEN-ENDED FEEDBACK

1. **What feature or aspect of SALBA worked best during your test session?**  
   ____________________________________________________________________________________________________  
   ____________________________________________________________________________________________________  

2. **What was the most difficult or confusing part of using SALBA?**  
   ____________________________________________________________________________________________________  
   ____________________________________________________________________________________________________  

3. **What specific recommendations or improvements do you suggest for future versions of SALBA?**  
   ____________________________________________________________________________________________________  
   ____________________________________________________________________________________________________  

---

## 9. APPENDIX: SYSTEM QUALITY & UAT EVALUATION INSTRUMENT

*(ISO/IEC 25010 Standard Evaluation Questionnaire for Research & Capstone Defense)*

| Dimension | Evaluation Focus Statement | Score (1 - 5) |
| :--- | :--- | :---: |
| **Functional Suitability** | The system provides all essential functions required for emergency alert reporting, AI severity analysis, rescuer dispatching, and SITREP report compilation. | `[   ]` |
| **Performance Efficiency** | Alert notifications and real-time GPS position tracking synchronize with high speed and low latency across mobile and web interfaces. | `[   ]` |
| **Usability** | The user interface displays high visual clarity, intuitive layout hierarchy, and minimal cognitive effort for emergency operators and responders. | `[   ]` |
| **Reliability** | The system maintains continuous fault tolerance, reliable data persistence, and graceful error handling during high-volume alert simulation. | `[   ]` |
| **Security** | Authentication, role-based authorization, and sensitive user data (contact info, emergency location) remain safely protected. | `[   ]` |

---
*End of SALBA Beta Testing Package — Thank you for your valuable contribution to CDRRMO emergency rescue technology!*
