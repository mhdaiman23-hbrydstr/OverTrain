# Navigation Race Condition - Debug Guide

## Quick Repro Steps

1. **Start app and ensure you have an active program**
   - If not, start one first

2. **Open browser DevTools** (`F12`)
   - Go to Console tab

3. **Run this command to see available log utilities:**
   ```javascript
   window.__debugLogs
   ```

4. **Reproduce the issue - Click tabs rapidly:**
   - Start in Train tab
   - Click: Programs → Analytics → Programs → Train (quick succession)
   - Watch if you get pulled back to Train unexpectedly

5. **Capture logs:**
   ```javascript
   // Export logs as text
   const logs = window.__debugLogs.exportText()
   console.log(logs)

   // Or download directly
   window.__debugLogs.downloadLogs('navigation-issue.log')
   ```

## Available Debug Commands

```javascript
// Start/stop capturing
window.__debugLogs.start()
window.__debugLogs.stop()

// Get all logs
window.__debugLogs.getLogs()

// Get logs by source (component)
window.__debugLogs.getBySource('TrainSection')
window.__debugLogs.getBySource('ProgramsSection')
window.__debugLogs.getBySource('HomePage')

// Get recent logs (last N seconds)
window.__debugLogs.getRecent(10) // Last 10 seconds

// Export logs
window.__debugLogs.exportText()    // Human readable
window.__debugLogs.exportJSON()    // JSON format

// Download logs to file
window.__debugLogs.downloadLogs('my-logs.log')

// Print logs to console
window.__debugLogs.print()

// Clear logs
window.__debugLogs.clear()
```

## What to Look For

When analyzing logs, look for:

1. **Navigation sequence** - What order are view changes happening?
2. **Event timings** - Are `programChanged` events firing at unexpected times?
3. **async operations** - Are multiple `loadProgramData` calls overlapping?
4. **Race conditions** - Does `setCurrentView` get called multiple times rapidly?

## Expected Logs During Quick Navigation

When switching from Train → Programs → Analytics normally:

```
[HH:MM:SS.mmm] [LOG] [HomePage] Current view changing
[HH:MM:SS.mmm] [LOG] [ProgramsSection] Program changed, invalidating template cache...
[HH:MM:SS.mmm] [LOG] [ProgramsSection] Loading data...
[HH:MM:SS.mmm] [LOG] [HomePage] Current view changing
[HH:MM:SS.mmm] [LOG] [Analytics] Loading analytics...
```

## If Issue Reproduces

You should see something like:

```
[HH:MM:SS.mmm] [LOG] [HomePage] Current view changing (from "train" to "programs")
[HH:MM:SS.mmm] [LOG] [ProgramsSection] Loading...
[HH:MM:SS.mmm] [LOG] [HomePage] Current view changing (from "programs" to "analytics")
[HH:MM:SS.mmm] [LOG] [TrainSection] Active program changed event received, reloading...
[HH:MM:SS.mmm] [LOG] [HomePage] Current view changing (back to "train" - UNEXPECTED!)
```

This would indicate a `programChanged` event firing when it shouldn't, causing a view redirect.

## Steps to Share Results

1. **Reproduce the issue**
2. **Run:** `window.__debugLogs.downloadLogs('navigation-race.log')`
3. **Save the downloaded file**
4. **Share the log file** for analysis

## Potential Root Causes

Based on code analysis, the issue is likely in one of these areas:

1. **ProgramStateManager.getActiveProgram()** - Might be firing `programChanged` event unintentionally
2. **loadData() in ProgramsSection** - Might be called during navigation and invalidating cache
3. **handleProgramChange in HomePage** - Might redirect to train if program state changes during navigation
4. **Race between getCurrentView logic and programChanged event**

---

Let me know once you've reproduced it and I'll analyze the logs! 🔍
