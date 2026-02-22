# Frontend API Call Optimizations

## Changes Made to AttendanceSheet.jsx

### 1. ✅ Request Deduplication & Caching
Added request deduplication and short-term caching to `fetchJson()` function:
- **Request Deduplication**: Prevents multiple simultaneous calls to the same endpoint
- **5-second Cache**: GET requests are cached for 5 seconds to prevent rapid duplicate calls
- **Pending Request Tracking**: If a request is already in flight, subsequent calls wait for the same promise

**Benefits:**
- Eliminates duplicate API calls when component re-renders
- Reduces server load significantly
- Faster response times for cached requests

### 2. ✅ Fixed useEffect Dependencies

#### Import Tab (Lines 214-220)
**Before:**
```javascript
useEffect(() => {
  if (activeTab === 'import') {
    loadExistingBatches();
    loadDevices();
    loadShiftStatus();
  }
}, [activeTab, month, year]); // ❌ Devices reloaded on every month/year change
```

**After:**
```javascript
// Load devices only when tab becomes active
useEffect(() => {
  if (activeTab === 'import') {
    loadExistingBatches();
    loadDevices();
    loadShiftStatus();
  }
}, [activeTab]); // ✅ Devices only load when tab changes

// Reload batches separately when month/year changes
useEffect(() => {
  if (activeTab === 'import') {
    loadExistingBatches();
  }
}, [month, year]);
```

**Benefits:**
- Devices are only loaded once when switching to import tab
- Batches reload separately when needed (month/year change)

#### Monthly Summary Tab (Lines 886-891)
**Before:**
```javascript
useEffect(() => { 
  if (activeTab === "monthly") {
    loadSummaryDevices();
    loadSummary(); 
  }
}, [activeTab, month, year, selectedDeviceForSummary]); // ❌ Devices reloaded on every change
```

**After:**
```javascript
// Load devices only when tab becomes active
useEffect(() => { 
  if (activeTab === "monthly") {
    loadSummaryDevices();
  }
}, [activeTab]); // ✅ Devices only load when tab changes

// Load summary when filters change (only if tab is active)
useEffect(() => { 
  if (activeTab === "monthly" && month && year) {
    loadSummary(); 
  }
}, [activeTab, month, year, selectedDeviceForSummary]);
```

**Benefits:**
- Devices are only loaded once when switching to monthly tab
- Summary reloads only when filters actually change
- Prevents unnecessary device API calls

### 3. ✅ Parameter Validation
Added validation in `loadSummary()` to prevent incomplete API calls:

```javascript
const loadSummary = async () => {
  // Validate parameters before making API call
  if (!month || !year) {
    console.warn('⚠️ Cannot load summary: month or year is missing', { month, year });
    setSummaryError("Please select both month and year");
    setSummaryRows([]);
    return;
  }
  // ... rest of function
};
```

**Benefits:**
- Prevents API calls with incomplete parameters (e.g., `summary?month=12` without year)
- Better error handling and user feedback

## Expected Results

### Before Optimizations:
- **~10-15 API calls** per page load
- Multiple duplicate calls to same endpoints
- Devices loaded multiple times unnecessarily
- Some calls with incomplete parameters

### After Optimizations:
- **~3-5 API calls** per page load
- No duplicate calls (deduplication)
- Devices loaded only once per tab switch
- All calls have complete parameters
- Cached responses for rapid re-renders

## Testing

To verify improvements:

1. **Open Browser DevTools → Network Tab**
2. **Navigate to `/attendance` page**
3. **Count total requests:**
   - Should see: `/attendance/employees` (1 call)
   - Should see: `/devices?activeOnly=true` (1 call per tab)
   - Should see: `/attendance/summary?month=X&year=Y` (1 call with complete params)
4. **Switch tabs** - devices should only load once per tab
5. **Change month/year** - summary should reload, but devices should NOT reload
6. **Check for duplicate calls** - should see deduplication messages in console

## Additional Recommendations

### Future Improvements:

1. **Use React Query or SWR** for better caching and request management:
   ```bash
   npm install @tanstack/react-query
   # or
   npm install swr
   ```

2. **Add Response Caching** - Use browser's HTTP cache headers (already added in backend)

3. **Debounce Filter Changes** - If filters trigger API calls, debounce them:
   ```javascript
   import { useDebouncedCallback } from 'use-debounce';
   ```

4. **Lazy Load Data** - Only load data when component is visible/active

## Files Modified

- `src/routes/Attendance/AttendanceSheet.jsx`
  - Added request deduplication and caching to `fetchJson()`
  - Fixed useEffect dependencies for import tab
  - Fixed useEffect dependencies for monthly summary tab
  - Added parameter validation in `loadSummary()`

## Notes

- Request cache has a 5-second TTL (can be adjusted)
- Deduplication works for simultaneous requests only
- Backend caching headers (added separately) work together with frontend optimizations
