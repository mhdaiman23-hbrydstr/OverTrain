# Development Rules & Validation Checklist

This document defines the development rules and validation checklist for LiftLog. **All code changes must be validated against these rules before implementation.**

---

## ðŸŽ¯ Core Development Principles

### 1. **Think Before You Code**
- âœ… Analyze the entire code flow before making changes
- âœ… Identify root causes, not symptoms
- âœ… Avoid patching pieces - implement comprehensive fixes
- âœ… Map out all affected components and data flows
- âŒ No quick fixes without understanding the full context

### 2. **Data Integrity First**
- âœ… localStorage and database must ALWAYS stay in sync
- âœ… Critical state changes must be persisted to database before navigation
- âœ… Use `await` for database operations that affect program flow
- âœ… Validate data integrity before and after major operations
- âŒ Never assume localStorage-only updates are sufficient

### 3. **State Management**
- âœ… Program state (`current_week`, `current_day`) must sync to database
- âœ… Workout state (in-progress, history) must be consistent across storage
- âœ… Events (`programChanged`, `workoutCompleted`) must fire AFTER state is persisted
- âœ… Component state must reflect database state, not just localStorage
- âŒ Don't dispatch events before async operations complete

---

## ðŸ“‹ Pre-Implementation Validation Checklist

Before implementing ANY code change, validate against this checklist:

### Phase 1: Analysis âœ“
- [ ] Have I read and understood ALL affected files?
- [ ] Have I traced the complete data flow from start to finish?
- [ ] Have I identified the root cause (not just the symptom)?
- [ ] Have I checked for similar patterns elsewhere in the codebase?
- [ ] Have I considered race conditions and async timing issues?

### Phase 2: Design âœ“
- [ ] Does this fix address the root cause comprehensively?
- [ ] Will this change break existing functionality?
- [ ] Are all callers of modified functions updated?
- [ ] Is the solution minimal and maintainable?
- [ ] Have I considered edge cases and error scenarios?

### Phase 3: Database Consistency âœ“
- [ ] Are all critical state changes synced to database?
- [ ] Are database operations awaited before navigation/events?
- [ ] Will this work correctly after page refresh?
- [ ] Is the database the source of truth for this data?
- [ ] Have I tested the flow with network delays?

### Phase 4: Event Sequencing âœ“
- [ ] Are events dispatched AFTER database sync completes?
- [ ] Will components receive stale data if events fire too early?
- [ ] Are there race conditions between events and navigation?
- [ ] Is the event necessary, or can we use callbacks instead?

### Phase 5: Type Safety âœ“
- [ ] Are all function signatures updated (sync â†’ async)?
- [ ] Are return types correct (void â†’ Promise<void>)?
- [ ] Are TypeScript errors addressed (not ignored)?
- [ ] Are all parameters validated before use?

---

## ðŸ”’ Critical Code Patterns

### Pattern 1: Program State Updates

**ALWAYS follow this pattern when updating program state:**

```typescript
// âœ… CORRECT
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

// âŒ WRONG - Database sync not awaited
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
// âœ… CORRECT
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

// âŒ WRONG - Check after completion
async function completeWorkout() {
  const completed = await WorkoutLogger.completeWorkout(workoutId, userId)
  const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(week, day, userId) // Always false!
  // ... rest of logic is broken
}
```

### Pattern 3: Database Sync

**ALWAYS sync critical state to database:**

```typescript
// âœ… CORRECT - Function is async and syncs to DB
private static async saveActiveProgram(program: ActiveProgram): Promise<void> {
  // Save to localStorage (fast)
  localStorage.setItem(KEY, JSON.stringify(program))

  // Sync to database (critical for persistence)
  if (userId && supabase) {
    await supabase.from("active_programs").upsert({...}) // MUST await!
  }
}

// âŒ WRONG - No database sync
private static saveActiveProgram(program: ActiveProgram): void {
  localStorage.setItem(KEY, JSON.stringify(program))
  // Missing database sync - state lost on refresh!
}
```

### Pattern 4: Optimistic UI with Background Sync

**For instant UX, use fire-and-forget background sync AFTER data is safe:**

```typescript
// âœ… CORRECT - Optimistic UI pattern
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

// âŒ WRONG - Blocking the user
async function handleCompleteWorkout() {
  await WorkoutLogger.completeWorkout(workoutId, userId)
  await WorkoutLogger.syncToDatabase(userId) // User waits for network!
  onComplete?.() // Slow UX
}
```

