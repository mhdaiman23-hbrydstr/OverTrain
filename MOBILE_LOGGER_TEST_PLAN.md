# Mobile Logger Test Plan (Active Program Core)

**Focus**: Active program logging - the core functionality. Test these 6 critical scenarios on iOS and Android mobile devices.

**Last Updated**: 2025-11-02
**Build**: Vercel deployment (a3c22ee + ffe77c1)
**Tested On**: (fill in device/OS during testing)

---

## **Pre-Test Checklist**

- [ ] Vercel deployment is live and accessible on mobile
- [ ] iOS Safari or Android Chrome is being tested
- [ ] Network: Test both WiFi and offline scenarios
- [ ] Storage: Monitor localStorage/IndexedDB usage (should not exceed 50MB)
- [ ] Console: Open DevTools to monitor logs and errors

---

## **Test 1: Exercise Replacement with Notes Cleanup** ⭐ CRITICAL

**What it tests**: When replacing an exercise, the old exercise's notes should NOT carry over to the new exercise.

**Setup**:
1. Start a new workout (any program)
2. Click on first exercise's 3-dot menu → "Edit Exercise Notes"
3. Add a note: `"OLD EXERCISE NOTE - Should not appear after replacement"`
4. Pin the note (check the pin icon)
5. Save the note

**Test Steps**:
1. Click 3-dot menu on same exercise → "Replace Exercise"
2. Select a different exercise from the library (e.g., if it was "Squat", change to "Leg Press")
3. Verify sets are reset (weight = 0, reps = 0, completed = false)
4. Click 3-dot menu on the NEW exercise → "View Exercise Notes"

**Expected Result** ✓:
- Notes dialog should be EMPTY or show no notes
- No text matching "OLD EXERCISE NOTE" should appear
- Suggested weight should be 0 (fresh start)

**Failure Indicators** ✗:
- Old notes appear on new exercise
- Pinned notes carry over to new exercise
- Console error: `"Failed to delete exercise notes on replacement"`

**Why This Matters**:
- Prevents confusing/misleading notes from appearing on wrong exercises
- Ensures data integrity when swapping exercises mid-program
- Tests the new `ExerciseNotesService.deleteExerciseNotes()` fix

**Console Logs to Watch**:
```
[useWorkoutSession] Cleaning up notes for replaced exercise: <exercise-id>
```

---

## **Test 2: Debounced Save + Completion Ordering** ⭐ CRITICAL

**What it tests**: When you rapidly edit set weights/reps then complete the workout, all edits are persisted before completion is marked.

**Setup**:
1. Start a workout with at least 2 sets in first exercise
2. Go to first set

**Test Steps**:
1. Rapidly tap/type in the weight field: `135` (quickly, no waiting between keystrokes)
2. Immediately tap reps field and type: `5`
3. Immediately tap next field (weight for second set) and type: `140`
4. WITHOUT WAITING, click "Complete Exercises to Finish Workout"
5. Fill out completion dialog (can skip notes)
6. Click "Complete Workout"

**Expected Result** ✓:
- Completion dialog shows correct stats:
  - "Total Sets: 2" or whatever you logged
  - "Completed: 100%" (all sets marked complete)
  - Muscle group volume shows correct totals
- Next week shows `suggestedWeight` based on weights you just entered (135, 140)
- Console shows:
  ```
  [WorkoutLogger.completeWorkout] Flushing pending set completions before completing workout
  [WorkoutLogger.completeWorkout] Using provided workout data (has latest set flags)
  ```

**Failure Indicators** ✗:
- Completion dialog shows "Completed: 0%" even though you logged all sets
- Muscle group stats are blank or show wrong numbers
- Next week shows suggestedWeight = 0 instead of 135/140
- Weights appear blank when you switch to next exercise mid-logging

**Why This Matters**:
- Rapid input is common on mobile (user excitement to log)
- Debounced saves (300ms batching) could lose data if completion happens first
- Tests the `flushPendingWorkoutSave()` fix before completion

**Console Logs to Watch**:
```
Debounced sync triggered for weight/reps update
[WorkoutLogger.completeWorkout] Flushing pending set completions before completing workout
```

---

## **Test 3: Offline Workout Completion + Sync** ⭐ CRITICAL

**What it tests**: Completing a workout while offline should still work, with sync happening when online.

**Setup**:
1. Start a workout

