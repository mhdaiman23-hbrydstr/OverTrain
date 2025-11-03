# LiftLog Development Audit & Guardrails
**Date**: October 30, 2025
**Branch**: `feat/workout-cleanup-and-rls`

---

## Executive Summary

This audit documents today's development commits and establishes guardrails for maintaining code stability, especially when extending the workout logger system.

**Key Principle**: The workout logger is production-stable. New features must be added via isolated, non-invasive patterns that don't modify core logger logic.

---

## Today's Commits (October 30, 2025)

### 1. **fix(train): skip database call for cached active program data** (1495965)
- **Type**: Performance optimization
- **Impact**: Reduced database calls for cached program state
- **Pattern**: Check localStorage before making database queries
- **Guardrail**: Always validate cached data before using it

### 2. **feat(ui): add female-specific indicator to program templates** (58376bc)
- **Type**: UI enhancement
- **Impact**: Visual indication of female-specific programs
- **Pattern**: Add semantic indicators to templates without modifying template structure
- **Guardrail**: Don't break existing template queries; use optional fields

### 3. **fix(ui): show female-only indicator, hide for mixed-gender templates** (8681d0f)
- **Type**: UI logic fix
- **Impact**: Corrected visibility logic for gender indicators
- **Pattern**: Conditional rendering based on template properties
- **Guardrail**: Test all template visibility states

### 4. **feat(workout-logger): add color-coded muscle group badges to replace exercise dialog** (e3edc82)
- **Type**: UI enhancement
- **Impact**: Visual improvements to exercise replacement UI
- **Pattern**: Add new UI components without touching core workout logic
- **Guardrail**: New components are isolated; old components remain untouched

### 5. **feat(program-wizard): add color-coded muscle group badges + replace popover with dialog** (8330f8e)
- **Type**: UI refactor + UX improvement
- **Impact**: Better visual hierarchy in program wizard
- **Pattern**: Replace less-capable UI components (popovers) with more capable ones (dialogs)
- **Guardrail**: Ensure all existing functionality still works after component replacement

### 6. **fix(program-wizard): pre-filter exercises by day's muscle groups in add exercise dialog** (417c1a6)
- **Type**: UX improvement
- **Impact**: Smarter exercise filtering based on context
- **Pattern**: Add filtering logic without modifying exercise database schema
- **Guardrail**: Filtering is client-side; doesn't affect data integrity

---

## New Feature: Bodyweight Exercise Detection (Added Today)

### Overview
Auto-fills exercise sets with user's bodyweight when they reach a "Bodyweight Only" exercise.

### Implementation Pattern: Non-Invasive Feature Addition

**Key Principle**: Add new functionality without modifying the stable core logger.

### Architecture
```
1. New State (use-workout-session.ts)
   - showBodyweightDialog: boolean
   - bodyweightInput: string
   - bodyweightExerciseId: string | null

2. New Functions (use-workout-session.ts)
   - checkForBodyweightExercise(): Detects next exercise is bodyweight
   - handleSaveBodyweight(): Fills sets + saves to profile

3. New Dialog Component (isolated)
   - bodyweight-dialog.tsx (completely new, doesn't touch existing dialogs)

4. Integration Point (ONE location)
   - In handleCompleteSet(), after exercise completes:
     if (updatedExercise!.completed) {
       checkForBodyweightExercise(exerciseId)
     }

5. UI Integration (WorkoutDialogs.tsx)
   - Added <BodyweightDialog /> component (no changes to existing dialogs)
```

### Why This Pattern Is Safe

✅ **Isolated Logic**: All bodyweight logic lives in dedicated functions
✅ **Non-Invasive Integration**: Only ONE new line in existing function
✅ **Backward Compatible**: Doesn't affect existing exercises or workflows
✅ **Easy to Test**: Can test bodyweight feature independently
✅ **Reversible**: Can remove entire feature by deleting:
   - New state variables (3 lines)
   - New functions (2 functions)
   - New dialog component (1 file)
   - Integration check (2 lines)

---

## Guardrails for Future Development

### 1. **Production Stability First**
- Never modify `handleCompleteSet`, `handleSetUpdate`, or core persistence logic
- New features must add new functions, not modify existing ones
- Test all existing workflows after changes

### 2. **Isolated Components Pattern**
- New features → new component files
- New business logic → new hook functions
- New state → new useState declarations
- Example: `bodyweight-dialog.tsx` doesn't import or modify any existing dialog

### 3. **Single Integration Point Rule**
- Each feature should integrate at ONE location only
- Document the exact line/function where integration happens
- Make integration lines obvious (wrap in comments if needed)

### 4. **Always Prefetch Equipment Type**
- When working with exercises, check `equipmentType === "Bodyweight Only"`
- Equipment type is available on `WorkoutTemplateExercise`
- Never modify equipment detection logic; add new detection patterns instead

### 5. **Workout Data Integrity**
- Always validate sets have week/day before saving
- Check for corrupted data (missing sets array) before using
- Sets are pre-initialized when creating WorkoutSession
- Never add sets dynamically to existing WorkoutSession

### 6. **Profile Updates Must Be Defensive**
- When saving to user profile, handle missing fields gracefully
- Use optional chaining and type guards
- Example: `if (user && (!user.bodyweight || user.bodyweight !== bodyweight))`