**Key Rules:**
- âœ… Save to localStorage FIRST (instant, synchronous)
- âœ… Start database sync in background (fire-and-forget with .then/.catch)
- âœ… Navigate immediately - don't wait for network
- âœ… Data is safe in localStorage, sync retries automatically
- âŒ Never block the user waiting for database operations

### Pattern 5: UPDATE/INSERT Pattern for Database Sync

**When syncing existing records, check if UPDATE affected rows:**

```typescript
// âœ… CORRECT - Check if update affected rows
if (userId && supabase) {
  // Try UPDATE first, get result to check if rows were affected
  const { data: updateData, error: updateError } = await supabase
    .from("in_progress_workouts")
    .update({...})
    .eq('id', workoutId)
    .eq('user_id', userId)
    .select()  // â† CRITICAL: Get updated rows

  // If no rows updated, INSERT new record
  if (updateError || !updateData || updateData.length === 0) {
    await supabase.from("in_progress_workouts").insert({...})
  }
}

// âŒ WRONG - Only checking error code
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
// âœ… CORRECT - Check for completion and finalize
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

// âŒ WRONG - Just log and do nothing
if (!foundIncomplete) {
  console.log("All workouts appear to be completed, staying at current position")
}
// Program stays active forever, shows empty workout page
```

### Pattern 7: Database Cleanup on Program End

**Always clean up related data when ending a program:**

```typescript
// âœ… CORRECT - Clean both localStorage AND database
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

// âŒ WRONG - Only clearing localStorage
static clearInProgress(userId?: string): void {
  const storageKeys = this.getUserStorageKeys(userId)
  localStorage.removeItem(storageKeys.inProgress)
  // Missing database cleanup - orphaned records remain!
}
```

---

## ðŸš¨ Common Anti-Patterns to Avoid

### Anti-Pattern 1: Patching Symptoms
```typescript
// âŒ BAD - Patching a symptom
if (workout.week !== activeProgram.currentWeek) {
  // Bandaid fix: force reload
  location.reload()
}

// âœ… GOOD - Fix the root cause
// Ensure program state syncs to database before navigation
await ProgramStateManager.saveActiveProgram(activeProgram)
```

### Anti-Pattern 2: Fire-and-Forget Database Ops
```typescript
// âŒ BAD - Not awaiting critical operations
function saveAndNavigate() {
  saveToDatabase(data) // Fire and forget!
  navigate() // Navigation happens before save completes!
}

// âœ… GOOD - Await before proceeding
async function saveAndNavigate() {
  await saveToDatabase(data) // Wait for save!
  navigate() // Now safe to navigate
}
```

### Anti-Pattern 3: Event Before State
```typescript
// âŒ BAD - Event fires before state is ready
function updateState() {
  updateLocalStorage()
  window.dispatchEvent(new Event("stateChanged")) // Listeners get stale DB data!
  updateDatabase() // Too late!
}

// âœ… GOOD - Event fires after state is persisted
async function updateState() {
  updateLocalStorage()
  await updateDatabase() // Wait for DB!
  window.dispatchEvent(new Event("stateChanged")) // Now listeners get fresh data
}
```

### Anti-Pattern 4: Mixing Sync and Async
```typescript
// âŒ BAD - Function is sync but calls async operations
function updateProgram() {
  this.saveActiveProgram(activeProgram) // Returns Promise but not awaited!
  doSomethingElse() // Runs before save completes!
}

// âœ… GOOD - Function is async and awaits operations
async function updateProgram() {
  await this.saveActiveProgram(activeProgram) // Properly awaited
  doSomethingElse() // Runs after save completes
}
```

---

## ðŸ“ Code Review Checklist

Before committing code, verify:

### Functionality âœ“
- [ ] Does the code solve the stated problem completely?
- [ ] Have I tested the happy path?
- [ ] Have I tested error scenarios?
- [ ] Have I tested edge cases (empty data, missing fields, etc.)?
- [ ] Does it work after page refresh?

### Data Consistency âœ“
- [ ] Is localStorage in sync with database?
- [ ] Are all state changes persisted before navigation?
- [ ] Will data survive browser refresh?
- [ ] Are there any race conditions?

