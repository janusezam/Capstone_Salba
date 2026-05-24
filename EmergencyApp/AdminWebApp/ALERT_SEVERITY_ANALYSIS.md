# Alert Severity/Status Determination System - Code Analysis

## Executive Summary
The SALBA emergency system determines alert severity through a **two-stage process**:
1. **Initial Severity Assignment** (instant, when alert is created)
2. **AI/ML Assessment** (background, enhances severity with hotspot and confidence data)

---

## Part 1: ALERT TYPES & INITIAL SEVERITY ASSIGNMENT

### Location: `backend/routes/alertRoutes.js` (lines 22-42)

#### Alert Types Available
The system supports exactly **5 disaster types**:
- `Fire`
- `Earthquake`
- `Flood`
- `Landslide`
- `Typhoon`

#### Initial Severity Mapping
When an alert is created, severity is assigned immediately based on the disaster type:

```javascript
// Map disaster type to severity (Lines 31-39)
const severityMap = {
  'Fire': 'critical',
  'Earthquake': 'critical',
  'Flood': 'high',
  'Landslide': 'high',
  'Typhoon': 'high',
};

const report = await Report.create({
  // ... other fields
  severity: severityMap[type] || 'medium',
  // ...
});
```

**Key Points:**
- Fire & Earthquake = **CRITICAL** (most severe)
- Flood, Landslide, Typhoon = **HIGH** (less severe)
- Unknown types = **MEDIUM** (fallback)
- Severity levels: `['low', 'moderate', 'high', 'critical']`

---

## Part 2: DATABASE SCHEMA - Report/Alert Model

### Location: `backend/models/Report.js` (lines 1-35)

#### Schema Definition
```javascript
const reportSchema = new mongoose.Schema({
  // ... location and user fields
  severity: { 
    type: String, 
    enum: ['low','moderate','high','critical'], 
    default: 'low' 
  },
  status: { 
    type: String, 
    enum: [
      'new',
      'acknowledged',
      'in_progress',
      'resolved',
      'Pending',
      'Ongoing',
      'Resolved',
      'Declined'
    ], 
    default: 'new' 
  },
  disasterType: { type: String, default: '' },
  
  // ML Predictions - stores AI assessment
  mlPredictions: {
    disasterType: { type: String, default: null },
    disasterTypeConfidence: { type: Number, default: null },
    severity: { type: String, default: null },  // AI-assessed severity
    severityConfidence: { type: Number, default: null },
    isLegitimate: { type: Boolean, default: true },
    legitimacyConfidence: { type: Number, default: null },
    overall: {
      confidence: { type: Number, default: null },
      recommendation: { type: String, default: null },
    }
  },
  mlProcessedAt: { type: Date, default: null }
}, { timestamps: true });
```

**Note:** Each report has TWO severity fields:
- `severity`: Initial immediate severity (from alertRoutes.js)
- `mlPredictions.severity`: AI-enhanced severity (from ML assessment)
- `status`: Separate from severity; tracks report lifecycle

---

## Part 3: AI/ML ASSESSMENT - Severity Enhancement

### Location: `backend/utils/enhancedMLModel.js`

#### Stage 1: Immediate Alert Recipient (Lines 50-320)

After alert is created, `enhancedML.assessSeverity()` runs in background.

```javascript
assessSeverity(disasterType, lat, lng, reportText = '') {
  // BASE SEVERITY (same as initial mapping but with slight differences)
  const baseSeverity = {
    'Fire': 'high',                // Note: Different from initial 'critical'
    'Earthquake': 'critical',
    'Flood': 'high',
    'Landslide': 'high',
    'Typhoon': 'critical',         // Note: Different from initial 'high'
  };

  const severity = baseSeverity[disasterType] || 'moderate';

  // ENHANCEMENT 1: Hotspot Detection
  const inHotspot = this.hotspots.some(hotspot =>
    geolib.getDistance(
      { latitude: hotspot.lat, longitude: hotspot.lng },
      { latitude: lat, longitude: lng }
    ) < hotspot.radiusMeters  // 1000m radius
  );

  // Escalate HIGH to CRITICAL if in hotspot
  const escalatedSeverity = inHotspot && severity === 'high' 
    ? 'critical' 
    : severity;

  // ENHANCEMENT 2: Text-based Urgency Keywords
  const urgencyKeywords = [
    'immediate', 
    'urgent', 
    'critical', 
    'emergency', 
    'life threat'
  ];
  const urgencyScore = urgencyKeywords.filter(
    k => reportText.toLowerCase().includes(k)
  ).length;

  // Escalate to CRITICAL if 3+ urgency keywords present
  const finalSeverity = urgencyScore > 2 
    ? 'critical' 
    : escalatedSeverity;

  return {
    severity: finalSeverity,
    inHotspot,
    urgencyIndicators: urgencyScore,
    recommendation: this.getSeverityAction(finalSeverity),
  };
}
```

