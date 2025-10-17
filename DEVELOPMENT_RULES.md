# Development Rules & Validation Checklist

This document defines the development rules and validation checklist for LiftLog. **All code changes must be validated against these rules before implementation.**

---

## 🎯 Core Development Principles

### 1. **Think Before You Code**
- ✅ Analyze the entire code flow before making changes
- ✅ Identify root causes, not symptoms
- ✅ Avoid patching pieces - implement comprehensive fixes
- ✅ Map out all affected components and data flows
- ❌ No quick fixes without understanding the full context

### 2. **Data Integrity First**
- ✅ localStorage and database must ALWAYS stay in sync
- ✅ Critical state changes must be persisted to database before navigation
- ✅ Use `await` for database operations that affect program flow
- ✅ Validate data integrity before and after major operations
- ❌ Never assume localStorage-only updates are sufficient

### 3. **State Management**
- ✅ Program state (`current_week`, `current_day`) must sync to database
- ✅ Workout state (in-progress, history) must be consistent across storage
- ✅ Events (`programChanged`, `workoutCompleted`) must fire AFTER state is persisted
- ✅ Component state must reflect database state, not just localStorage
- ❌ Don't dispatch events before async operations complete

---

## 📋 Pre-Implementation Validation Checklist

Before implementing ANY code change, validate against this checklist:

### Phase 1: Analysis ✓
- [ ] Have I read and understood ALL affected files?
- [ ] Have I traced the complete data flow from start to finish?
- [ ] Have I identified the root cause (not just the symptom)?
- [ ] Have I checked for similar patterns elsewhere in the codebase?
- [ ] Have I considered race conditions and async timing issues?

### Phase 2: Design ✓
- [ ] Does this fix address the root cause comprehensively?
- [ ] Will this change break existing functionality?
- [ ] Are all callers of modified functions updated?
- [ ] Is the solution minimal and maintainable?
- [ ] Have I considered edge cases and error scenarios?

### Phase 3: Database Consistency ✓
- [ ] Are all critical state changes synced to database?
- [ ] Are database operations awaited before navigation/events?
- [ ] Will this work correctly after page refresh?
- [ ] Is the database the source of truth for this data?
- [ ] Have I tested the flow with network delays?

### Phase 4: Event Sequencing ✓
- [ ] Are events dispatched AFTER database sync completes?
- [ ] Will components receive stale data if events fire too early?
- [ ] Are there race conditions between events and navigation?
- [ ] Is the event necessary, or can we use callbacks instead?

### Phase 5: Type Safety ✓
- [ ] Are all function signatures updated (sync → async)?
- [ ] Are return types correct (void → Promise<void>)?
- [ ] Are TypeScript errors addressed (not ignored)?
- [ ] Are all parameters validated before use?

---

## 🔒 Critical Code Patterns

### Pattern 1: Program State Updates

**ALWAYS follow this pattern when updating program state:**

```typescript
// ✅ CORRECT
async function updateProgramState() {
  // 1. Update state in memory
  activeProgram.currentWeek = newWeek
  activeProgram.currentDay = newDay

  // 2. Save to localStorage AND database (await!)
  await ProgramStateManager.saveActiveProgram(activeProgram)

  // 3. THEN dispatch events
  window.dispatchEvent(new Event("programChanged"))

  // 4. THEN navigate
  navigate()
}

// ❌ WRONG - Database sync not awaited
function updateProgramState() {
  activeProgram.currentWeek = newWeek
  ProgramStateManager.saveActiveProgram(activeProgram) // Missing await!
  window.dispatchEvent(new Event("programChanged")) // Fires before DB sync!
  navigate() // Navigation happens with stale DB state!
}
```

### Pattern 2: Workout Completion

**ALWAYS follow this sequence:**

```typescript
// ✅ CORRECT
async function completeWorkout() {
  // 1. Check if already completed BEFORE completing
  const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(week, day, userId)

  // 2. Complete the workout (moves to history)
  const completed = await WorkoutLogger.completeWorkout(workoutId, userId)

  // 3. Advance program ONLY if not already completed
  if (completed && !wasAlreadyCompleted) {
    await ProgramStateManager.completeWorkout(userId) // MUST await!
  }

  // 4. Sync to database
  await WorkoutLogger.syncToDatabase(userId)

  // 5. Navigate or dispatch events
  onComplete?.()
}

// ❌ WRONG - Check after completion
async function completeWorkout() {
  const completed = await WorkoutLogger.completeWorkout(workoutId, userId)
  const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(week, day, userId) // Always false!
  // ... rest of logic is broken
}
```

