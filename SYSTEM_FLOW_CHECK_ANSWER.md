# SALBA SYSTEM FLOW ANALYSIS REPORT
**Capstone Project System Flow & Implementation Audit**  
**Date**: September 11, 2026  
**Repository**: `SALBA-CDRRMO-RESCUE-APP`  

> [!NOTE]  
> This report provides an exact, code-grounded audit of the SALBA disaster response system based strictly on the source code implemented in the repository (`DisasterSOS`, `RescuerApp`, `EmergencyApp/AdminWebApp`, and `salba-ml-service`). It is structured specifically for thesis Chapter 3 methodology comparison.

---

## 1. END-TO-END FLOW (VICTIM/CITIZEN REPORTING)

### 1.1 Step-by-Step Reporting Walkthrough
1. **Screen Launch & Automatic Location Fetching**:
   - When the user opens the `HomeScreen` in the `DisasterSOS` citizen app ([`HomeScreen.jsx`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L314-L331)), the app automatically runs `fetchUserLocation()` inside a `useEffect` hook on mount.
   - It calls `Location.requestForegroundPermissionsAsync()` and `Location.getCurrentPositionAsync({})`.
2. **Disaster Type Selection**:
   - The user selects a disaster category from the dropdown picker ([`HomeScreen.jsx`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L305-L311)): `Flood`, `Fire`, `Earthquake`, `Landslide`, or `Typhoon`.
   - Option to enter an optional note/description text.
3. **Emergency Button Tap & Cooldown Check**:
   - The user taps the primary "Send Emergency Alert" button ([`HomeScreen.jsx`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L353-L376)).
   - The app verifies `cooldownRemaining` (60-second cooldown timer between submissions).
4. **Warning Dialog Confirmation**:
   - A warning dialog is displayed: *"Sending a false or fake report can mislead emergency responders..."* ([`HomeScreen.jsx`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L365-L375)).