#### Severity Escalation Logic (Decision Tree)

```
Initial Severity (from alertRoutes.js)
        ↓
assessSeverity() Processing:
        ├─ If in HOTSPOT + severity='high' → escalate to 'critical'
        └─ If urgencyScore > 2 → escalate to 'critical'
        ↓
Final Severity (stored in mlPredictions.severity)
```

#### Stage 2: One-Tap SOS Verification (Lines 138-200)

For one-tap SOS alerts (no detailed description), verification includes severity assessment:

```javascript
const baseSeverity = {
  'Fire': 'critical',
  'Earthquake': 'critical',
  'Flood': 'high',
  'Landslide': 'high',
  'Typhoon': 'critical',
};

const assessedSeverity = (baseSeverity[disasterType] || 'moderate');
const isCritical = assessedSeverity === 'critical' 
  || (assessedSeverity === 'high' && isInHotspot);

return {
  isValid: isLegitimate,
  isOneTapSOS: true,
  isLegitimate,
  isCritical,
  severity: assessedSeverity,
  inHotspot: isInHotspot,
  confidence: Math.round(overallConfidence * 100) / 100,
  duplicateRisk: Math.round(duplicateScore * 100) / 100,
  falseAlarmRisk: Math.round(falseAlarmRisk * 100) / 100,
  issues,
  recommendation: isLegitimate && isCritical 
    ? 'admin_can_dispatch' 
    : (isLegitimate ? 'admin_review' : 'flag_false_alarm'),
};
```

#### Stage 3: Severity Action Mapping (Lines 305-312)

The severity level maps to recommended dispatch action:

```javascript
getSeverityAction(severity) {
  const actions = {
    critical: 'Immediate multi-team dispatch. Activate emergency protocol.',
    high: 'Urgent dispatch. Multiple teams recommended.',
    moderate: 'Standard response. Single team sufficient.',
    low: 'Monitor. Dispatch only if escalation occurs.',
  };
  return actions[severity] || 'Standard protocols apply.';
}
```

---

## Part 4: HOTSPOT DETECTION SYSTEM

### Location: `backend/utils/enhancedMLModel.js` (Lines 238-305)

Hotspots are geographic areas with high historical incident density. They influence severity escalation.

```javascript
async detectHotspots() {
  // Get all reports with coordinates
  const reports = await Report.find({ 
    lat: { $exists: true }, 
    lng: { $exists: true } 
  }).lean();

  // Grid-based clustering: 1km x 1km cells
  const grid = {};
  const cellSize = 0.01; // ~1km at equator

  // Calculate RISK SCORE for each cell
  const hotspots = Object.values(grid)
    .map(cell => {
      const criticalCount = cell.reports.filter(r => r.severity === 'critical').length;
      const highCount = cell.reports.filter(r => r.severity === 'high').length;

      // Risk = (critical*2 + high*1) / total reports
      const riskScore = (criticalCount * 2 + highCount * 1) / cell.reports.length;

      return {
        lat: cell.lat,
        lng: cell.lng,
        reportCount: cell.reports.length,
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: riskScore >= 1.5 
          ? 'critical' 
          : (riskScore >= 0.7 ? 'high' : 'moderate'),
        radiusMeters: 1000,  // 1km radius
        disasterTypes: [...new Set(cell.reports.map(r => r.disasterType))],
      };
    })
    .filter(h => h.riskScore > 0.5);  // Only significant hotspots

  this.hotspots = hotspots;
}
```

**Hotspot Impact on Severity:**
- Alert in CRITICAL hotspot + HIGH severity → escalated to CRITICAL
- Alert in HIGH hotspot + HIGH severity → stays HIGH
- Alert in MODERATE hotspot + HIGH severity → stays HIGH

