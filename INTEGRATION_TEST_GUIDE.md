# Integration Testing Guide

## Pre-Flight Checklist

### ✅ Backend Requirements
- [ ] MongoDB running on localhost:27017
- [ ] Node.js server running on localhost:5000
- [ ] `/api/reports` endpoint accessible
- [ ] `/api/reports/export/csv` endpoint accessible
- [ ] JWT authentication working
- [ ] Admin user account created

### ✅ Frontend Requirements
- [ ] React dev server running on localhost:3000
- [ ] No console errors (F12)
- [ ] Network requests visible in DevTools
- [ ] Dark mode toggle working
- [ ] Theme persists on refresh

---

## Test Plan

### Phase 1: API Endpoint Validation

#### Test 1.1: Basic API Connectivity
```bash
# Test without filters
curl -X GET "http://localhost:5000/api/reports" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** 200 response with data array

#### Test 1.2: Severity Filter
```bash
curl -X GET "http://localhost:5000/api/reports?severity=critical" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** Only critical severity reports

#### Test 1.3: Status Filter
```bash
curl -X GET "http://localhost:5000/api/reports?status=Active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** Only Active status reports

#### Test 1.4: Search Filter
```bash
curl -X GET "http://localhost:5000/api/reports?search=fire" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** Reports containing 'fire' in note/type

