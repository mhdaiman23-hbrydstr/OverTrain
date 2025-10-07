# Testing Guide: Automatic Deload Week System

## Quick Start

The dev server should be running at `http://localhost:3000`

## Pre-Testing Setup

### Clear Old Data (Optional but Recommended)

Open browser console (F12) and run:
```javascript
// Clear all program history and start fresh
localStorage.removeItem('liftlog_program_history')
localStorage.removeItem('liftlog_active_program')
localStorage.removeItem('liftlog_workouts')
localStorage.removeItem('liftlog_in_progress_workouts')
location.reload()
```

## Test Scenario 1: Quick Deload Verification

This is the fastest way to see if deload works:

### Step 1: Start a Program
1. Navigate to **Programs** section
2. Select **"3-Day Full Body Beginner"** (for female) or **"4-Day Upper/Lower Split"** (for male)
3. Click **"Start Program"**

### Step 2: Simulate Progress to Week 6

**Option A - Manual localStorage Edit (Fastest):**

Open browser console and run:
```javascript
// Get active program
let program = JSON.parse(localStorage.getItem('liftlog_active_program'))

// Jump to Week 6
program.currentWeek = 6
program.currentDay = 1

// Save it back
localStorage.setItem('liftlog_active_program', JSON.stringify(program))

// Reload to see Week 6
location.reload()
```

**Option B - Create Fake Week 5 Data:**

Open browser console and run:
```javascript
// Create a fake Week 5 workout for progression
const fakeWorkout = {
  id: 'test-week5-day1',
  week: 5,
  day: 1,
  workoutName: 'Full Body A',
  startTime: Date.now() - 86400000, // Yesterday
  endTime: Date.now() - 86400000 + 3600000,
  exercises: [
    {
      id: 'squat-f1',
      exerciseName: 'Barbell Back Squat',
      targetSets: 3,
      targetReps: '10-12',
      sets: [
        { id: '1', weight: 100, reps: 12, completed: true },
        { id: '2', weight: 105, reps: 12, completed: true },
        { id: '3', weight: 110, reps: 12, completed: true }
      ]
    }
  ],
  notes: 'Test data for Week 5'
}

// Add to workout history
let workouts = JSON.parse(localStorage.getItem('liftlog_workouts') || '[]')
workouts.push(fakeWorkout)
localStorage.setItem('liftlog_workouts', JSON.stringify(workouts))

// Update program to Week 6
let program = JSON.parse(localStorage.getItem('liftlog_active_program'))
program.currentWeek = 6
program.currentDay = 1
localStorage.setItem('liftlog_active_program', JSON.stringify(program))

console.log('Week 5 data created. Navigate to Train section to start Week 6.')
```

### Step 3: Start Week 6 Workout

1. Navigate to **Train** section
2. Click **"Start Workout"** for Week 6, Day 1
3. **Expected Results:**

#### Visual Verification:
- ✅ Number of sets reduced (e.g., 3 → 2)
- ✅ Suggested weights are 65% of Week 5 weights
- ✅ Rep range is reduced (e.g., "10-12" → "8-10")
- ✅ Green banner might show: "Deload week (65% reduction for recovery)"

#### Console Verification (F12 → Console tab):
Look for these messages:
```
[LinearProgressionEngine] Calculating DELOAD week
[LinearProgressionEngine] Generated per-set deload suggestions
```

#### Example Calculation:
If Week 5 was:
- Set 1: 100 lbs × 12 reps
- Set 2: 105 lbs × 12 reps  
- Set 3: 110 lbs × 12 reps

Week 6 deload should show:
- Set 1: 65 lbs (65% of 100) × 10 reps (deload rep range)
- Set 2: 68 lbs (65% of 105) × 10 reps

## Test Scenario 2: Full Program Progression

If you want to test the complete flow:

### Week-by-Week Testing

**Week 1:**
1. Start program
2. Enter starting weights (e.g., 45 lbs for squat)
3. Complete all sets
4. Finish workout

**Weeks 2-5:**
1. Start next workout
2. Verify suggested weights are +2.5% from previous week
3. Complete all sets
4. Finish workout
5. Repeat

**Week 6 (Deload):**
1. Start workout
2. **Verify deload characteristics:**
   - Reduced sets (check UI)
   - Reduced weights (65% of Week 5)
   - Reduced rep range (check "Target Reps" field)
