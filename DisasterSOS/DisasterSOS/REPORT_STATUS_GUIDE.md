# 📋 Report Status Tracking Guide - DisasterSOS Mobile App

## Overview
Users can now easily track the status of all their submitted emergency reports directly in the **"My Reports"** screen. This feature shows real-time updates on whether reports are **Pending**, **Ongoing**, or **Resolved**.

---

## 🎯 How Users Can Check Report Status

### Step 1: Open "My Reports" Tab
- Open the DisasterSOS app
- Navigate to the **"My Reports"** tab (often the 4th tab in the bottom navigation)
- You'll see a list of all your submitted emergency reports

### Step 2: View Status Badge
Each report card displays:
- **Disaster Type** (Fire, Flood, Earthquake, etc.)
- **Status Badge** (colored indicator showing current status)
- **Location** where the emergency was reported
- **Submission Time**
- **Severity Level** (Critical, High, Moderate, Low)
- **Preview of your description** (first 2 lines)

### Step 3: Tap for Detailed Information
- **Tap any report card** to open a detailed modal showing:
  - Full disaster type
  - Current status (with explanation)
  - Complete location name
  - Full severity level
  - Your complete report description/note
  - Reporter name (if provided)
  - Exact submission timestamp
  - Status explanation in plain language

---

## 🎨 Status Color Codes

### Status Meanings & Colors:

| Status | Color | Meaning |
|--------|-------|---------|
| **Pending** | 🟡 Yellow | Your report has been received but not yet assigned to a rescue team |
| **Ongoing** | 🔵 Blue | A rescue team is actively responding to your emergency |
| **Resolved** | 🟢 Green | Your emergency has been handled and resolved |
| **Declined** | 🔴 Red | Your report could not be processed (may need clarification) |

---

## 📊 What Each Status Means

### 🟡 **Pending Status**
```
Your report is waiting in the queue
↓
It will be reviewed by the admin team
↓
Once verified, a rescue team will be assigned
```
**What to expect:** Response within 5-15 minutes depending on incident severity

### 🔵 **Ongoing Status**
```
A rescue team has been assigned
↓
They are currently responding to your emergency
↓
You can see the team on the map
```
**What to expect:** The rescue team is mobile and en route or already on-site

### 🟢 **Resolved Status**
```
The rescue team has completed their response
↓
Your emergency has been handled
↓
You can now close this report
```
**What to expect:** Final status - no further action needed (unless you submit another report)

### 🔴 **Declined Status**
```
The report could not be processed
↓
This may be due to:
  • Invalid location coordinates
  • Unclear emergency type
  • Insufficient information
↓
You can submit a new report with more details
```
**What to do:** Re-submit with clearer information

---

## 🔄 Refreshing Your Reports

### To get the latest status updates:
1. **Pull down to refresh** - Swipe the report list downward to refresh
2. **Status updates automatically** - New statuses appear within 10-30 seconds
3. **Check the timestamp** - Shows exactly when your report was submitted

---

## 💡 Tips for Tracking Your Report

### Best Practices:

✅ **DO:**
- Check your reports regularly for status updates
- Provide detailed descriptions in your report
- Stay in the area to guide rescue teams if needed
- Refresh the list periodically for latest updates

❌ **DON'T:**
- Submit duplicate reports for the same incident
- Close the app immediately after reporting
- Panic if status takes a few minutes to update

---

## 📱 Report Details You'll See

### On the Report Card (Quick View):
- 🔴 Disaster type icon with name
- 🔷 Status badge (color-coded)
- 📍 Location name
- 🕐 Time submitted
- ⚠️ Severity level
- 📝 First 2 lines of your description

### In the Detailed View (Tap to Open):
- Full disaster type name
- **Current Status** with explanation
- Complete location name with coordinates
- Full severity level description
- Your complete report description/note
- Reporter contact information (if provided)
- Full submission date & time
- Status update message explaining what's happening

---

## 🔧 Troubleshooting Status Issues

### "My report isn't showing up"
- **Solution:** Pull down to refresh the list
- **Why:** There might be a slight sync delay with the server

### "Status says Pending but it's been 20 minutes"
- **Solution 1:** Refresh the list
- **Solution 2:** Check your internet connection
- **Solution 3:** The admin team may be reviewing multiple reports

### "Can't see my report details"
- **Solution:** Make sure you have:
  - Active internet connection
  - Updated version of DisasterSOS app
  - Sufficient storage space

---

## 📞 When to Contact Support

Contact the emergency hotline if:
- Your report shows **"Declined"** and you need clarification
- Status hasn't changed after **30 minutes**
- You need to add additional information
- You want to withdraw or mark a report as false alarm

---

## 🚨 Emergency Priority System

### Reports are prioritized by:
1. **Severity Level** - Critical > High > Moderate > Low
2. **Location Proximity** - Closer incidents get faster response
3. **Availability** - Available rescue teams are dispatched first
4. **Active Incidents** - Multiple reports at same location = CRITICAL escalation

---

## 📈 Report Management Features

### Additional Actions Available:
- **Clear History** - Remove all reports from view (data still saved)
- **Refresh** - Get latest status updates
- **View Details** - See full report information
- **Share Location** - Share incident location with friends/family

---

## 🌍 Integration with Admin Dashboard

When you submit a report:
1. **You see:** Status badge in your app
2. **Admin sees:** Real-time alert in their dashboard
3. **System does:** ML verification + auto-priority assignment
4. **Team gets:** Alert notification → Map view → Route optimization

---

## 🔐 Privacy & Data

Your reports are:
- ✅ **Visible only to you** (in your personal list)
- ✅ **Visible to authorized admin/rescue teams** (for response)
- ✅ **Never shared publicly** (unless you explicitly share)
- ✅ **Deleted after 90 days** (unless you mark as important)

---

## 📚 Quick Reference

### Status Update Timeline (Typical):

```
0 min   → Report submitted → Status: PENDING
2-5 min → Reviewed by admin → Status: PENDING (being verified)
5-10 min→ Team assigned     → Status: ONGOING (team en route)
10-20 min→ Team arrives    → Status: ONGOING (on-site)
15-30 min→ Emergency handled → Status: RESOLVED
```

**⚠️ These times vary based on incident severity and team availability**

---

## ❓ FAQ

**Q: How often does my status update?**
A: Every 10-30 seconds when a change occurs. Otherwise, it updates when you refresh.

**Q: Can I cancel a report once submitted?**
A: Yes, you can withdraw it. Contact admin or wait for it to resolve naturally.

**Q: What if I need to add more information?**
A: Open the detailed view and press "Contact Admin" to send an update.

**Q: Do all my old reports stay visible?**
A: Yes, they're kept for 90 days for tracking purposes.

**Q: Can rescue teams see my description?**
A: Yes, they see your full note to help them respond appropriately.

---

**Last Updated:** April 2026
**Feature Version:** 1.0
**Supported on:** DisasterSOS App v2.0+