5. **Camera Screen & Photo Upload (Optional)**:
   - Tapping "Proceed" navigates to [`CameraScreen.jsx`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/CameraScreen.jsx#L378-L386) to capture an incident photo, or skip photo capture.
   - Once taken or skipped, `proceedWithAlert(photoUrl)` is executed.
6. **Payload Construction & Barangay Geocoding**:
   - [`proceedWithAlert`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L388-L436) fetches cached user profile (`userData`, `userPhone`) from `AsyncStorage`.
   - If GPS coordinates were not captured during mount, it attempts to fetch them via `Location.getCurrentPositionAsync({})`.
   - The GPS coordinates (`latitude`, `longitude`) are passed to `getNearestBarangay(coords.latitude, coords.longitude)` ([`locationHelper.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/utils/locationHelper.js)) to obtain the human-readable barangay name (`locationName`).
7. **HTTP Post to Backend**:
   - `sendAlert(data)` in [`alertService.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/services/alertService.js#L6-L35) sends an HTTP `POST` request to `${BASE_URL}/api/alerts` with `Authorization: Bearer <userToken>`.

---

### 1.2 GPS Location Capture Confirmation
* **Automated vs. Manual**: The app captures GPS location **AUTOMATICALLY** upon screen mount ([`HomeScreen.jsx:L314-L331`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L314-L331)).
* **Fallback Capture**: If the mount-level GPS fetch failed or is still null, location permissions and coordinates are requested **AGAIN AUTOMATICALLY** during the submission phase ([`HomeScreen.jsx:L406-L421`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L406-L421)). User interaction is only required to grant the device OS location permission prompt once.

---

### 1.3 Exact Request Payload Body
The exact JavaScript object fields sent in the request body from `DisasterSOS` ([`HomeScreen.jsx:L426-L436`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L426-L436)) and consumed by backend `POST /api/alerts` ([`alertRoutes.js:L194`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L194)) are:

```json
{
  "type": "Flood | Fire | Earthquake | Landslide | Typhoon",
  "latitude": 8.1565,
  "longitude": 125.1237,
  "locationName": "Barangay 9 (Poblacion), Malaybalay City",
  "note": "Optional user note text",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "userName": "John Doe",
  "userPhone": "+639123456789",
  "photoUrl": "https://res.cloudinary.com/... or null"
}
```

---

## 2. AI CLASSIFICATION PIPELINE

### 2.1 Models Implemented and Running
The codebase contains **two distinct AI/ML layers**:

1. **Python Machine Learning Microservice** ([`salba-ml-service`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service) & [`EmergencyApp/AdminWebApp/ml_service`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/ml_service)):
   - **Disaster Type Classifier**: Implemented using **Random Forest** (`RandomForestClassifier` in [`models.py:L18-L101`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/ml_service/models.py#L18-L101) & [`train_models.py:L68-L91`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models.py#L68-L91)).
   - **Severity Predictor**: Implemented using **XGBoost** (`xgb.XGBClassifier` in [`models.py:L103-L184`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/ml_service/models.py#L103-L184) & [`train_models.py:L112-L136`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models.py#L112-L136)).
   - **False Alarm / Prank Detector**: Implemented using **Logistic Regression** (`LogisticRegression` in [`models.py:L186-L269`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/ml_service/models.py#L186-L269) & [`train_models.py:L149-L172`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/train_models.py#L149-L172)).

2. **Node.js Express Backend Live Pipeline** ([`alertRoutes.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L611-L643)):
   - Evaluates reports in background using **Groq AI Service** (`groqService.evaluateReportAI`) for LLM-based verification.
   - Uses local heuristic engine ([`enhancedMLModel.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/utils/enhancedMLModel.js)) as a fallback for spatio-temporal duplicate detection, velocity/location-jump detection (`assessSuspiciousLocationJump`), and risk scoring.
   - *Runtime Note*: The Node.js server contains an HTTP client ([`mlServiceClient.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/utils/mlServiceClient.js)) configured to call the Flask Python ML service on port `5001`. In production, Groq AI + `enhancedMLModel.js` runs automatically on report ingestion, while `mlServiceClient` endpoints are exposed via `/api/ml`.

---

### 2.2 Model Predictions vs. Thesis Methodology Claims
**EXACT MATCH**: The model choices in code align 100% with the methodology specification:
* **Random Forest**: Classifies `disaster_type` (`Fire`, `Flood`, `Earthquake`, `Landslide`, `Typhoon`).
* **XGBoost**: Predicts `severity` (`low`, `moderate`, `high`, `critical`).
* **Logistic Regression**: Predicts `is_false_alarm` / prank status (`true` or `false`).

---

### 2.3 Confidence Threshold Check & Admin Routing
* **Threshold Implementation**: Confidence scoring and threshold rules **ARE IMPLEMENTED IN CODE**:
  * In [`enhancedMLModel.js:L181`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/utils/enhancedMLModel.js#L181) & [`L230`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/utils/enhancedMLModel.js#L230):
    * `confidence > 0.80`: Recommendation = `'auto_dispatch'` / `'admin_can_dispatch'`
    * `0.50 <= confidence <= 0.80`: Recommendation = `'review'` / `'admin_review'`
    * `confidence < 0.50`: Recommendation = `'flag_false_alarm'`
  * In [`alertRoutes.js:L358-L360`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L358-L360): Suspicious location-jumps (e.g. >150 km/h position jumps between submissions) force `confidence = 0.25` and recommendation = `'flag_false_alarm'`.
* **Routing Behavior**: **ALL reports go to the Admin Dashboard regardless of confidence score**. The AI recommendation (`auto_dispatch`, `admin_review`, `flag_false_alarm`) is displayed as a visual badge to aid the human administrator. No reports are automatically dispatched directly to responders without human admin approval.

---

### 2.4 Measured and Logged Accuracy
* **Documented Accuracy** ([`AI_VALIDATION_REPORT.md:L56-L90`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/AI_VALIDATION_REPORT.md#L56-L90)):
  * **Overall System Baseline Accuracy**: **92-94%** (improves to **94.1%** with 45 feedback loop entries).
  * **5-Fold Cross-Validation Accuracy**: **92.3%**
  * **10-Fold Cross-Validation Accuracy**: **91.8%**
  * **Precision / Recall / F1-Score Breakdown**:
    * Flood: Precision 0.94, Recall 0.91, F1-Score 0.92
    * Fire: Precision 0.91, Recall 0.90, F1-Score 0.90
    * Earthquake: Precision 0.88, Recall 0.87, F1-Score 0.87
    * Landslide: Precision 0.92, Recall 0.89, F1-Score 0.90
    * Typhoon: Precision 0.90, Recall 0.91, F1-Score 0.90
    * **Average F1-Score**: **0.90**
* **Standalone ML Service Target Metrics** ([`COMPLETION_REPORT.md:L69-L79`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/salba-ml-service/COMPLETION_REPORT.md#L69-L79)):
  * Disaster Classifier (Random Forest): 87-90%
  * Severity Predictor (XGBoost): 85-88%
  * False Alarm Detector (Logistic Regression): 92-95%

---

## 3. INCIDENT VERIFICATION AND DISPATCH (ADMIN SIDE)

### 3.1 Verification and Dispatch Flow
* **Verification**: Post-classification, reports enter status `'new'` or `'pending'` in MongoDB and are broadcast in real-time to the Admin Web App via Socket.IO (`req.io.to('admins').emit('new_alert', report)`).
* **Manual Dispatch Required**: Dispatch is **NOT AUTOMATIC**. An administrator must review the report on the dashboard, view AI recommendations/confidence, select an available rescue team (`Alpha`, `Bravo`, `Charlie`, `Delta`), and trigger the dispatch action.
* **Dispatch Execution**: Dispatch is executed via `POST /api/teams/:id/dispatch` ([`teamRoutes.js:L160-L315`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/teamRoutes.js#L160-L315)), which:
  1. Sets `team.status = 'deployed'` and `team.currentMission = reportId`.
  2. Sets `report.status = 'acknowledged'` and populates `assignedTeam` & `assignedRescuer`.
  3. Creates `Notification` records for team members.
  4. Emits real-time Socket.IO events.

---

### 3.2 Notification Mechanism for Emergency Responders
Responders are notified via **Socket.IO Real-Time Events** and **Database Notifications**:
* **Primary Notification Mechanism**: **Socket.IO Event** emitted to rescuer rooms ([`teamRoutes.js:L292-L300`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/teamRoutes.js#L292-L300)):
  `req.io.to('rescuer_${member._id}').emit('dispatch_alert', { team, lat, lng, address, reportId })`
* **In-App Rescuer Handler**: [`SocketContext.js:L102-L106`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/RescuerApp/src/context/SocketContext.js#L102-L106) listens for `dispatch_alert` and triggers local audio/vibration alerts.
* **Database Logs**: Persistent `Notification` records are created in MongoDB (`type: 'dispatch'`).
* **Push Notifications**: Expo push token field exists on `User` schema (`pushToken`), but active in-app delivery relies directly on Socket.IO.

---

### 3.3 Responder Accept / Decline Logic
* **Decline Logic**: **NOT IMPLEMENTED**. Rescuers cannot "Decline" or "Reject" an assigned dispatch from the mobile app.
* **Rescuer Status Transitions**: Once assigned by admin, the responder app allows the team leader/members to update mission status via `PATCH /api/rescue/my-mission/status` ([`rescueRoutes.js:L92-L221`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/rescueRoutes.js#L92-L221)). The allowed status transitions are:
  1. `on_the_way` (En Route)
  2. `ongoing` (Arrived at Scene)
  3. `resolved` (Mission Completed - requires optional resolution photo proof)

---

## 4. REAL-TIME UPDATES AND STATUS TRACKING

### 4.1 How Citizens Receive Status Updates
* **Mechanism**: The citizen mobile app (`DisasterSOS`) receives status updates **EXCLUSIVELY VIA HTTP POLLING**.
* **Code Proof**: In [`HomeScreen.jsx:L202-L227`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L202-L227), a `useEffect` hook runs a 5-second polling interval calling `getMyReports()`:
  ```javascript
  fetchActiveReport();
  interval = setInterval(fetchActiveReport, 5000); // Polls GET /api/alerts/my-reports every 5s
  return () => clearInterval(interval);
  ```
* Citizen app does **NOT** use Socket.IO for status updates.

---

### 4.2 Socket.IO Integration Confirmation
* **Server-Side (`EmergencyApp/AdminWebApp/backend/server.js`)**: **FULLY INTEGRATED**. Socket.IO server runs on HTTP server, emitting events `new_alert`, `alert_updated`, `dispatch_alert`, `rescuer_location`, `mission_complete`.
* **Rescuer App (`RescuerApp/src/context/SocketContext.js`)**: **FULLY INTEGRATED**. Connects via `socket.io-client`, joins rescuer rooms, listens for `dispatch_alert` and `mission_complete`, and streams live rescuer GPS coordinates back to server (`socket.emit('rescuer_location')`).
* **Admin Web App (`AdminWebApp/frontend`)**: **FULLY INTEGRATED**. Listens to real-time socket events to update map markers and alert lists dynamically.
* **Citizen App (`DisasterSOS`)**: **NOT INTEGRATED**. Standard HTTP polling is used instead of Socket.IO.

---

## 5. DATABASE / DATA FLOW

### 5.1 Collections / Tables and Key Fields
The MongoDB database contains **11 active collections**:

1. **`reports`** ([`Report.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/Report.js)):
   * Key Fields: `userId` (ref: User), `lat`, `lng`, `accuracy`, `severity` (`low`, `moderate`, `high`, `critical`), `note`, `status` (`new`, `pending`, `acknowledged`, `in_progress`, `on_the_way`, `ongoing`, `resolved`, `declined`), `assignedTeam` (ref: Team), `disasterType`, `locationName`, `senderName`, `senderPhone`, `assignedRescuer` (`rescuerId`, `rescuerName`, `rescuerLat`, `rescuerLng`, `startedAt`), `rescuerMissionStatus`, `resolvedBy` (ref: User), `mlPredictions` (`disasterType`, `disasterTypeConfidence`, `severity`, `severityConfidence`, `isLegitimate`, `legitimacyConfidence`, `overall`), `hazardZones`, `photoUrl`, `resolutionPhotoUrl`, `onTheWayAt`, `arrivedAt`, `responseDurationMinutes`, `responseDistanceMeters`.
2. **`users`** ([`User.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/User.js)):
   * Key Fields: `name`, `username`, `email`, `password`, `phone`, `jobTitle`, `picture`, `role` (`admin`, `user`, `rescuer`), `dutyStatus` (`on-duty`, `off-duty`), `pushToken`, `isOnline`, `lastSeen`, `lastLat`, `lastLng`, `location`, `lastLocationCoords` (`lat`, `lng`), `blocked`.
3. **`teams`** ([`Team.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/Team.js)):
   * Key Fields: `name` (`Alpha`, `Bravo`, `Charlie`, `Delta`), `leader` (ref: User), `members` (Array of refs to User), `status` (`available`, `deployed`, `standby`), `currentMission` (ref: Report), `color`.
4. **`notifications`** ([`Notification.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/Notification.js)):
   * Key Fields: `userId` (ref: User), `type` (`dispatch`, `mission_complete`, `team_update`, `alert`, `status_update`), `title`, `message`, `data` (`reportId` ref: Report, `teamId` ref: Team, `lat`, `lng`, `address`), `isRead`.
5. **`sitreps`** ([`SITREP.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/SITREP.js)):
   * Key Fields: `reportId` (ref: Report), `sitrepNumber`, `dateTime`, `directedTo`, `ccList`, `subject`, `situationOverview`, `affectedPopulation`, `idpCenters`, `lifelines`, `damagesAndLosses`, `actionsTaken`, `preparedBy`.
6. **`sitrepdocs`** ([`SITREPDoc.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/SITREPDoc.js)):
   * Key Fields: `reportId` (ref: Report), `title`, `content`, `preparedBy` (ref: User), `status`, `sitrepNumber`.
7. **`feedbacks`** ([`UserFeedback.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/UserFeedback.js)):
   * Key Fields: `userId` (ref: User), `senderName`, `senderEmail`, `senderPhone`, `category`, `message`, `isReadByAdmin`, `readAt`.
8. **`aifeedbacks`** ([`AIFeedback.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/AIFeedback.js)):
   * Key Fields: `reportId` (ref: Report), `adminId` (ref: User), `aiPrediction`, `adminCorrection`, `feedbackType`, `isAccurate`.
9. **`hazardzones`** ([`HazardZone.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/HazardZone.js)):
   * Key Fields: `location`, `latitude`, `longitude`, `riskLevel` (`LOW`, `MEDIUM`, `HIGH`), `hazardTypes`, `isActive`.
10. **`bilingualterms`** ([`BilingualTerm.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/BilingualTerm.js)):
    * Key Fields: `visayanTerm`, `englishTranslation`, `category`, `disasterContext`.
11. **`predictioncaches`** ([`PredictionCache.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/models/PredictionCache.js)):
    * Key Fields: `cacheKey`, `reportText`, `prediction`, `expiresAt`.

---

### 5.2 Foreign Key / Reference Relationships Verification
All foreign key references **MATCH standard Mongoose relational pointers**:
* `Report.userId` $\rightarrow$ `User._id`
* `Report.assignedTeam` $\rightarrow$ `Team._id`
* `Report.resolvedBy` $\rightarrow$ `User._id`
* `Report.declinedBy` $\rightarrow$ `User._id`
* `Team.leader` $\rightarrow$ `User._id`
* `Team.members` $\rightarrow$ Array of `User._id`
* `Team.currentMission` $\rightarrow$ `Report._id`
* `Notification.userId` $\rightarrow$ `User._id`
* `Notification.data.reportId` $\rightarrow$ `Report._id`
* `Notification.data.teamId` $\rightarrow$ `Team._id`
* `SITREP.reportId` $\rightarrow$ `Report._id`
* `SITREPDoc.reportId` $\rightarrow$ `Report._id`
* `AIFeedback.reportId` $\rightarrow$ `Report._id` & `AIFeedback.adminId` $\rightarrow$ `User._id`

---

## 6. GAPS AND MISMATCHES (METHODOLOGY VS. IMPLEMENTATION)

### 6.1 Unimplemented / Stubbed Features (What paper might claim vs reality)
1. **Fully Automated AI Dispatch (NOT IMPLEMENTED)**:
   * Methodology text might claim high-confidence AI reports are automatically dispatched to rescuers without human intervention.
   * *Actual Code*: **Dispatches are 100% manual**. The AI only attaches predictions and recommendations (`admin_can_dispatch`, `admin_review`, `flag_false_alarm`). An admin must click "Dispatch" in the Web App.
2. **Rescuer Accept / Decline Functionality (NOT IMPLEMENTED)**:
   * Methodology text might claim responders receive a prompt to "Accept" or "Decline" a dispatch.
   * *Actual Code*: **Rescuers cannot decline**. Once assigned, status moves directly to deployed/acknowledged. Rescuers can only progress state (`on_the_way` $\rightarrow$ `ongoing` $\rightarrow$ `resolved`).
3. **Citizen Real-Time WebSockets (NOT IMPLEMENTED IN CITIZEN APP)**:
   * Methodology text might claim citizens receive instant push/websocket updates on rescuer position.
   * *Actual Code*: Citizen app (`DisasterSOS`) uses **5-second HTTP polling** (`setInterval(fetchActiveReport, 5000)`). Socket.IO is used only in Rescuer App and Admin Web App.
4. **Standalone Python ML Microservice Connection in Default Pipeline**:
   * Methodology text might imply node server calls Python Flask RF/XGBoost microservice on every report.
   * *Actual Code*: Live Express backend uses Groq AI API + JS heuristics (`enhancedMLModel.js`). Python ML service exists and is fully trained, but operates via standalone endpoints under `/api/ml`.

---

### 6.2 Extra Features Beyond Basic One-Tap Flow
1. **Multi-Report Clustering & Auto-Escalation**:
   * If 3+ different users submit reports in the same ~1km radius within 1 hour, the system automatically escalates report severity to `CRITICAL` ([`alertRoutes.js:L392-L446`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L392-L446)).
2. **Hazard Zone Proximity Escalation**:
   * If an emergency report falls within 2km of a known high-risk hazard zone, severity is automatically escalated to `CRITICAL` ([`alertRoutes.js:L449-L535`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L449-L535)).
3. **Velocity / Location-Jump False Alarm Detection**:
   * Detects impossible physical travel speeds (>120-150 km/h) between consecutive reports from the same user to flag potential spam/fake alerts ([`alertRoutes.js:L26-L92`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/alertRoutes.js#L26-L92)).
4. **Live Road Routing (OSRM / GraphHopper)**:
   * Computes turn-by-turn driving polyline routes between live rescuer coordinates and victim location in both Admin Web App and Mobile App ([`HomeScreen.jsx:L230-L288`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/DisasterSOS/DisasterSOS/screens/HomeScreen.jsx#L230-L288)).
5. **Automatic SITREP (Situation Report) Generation**:
   * Generates formal Disaster Risk Reduction Situation Reports (SITREPs) with affected population, IDP evacuation center status, and infrastructure lifeline tracking ([`sitrepRoutes.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/sitrepRoutes.js)).
6. **Bilingual Visayan-English Translation Dictionary**:
   * Maps Visayan dialect emergency terms to English for AI text classification ([`bilingualRoutes.js`](file:///c:/Users/Zam/OneDrive/Desktop/capstone/SALBA-CDRRMO-RESCUE-APP/EmergencyApp/AdminWebApp/backend/routes/bilingualRoutes.js)).
