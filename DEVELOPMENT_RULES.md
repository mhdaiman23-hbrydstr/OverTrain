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

### Pattern 4: Optimistic UI with Background Sync

**For instant UX, use fire-and-forget background sync AFTER data is safe:**

```typescript
// ✅ CORRECT - Optimistic UI pattern
async function handleCompleteWorkout() {
  // 1. Save to localStorage (instant, synchronous)
  await WorkoutLogger.completeWorkout(workoutId, userId)

  // 2. Start background sync (non-blocking)
  if (userId) {
    WorkoutLogger.syncToDatabase(userId)
      .then(() => console.log("Background sync completed"))
      .catch((error) => console.error("Background sync failed (will retry):", error))
  }

  // 3. Navigate immediately (data already safe in localStorage)
  onComplete?.()
}

// ❌ WRONG - Blocking the user
async function handleCompleteWorkout() {
  await WorkoutLogger.completeWorkout(workoutId, userId)
  await WorkoutLogger.syncToDatabase(userId) // User waits for network!
  onComplete?.() // Slow UX
}
```

**Key Rules:**
- ✅ Save to localStorage FIRST (instant, synchronous)
- ✅ Start database sync in background (fire-and-forget with .then/.catch)
- ✅ Navigate immediately - don't wait for network
- ✅ Data is safe in localStorage, sync retries automatically
- ❌ Never block the user waiting for database operations

### Pattern 5: UPDATE/INSERT Pattern for Database Sync

**When syncing existing records, check if UPDATE affected rows:**

```typescript
// ✅ CORRECT - Check if update affected rows
if (userId && supabase) {
  // Try UPDATE first, get result to check if rows were affected
  const { data: updateData, error: updateError } = await supabase
    .from("in_progress_workouts")
    .update({...})
    .eq('id', workoutId)
    .eq('user_id', userId)
    .select()  // ← CRITICAL: Get updated rows

  // If no rows updated, INSERT new record
  if (updateError || !updateData || updateData.length === 0) {
    await supabase.from("in_progress_workouts").insert({...})
  }
}

// ❌ WRONG - Only checking error code
if (userId && supabase) {
  const { error: updateError } = await supabase
    .from("in_progress_workouts")
    .update({...})
    .eq('id', workoutId)
    .eq('user_id', userId)
    // Missing .select() - can't check if rows were affected!

  // This condition is NEVER true when UPDATE succeeds with 0 rows!
  if (updateError?.code === 'PGRST116') {
    await supabase.from("in_progress_workouts").insert({...})
  }
}
```

**Why this matters:**
- Supabase UPDATE succeeds with 0 rows affected (no error thrown)
- Without `.select()`, you can't detect that no rows were updated
- INSERT never runs, data never syncs to database

### Pattern 6: Program Completion Detection

**Auto-finalize programs when all workouts are complete:**

```typescript
// ✅ CORRECT - Check for completion and finalize
async function recalculateProgress() {
  let foundIncomplete = false

  for (let week = 1; week <= maxWeeks; week++) {
    for (let day = 1; day <= daysPerWeek; day++) {
      if (!WorkoutLogger.hasCompletedWorkout(week, day, userId, instanceId)) {
        activeProgram.currentWeek = week
        activeProgram.currentDay = day
        foundIncomplete = true
        break
      }
    }
    if (foundIncomplete) break
  }

  // If all workouts complete, finalize the program
  if (!foundIncomplete) {
    console.log("All workouts completed! Finalizing program...")
    await this.finalizeActiveProgram(userId, { endedEarly: false })
    return // Exit early - program is now finalized
  }

  await this.saveActiveProgram(activeProgram)
}

// ❌ WRONG - Just log and do nothing
if (!foundIncomplete) {
  console.log("All workouts appear to be completed, staying at current position")
}
// Program stays active forever, shows empty workout page
```

### Pattern 7: Database Cleanup on Program End

