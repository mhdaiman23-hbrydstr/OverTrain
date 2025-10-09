# Program Completion Testing Guide

## 🎯 Objective
Test the program completion logic with a clean 2-week test program to ensure:
1. Program ends properly after Week 2, Day 3
2. Program summary dialog appears correctly
3. No Week 7 is created
4. Calendar modal shows correct data

## 🧹 Step 1: Complete Reset
1. Open the browser console (F12)
2. Copy and paste the contents of `complete-program-reset.js`
3. Press Enter to execute
4. The page will automatically reload with a clean slate

## 📋 Step 2: Select Test Program
1. After the page reloads, go to the Programs section
2. Select the **"2-Week Test Program (DEV ONLY)"** 
3. This program is available for all experience levels and genders
4. Start the program

## 🏋️ Step 3: Complete All Workouts
The test program has:
- **Week 1**: Normal intensity (3 sets per exercise)
- **Week 2**: Deload week (2 sets per exercise)

### Workout Schedule:
- **Week 1, Day 1**: Test Workout A (Squat, Bench, Row)
- **Week 1, Day 2**: Test Workout B (Deadlift, OHP, Curls)  
- **Week 1, Day 3**: Test Workout C (Front Squat, Pull-ups, Lateral Raises)
- **Week 2, Day 1**: Test Workout A (Deload - 2 sets)
- **Week 2, Day 2**: Test Workout B (Deload - 2 sets)
- **Week 2, Day 3**: Test Workout C (Deload - 2 sets) ⭐ **FINAL WORKOUT**

### Quick Completion Method:
Use the `simple-workout-completer.js` script to auto-complete workouts:

```javascript
// For each workout, run this in console:
const currentWorkout = getCurrentWorkout();
if (currentWorkout) {
  completeWorkout(currentWorkout.id);
  console.log(`Completed: ${currentWorkout.workout_name}`);
}
```

## 🔍 Step 4: Critical Test Points

### After Week 2, Day 3 Completion:
1. ✅ **Program Summary Dialog** should appear automatically
2. ✅ **Dialog should show**:
   - Total workouts completed: 6
   - Program duration: 2 weeks
   - Completion rate: 100%
   - View Summary button should work

3. ✅ **No Week 3 should be created**
4. ✅ **UI should show** program completed state
5. ✅ **Calendar modal** should only show Week 1 and Week 2

### If Issues Occur:
Check the console for these key logs:
- `[ProgramState] Program completed!`
- `[ProgramState] Showing completion dialog...`
- `[ProgramState] Current week: 2, Current day: 3`
- `[ProgramState] Program weeks: 2`

## 🐛 Common Issues & Solutions

### Issue 1: Program continues to Week 3
**Symptoms**: Week 3, Day 1 appears after completing Week 2, Day 3
**Debug**: Check `getCurrentWorkout()` in console
**Fix**: The `isProgramCompleted()` logic in `lib/program-state.ts` needs adjustment

### Issue 2: No completion dialog
**Symptoms**: Workout completes but no summary appears
**Debug**: Check if `showProgramCompletionDialog()` is called
**Fix**: Check the completion logic in `components/workout-completion-dialog.tsx`

### Issue 3: Calendar shows Week 3
**Symptoms**: Calendar modal has Week 3 data
**Debug**: Check `generateCalendarData()` in `components/workout-calendar.tsx`
**Fix**: Ensure it respects the program's week count

## 📊 Expected Results

### Successful Test:
```
✅ Program ends after Week 2, Day 3
✅ Completion dialog appears with correct stats
✅ No Week 3 created
✅ Calendar shows only 2 weeks
✅ UI shows program completed state
```

### Test Data:
- Total workouts: 6
- Program duration: 2 weeks
- Completion rate: 100%
- Last workout: Week 2, Day 3 (Test Workout C)

## 🧪 Additional Tests

### Test 1: Incomplete Program
1. Complete only Week 1 workouts
2. Verify program continues to Week 2
3. Verify no completion dialog appears

### Test 2: Skip Workouts
1. Skip Week 1, Day 2
2. Complete other workouts
3. Verify program handles gaps correctly

### Test 3: Browser Refresh
1. Complete some workouts
2. Refresh browser
3. Verify progress is maintained
4. Continue and complete program

## 📝 Notes

### Test Program Features:
- **Quick completion**: Only 6 workouts total
- **Clear progression**: Normal week → Deload week
- **Available to all**: Works with any user profile
- **Marked clearly**: "(DEV ONLY)" in name

### Production Removal:
Remember to remove the test template before production:
```typescript
// Remove this from gymTemplates object:
"test-2week-3day-program"
```

## 🎉 Success Criteria

The test is successful when:
1. Program ends exactly after Week 2, Day 3
2. Completion dialog appears and works
3. No extra weeks are created
4. Calendar data is accurate
5. UI shows correct completion state

Once all these work correctly, the program completion logic is verified and ready for production use!