**Test Steps**:
1. Log 3 sets with various weights (e.g., 135, 140, 145)
2. BEFORE completing, toggle device to airplane mode (or disable WiFi)
3. Verify sidebar shows "Offline" status indicator
4. Complete all remaining sets
5. Click "Complete Exercises to Finish Workout"
6. Fill out completion dialog
7. Click "Complete Workout"

**Expected Result** ✓:
- UI responds immediately (no spinner forever)
- Completion dialog appears and shows correct stats
- Sidebar shows "Offline" throughout (not "Syncing")
- Toast message or indication that data is saved locally
- Turn WiFi/airplane mode OFF
- Sidebar transitions to "Syncing" then "Synced"
- Navigate to analytics/history and verify completed workout appears with correct weights

**Failure Indicators** ✗:
- Completion hangs (spinner never resolves)
- Completion dialog never appears
- After going online, weights show as 0
- Error toasts about sync failure (with no recovery option)
- Sidebar shows "Sync failed" without retry mechanism

**Why This Matters**:
- Mobile users lose connection frequently (moving between locations)
- Critical data (completed workouts) must persist locally
- Set queue and debounced saves must handle offline gracefully
- Tests `ConnectionMonitor.isOnline()` and queue retry logic

**Console Logs to Watch**:
```
[ConnectionMonitor] Status changed to offline
[WorkoutLogger] Queue offline: Set 1 logged (will retry when online)
[ConnectionMonitor] Status changed to online
[ConnectionMonitor] Syncing queued items...
```

---

## **Test 4: Notes Persistence Through Week Transitions** ⭐ IMPORTANT

**What it tests**: Pinned exercise notes carry over to the same exercise in the next week.

**Setup**:
1. Complete a full week (or at least one day)
2. While logging, add a note to an exercise: `"This exercise feels good, keep weight"`
3. Pin the note
4. Complete the workout and week

**Test Steps**:
1. Start the next week (same program)
2. Click on the SAME exercise that had the pinned note
3. Click 3-dot menu → "View Exercise Notes"

**Expected Result** ✓:
- Note appears: `"This exercise feels good, keep weight"`
- Note is still pinned (shows pin icon as active)
- Suggested weight is based on previous week's performance

**Failure Indicators** ✗:
- Note doesn't appear in next week
- Cache invalidation error in console
- Notes show as empty when changing weeks
- Pinned flag is lost

**Why This Matters**:
- Pinned notes help users remember context across weeks
- Tests `ExerciseNotesService.invalidateCache()` on week change
- Tests week-to-week progression note carryover

---

## **Test 5: Exercise Movement & Reordering** ⭐ IMPORTANT

**What it tests**: Moving exercises up/down in workout saves correctly.

**Setup**:
1. Start a workout with 3+ exercises

**Test Steps**:
1. Click on exercise at position 2 (middle) → 3-dot menu
2. Click "Move Up"
3. Verify it moves to position 1
4. Click same exercise's menu again → "Move Down"
5. Verify it moves back to position 2
6. Add a set completion to first exercise (log a weight)
7. WITHOUT waiting, move another exercise up
8. WITHOUT waiting, complete the workout

**Expected Result** ✓:
- Exercise order persists (appears in correct order next workout)
- Set completions aren't lost when moving exercises around
- Muscle group stats reflect correct exercises

**Failure Indicators** ✗:
- Exercise order reverts when you switch/refresh
- Set data is lost or assigned to wrong exercise
- Console shows "Cannot find exercise" errors
- Completion dialog shows wrong muscle groups

**Why This Matters**:
- Users sometimes want to reorder exercises on-the-fly
- Tests save ordering without debounce blocking
- Ensures set data stays with correct exercise during reorder

---

## **Test 6: Out-of-Bounds Weight Detection (Rapid Input)** ⭐ IMPORTANT

**What it tests**: When you enter a weight outside the suggested range, a banner appears. This should work even with rapid input.