**Always clean up related data when ending a program:**

```typescript
// ✅ CORRECT - Clean both localStorage AND database
static async clearInProgress(userId?: string): Promise<void> {
  const storageKeys = this.getUserStorageKeys(userId)

  // Clear from localStorage
  localStorage.removeItem(storageKeys.inProgress)

  // Also delete from database
  if (userId && supabase) {
    await supabase
      .from("in_progress_workouts")
      .delete()
      .eq("user_id", userId)
  }
}

// ❌ WRONG - Only clearing localStorage
static clearInProgress(userId?: string): void {
  const storageKeys = this.getUserStorageKeys(userId)
  localStorage.removeItem(storageKeys.inProgress)
  // Missing database cleanup - orphaned records remain!
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

### Mistake 4: In-Progress Workouts Not Syncing (Oct 2025)
**Problem**: New workouts saved to localStorage but never appeared in database
**Root Cause**: Two issues compounding:
1. `startWorkout()` called `saveCurrentWorkout()` without passing `userId`
2. `saveCurrentWorkout()` UPDATE/INSERT logic only checked for error code `PGRST116`, but Supabase UPDATE succeeds with 0 rows (no error), so INSERT never ran
**Fix**:
1. Pass `userId` to `saveCurrentWorkout()` in `startWorkout()`
2. Add `.select()` to UPDATE query and check if `updateData.length === 0`
**Lesson**:
- Always pass required parameters to functions
- Supabase UPDATE succeeds with 0 rows - must use `.select()` to check if rows were affected
- Test database state, not just localStorage

### Mistake 5: Completed Programs Staying Active (Oct 2025)
**Problem**: Programs with 100% completion stayed active, showing empty workout page
**Root Cause**: `recalculateProgress()` logged "All workouts completed" but didn't finalize the program
**Fix**: Call `finalizeActiveProgram()` when no incomplete workouts found
**Lesson**: Detect terminal states and transition properly - don't just log and ignore

### Mistake 6: Orphaned In-Progress Workouts (Oct 2025)
**Problem**: In-progress workouts remained in database after program ended
**Root Cause**: `clearInProgress()` only cleared localStorage, not database
**Fix**: Made function async and added database deletion with `supabase.delete()`
**Lesson**: When clearing data, always clear BOTH localStorage AND database

### Mistake 7: Blocking UX with await syncToDatabase() (Oct 2025)
**Problem**: Users had to wait for network operations before navigation
**Root Cause**: `await WorkoutLogger.syncToDatabase()` blocked navigation
**Fix**: Use fire-and-forget pattern with `.then()/.catch()` for background sync
**Lesson**:
- Save to localStorage first (instant)
- Start background sync (non-blocking)
- Navigate immediately - data is already safe
- Never make users wait for network operations

### Mistake 8: Race Condition in Program End Flow (Oct 2025)
**Problem**: After ending program, train section showed workout summary instead of call-to-action
**Root Cause**: `finalizeProgramState()` called without `await`, causing race condition:
1. Workout logger dispatched `programEnded` event immediately
2. Train section received event and waited 100ms
3. Train section queried database for active program
4. BUT `finalizeProgramState()` hadn't finished deleting from database yet
5. Train section found active program still in database → showed wrong screen
**Fix**: Reordered `handleEndProgram()` to `await finalizeProgramState()` BEFORE dispatching event
**Lesson**:
- ALWAYS await database cleanup operations before dispatching navigation events
- Race conditions happen when async operations aren't properly sequenced
- Adding artificial delays (100ms timeout) masks the problem but doesn't fix it
- Event handlers will query database immediately - ensure cleanup is complete first
- The sequence must be: cleanup database → THEN dispatch event → THEN navigate

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

### Mistake 9: Component Unmounting Causing Loading Spinners (Oct 2025)
**Problem**: Switching between tabs (Programs ↔ Train ↔ Analytics ↔ Profile) showed loading spinners every time
**Root Cause**: Conditional rendering with `if (currentView === "programs")` unmounted components when switching tabs, losing all state and cached data
**Fix**:
1. Render all views simultaneously in single conditional block
2. Use CSS `display: none/block` to hide/show instead of mounting/unmounting
3. Only show loading spinner on initial load (when state is empty)
**Changes**:
- `app/page.tsx`: Combined all view conditionals into single render with `style={{ display }}`
- `components/programs-section.tsx`: Only set `isLoading = true` when `allTemplates.length === 0`
- `components/workout-calendar.tsx`: Only set `isLoading = true` when `!activeProgram`
**Lesson**:
- Component unmounting destroys state and cached data
- CSS visibility (`display: none`) preserves mounted components
- Conditional loading spinners: only show when data doesn't exist yet
- Tabs should feel like native app navigation (instant, no flicker)

---

## 🎨 UI Performance Patterns

### Pattern 8: Instant Tab Switching (Keep Components Mounted)

**For seamless navigation, render all tabs simultaneously and toggle visibility:**

```typescript
// ✅ CORRECT - All tabs mounted, visibility toggled with CSS
if (user && (currentView === "programs" || currentView === "train" || currentView === "analytics" || currentView === "profile")) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SidebarNavigation currentView={currentView} onViewChange={setCurrentView} />

      {/* Programs Section - Hidden but mounted */}
      <div style={{ display: currentView === "programs" ? "block" : "none" }}>
        <ProgramsSection />
      </div>

      {/* Train Section - Hidden but mounted */}
      <div style={{ display: currentView === "train" ? "block" : "none" }}>
        <TrainSection />
      </div>

      {/* Other sections... */}
    </div>
  )
}