### Pattern 3: Database Sync

**ALWAYS sync critical state to database:**

```typescript
// ✅ CORRECT - Function is async and syncs to DB
private static async saveActiveProgram(program: ActiveProgram): Promise<void> {
  // Save to localStorage (fast)
  localStorage.setItem(KEY, JSON.stringify(program))

  // Sync to database (critical for persistence)
  if (userId && supabase) {
    await supabase.from("active_programs").upsert({...}) // MUST await!
  }
}

// ❌ WRONG - No database sync
private static saveActiveProgram(program: ActiveProgram): void {
  localStorage.setItem(KEY, JSON.stringify(program))
  // Missing database sync - state lost on refresh!
}
```

---

## 🚨 Common Anti-Patterns to Avoid

### Anti-Pattern 1: Patching Symptoms
```typescript
// ❌ BAD - Patching a symptom
if (workout.week !== activeProgram.currentWeek) {
  // Bandaid fix: force reload
  location.reload()
}

// ✅ GOOD - Fix the root cause
// Ensure program state syncs to database before navigation
await ProgramStateManager.saveActiveProgram(activeProgram)
```

### Anti-Pattern 2: Fire-and-Forget Database Ops
```typescript
// ❌ BAD - Not awaiting critical operations
function saveAndNavigate() {
  saveToDatabase(data) // Fire and forget!
  navigate() // Navigation happens before save completes!
}

// ✅ GOOD - Await before proceeding
async function saveAndNavigate() {
  await saveToDatabase(data) // Wait for save!
  navigate() // Now safe to navigate
}
```

### Anti-Pattern 3: Event Before State
```typescript
// ❌ BAD - Event fires before state is ready
function updateState() {
  updateLocalStorage()
  window.dispatchEvent(new Event("stateChanged")) // Listeners get stale DB data!
  updateDatabase() // Too late!
}

// ✅ GOOD - Event fires after state is persisted
async function updateState() {
  updateLocalStorage()
  await updateDatabase() // Wait for DB!
  window.dispatchEvent(new Event("stateChanged")) // Now listeners get fresh data
}
```

### Anti-Pattern 4: Mixing Sync and Async
```typescript
// ❌ BAD - Function is sync but calls async operations
function updateProgram() {
  this.saveActiveProgram(activeProgram) // Returns Promise but not awaited!
  doSomethingElse() // Runs before save completes!
}

// ✅ GOOD - Function is async and awaits operations
async function updateProgram() {
  await this.saveActiveProgram(activeProgram) // Properly awaited
  doSomethingElse() // Runs after save completes
}
```

---

## 📝 Code Review Checklist

Before committing code, verify:

### Functionality ✓
- [ ] Does the code solve the stated problem completely?
- [ ] Have I tested the happy path?
- [ ] Have I tested error scenarios?
- [ ] Have I tested edge cases (empty data, missing fields, etc.)?
- [ ] Does it work after page refresh?

### Data Consistency ✓
- [ ] Is localStorage in sync with database?
- [ ] Are all state changes persisted before navigation?
- [ ] Will data survive browser refresh?
- [ ] Are there any race conditions?