### 7. **Dialog Pattern**
- All new dialogs should follow WorkoutDialogs integration pattern
- Add new dialog component separately
- Add state to hook (`show`, `set`, `input`, `handler`)
- Pass to WorkoutDialogs via props
- Don't add inline dialogs to main components

### 8. **Testing Scenarios**
Before adding features, ensure these work:
- ✅ Cold start (no previous data)
- ✅ Existing data present (cached)
- ✅ Network offline (localStorage fallback)
- ✅ Partial data (some fields missing)
- ✅ Invalid data (corrupted cache)

---

## Code Organization Reference

### File Structure for New Features
```
If adding feature X:
├── components/workout-logger/
│   ├── components/
│   │   ├── x-dialog.tsx          (New: UI component)
│   │   └── WorkoutDialogs.tsx    (Modified: Add <XDialog />)
│   ├── hooks/
│   │   └── use-workout-session.ts (Modified: Add handlers + state)
│   └── types.ts                  (Check if types need updates)
└── components/workout-logger.tsx  (Modified: Pass props to WorkoutDialogs)
```

### State Management Pattern
```typescript
// In use-workout-session.ts
const [showXDialog, setShowXDialog] = useState(false)
const [xInput, setXInput] = useState("")
const [xData, setXData] = useState<Type | null>(null)

const handleXLogic = () => { /* logic here */ }
const checkIfXNeeded = () => { /* detection here */ }

// Return all in hook return object
return {
  showXDialog,
  setShowXDialog,
  xInput,
  setXInput,
  handleXLogic,
  // ...
}
```

---

## Build & Deployment Checklist

- ✅ Build succeeds: `npm run build`
- ✅ Tests pass: `npm run test -- --run` (if applicable)
- ✅ No TypeScript errors
- ✅ No ESLint warnings (in changed files)
- ✅ Core logger workflows still work (manual testing)
- ✅ New feature works in isolation
- ✅ Feature gracefully fails if dependencies missing
- ✅ Commit message follows pattern: `feat(scope): description`

---

## Progression Enhancement Notes

**Future Work**: Adding weight progression logic for bodyweight exercises
- Will NOT apply weight progression (bodyweight doesn't increase)
- WILL apply rep progression (+1 reps)
- Will use same pattern: isolated logic, single integration point
- Will NOT modify progression router core logic

---

## Quick Reference: Recent Patterns Used

### Pattern 1: UI Enhancement Without Core Changes
Used in: Female indicator, muscle group badges
```typescript
// Add to template/exercise object without breaking existing code
templateHasProperty?: boolean
// Use in components with optional chaining
{property && <Badge />}
```

### Pattern 2: Client-Side Filtering
Used in: Exercise pre-filtering by muscle groups
```typescript
// Filter on client before showing to user
// Don't modify database queries
const filtered = exercises.filter(ex =>
  selectedMuscles.includes(ex.muscleGroup)
)
```

### Pattern 3: Isolated Dialog Feature
Used in: Bodyweight input dialog
```typescript
// 1. New dialog component (no dependencies on other dialogs)
// 2. New state in hook (show, input, handler)
// 3. Pass to WorkoutDialogs via props
// 4. WorkoutDialogs renders with <DialogComponent />
// 5. Single integration point in core logic
```

### Pattern 4: ProgramStateManager Lock Hygiene
Used in: Custom program forking during exercise replacement
```typescript
// Run fork-or-custom logic before acquiring the mutex
if (!activeProgram.isCustom) {
  await ProgramStateManager.ensureCustomTemplateForActiveProgram()
}

return ProgramStateManager.withLock(async () => {
  const updated = await ProgramStateManager.getActiveProgram({ skipDatabaseLoad: true })
  // ... mutate template safely inside the lock ...
})
```
- Avoid calling helpers that acquire `withLock()` while already inside another `withLock()` scope—nested lock acquisition stalls the second call and leaves state partially updated.
- Ensure the active program is marked custom *prior* to template mutations so the CURRENT pill follows the forked template instead of leaving the user on the original.
- When enriching template data, keep database-sourced metadata intact so reloads stay lossless (avoid guessing fields client-side when Supabase already stores them).

### Pattern 5: Preserve Exercise Metadata On Reload
Used in: Muscle-group persistence for future-week replacements
```typescript
const exercises: ExerciseTemplate[] = day.exercises?.map(ex => ({
  // ...existing fields...
  muscleGroup: ex.exercise?.muscle_group ?? undefined,
}))
```
- When converting Supabase rows to `ExerciseTemplate`, forward all metadata we rely on in the workout logger (e.g., `muscleGroup`) instead of recomputing it later.
- This keeps future-week views aligned with the immediate replacement UI and prevents regressions like “Other” muscle groups after cache refreshes.

---

## Version Information
- **Next.js**: 15.5.4
- **Tailwind CSS**: Latest (from shadcn/ui)
- **Database**: Supabase (with localStorage fallback)
- **Build Status**: ✅ Successful (67s compile time)

---

**Last Updated**: October 30, 2025
**Maintained By**: Development Team
**Next Review**: After next feature addition