---

## Part 5: ALERT CREATION FLOW WITH ML ENHANCEMENT

### Location: `backend/routes/alertRoutes.js` (Lines 22-120)

Complete flow from user submission through ML assessment:

```javascript
router.post('/', async (req, res) => {
  const { type, latitude, longitude, locationName, userId, userName } = req.body;

  // STEP 1: Initial severity assignment (IMMEDIATE)
  const severityMap = {
    'Fire': 'critical',
    'Earthquake': 'critical',
    'Flood': 'high',
    'Landslide': 'high',
    'Typhoon': 'high',
  };

  const report = await Report.create({
    severity: severityMap[type] || 'medium',  // ← INITIAL SEVERITY
    disasterType: type,
    lat: latitude,
    lng: longitude,
    locationName: locationName,
    senderName: userName || 'Anonymous Reporter',
    // ... status: 'new'
  });

  // STEP 2: Background AI verification (NON-BLOCKING)
  setImmediate(async () => {
    // Fetch recent reports in 30-minute window within 0.05° (5km)
    const recentReports = await Report.find({
      lat: { $gte: latitude - 0.05, $lte: latitude + 0.05 },
      lng: { $gte: longitude - 0.05, $lte: longitude + 0.05 },
      createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 30) },
      _id: { $ne: report._id }
    }).lean();

    // Verify legitimacy
    const verification = enhancedML.verifyReport(
      { lat: latitude, lng: longitude, disasterType: type, reportText: locationName, userId },
      recentReports
    );

    // Assess severity with AI
    const assessment = enhancedML.assessSeverity(type, latitude, longitude, locationName || '');

    // Update report with ML predictions
    report.mlPredictions = {
      disasterType: type,
      disasterTypeConfidence: 0.95,        // Mobile reports are explicit type
      severity: assessment.severity,        // ← AI-ENHANCED SEVERITY
      severityConfidence: 0.85,
      isLegitimate: verification.isValid,
      legitimacyConfidence: verification.confidence,
      overall: {
        confidence: verification.confidence,
        recommendation: verification.recommendation,
      }
    };
    report.mlProcessedAt = new Date();
    await report.save();
  });

  // STEP 3: Broadcast alert to admins (with initial severity)
  if (req.io) {
    req.io.emit('new_alert', {
      id: report._id,
      type,
      latitude,
      longitude,
      severity: report.severity,  // ← INITIAL SEVERITY
      createdAt: report.createdAt,
    });
  }

  res.status(201).json({ success: true, report });
});
```

---

## Part 6: REPORT VERIFICATION & LEGITIMACY SCORING

### Location: `backend/utils/enhancedMLModel.js` (Lines 138-233)

Verification checks help admins assess confidence in severity:

```javascript
verifyReport(newReport, existingReports) {
  const isOneTapSOS = !reportText || reportText.trim().length === 0;

  let duplicateScore = 0;
  let falseAlarmRisk = 0;

  if (isOneTapSOS) {
    // One-tap: Check for duplicates within 50m, 5 minutes
    existingReports.forEach(existing => {
      const distance = geolib.getDistance(...);
      const timeDiff = (new Date() - new Date(existing.createdAt)) / 1000 / 60;

      if (distance < 50 && existing.disasterType === type && timeDiff < 5) {
        duplicateScore += 0.6;  // High duplicate risk
      }
      if (existing.userId === userId && timeDiff < 3) {
        falseAlarmRisk += 0.4;  // Same user, multiple taps
      }
    });
  } else {
    // Text-based: Check within 200m, 10 minutes
    existingReports.forEach(existing => {
      if (distance < 200 && existing.disasterType === type && timeDiff < 10) {
        duplicateScore += 0.7;
      }
      if (existing.userId === userId && timeDiff < 5) {
        falseAlarmRisk += 0.3;
      }
    });

    // Prank/test keywords
    if (reportText.includes('prank') || reportText.includes('test')) {
      falseAlarmRisk += 0.8;
    }
  }

  const overallConfidence = Math.max(0, Math.min(1, 1 - (duplicateScore + falseAlarmRisk) / 2));

  return {
    isValid: overallConfidence > 0.5,
    confidence: overallConfidence,
    duplicateRisk: duplicateScore,
    falseAlarmRisk: falseAlarmRisk,
    issues: [...],
    recommendation: overallConfidence > 0.8 
      ? 'auto-dispatch' 
      : (overallConfidence > 0.5 ? 'review' : 'flag-false-alarm'),
  };
}
```