### Code Quality ✓
- [ ] Are functions properly async/await where needed?
- [ ] Are all error cases handled?
- [ ] Is logging sufficient for debugging?
- [ ] Are variable names clear and descriptive?
- [ ] Is the code DRY (Don't Repeat Yourself)?

### Architecture ✓
- [ ] Does this follow existing patterns in the codebase?
- [ ] Is the fix localized or does it affect multiple components?
- [ ] Have all affected components been updated?
- [ ] Is the solution maintainable long-term?

### Testing ✓
- [ ] Have I manually tested the complete flow?
- [ ] Have I tested with network throttling/offline?
- [ ] Have I tested with console logs to verify sequence?
- [ ] Have I verified database state after operations?

---

## 🔍 Debugging Workflow

When investigating bugs, follow this systematic approach:

### Step 1: Reproduce
1. Document exact steps to reproduce
2. Capture console logs
3. Check localStorage state
4. Check database state
5. Identify what's wrong vs. what's expected

### Step 2: Trace
1. Find where the user action starts (e.g., button click)
2. Trace through all function calls
3. Identify all state changes
4. Identify all database operations
5. Map out event dispatches and listeners

### Step 3: Analyze
1. Find where actual behavior diverges from expected
2. Check if it's a data issue (wrong state) or logic issue (wrong flow)
3. Identify root cause (not just symptom)
4. Verify there are no other places with the same issue

### Step 4: Fix
1. Design comprehensive fix addressing root cause
2. Validate against this ruleset
3. Update all affected code paths
4. Add logging for future debugging
5. Test thoroughly before committing

---

## 📚 Key Storage Keys Reference

**Critical localStorage keys** (must stay in sync with database):

```typescript
// Program State
liftlog_active_program         // Current active program (week, day, progress)
liftlog_program_history         // Historical programs
liftlog_program_progress        // Program progress data

// Workout State
liftlog_in_progress_workouts_<userId>  // In-progress workouts
liftlog_workouts_<userId>              // Completed workout history

// User State
liftlog_user                    // Current authenticated user
```

**Database Tables:**
- `active_programs` - Current active program state (MUST match localStorage)
- `workouts` - Completed workout history
- `in_progress_workouts` - In-progress workouts
- `profiles` - User profiles
- `program_templates` - Available workout programs

---

## ⚠️ Critical Operations Checklist

### When Completing a Workout:
- [ ] Check `wasAlreadyCompleted` BEFORE calling `completeWorkout()`
- [ ] Move workout from in-progress to history
- [ ] Advance program state if not already completed
- [ ] Await `ProgramStateManager.completeWorkout()` (syncs to DB)
- [ ] Await `WorkoutLogger.syncToDatabase()` (syncs workout data)
- [ ] THEN dispatch events or navigate

### When Ending a Workout Early:
- [ ] Mark incomplete sets as skipped (completed: true, skipped: true, reps: 0, weight: 0)
- [ ] Save workout with skipped sets
- [ ] Complete workout (moves to history)
- [ ] Advance program state (await the save!)
- [ ] Navigate to next workout (no completion dialog)
- [ ] User can click back in calendar to see skipped sets

### When Advancing Program State:
- [ ] Calculate next incomplete day/week
- [ ] Update `activeProgram.currentWeek` and `currentDay`
- [ ] Call `await saveActiveProgram()` (syncs to DB!)
- [ ] THEN dispatch `programChanged` event
- [ ] Verify database has correct state before navigation

### When Loading Program State:
- [ ] Load from database as source of truth
- [ ] Merge with localStorage if newer
- [ ] Validate data integrity (check for missing fields)
- [ ] Recalculate progress if needed
- [ ] Save corrected state back to database

---

## 🎓 Learning from Past Mistakes

### Mistake 1: "End Workout" Data Loss
**Problem**: Workout data disappeared after clicking "End Workout"
**Root Cause**: Program state only saved to localStorage, not database
**Fix**: Made `saveActiveProgram()` async and added database sync
**Lesson**: Critical state must always sync to database before navigation

### Mistake 2: Premature Event Dispatching
**Problem**: `programChanged` event fired before state was saved
**Root Cause**: Event dispatched before async operations completed
**Fix**: Removed early event dispatch, let parent handle navigation
**Lesson**: Events should only fire AFTER state is fully persisted

### Mistake 3: Symptom Patching
**Problem**: Multiple small fixes that didn't solve the core issue
**Root Cause**: Fixing symptoms instead of root causes
**Fix**: Comprehensive analysis and single cohesive fix
**Lesson**: Stop, analyze completely, then implement comprehensive fix

---

## ✅ Before Every Commit

Run through this final checklist:

- [ ] I understand the root cause of the problem
- [ ] I have read all affected code files completely
- [ ] I have validated against the Development Rules
- [ ] All database operations are properly awaited
- [ ] All function signatures are updated (sync → async if needed)
- [ ] All callers of modified functions are updated
- [ ] Events fire AFTER state is persisted
- [ ] Code works after page refresh
- [ ] I have tested the complete user flow
- [ ] Console logs confirm correct sequence of operations
- [ ] Database state matches expected state after operations
- [ ] No TypeScript errors (not ignored, actually fixed)
- [ ] Commit message clearly explains the fix and root cause

---

## 📖 Usage

**Before implementing any change:**

1. Read this document completely
2. Validate your approach against Phase 1-5 checklists
3. Ensure you're following critical code patterns
4. Avoid anti-patterns listed above
5. Complete code review checklist before committing

**When in doubt:**
- Stop and analyze the complete flow
- Check if similar code exists elsewhere
- Verify database sync is in place
- Test with page refresh
- Ask: "Am I fixing the root cause or just the symptom?"

---

*Last Updated: 2025-10-17*
*Version: 1.0*

---

## 🤝 Contributing

When you discover new patterns or make mistakes:

1. Document the pattern/anti-pattern in this file
2. Add it to the appropriate section
3. Include code examples
4. Explain the "why" behind the rule
5. Update the version and date

This is a living document that evolves with the codebase.