// ❌ WRONG - Conditional rendering unmounts components
if (user && currentView === "programs") {
  return <ProgramsSection />  // Unmounts when you switch tabs!
}

if (user && currentView === "train") {
  return <TrainSection />  // Unmounts when you switch tabs!
}
```

**Why this matters:**
- Component unmounting destroys state, cached data, and event listeners
- Remounting triggers `useEffect`, causing unnecessary data fetching
- Users see loading spinners on every tab switch
- CSS `display: none` keeps components alive with preserved state

### Pattern 9: Conditional Loading Spinners

**Only show loading spinners when data genuinely doesn't exist:**

```typescript
// ✅ CORRECT - Check if data exists before showing spinner
const loadData = async () => {
  // Only show spinner on initial load
  if (allTemplates.length === 0) {
    setIsLoading(true)
  }

  const templates = await fetchTemplates()
  setAllTemplates(templates)
  setIsLoading(false)
}

// ❌ WRONG - Unconditional spinner
const loadData = async () => {
  setIsLoading(true)  // Shows spinner even when re-fetching cached data!
  const templates = await fetchTemplates()
  setAllTemplates(templates)
  setIsLoading(false)
}
```

**Key principles:**
- ✅ Only show loading state when data is genuinely unavailable
- ✅ Skip loading state when refreshing/updating existing data
- ✅ Service-layer caching makes subsequent loads instant
- ❌ Never show spinners for cached data fetches

### Pattern 10: Lazy Loading with Preloading

**Combine lazy loading with authentication preloading for instant UX:**

```typescript
// 1. Load lightweight data initially (fast)
static async getAllTemplates(): Promise<GymTemplate[]> {
  const dbTemplates = await service.getAllTemplates()  // Metadata only, no exercises
  return dbTemplates.map(t => ({
    id: t.id,
    name: t.name,
    weeks: t.weeks,
    days: t.days,
    schedule: {}  // Empty - exercises load on-demand
  }))
}

// 2. Preload during authentication (before user navigates)
async function loadUserApplicationData(userId: string) {
  // ... other data loading ...

  // Preload templates for instant Programs tab access
  await ProgramStateManager.getAllTemplates()  // Now cached!

  // ... dispatch events ...
}