3. Complete deload workout

## Console Commands Reference

### View Current Program State
```javascript
JSON.parse(localStorage.getItem('liftlog_active_program'))
```

### View All Workouts
```javascript
JSON.parse(localStorage.getItem('liftlog_workouts'))
```

### View In-Progress Workouts
```javascript
JSON.parse(localStorage.getItem('liftlog_in_progress_workouts'))
```

### Jump to Specific Week
```javascript
let program = JSON.parse(localStorage.getItem('liftlog_active_program'))
program.currentWeek = 6  // Change to desired week
program.currentDay = 1
localStorage.setItem('liftlog_active_program', JSON.stringify(program))
location.reload()
```

### Clear Everything and Start Over
```javascript
localStorage.clear()
location.reload()
```

## Expected Console Logs

### When Starting a Program:
```
[TemplateProcessor] Processing template with automatic deload:
  templateId: "fullbody-3day-beginner-female"
  weeks: 6
  lastWeekIsDeload: 6

[TemplateProcessor] Template processing complete
[ProgramState] Processed template with automatic deload weeks
```

### When Starting Week 6 Workout:
```
[LinearProgressionEngine] Calculating progression:
  exerciseName: "Barbell Back Squat"
  currentWeek: 6
  hasPreviousData: true

[LinearProgressionEngine] Calculating DELOAD week:
  exerciseName: "Barbell Back Squat"
  currentWeek: 6
  hasPreviousData: true
  previousSetsData: 3

[LinearProgressionEngine] Generated per-set deload suggestions:
  [
    { weight: 65, reps: 10, baseWeight: 100, baseReps: 12 },
    { weight: 68, reps: 10, baseWeight: 105, baseReps: 12 },
    { weight: 71, reps: 10, baseWeight: 110, baseReps: 12 }
  ]
```

## Troubleshooting

### Issue: No deload detected in Week 6

**Check 1:** Verify template was processed
```javascript
let program = JSON.parse(localStorage.getItem('liftlog_active_program'))
console.log(program.template.schedule.day1.exercises[0].progressionTemplate)
// Should show week6 with intensity: "deload"
```

**Check 2:** Verify you're actually in Week 6
```javascript
let program = JSON.parse(localStorage.getItem('liftlog_active_program'))
console.log('Current Week:', program.currentWeek)
// Should show 6
```

### Issue: Weights not reducing to 65%

**Check:** Verify Week 5 data exists
```javascript
let workouts = JSON.parse(localStorage.getItem('liftlog_workouts'))
let week5 = workouts.filter(w => w.week === 5)
console.log('Week 5 workouts:', week5)
// Should show at least one workout
```

### Issue: Sets not reducing

**Check:** Verify processed template
```javascript
let program = JSON.parse(localStorage.getItem('liftlog_active_program'))
let exercise = program.template.schedule.day1.exercises[0]
console.log('Week 1 sets:', exercise.progressionTemplate.week1.sets)
console.log('Week 6 sets:', exercise.progressionTemplate.week6.sets)
// Week 6 should be 1 less than Week 1
```

## Success Criteria

✅ **Deload system is working correctly if:**

1. Week 6 shows `intensity: "deload"` in template
2. Console logs show "Calculating DELOAD week"
3. Suggested weights are ~65% of Week 5 (±2.5 lbs for rounding)
4. Number of sets is reduced by 1
5. Rep range is reduced (e.g., "10-12" → "8-10")
6. Per-set suggestions exist (one for each previous set)

## Testing Both Templates

### Template 1: 3-Day Full Body Beginner (Female)
- **Weeks:** 6 total, last week (6) is deload
- **Sets:** Typically 3 → 2 on deload
- **Rep Range:** "10-12" → "8-10" on deload
- **Test Exercise:** Barbell Back Squat (Day 1)

### Template 2: 4-Day Upper/Lower Split (Male)
- **Weeks:** 6 total, last week (6) is deload
- **Sets:** Varies by exercise (4 → 3, 3 → 2)
- **Rep Range:** "6-8" → "4-6" on deload
- **Test Exercise:** Barbell Bench Press (Day 1)

---

**Ready to Test?**

1. ✅ Dev server running at `localhost:3000`
2. ✅ Templates simplified and processed automatically
3. ✅ Deload logic implemented (65% reduction)
4. ✅ Console logging added for debugging

**Start testing and check console logs!**