#### Test 1.5: Combined Filters
```bash
curl -X GET "http://localhost:5000/api/reports?severity=high&status=Active&search=fire" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** All filters applied correctly

#### Test 1.6: Pagination
```bash
curl -X GET "http://localhost:5000/api/reports?page=2&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.pagination'
```
**Expected:** `page: 2, limit: 10, hasNextPage: true/false`

---

### Phase 2: Frontend Integration Tests

#### Test 2.1: Open Reports Tab
1. Navigate to http://localhost:3000
2. Login with admin credentials
3. Click "Alerts & Reports" tab
4. **Expected:** Reports table loads with all data

#### Test 2.2: Severity Filter - Single Selection
1. Click Severity dropdown
2. Select "Critical"
3. **Expected:** 
   - Table updates immediately
   - Only critical reports show
   - Console shows: `[API] Fetching reports with filters: {severity: "Critical",...}`
   - Console shows: `[API] ✓ Fetched X reports`

#### Test 2.3: Severity Filter - Reset
1. Select "All Severity"
2. **Expected:** All severity levels displayed

#### Test 2.4: Status Filter - Multiple Changes
1. Select Status = "Active"
2. ✅ Verify: Only Active status
3. Change to Status = "Resolved"  
4. ✅ Verify: Only Resolved status
5. Change to Status = "All"
6. ✅ Verify: All statuses shown

#### Test 2.5: Search Filter
1. Enter "fire" in search box
2. **Expected:**
   - Table updates with matching results
   - Works with other filters

#### Test 2.6: Combined Filters
1. Set Severity = "High"
2. Set Status = "Active"
3. Enter Search = "flood"
4. **Expected:** All three filters applied simultaneously
5. Clear each filter to verify isolation

#### Test 2.7: Loading State
1. Apply filter on slow network (DevTools throttle to "Slow 3G")
2. **Expected:**
   - Loading spinner appears
   - "Loading reports..." text shown
   - Export button disabled
3. Network returns to normal
4. **Expected:** Spinner disappears, data loads

#### Test 2.8: Error Handling
1. Disable network (DevTools Offline)
2. Trigger filter change
3. **Expected:**
   - Error message displayed
   - Console shows: `[API] ✗ Failed to fetch reports`
   - "Network Error" or similar message
4. Re-enable network
5. **Expected:** Can fetch data again

---

### Phase 3: Export Functionality Tests

#### Test 3.1: Basic Export
1. Click "Export" button
2. **Expected:**
   - Button shows "⏳ Exporting..."
   - CSV file downloads: `disaster_reports_YYYY-MM-DD.csv`
   - Success message: "✓ Reports exported successfully!"
   - Button returns to normal state

#### Test 3.2: Export with Filters Applied
1. Set Severity = "Critical"
2. Click Export
3. **Expected:**
   - Downloaded CSV contains only critical reports
   - Verify by opening CSV in Excel/text editor

#### Test 3.3: Export CSV Format Validation
Opening the exported CSV:
```
ID,Type,Location,Severity,Status,Submitter,Submitted Date,Resolved By,Notes
"ALT-2024-001","Fire","Downtown","critical","Active","John Doe","3/23/2024, 2:32:00 PM","N/A","Building collapse"
```
**Expected:**
- Proper header row
- Quoted fields with commas
- Special characters escaped
- All filtered data included
- No extra rows

#### Test 3.4: Export with No Results
1. Apply filter with no matching reports
2. Try to export
3. **Expected:** Success or proper error handling

#### Test 3.5: Export During Slow Connection
1. Throttle to "Slow 3G"
2. Click Export
3. **Expected:**
   - "⏳ Exporting..." state visible
   - Still downloads when complete
   - Does not timeout

---

### Phase 4: Dark Mode Testing

#### Test 4.1: Filter UI in Dark Mode
1. Enable Dark Mode (Settings tab → Dark Mode button)
2. All filter elements visible
3. All text readable
4. Hover states work
5. **Expected:** All visual elements accessible

#### Test 4.2: Table in Dark Mode
1. Verify table rows readable
2. Verify status/severity badges visible
3. Verify row hover effect works
4. **Expected:** No contrast issues

#### Test 4.3: Messages in Dark Mode
1. Trigger error (disable network)
2. **Expected:** Error message readable in dark mode
3. Trigger export success
4. **Expected:** Success message readable

---

### Phase 5: Performance Testing

#### Test 5.1: Large Dataset Filtering
1. Create 1000+ reports in database
2. Set limit to 50
3. Apply filter
4. **Expected:** Response < 2 seconds

#### Test 5.2: Search Performance
1. Search with complex term
2. **Expected:** Results returned within 2 seconds
3. No UI freezing

#### Test 5.3: Export Performance
1. Export 500 reports
2. **Expected:** Download completes within 5 seconds

#### Test 5.4: Pagination Handling
1. Have 200+ total reports
2. Paginate through results
3. **Expected:** 
   - Each page loads correctly
   - hasNextPage/hasPrevPage accurate
   - No duplicate data across pages

---

### Phase 6: State Management Testing

#### Test 6.1: Filter State Persistence
1. Apply filters
2. Refresh page
3. **Expected:** Filters reset to defaults (not persisted - by design)

#### Test 6.2: Error State Recovery
1. Trigger error (offline mode)
2. See error message
3. Re-enable network
4. Apply same filter again
5. **Expected:** Works correctly, error cleared

#### Test 6.3: Export State
1. Click Export
2. Click Export again while exporting
3. **Expected:** Button remains disabled, only one export

#### Test 6.4: Multiple Filter Changes
1. Rapidly change severity, status, search
2. **Expected:** Latest filter state used, no race conditions

---

### Phase 7: Edge Cases

#### Test 7.1: Empty Search Results
1. Search for non-existent term (e.g., "xyzabc")
2. **Expected:** "No reports found" message

#### Test 7.2: Invalid Filter Values
Backend should reject, frontend should handle gracefully

#### Test 7.3: Missing Authorization
1. Remove token from localStorage
2. Try to load reports
3. **Expected:** Redirect to login OR error message

#### Test 7.4: Non-Admin User
1. Login with non-admin account
2. Try to access admin dashboard
3. **Expected:** Error or permission denied

#### Test 7.5: Special Characters in Search
1. Search for: `"test'"/\`
2. **Expected:** No errors, proper escaping

---

## Regression Testing Checklist

After each deployment, verify:

- [ ] All filter dropdowns functional
- [ ] Search input accepts text
- [ ] Export button downloads file
- [ ] Loading states appear
- [ ] Error messages display
- [ ] Dark mode colors correct
- [ ] No console errors
- [ ] Network requests have correct parameters
- [ ] Response format matches documentation
- [ ] Pagination info accurate

---

## Performance Benchmarks

Target metrics:
| Operation | Target | Acceptable |
|-----------|--------|------------|
| List reports | <1s | <2s |
| Filtered reports | <1s | <2s |
| Search | <1.5s | <3s |
| Export 100 records | <2s | <5s |
| Export 500 records | <5s | <10s |

---

## Debugging Commands

### Check API Response
```javascript
// In browser console:
fetch('/api/reports?severity=critical', {
  headers: { 'Authorization': `Bearer ${localStorage.token}` }
})
.then(r => r.json())
.then(d => console.table(d.data))
```

### Check Filter Parameters
```javascript
// Look in Network tab for request:
// GET /api/reports?severity=...&status=...&search=...
// Verify all parameters present
```

### Check State Values
```javascript
// In React DevTools, inspect:
// - reports: array of report objects
// - loadingReports: boolean
// - reportsError: string or null
// - filterSeverity, filterStatus, searchQuery: current values
```

### Browser Console Colors
```
[API] = ℹ️  Info (blue)
[API] ✓ = ✅ Success (green)  
[API] ✗ = ❌ Error (red)
```

---

## Sign Off

**Tested By:** _______________  
**Test Date:** _______________  
**Pass/Fail:** _______________  
**Issues Found:** _______________  
**Ready for Production:** [ ] Yes [ ] No

---

**Document Version:** 1.0  
**Last Updated:** March 24, 2026
