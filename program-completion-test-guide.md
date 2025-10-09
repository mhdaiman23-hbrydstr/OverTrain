# Program Completion Test Guide

## 🎯 Objective
Test the "Finish Program" functionality when completing the last workout of the last week.

## 📋 Pre-Test Setup

### 1. Run the Reset Script
Copy and paste this script into your browser console:

```javascript
// Paste the contents of reset-week2-day3-for-completion-test.js here
```

This will:
- Clear Week 2, Day 3 completion data
- Reset program state to Week 2, Day 3 (incomplete)
- Clear cache conflicts
- Auto-refresh the page

### 2. Verify Reset State
After the page refresh, check:
- Calendar shows Week 2, Day 3 as red (current/incomplete)
- Program progress shows 5/6 workouts completed (83.3%)
- Week 2, Day 3 shows no previous workout data

## 🧪 Testing Steps

### Step 1: Navigate to Final Workout
1. Click on Week 2, Day 3 in the calendar
2. Verify it loads the correct workout (Test Workout C)
3. Check that all sets are empty/unfilled

### Step 2: Complete the Workout
1. **Exercise 1: Barbell Front Squat** - Complete all 3 sets
2. **Exercise 2: Overhead Press** - Complete all 3 sets  
3. **Exercise 3: Barbell Curls** - Complete all 3 sets
4. Click "Complete Workout" button

### Step 3: Verify Completion Flow
**Expected Sequence:**
1. ✅ Workout completion dialog appears
2. ✅ Program completion popup appears (this is what we're testing)
3. ✅ Program summary shows statistics
4. ✅ Options to start new program or view history

## 🎯 Expected Results

### ✅ Success Indicators
- **Program Completion Popup**: Should appear immediately after workout completion
- **Program Summary**: Shows total workouts, completion rate, duration
- **Progress**: Shows 6/6 workouts completed (100%)
- **Navigation**: Can start a new program or view completed programs
- **Calendar**: Shows no active program
- **Database**: No 409 errors in console

### ❌ Failure Indicators
- No program completion popup appears
- Popup appears but clicking does nothing
- Progress stuck at 83.3% instead of 100%
- Program remains active instead of moving to history
- 409 database errors in console
- Calendar still shows old program as active

## 🔍 Debugging Commands

If issues occur, run these in browser console:

### Check Program State
```javascript
const program = JSON.parse(localStorage.getItem('liftlog_active_program'));
console.log('Program:', program);
console.log('Progress:', program.progress + '%');
console.log('Current Week/Day:', program.currentWeek, program.currentDay);
```

### Check Completion Status
```javascript
const workouts = JSON.parse(localStorage.getItem('liftlog_workouts'));
const completed = workouts.filter(w => w.completed && w.user_id === 'YOUR_USER_ID');
console.log('Completed workouts:', completed.length);
```

### Force Program Recalculation
```javascript
window.ProgramStateManager?.recalculateProgress();
```

### Check Calendar State
```javascript
window.CalendarDev?.debugCalendarState();
```

## 📊 Test Results Checklist

Mark each item as you test:

- [ ] Week 2, Day 3 loads correctly (no auto-filled data)
- [ ] All exercises can be completed manually
- [ ] Workout completion dialog appears
- [ ] **Program completion popup appears** 🎯
- [ ] Program summary shows correct statistics
- [ ] Progress shows 100% complete
- [ ] Can start a new program
- [ ] Program appears in history/completed programs
- [ ] Calendar shows no active program
- [ ] No 409 database errors
- [ ] Page refresh maintains completed state

## 🚨 If Program Completion Popup Doesn't Appear

1. **Check console for errors** - Look for JavaScript errors
2. **Verify workout completion** - Check if workout was marked as completed
3. **Check program state** - Verify currentWeek/currentDay didn't advance incorrectly
4. **Manual program completion** - Try triggering completion manually:
   ```javascript
   window.ProgramStateManager?.completeWorkout('YOUR_USER_ID');
   ```

## 📝 Notes

- The 2-week test program should trigger completion after Week 2, Day 3
- This tests the same logic that would apply to longer programs
- Database sync issues (409 errors) should be resolved by the reset script
- If issues persist, check the WorkoutCompletionDialog component logic

## 🔗 Related Files

- `components/workout-completion-dialog.tsx` - Completion popup logic
- `lib/program-state.ts` - Program completion logic
- `lib/workout-logger.ts` - Workout completion handling

---

**After testing, document any issues found and the actual behavior observed.**