### Code Quality âœ“
- [ ] Are functions properly async/await where needed?
- [ ] Are all error cases handled?
- [ ] Is logging sufficient for debugging?
- [ ] Are variable names clear and descriptive?
- [ ] Is the code DRY (Don't Repeat Yourself)?

### Architecture âœ“
- [ ] Does this follow existing patterns in the codebase?
- [ ] Is the fix localized or does it affect multiple components?
- [ ] Have all affected components been updated?
- [ ] Is the solution maintainable long-term?

### Testing âœ“
- [ ] Have I manually tested the complete flow?
- [ ] Have I tested with network throttling/offline?
- [ ] Have I tested with console logs to verify sequence?
- [ ] Have I verified database state after operations?

---

## ðŸ” Debugging Workflow

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

## ðŸ“š Key Storage Keys Reference

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

## âš ï¸ Critical Operations Checklist

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

## ðŸŽ“ Learning from Past Mistakes

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
5. Train section found active program still in database â†’ showed wrong screen
**Fix**: Reordered `handleEndProgram()` to `await finalizeProgramState()` BEFORE dispatching event
**Lesson**:
- ALWAYS await database cleanup operations before dispatching navigation events
- Race conditions happen when async operations aren't properly sequenced
- Adding artificial delays (100ms timeout) masks the problem but doesn't fix it
- Event handlers will query database immediately - ensure cleanup is complete first
- The sequence must be: cleanup database â†’ THEN dispatch event â†’ THEN navigate

---

## âœ… Before Every Commit

Run through this final checklist:

- [ ] I understand the root cause of the problem
- [ ] I have read all affected code files completely
- [ ] I have validated against the Development Rules
- [ ] All database operations are properly awaited
- [ ] All function signatures are updated (sync â†’ async if needed)
- [ ] All callers of modified functions are updated
- [ ] Events fire AFTER state is persisted
- [ ] Code works after page refresh
- [ ] I have tested the complete user flow
- [ ] Console logs confirm correct sequence of operations
- [ ] Database state matches expected state after operations
- [ ] No TypeScript errors (not ignored, actually fixed)
- [ ] Commit message clearly explains the fix and root cause

---

## ðŸ“– Usage

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
**Problem**: Switching between tabs (Programs â†” Train â†” Analytics â†” Profile) showed loading spinners every time
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

## ðŸŽ¨ UI Performance Patterns

### Pattern 8: Instant Tab Switching (Keep Components Mounted)

**For seamless navigation, render all tabs simultaneously and toggle visibility:**

```typescript
// âœ… CORRECT - All tabs mounted, visibility toggled with CSS
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

// âŒ WRONG - Conditional rendering unmounts components
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
- Keep background effects scoped to the active tab. Example: pass `shouldAutoStart={currentView === "train"}` into `TrainSection` and only call `onStartWorkout()` when that flag is true so hidden views can't hijack navigation.

### Pattern 9: Conditional Loading Spinners

**Only show loading spinners when data genuinely doesn't exist:**

```typescript
// âœ… CORRECT - Check if data exists before showing spinner
const loadData = async () => {
  // Only show spinner on initial load
  if (allTemplates.length === 0) {
    setIsLoading(true)
  }

  const templates = await fetchTemplates()
  setAllTemplates(templates)
  setIsLoading(false)
}

// âŒ WRONG - Unconditional spinner
const loadData = async () => {
  setIsLoading(true)  // Shows spinner even when re-fetching cached data!
  const templates = await fetchTemplates()
  setAllTemplates(templates)
  setIsLoading(false)
}
```

**Key principles:**
- âœ… Only show loading state when data is genuinely unavailable
- âœ… Skip loading state when refreshing/updating existing data
- âœ… Service-layer caching makes subsequent loads instant
- âŒ Never show spinners for cached data fetches

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

### Pattern 11: Historical Program Calendar (Readâ€‘Only)

Use the readâ€‘only calendar without fetching active program state. Historical views must render instantly from provided props and may lazily enrich labels.

- Inputs
  - `historicalProgram`: `{ templateId, instanceId, name, totalWeeks, daysPerWeek }`
  - `historicalWorkouts`: `Array<{ week?: number; day?: number; completed: boolean }>`
- Rules
  - Do not fetch or poll the active program when `readOnly` is true.
  - Set `isLoading = false` immediately in readâ€‘only mode; no spinner flashes.
  - For day labels, fetch template via `ProgramTemplateService.getTemplate(templateId)` and use `schedule.day*.name` (maps to DB `program_template_days.day_name`).
  - Fetching day names is nonâ€‘blocking; render immediately and update labels when ready.
  - Use shared utilities from `lib/history.ts`:
    - `getHistoricalWorkouts(instanceId, userId?)`
    - `buildHistoricalProgram(entry, workouts)`
    - `getHistoricalProgramData(entry, userId?)`
- Antiâ€‘patterns
  - Donâ€™t call `ProgramStateManager.getActiveProgram()` in readâ€‘only mode.
  - Donâ€™t duplicate logic to compute total weeks/days in components; use `buildHistoricalProgram`.
  - Donâ€™t show loading spinners in historical views when data is already provided.

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
  - In `TemplateDetailView`, pass `isStarting` to show a spinner and the label â€œStartingâ€¦â€.
  - Disable the Start button while starting to prevent double clicks.
- Flow
  1. On click: set `isStartingProgram = true`, `startingTemplateId = templateId`.
  2. `await ProgramStateManager.loadTemplate(templateId)` (ensures cached/preloaded).
  3. Clear inâ€‘progress workouts, cleanup corrupted workouts.
  4. `await ProgramStateManager.setActiveProgram(templateId, progressionOverride)`.
  5. On success: close detail, update state, call `onProgramStarted`, reset loading state.
  6. On failure: log error, reset loading state.
- Optional
  - Show a toast â€œStarting programâ€¦â€ on click and â€œProgram startedâ€ on success.

Checklist
- [ ] Start button shows spinner + â€œStartingâ€¦â€ while pending
- [ ] Button disabled during start to prevent duplicates
- [ ] Loading state resets on both success and failure
- [ ] Postâ€‘start flows (navigation/events) occur after activation

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

- Antiâ€‘patterns
  - Donâ€™t keep stale `muscleGroup`/`equipmentType` from the old exercise.
  - Donâ€™t retain previous set reps/weights after replacement.
  - Donâ€™t trigger `ProgressionRouter` for the replaced exercise in the current session.
  - Donâ€™t rely solely on template exercise IDs after replacement; name or library ID matching may be required.

Checklist
- [ ] Replacement uses `exercise_library` (id/name/muscleGroup/equipmentType)
- [ ] Sets zeroed (reps/weight = 0) and not completed
- [ ] `suggestedWeight = 0`, `progressionNote` cleared
- [ ] Repeat applies across current workout when selected
- [ ] Changes saved and library dialog closed

### Pattern 14: Template Forking & Future Session Replacements

Fork canonical templates before mutating future workouts so program structure stays deterministic and Supabase rows remain immutable to nonâ€‘owners.

- When the user chooses â€œRepeatâ€ (apply to future), call `ProgramStateManager.applyFutureExerciseReplacement`.  
  - This ensures `ensureCustomTemplateForActiveProgram` forks the canonical template via `ProgramForkService.forkTemplateToMyProgram`.  
  - Active program is repointed to the fork and stats are recalculated.  
- Updates to the fork must use the **exercise_library UUID** (not display slugs) so Supabase updates succeed.  
- Clear cached inâ€‘progress workouts for future weeks (`WorkoutLogger.clearCurrentWorkout(week, day, userId)`) so regenerated sessions pick up the new exercise.  
- Always clear `ProgramTemplateService` caches after template mutation.

Checklist
- [ ] Repeat actions route through `ProgramStateManager.applyFutureExerciseReplacement`
- [ ] Fork occurs only once per template (idempotent guard in `ensureCustomTemplateForActiveProgram`)
- [ ] Future workout cache cleared; new sessions rebuild from fork
- [ ] Exercise ID payload uses `exerciseLibraryId` UUIDs

### Pattern 15: My Programs UX & Management

Expose user-owned templates consistently in the â€œMy Programsâ€ tab and keep rename/end actions authoritative.

- Always load My Programs from `ProgramStateManager.getMyPrograms()` (server canonical list) when the feature flag is on; fall back to legacy local storage only when offline.  
- Display fork metadata (icon + `origin_name_snapshot` / `forked_at`) so users know the source.  
- Use dropdown actions:
  - `Rename Program` â†’ `ProgramStateManager.renameCustomProgram(templateId, newName)` (updates Supabase row, history, active run).  
  - `End Program` (visible only for the active custom template) â†’ `ProgramStateManager.finalizeActiveProgram(...)`.  
- After rename/end, refresh lists and fire a toastâ€”users need immediate confirmation.
 - Rename flows must use the in-app dialog pattern (LiftLog theme) instead of native browser prompts.

Checklist
- [ ] My Programs tab calls `ProgramStateManager.getMyPrograms()` and merges active state
- [ ] Fork badges/icons render for custom templates
- [ ] Rename and End actions call the correct ProgramStateManager helpers
- [ ] Rename dialog matches design (themed dialog, inline validation, no browser prompt)
- [ ] UI reacts instantly (toast + list refresh + `programChanged` event)

---

*Last Updated: 2025-10-24*
*Version: 1.8 - Added Pattern 17: Dialog Positioning with Sidebar Compensation.*

---

## ðŸ¤ Contributing

When you discover new patterns or make mistakes:

1. Document the pattern/anti-pattern in this file
2. Add it to the appropriate section
3. Include code examples
4. Explain the "why" behind the rule
5. Update the version and date

This is a living document that evolves with the codebase.

### Pattern 16: List Rows With Nested Menus

When a clickable row (e.g., opens details or navigates) contains nested interactive controls (dropdown menu triggers, buttons), ensure the nested controls do not bubble pointer/mouse/click events to the parent row.

- Do
  - Stop propagation on `onPointerDown` and `onMouseDown` for the nested control to prevent the row click from firing.
  - Optionally use a one-shot suppression guard in the row click handler to ignore the next click if a nested action set it beforehand.
  - Allow the menu system (Radix) to handle opening: avoid `preventDefault` unless absolutely necessary.

- Don’t
  - Call `preventDefault` on the trigger’s pointer/mouse handlers if it prevents Radix menus from opening.
  - Let events bubble up to the parent row’s `onClick`, which can cause navigation or heavy data loads.

Example (React):

```tsx
// Row with onClick (e.g., opens details)
<div onClick={handleRowClick}>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        onPointerDown={(e) => {
          e.stopPropagation();
          setSuppressNextRowClick(true);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setSuppressNextRowClick(true);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical />
      </Button>
    </DropdownMenuTrigger>
    {/* Items stop propagation as well */}
    <DropdownMenuContent>
      <DropdownMenuItem onPointerDown={(e) => e.stopPropagation()} onSelect={(e) => { e.stopPropagation(); doAction(); }} />
    </DropdownMenuContent>
  </DropdownMenu>
</div>

// Guard in the row click handler
const handleRowClick = () => {
  if (suppressNextRowClick) { setSuppressNextRowClick(false); return; }
  // proceed with navigation/details
};
```

Checklist
- [ ] Menu trigger stops propagation on pointer/mouse down
- [ ] Row click checks one-shot suppression guard
- [ ] No use of preventDefault that blocks menu opening
- [ ] Heavy operations (navigation/data load) only occur when row click is intentional

---

## 🎨 UI Component Patterns

### Button Component Rules

**NEVER use native `<button>` HTML elements.** Always use the shadcn `<Button>` component.

#### Button Sizes

```typescript
// Mobile-optimized touch targets
<Button size="touch">Click me</Button>  // h-11 (44px) - Mobile primary
<Button size="icon">☰</Button>          // h-9 w-9 (36px) - Icon buttons
<Button>Click me</Button>               // h-9 (36px) - Default text button
<Button size="sm">Compact</Button>      // h-8 (32px) - Compact contexts
<Button size="lg">Large</Button>        // h-10 (40px) - Featured actions
```

**Key Rules:**
- ✅ Use `size="touch"` for mobile-first interfaces (dialog buttons, footer actions)
- ✅ Use `size="icon"` for icon buttons (menus, toggles, etc.)
- ✅ Never use responsive className overrides like `h-9 sm:h-10 sm:w-10`
- ✅ Responsive sizing is handled by Button component variant system
- ❌ Never hardcode button height/padding with `px-` or `py-` classes
- ❌ Never use `min-h-[44px]` or similar custom sizing

#### Button Variants

```typescript
<Button variant="default">Primary action</Button>      // Blue, filled
<Button variant="outline">Secondary action</Button>   // Bordered, minimal
<Button variant="ghost">Tertiary action</Button>      // No background
<Button variant="destructive">Delete</Button>         // Red, filled
<Button variant="link">Text link</Button>             // Underlined text
```

**Key Rules:**
- ✅ Use appropriate variant for context
- ✅ Focus states, disabled states handled automatically
- ❌ Never add custom className for focus/hover/disabled states

#### Button with Icons

```typescript
// Icon + Text (default spacing)
<Button>
  <Download className="h-4 w-4 mr-2" />
  Download
</Button>

// Icon only
<Button variant="ghost" size="icon">
  <Menu className="h-4 w-4" />
</Button>

// Text + Icon
<Button>
  Send
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>
```

**Key Rules:**
- ✅ Icon size should match text size (h-4 w-4 for text buttons)
- ✅ Use `ml-2` or `mr-2` for spacing between icon and text
- ✅ Icon-only buttons use `size="icon"`
- ❌ Never set custom icon sizes larger than button height

### Card Components

Use specialized card components instead of generic `<Card>`. This improves:
- Consistency across similar patterns
- Reusability across features
- Maintainability (styling in one place)
- Type safety

#### StatCard: Metrics with Icon + Value + Label

**Use for:** Analytics dashboards, key metrics, quick stats

```typescript
import { StatCard } from "@/components/ui/stat-card"

<StatCard
  icon={<Trophy className="h-8 w-8" />}
  value={42}
  label="Workouts Completed"
  variant="gradient"
  size="md"
/>
```

**Variants:** default, gradient, accent
**Sizes:** sm (compact), md (standard), lg (spacious)
**Accent Colors:** primary, success, warning, error

#### DetailCard: Header + Content Layout

**Use for:** Profile sections, detail views, analytics with explanations

```typescript
import { DetailCard } from "@/components/ui/detail-card"

<DetailCard
  title="Weekly Progress"
  description="Your workout frequency over the past 8 weeks"
  size="md"
  action={<Button size="sm">View Details</Button>}
>
  <div>{/* Content here */}</div>
</DetailCard>
```

**Variants:** default, highlighted, minimal
**Sizes:** sm, md, lg

#### MetricListCard: Metrics with Trends

**Use for:** Strength gains, progress tracking, performance metrics

```typescript
import { MetricListCard } from "@/components/ui/metric-list-card"

<MetricListCard
  title="Strength Gains"
  description="Percentage increase by muscle group"
  items={[
    { label: "Chest", value: "+15%", trend: "up" },
    { label: "Back", value: "+8%", trend: "up" }
  ]}
  showTrendIcons={true}
/>
```

#### ExerciseCard: Exercise Display with Status

**Use for:** Exercise lists, workout details, exercise tracking

```typescript
import { ExerciseCard } from "@/components/ui/exercise-card"

<ExerciseCard status="current" zone="strength" intensity="high">
  <ExerciseCardContent>
    <h3>Bench Press</h3>
  </ExerciseCardContent>
</ExerciseCard>
```

**Status:** pending, current, completed, warmup
**Zone:** strength, endurance, power, warmup, recovery
**Intensity:** normal, high, maximum

#### ExerciseListCard: Exercise Items in Lists

**Use for:** Program templates, exercise selection, exercise lists

```typescript
import { ExerciseListCard } from "@/components/ui/exercise-list-card"

<ExerciseListCard
  exerciseName="Bench Press"
  subtitle="Barbell"
  badges={[{ label: "4 sets" }]}
  metadata={[{ label: "Max Weight:", value: "100kg" }]}
  action={<Button size="icon" variant="ghost">⋮</Button>}
/>
```

#### ProgramCard: Program Template Display

**Use for:** Program recommendations, template selection, program browsing

```typescript
import { ProgramCard } from "@/components/ui/program-card"

<ProgramCard
  title="Upper/Lower Split"
  description="4-day split for strength and hypertrophy"
  difficulty="Intermediate"
  duration="8 weeks"
  workouts={16}
  frequency="4 days/week"
  goals={["Strength", "Hypertrophy"]}
  action={<Button>Select</Button>}
/>
```

#### AccentCard: Colored Status/Alert Cards

**Use for:** Alerts, notifications, status indicators, tips

```typescript
import { AccentCard } from "@/components/ui/accent-card"

<AccentCard
  variant="success"
  icon={<CheckCircle className="h-5 w-5" />}
  title="Great job!"
  description="You've completed your weekly goal"
/>
```

**Variants:** info (blue), success (green), warning (orange), error (red)

### Card Component Rules

**DO:**
- ✅ Use specialized card components (StatCard, DetailCard, etc.)
- ✅ Props control all styling (variant, size, accentColor)
- ✅ Extract repeated card patterns into new components
- ✅ Use TypeScript props for type safety
- ✅ Keep card styling centralized in component, not in consumers

**DON'T:**
- ❌ Create generic `<Card>` when a specialized component exists
- ❌ Override card styling with custom `className` props (use variant instead)
- ❌ Repeat the same card pattern in multiple files (extract to component)
- ❌ Mix multiple card patterns in same file (use appropriate component)
- ❌ Add responsive className overrides (`sm:`, `md:` prefixes on cards)

### Dialog Component Rules

**Use DialogWrapper for consistency:**

```typescript
import { DialogWrapper } from "@/components/ui/dialog-wrapper"

<DialogWrapper
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Delete Exercise?"
  description="This action cannot be undone"
  size="compact"
>
  <p>Are you sure?</p>
</DialogWrapper>
```

**Sizes:** compact (md), default (lg), medium (2xl), large (4xl), fullscreen

**Key Rules:**
- ✅ Always use DialogWrapper for consistent dialog sizing
- ✅ Never hardcode `max-w-[value]` on DialogContent
- ✅ Mobile dialogs automatically responsive (size="compact" → medium on desktop)
- ❌ Never use hardcoded `max-w-2xl` or `max-w-md` in dialogs

### Pattern 17: Dialog Positioning with Sidebar Compensation

**When dialogs need to center in the main content area (accounting for sidebar):**

The shadcn `DialogContent` component has built-in centering: `fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]`. This centers dialogs in the **full viewport** on all screen sizes.

However, when you have a sidebar (e.g., `lg:left-64`), you need to override this on desktop to center the dialog in the **remaining content area** after the sidebar.

```typescript
// ✅ CORRECT - Override left position on desktop
<DialogContent className="max-h-[85vh] sm:max-h-[90vh] flex flex-col lg:left-[calc(128px+50%)]">
  {/* Dialog content */}
</DialogContent>

// The math:
// - Sidebar width = 256px (left-64 in Tailwind)
// - Remaining space = 100vw - 256px
// - Center point = 256px + ((100vw - 256px) / 2)
//               = 256px + 50vw - 128px
//               = 128px + 50vw
// - The existing -translate-x-1/2 shift handles the rest

// ❌ WRONG - Using full sidebar width
lg:left-[calc(256px+50%)]  // Centers too far right

// ❌ WRONG - Removing default centering entirely
className="fixed top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2..."
// This conflicts with DialogContent's built-in transforms

// ❌ WRONG - Trying to add margin-based centering
className="mx-auto"  // Doesn't work with fixed positioning
```

**Key Rules:**
- ✅ Let DialogContent's default centering work for mobile/tablet
- ✅ Override only on desktop (lg breakpoint) with `lg:left-[calc(128px+50%)]`
- ✅ Use half the sidebar width (128px = 256px/2) in the calculation
- ✅ Keep the default `-translate-x-1/2` shift (it works with both positions)
- ✅ Test centering on both mobile (full viewport) and desktop (content area)
- ❌ Never remove the default fixed positioning classes
- ❌ Never add custom transform overrides that conflict with defaults
- ❌ Never use full sidebar width (256px) in the calculation

### Mobile-First CSS Rules

**All components must be mobile-first. CSS should NOT contain mobile overrides.**

✅ CORRECT - Uses Tailwind responsive prefixes naturally:
```tsx
<div className="p-4 sm:p-6 md:p-8 text-sm sm:text-base md:text-lg">
```

❌ WRONG - Excessive mobile overrides:
```tsx
<button className="text-xs sm:text-sm md:text-base py-1.5 sm:py-2 md:py-3 h-auto min-h-[32px] sm:min-h-[36px] md:min-h-[44px]">
```

**Use Component Variants Instead:**
```tsx
// Instead of responsive className bloat, use Button sizes
<Button size="touch">Click me</Button>
// Automatically 44px on mobile, 36px on desktop (if needed)
```

**Key Rules:**
- ✅ Define base styles for mobile (default)
- ✅ Add `sm:`, `md:`, `lg:` prefixes for larger screens only
- ✅ Use component `size` props instead of responsive overrides
- ❌ Never have more than 1-2 responsive prefixes per property
- ❌ Never use `h-auto min-h-[px]` patterns (use component sizes instead)

---