---

## Summary: Severity Determination Decision Tree

```
User submits alert with type (Fire, Earthquake, Flood, Landslide, or Typhoon)
                                    ↓
                    ┌───────────────────────────────┐
                    │   IMMEDIATE SEVERITY ASSIGNMENT │
                    │   (alertRoutes.js, Line 34)     │
                    └───────────────────────────────┘
                                    ↓
        Fire/Earthquake → CRITICAL | Flood/Landslide/Typhoon → HIGH
                                    ↓
            ┌──────────────────────────────────────────┐
            │     BACKGROUND ML ASSESSMENT STARTS       │
            │   (enhancedMLModel.js, non-blocking)     │
            └──────────────────────────────────────────┘
                            ↓
        ┌────────────────────┴────────────────────┐
        ↓                                         ↓
    Check Hotspot                      Check Urgency Keywords
    (in 1km radius area                (immediate, urgent,
     with high incident density)        critical, emergency,
                                        life threat)
        ↓                                         ↓
    If in CRITICAL hotspot          If 3+ keywords found
    + severity=HIGH                 Escalate to CRITICAL
    Escalate to CRITICAL
                                    ↓
                    ┌───────────────────────────────┐
                    │   FINAL AI-ENHANCED SEVERITY   │
                    │   (stored in mlPredictions)    │
                    └───────────────────────────────┘
                                    ↓
                        Map to Dispatch Action
                        (getSeverityAction)
                                    ↓
    CRITICAL → Immediate multi-team dispatch
    HIGH     → Urgent dispatch, multiple teams
    MODERATE → Standard response, single team
    LOW      → Monitor only
```

---

## Key Confidence Scores in ML Predictions

| Field | Source | Range | Meaning |
|-------|--------|-------|---------|
| `disasterTypeConfidence` | Mobile app | 0.95 (explicit type) | How certain the type is correct |
| `severityConfidence` | assessSeverity() | 0.85 | How certain the severity assessment is |
| `legitimacyConfidence` | verifyReport() | 0-1.0 | How likely the report is genuine |
| `overall.confidence` | Combined | 0-1.0 | Overall confidence in all predictions |

---

## Recommendations from AI/ML System

| Confidence | Recommendation | Action |
|-----------|---|---|
| > 0.8 | `auto-dispatch` | Admin can auto-dispatch rescuers |
| 0.5 - 0.8 | `review` | Admin should review before dispatch |
| < 0.5 | `flag-false-alarm` | Flag as potential false alarm |
| (One-tap critical) | `admin_can_dispatch` | Can dispatch immediately |
| (One-tap non-critical) | `admin_review` | Review recommended |

---

## Files Involved in Severity Determination

1. **[backend/routes/alertRoutes.js](backend/routes/alertRoutes.js)** - Initial severity assignment
2. **[backend/models/Report.js](backend/models/Report.js)** - Database schema
3. **[backend/utils/enhancedMLModel.js](backend/utils/enhancedMLModel.js)** - AI/ML assessment
   - `assessSeverity()` - Severity enhancement
   - `verifyReport()` - Legitimacy verification
   - `detectHotspots()` - Hotspot detection
   - `getSeverityAction()` - Severity to action mapping
4. **[test-system.js](test-system.js)** - System testing

---

## Testing Alert Severity

Alert the system with different types to see immediate severity assignment:

```bash
# Fire alert → CRITICAL
POST /api/alerts
{"type": "Fire", "latitude": 8.15, "longitude": 125.12, "locationName": "Malaybalay"}

# Flood alert → HIGH
POST /api/alerts
{"type": "Flood", "latitude": 8.15, "longitude": 125.12, "locationName": "Malaybalay"}

# Unknown type → MEDIUM
POST /api/alerts
{"type": "Storm", "latitude": 8.15, "longitude": 125.12, "locationName": "Malaybalay"}
```

Then check `mlPredictions.severity` in the report after a few seconds to see AI assessment.