// 3. On-demand loading when needed
const handleTemplateClick = async (templateId: string) => {
  // Load full template with exercises (hits cache if preloaded)
  await ProgramStateManager.loadTemplate(templateId)
  showTemplateDetail(templateId)
}
```

**Result:**
- Initial load: ~50-100ms (metadata only)
- Preloading during auth: Templates cached before user navigates
- Tab switching: Instant (cached + component stays mounted)
- Template detail: Instant (data already cached)

---

### Pattern 11: Historical Program Calendar (Read‑Only)

Use the read‑only calendar without fetching active program state. Historical views must render instantly from provided props and may lazily enrich labels.

- Inputs
  - `historicalProgram`: `{ templateId, instanceId, name, totalWeeks, daysPerWeek }`
  - `historicalWorkouts`: `Array<{ week?: number; day?: number; completed: boolean }>`
- Rules
  - Do not fetch or poll the active program when `readOnly` is true.
  - Set `isLoading = false` immediately in read‑only mode; no spinner flashes.
  - For day labels, fetch template via `ProgramTemplateService.getTemplate(templateId)` and use `schedule.day*.name` (maps to DB `program_template_days.day_name`).
  - Fetching day names is non‑blocking; render immediately and update labels when ready.
  - Use shared utilities from `lib/history.ts`:
    - `getHistoricalWorkouts(instanceId, userId?)`
    - `buildHistoricalProgram(entry, workouts)`
    - `getHistoricalProgramData(entry, userId?)`
- Anti‑patterns
  - Don’t call `ProgramStateManager.getActiveProgram()` in read‑only mode.
  - Don’t duplicate logic to compute total weeks/days in components; use `buildHistoricalProgram`.
  - Don’t show loading spinners in historical views when data is already provided.

Checklist
- [ ] Calendar respects `readOnly` and never loads active program
- [ ] Day labels sourced from `ProgramTemplateService` (DB `day_name`)
- [ ] Uses `lib/history.ts` helpers (no duplicated logic)
- [ ] No loading spinners in history modal

### Pattern 12: Start Program UX Feedback

Provide clear feedback while a program is starting (template load + activation). Prevent duplicate submissions.

- State
  - `isStartingProgram: boolean`
  - `startingTemplateId: string | null`
- UI
  - In `TemplateDetailView`, pass `isStarting` to show a spinner and the label “Starting…”.
  - Disable the Start button while starting to prevent double clicks.
- Flow
  1. On click: set `isStartingProgram = true`, `startingTemplateId = templateId`.
  2. `await ProgramStateManager.loadTemplate(templateId)` (ensures cached/preloaded).
  3. Clear in‑progress workouts, cleanup corrupted workouts.
  4. `await ProgramStateManager.setActiveProgram(templateId, progressionOverride)`.
  5. On success: close detail, update state, call `onProgramStarted`, reset loading state.
  6. On failure: log error, reset loading state.
- Optional
  - Show a toast “Starting program…” on click and “Program started” on success.

Checklist
- [ ] Start button shows spinner + “Starting…” while pending
- [ ] Button disabled during start to prevent duplicates
- [ ] Loading state resets on both success and failure
- [ ] Post‑start flows (navigation/events) occur after activation

---

### Pattern 13: Exercise Replacement

Replace an exercise using authoritative data from `exercise_library`, reset current-session performance, and optionally apply across the whole workout.

- Rules
  - Source of truth: replacement must use `exercise_library` data via `ExerciseLibraryService`.
  - Update metadata on the workout exercise:
    - `exerciseId = exercise_library.id`
    - `exerciseName = exercise_library.name`
    - `muscleGroup = exercise_library.muscle_group`
    - `equipmentType = exercise_library.equipment_type`
  - Reset progression for the current session (not future):
    - Clear `suggestedWeight` (set to 0) and `progressionNote`.
    - For every set: `reps = 0`, `weight = 0`, `completed = false`, `skipped = false`.
    - Mark exercise `completed = false` and clear `endTime` if present.
    - Do NOT recalculate progression immediately; apply progression starting next week forward.
  - Repeat behavior (current workout only):
    - If user selects Repeat, apply replacement to all matching exercises in the same workout (match by previous `exerciseId` or normalized `exerciseName`).
  - Persist and close dialog: save with `WorkoutLogger.saveCurrentWorkout()` and clear replacement UI state.

- Anti‑patterns
  - Don’t keep stale `muscleGroup`/`equipmentType` from the old exercise.
  - Don’t retain previous set reps/weights after replacement.
  - Don’t trigger `ProgressionRouter` for the replaced exercise in the current session.
  - Don’t rely solely on template exercise IDs after replacement; name or library ID matching may be required.

Checklist
- [ ] Replacement uses `exercise_library` (id/name/muscleGroup/equipmentType)
- [ ] Sets zeroed (reps/weight = 0) and not completed
- [ ] `suggestedWeight = 0`, `progressionNote` cleared
- [ ] Repeat applies across current workout when selected
- [ ] Changes saved and library dialog closed

### Pattern 14: Template Forking & Future Session Replacements

Fork canonical templates before mutating future workouts so program structure stays deterministic and Supabase rows remain immutable to non‑owners.

- When the user chooses “Repeat” (apply to future), call `ProgramStateManager.applyFutureExerciseReplacement`.  
  - This ensures `ensureCustomTemplateForActiveProgram` forks the canonical template via `ProgramForkService.forkTemplateToMyProgram`.  
  - Active program is repointed to the fork and stats are recalculated.  
- Updates to the fork must use the **exercise_library UUID** (not display slugs) so Supabase updates succeed.  
- Clear cached in‑progress workouts for future weeks (`WorkoutLogger.clearCurrentWorkout(week, day, userId)`) so regenerated sessions pick up the new exercise.  
- Always clear `ProgramTemplateService` caches after template mutation.

Checklist
- [ ] Repeat actions route through `ProgramStateManager.applyFutureExerciseReplacement`
- [ ] Fork occurs only once per template (idempotent guard in `ensureCustomTemplateForActiveProgram`)
- [ ] Future workout cache cleared; new sessions rebuild from fork
- [ ] Exercise ID payload uses `exerciseLibraryId` UUIDs

### Pattern 15: My Programs UX & Management

Expose user-owned templates consistently in the “My Programs” tab and keep rename/end actions authoritative.

- Always load My Programs from `ProgramStateManager.getMyPrograms()` (server canonical list) when the feature flag is on; fall back to legacy local storage only when offline.  
- Display fork metadata (icon + `origin_name_snapshot` / `forked_at`) so users know the source.  
- Use dropdown actions:
  - `Rename Program` → `ProgramStateManager.renameCustomProgram(templateId, newName)` (updates Supabase row, history, active run).  
  - `End Program` (visible only for the active custom template) → `ProgramStateManager.finalizeActiveProgram(...)`.  
- After rename/end, refresh lists and fire a toast—users need immediate confirmation.

Checklist
- [ ] My Programs tab calls `ProgramStateManager.getMyPrograms()` and merges active state
- [ ] Fork badges/icons render for custom templates
- [ ] Rename and End actions call the correct ProgramStateManager helpers
- [ ] UI reacts instantly (toast + list refresh + `programChanged` event)

---

*Last Updated: 2025-10-19*
*Version: 1.6 - Documented template fork flow, My Programs UI requirements, and renamed/error handling expectations.*

---

## 🤝 Contributing

When you discover new patterns or make mistakes:

1. Document the pattern/anti-pattern in this file
2. Add it to the appropriate section
3. Include code examples
4. Explain the "why" behind the rule
5. Update the version and date

This is a living document that evolves with the codebase.