**Setup**:
1. Start a workout where exercises have `suggestedWeight` (from previous week's performance)
2. Look for a weight that's been suggested (check UI or 1RM calculation)

**Test Steps**:
1. Tap weight field for an exercise
2. Rapidly type a weight WAY higher than suggested (e.g., if suggested is 185, type 250)
3. Watch the UI

**Expected Result** ✓:
- Within 500ms, a banner appears warning: "Weight out of bounds"
- Banner shows min/max range for that exercise
- You can still continue (no blocking, just a warning)
- Reps adjust automatically if weight change triggers volume compensation

**Failure Indicators** ✗:
- No banner appears
- Banner appears very slowly (>2 seconds)
- Banner gets stuck/doesn't disappear when weight is corrected
- Reps don't adjust when they should
- Console shows bounds check errors

**Why This Matters**:
- Rapid input is common on mobile
- Debounced bounds checking (500ms) shouldn't miss out-of-range weights
- Tests `checkExerciseBoundsStatus()` with debouncing
- Prevents injury from unexpectedly heavy weights

**Console Logs to Watch**:
```
Debounced bounds check for banner (500ms delay for typing)
Out-of-bounds exercise found: exercise-id
```

---

## **Summary Matrix**

| Test | Feature | Active Program Impact | Priority | Status |
|------|---------|----------------------|----------|--------|
| 1 | Notes cleanup on replace | ✓ Notes isolated per exercise | CRITICAL | new |
| 2 | Debounce + completion | ✓ Weights/reps persisted correctly | CRITICAL | fixed |
| 3 | Offline completion | ✓ Data survives network loss | CRITICAL | fixed |
| 4 | Notes week transition | ✓ Context preserved across weeks | IMPORTANT | existing |
| 5 | Exercise movement | ✓ Sets stay with correct exercise | IMPORTANT | review |
| 6 | Weight bounds (rapid) | ✓ Safety warnings work with typing | IMPORTANT | existing |

---

## **Post-Test Reporting**

For each test, record:

```
Test: [Test Name]
Device: [iPhone/Android] [OS Version]
Network: [WiFi/Offline/Mobile Data]
Status: [PASS/FAIL]
Issues: [None / List any problems]
Console Errors: [Copy any red errors from DevTools]
Screenshots: [Attach if relevant]
Notes: [Any observations]
```

---

## **Known Fixes Applied**

- ✅ **Progression Suggestion Fix** (a3c22ee): Workout state data now passed directly to completion, ensuring latest weights/reps are saved
- ✅ **Exercise Notes Cleanup** (ffe77c1): Exercise notes deleted when exercises replaced or removed
- ✅ **Debounce Flush Ordering** (55fbfb8): `flushPendingWorkoutSave()` called before completion to ensure rapid edits are persisted
- ✅ **Offline Handling** (02da038): `requestIdleCallback()` prevents UI freeze during save
- ✅ **Queue Flushing** (60714f4): Set completion queue flushed before workout completion

---

## **Reference: Active Program Logger Data Flow**

```
User Action
  ↓
handleCompleteSet / updateSet
  ↓
setWorkout (React state update) → UI renders immediately
  ↓
scheduleWorkoutSave (debounce 300ms)
  ↓
(User can continue logging while debounce is pending)
  ↓
User clicks "Finish Workout"
  ↓
handleCompleteWorkout:
  1. flushPendingWorkoutSave() ← CRITICAL: Wait for debounce to complete
  2. saveCurrentWorkout(workoutWithNotes)
  3. completeWorkout(workoutWithNotes) ← CRITICAL: Pass React state, not localStorage
  4. Advance program week
  5. Show completion dialog with stats
  ↓
Next week:
  1. Load from history (with all set weights)
  2. Calculate progression suggestions
  3. Pre-fill suggestedWeight based on performance
```

---

## **Debugging Tips**

**Check localStorage**:
```javascript
// In browser DevTools console:
JSON.parse(localStorage.getItem('liftlog_in_progress_workouts_YOUR_USER_ID'))
JSON.parse(localStorage.getItem('liftlog_workouts_YOUR_USER_ID'))
JSON.parse(localStorage.getItem('liftlog_exercise_notes'))
```

**Force sync**:
```javascript
// In browser DevTools console:
const { ConnectionMonitor } = await import('@/lib/connection-monitor');
await ConnectionMonitor.forceSyncSets()
```

**Check sync status**:
```javascript
// In browser DevTools console:
const { ConnectionMonitor } = await import('@/lib/connection-monitor');
ConnectionMonitor.getStatus()
```

**Monitor set queue**:
```javascript
// Watch console for: [WorkoutLogger] Logging set: ...
```

---

## **Acceptance Criteria**

All 6 tests must **PASS** for deployment to production:
- [ ] Test 1: Notes cleanup works (no data leakage)
- [ ] Test 2: Rapid input doesn't lose data before completion
- [ ] Test 3: Offline completion works + sync on reconnect
- [ ] Test 4: Pinned notes carry to next week
- [ ] Test 5: Exercise reordering persists
- [ ] Test 6: Weight bounds warnings appear for rapid input

No critical failures with no recovery path.
