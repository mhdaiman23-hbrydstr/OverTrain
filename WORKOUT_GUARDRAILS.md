# Workout Logger Guardrails

This document defines the critical rules and patterns that must be followed when working with the workout logger system. These guardrails ensure data integrity, prevent race conditions, and maintain consistent behavior across the PWA.

## Core Principles

### 1. Database is Source of Truth
- All set completions sync to Supabase immediately via batched queue (`flushSetCompletions()`)
- Workout completion MUST flush all pending sets before marking complete
- PWA optimizes localStorage to avoid quota issues on mobile browsers
- IndexedDB is used as primary storage on mobile, with localStorage as mirror/fallback

**Key Files:**
- `lib/workout-logger.ts` - `logSetCompletion()`, `flushSetCompletions()`, `syncToDatabase()`

### 2. Program Instance Isolation
- Every new program run creates a new `instanceId` (UUID)
- Workouts are tagged with `programInstanceId` for strict matching
- Previous program workouts NEVER leak into new program runs
- `matchesInstance()` enforces strict instanceId matching

**Key Files:**
- `lib/program-state.ts` - `generateInstanceId()`, `setActiveProgram()`
- `lib/workout-logger.ts` - `matchesInstance()`, `tagWorkoutsWithInstance()`

### 3. Week Access Control
- Users cannot log future weeks until current week is fully completed
- `isWeekCompleted()` checks ALL days have completed workouts
- Future weeks can be previewed (read-only) but not edited
- `isWorkoutBlocked` and `isFullyBlocked` flags control UI access

**Key Files:**
- `lib/workout-logger.ts` - `isWeekCompleted()`, `hasCompletedWorkout()`
- `components/workout-logger/hooks/use-workout-session.ts` - week blocking logic

### 4. Progression and Volume Compensation
- Future weeks calculate progression based on previous week performance
- Volume compensation adjusts reps when user changes weight outside bounds
- Progression data comes from `ProgressionRouter.calculateProgression()`
- Per-set suggestions are generated for Week 2+ based on actual performance

**Key Files:**
- `lib/progression-router.ts` - `calculateProgression()`, `getPreviousPerformance()`
- `lib/progression-engines/linear-engine.ts`
- `lib/progression-engines/percentage-engine.ts`

### 5. Program End Saves to History
- `finalizeActiveProgram()` moves program to history
- Skipped workouts are marked with `skipped: true` flag
- Program history persists even after program ends
- Both localStorage AND Supabase are updated

**Key Files:**
- `lib/program-state.ts` - `finalizeActiveProgram()`, `getProgramHistory()`

### 6. Exercise Swap Uses Database Muscle Groups
- `ExerciseLibraryService.getExerciseById()` is the source of truth for exercise metadata
- Fallback to `getExerciseMuscleGroup()` only when database is unavailable
- NEVER use hardcoded muscle group data for swaps
- Exercise swaps fork the program to a custom copy if not already custom

**Key Files:**
- `lib/services/exercise-library-service.ts`
- `lib/exercise-muscle-groups.ts` - fallback only
- `lib/program-state.ts` - `applyFutureExerciseReplacement()`

### 7. New Exercise Persists in Instance Only (Default)
- Adding an exercise updates the current workout session
- Only persists to template if "Repeat" option is selected
- NO `programChanged` event dispatch on add to prevent race conditions
- Save order: Storage → State → Template (if repeat)

**Key Files:**
- `components/workout-logger/hooks/use-workout-session.ts` - `handleSelectExerciseFromLibrary()`
- `lib/program-state.ts` - `addExerciseToDay()`

### 8. New Set Persists in Instance Only (Default)
- Adding a set updates the current workout session
- Only persists to template if "Repeat" option is selected
- NO `programChanged` event dispatch on add to prevent race conditions
- Save order: Storage → State → Template (if repeat)

**Key Files:**
- `components/workout-logger/hooks/use-workout-session.ts` - `handleConfirmAddSet()`
- `lib/program-state.ts` - `addSetToExercise()`

### 9. Repeat Function Behavior
- "Repeat" modifies the template for current + future weeks
- Template changes sync to database via `program_template_exercises` table
- Current workout MUST be saved BEFORE template is modified
- Program is forked to custom copy on first modification

**Key Files:**
- `lib/program-state.ts` - `addExerciseToDay()`, `addSetToExercise()`, `ensureCustomTemplateForActiveProgram()`
- `lib/services/program-fork-service.ts`

## Critical Implementation Notes

### Race Condition Prevention

The primary race condition pattern to avoid:

```
BAD: Template update → programChanged event → State reload → Loses unsaved changes

GOOD: Save to storage → Update state → Template update (no event)
```

**Rules:**
1. NEVER dispatch `programChanged` from add/modify operations
2. Save workout to storage BEFORE updating React state
3. Save workout to storage BEFORE modifying template
4. Use `await` for storage operations to ensure order

### Event Flow

```
programChanged event should ONLY fire for:
- Navigation events (user clicks different week/day)
- Workout completion (after data is saved)
- Program start/end

programChanged should NOT fire for:
- Adding exercises
- Adding sets
- Exercise replacements
- Any in-session modifications
```

### Storage Save Order

For any workout modification:

```typescript
// 1. Build the updated workout object
const updatedWorkout = { ...workout, exercises: [...] }

// 2. Save to storage FIRST
await WorkoutLogger.saveCurrentWorkout(updatedWorkout, userId)

// 3. Update React state
setWorkout(updatedWorkout)

// 4. Optional: Update template (if repeat enabled)
if (repeatInFollowingWeeks) {
  await ProgramStateManager.addExerciseToDay(...)  // No event dispatched
}

// 5. Show toast/feedback
toast({ title: "Success", ... })
```

### Mobile Set Sync Pattern

Set logging uses fire-and-forget with batched sync:

```typescript
// SAFE: Queue for batched sync (returns immediately)
WorkoutLogger.logSetCompletion(...)

// CRITICAL: Before completing workout, flush the queue
await WorkoutLogger.flushSetCompletions()
await WorkoutLogger.completeWorkout(...)
```

## Testing Checklist

Before any PR that touches workout logger:

1. [ ] Add exercise without "Repeat" - persists in current workout only
2. [ ] Add exercise with "Repeat" - persists in current + future weeks
3. [ ] Add set without "Repeat" - persists in current workout only
4. [ ] Add set with "Repeat" - persists in current + future weeks
5. [ ] Navigate away and back - added exercises/sets remain
6. [ ] Complete workout - data syncs to Supabase
7. [ ] Week blocking - cannot log future week until current is complete
8. [ ] Program restart - new instance, clean slate
9. [ ] Exercise swap - uses DB muscle group, not hardcoded

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Main project guidance
- [AUDIT_MOBILE_SET_SYNC_BUG.md](./AUDIT_MOBILE_SET_SYNC_BUG.md) - Mobile sync patterns
