# SALBA Emergency Response System - User Manual

## Table of Contents
1. [System Overview](#overview)
2. [DisasterSOS (User App)](#disastersos)
3. [RescuerApp (Responder App)](#rescuerapp)
4. [Admin Dashboard](#admin)

---

## System Overview {#overview}

**SALBA** is an AI-powered emergency response system for Malaybalay City that connects citizens, emergency responders, and administrators in real-time.

### System Features
- ✅ One-tap emergency alerts
- ✅ Real-time location tracking
- ✅ AI-driven disaster detection (93% accuracy)
- ✅ Team coordination system
- ✅ Live analytics dashboard
- ✅ 354 location coverage (all barangays)

### Three Integrated Apps
1. **DisasterSOS** - For citizens to report emergencies
2. **RescuerApp** - For emergency responders
3. **Admin Dashboard** - For system management

---

# DisasterSOS User App {#disastersos}

## Getting Started

### 1. Download & Install
- Scan QR code from admin
- Install from Expo: `expo install go`
- Open app on your mobile device

### 2. Create Account
1. Tap **"Register"** on login screen
2. Enter your details:
   - Full Name
   - Email address
   - Password (min 8 characters)
   - Phone number
3. Tap **"Create Account"**
4. You're ready to report!

### 3. Login
1. Enter your **Email** and **Password**
2. Tap **"Login"**
3. Accept location permissions

---

## Reporting an Emergency

### Method 1: One-Tap SOS (Bypasser Mode)
**Fastest way to report**

1. Tap the **RED SOS BUTTON** on main screen
2. Select disaster type:
   - Flood
   - Fire
   - Earthquake
   - Landslide
   - Typhoon
3. Tap **"TAP TO ALERT"**
⚠️ Your current GPS location will be used

### Method 2: Report Incident (Location Mode)
**When you see disaster at a specific location**

1. Tap **Menu (☰)** → **"Report Incident"**
2. The **"Report Incident Mode"** activates
3. Select disaster type from dropdown
4. Select location:
   - Tap **"Select Barangay"** dropdown
   - Choose from 354 locations (Brgy 1-11 + all others)
   - Map updates with coordinates
5. Review location on map
6. Tap **"TAP TO ALERT"**

### Location Selection Guide
- **Barangay Format**: "Brgy 1 - Purok 1", "Aglayan - Purok 2", etc.
- **All 354 locations** available in dropdown
- **Searchable**: Type barangay name to filter
- **GPS Coordinates**: Each location has precise coordinates

---

## My Report History

### View Past Reports
1. Tap **Menu (☰)** → **"My Report History"**
2. See all your submitted reports
3. Each entry shows:
   - Disaster type
   - Location
   - Date and time
   - Current status

### Report Statuses
- **Pending**: Alert received, awaiting dispatch
- **Dispatched**: Rescue team assigned
- **In Progress**: Team responding
- **Completed**: Incident resolved

---

## Profile Settings

### Edit Your Profile
1. Tap **Menu (☰)** → **"Profile Settings"**
2. Update your information:
   - Name
   - Phone number
   - Address
   - Profile picture
3. Tap **"Save Changes"**

### Change Password
1. In Profile Settings, tap **"Change Password"**
2. Enter **Current Password**
3. Enter **New Password** (min 8 characters)
4. Confirm **New Password**
5. Tap **"Update"**

---

## Emergency Tips

### When to Use SALBA
✅ Natural disasters (floods, earthquakes, typhoons)
✅ Infrastructure emergencies (fires, accidents)
✅ Large-scale incidents

### Location Accuracy
- **Bypasser Mode**: Uses your GPS (5-10m accuracy)
- **Report Mode**: Uses barangay center coordinates
- All locations verified and mapped

### What Happens After You Report
1. Your report sent to Admin Dashboard
2. AI analyzes incident type (93% accurate)
3. Rescue teams notified in real-time
4. Team leader assigns responders
5. You receive status updates

### Important: Stay Safe
- Don't put yourself in danger
- Provide accurate information
- Cooperate with rescue teams
- Follow emergency instructions

---

# RescuerApp {#rescuerapp}

## Intro for Emergency Responders

### App Purpose
- Receive real-time emergency alerts
- Coordinate team response
- Update incident status
- Communicate with team

### Getting Started
1. Request login credentials from your supervisor
2. Open RescuerApp
3. Enter your **Email** and **Password**
4. Authorize location access
5. You're ready to respond!

---

## Responding to Emergencies

### 1. Receive Alert Notification
- **Mobile notification** appears with:
  - Disaster type
  - Location
  - Reported by: (user name)
  - Timestamp

### 2. View Pending Dispatch Alerts
1. Tap **"Dispatch"** tab on home screen
2. See all **Pending Alerts** in list
3. Each card shows:
   - **Type**: Flood, Fire, etc.
   - **Location**: Brgy 1 - Purok 1
   - **Reporter**: User name
   - **Time**: When reported
4. Tap any alert to view map

### 3. View Incident on Map
- **Red Marker** = Disaster location
- **Current Location** = Your position
- **Distance** = How far away
- **Route**: Navigation to location

---

## Team Coordination

### For Team Leaders

#### Assign Team to Incident
1. From incident detail, tap **"Assign Team"**
2. Select team members from list:
   - ☑️ Check rescuers to include
   - All available responders shown
3. Tap **"Confirm Assignment"**
4. Notifications sent to all team members

#### Send Team Message
1. Open incident
2. Tap **"Team Chat"**
3. Type message to all assigned rescuers
4. Tap **"Send"**

### For Team Members

#### Receive Assignment
- **Notification**: "You're assigned to Flood at Brgy 1"
- Tap to view details
- Navigate to location

#### Update Mission Status
1. Open your current mission
2. Tap **"Update Status"**
3. Select current phase:
   - 🚗 **En Route** (0%)
   - 📍 **On Scene** (30%)
   - 🆘 **Active Response** (50%)
   - ⚠️ **Complications** (75%)
   - ✅ **Incident Controlled** (100%)
4. Add notes: "Heavy flooding, water rising"
5. Tap **"Update"**

---

## Real-Time Updates

### What You'll See
- **Alert notifications** (new emergencies)
- **Status updates** from team members
- **Chat messages** from team leader
- **Map updates** from other responders

### Staying Connected
- Keep app **open** during response
- Ensure **location sharing** enabled
- Check **notifications** regularly
- Respond to **team messages**

---

## Incident Management

### Before Response
- Review alert details
- Check current weather
- Plan route on map
- Gather necessary equipment

### During Response
- Update status regularly
- Communicate with team
- Follow team leader instructions
- Monitor incident progress

### After Response
- Mark incident as **Completed**
- Submit incident report
- Log response time
- Provide any additional notes

---

# Admin Dashboard {#admin}

## Login & Access

### First Login
1. Go to: `http://localhost:3001`
2. Enter credentials:
   - Email: `admin@example.com`
   - Password: `password123`
3. Tap **"Login"**

### Dashboard Home
You'll see:
- **Response Status** card (metrics)
- **Top Incident Types** chart
- **Recent Reports** table
- **Real-time Activity** feed

---

## Monitoring Incidents

### Response Status Card
Shows **3 key metrics**:
1. **Pending Dispatch**: Alerts waiting for team assignment
2. **Active Missions**: Teams currently responding
3. **Resolved Today**: Incidents completed today

### Top Incident Types
- **Chart** showing incident distribution:
  - Flood incidents
  - Fire incidents
  - Earthquake incidents
  - Landslide incidents
  - Typhoon incidents

### Recent Reports
- **Table** of latest reports
- Each row shows:
  - Report ID
  - Type
  - Location
  - Reporter
  - Timestamp
  - Status

---

## Managing Users & Teams

### View All Users
1. Tap **"Users"** in sidebar (if available)
2. See registered users list
3. Filter by user type: Civilian, Rescuer

### View All Rescuers
1. Tap **"Rescuers"** in sidebar
2. See emergency responders
3. Check their:
   - Status (Available/On Mission)
   - Current location
   - Team assignments

---

## AI Accuracy Metrics

### Why AI Matters
- **Automatic disaster classification** (93% accurate)
- **Improves response** coordination
- **Learning system** gets better with feedback

### Feedback System
1. Review predictions on reports
2. If prediction is **incorrect**:
   - Click **"Incorrect"** on report
   - Select **correct** disaster type
   - Add brief comment (optional)
3. **AI learns** from your feedback
4. Accuracy improves over time

### Target: 95%+
- Current accuracy: **93%**
- With feedback: **95%+**
- Goal: Continuous improvement

---

## System Statistics

### Available Reports
- **Total Incidents**: All time records
- **This Month**: Current month incidents
- **This Week**: Last 7 days
- **Today**: 24 hour period

### Response Times
- **Average Response Time**: How fast teams arrive
- **Fastest Response**: Best response time
- **Slowest Response**: Needs improvement

### Coverage
- **354 Locations**: All barangays mapped
- **46 Barangays**: Complete city coverage
- **Real-time Tracking**: Live responder locations

---

## Keyboard Shortcuts (Desktop)

| Action | Shortcut |
|--------|----------|
| Refresh Data | `Ctrl + R` |
| Full Screen | `F11` |
| Developer Tools | `F12` |

---

## Troubleshooting

### Can't Login?
- Check **email** is correct
- Verify **password**
- Clear browser **cache**
- Try **different browser**

### Not Receiving Alerts?
- Check **notifications** enabled
- Verify **internet connection**
- Restart the app
- Check **location permissions**

### Location Not Showing Correctly?
- Ensure **location services** ON
- Give app **location permission**
- WiFi + GPS best for accuracy
- Allow few seconds for GPS lock

### App Crashes?
- **Close** and **reopen** app
- **Clear cache**: Settings → App → Clear Cache
- **Reinstall** if problems persist
- Contact admin if issue continues

---

## Contact & Support

### System Administrator
- Email: `admin@emergencycity.gov.ph`
- Phone: Provided by admin
- Hours: 24/7 for emergencies

### Feedback
- Report bugs in app
- Suggest features
- Share your experience

### Emergency
- Call **911** for life-threatening emergencies
- Use **SALBA app** for general alerts

---

## Version Information
- **System Version**: 1.0
- **Last Updated**: March 2026
- **Supported Devices**: Android 10+, iOS 14+
- **Locations**: 354 barangay/purok coverage

---

**Emergency Response, Starts Here** 🚨
