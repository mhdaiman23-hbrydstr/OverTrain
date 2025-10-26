# Phase 5: Component Integration Checklist

## Overview

We need to integrate 6 new components into 4 existing files:

1. **WorkoutLogger** - Load user preference, pass data to children
2. **ExerciseGroups** - Add notes banner and RPE box for each exercise
3. **WorkoutCalendar** - Add progression labels to week display
4. **ProfileSection** - Add preference toggle to Training tab

---

## Integration Checklist

### ✅ File 1: ExerciseGroups Component

**Location**: `components/workout-logger/components/ExerciseGroups.tsx`

**Changes**:
- [ ] Import new components:
  - `ExerciseNotesBanner`
  - `ExerciseNotesDialog`
  - `ExerciseCustomRpeBox`
  - `CustomRpeDialog`
  - Services: `ExerciseNotesService`, `CustomRpeService`

- [ ] Add props to component interface:
  ```typescript
  exerciseNotes?: { [exerciseId: string]: ExerciseNote }
  customRpes?: { [exerciseId: string]: { [setNumber: number]: number } }
  onExerciseNotesClick?: (exerciseId: string) => void
  onCustomRpeClick?: (exerciseId: string) => void
  onSaveExerciseNotes?: (exerciseId: string, noteText: string, isPinned: boolean) => Promise<void>
  onSaveCustomRpe?: (exerciseId: string, rpesBySet: { [setNumber: number]: number }) => Promise<void>
  blockLevelRpe?: number
  blockLevelRir?: number
  displayMode: RpeRirDisplayMode
  ```

- [ ] After exercise name (line ~109), add:
  - ExerciseNotesBanner if note exists
  - ExerciseCustomRpeBox

- [ ] Add state for dialogs:
  ```typescript
  const [selectedExerciseForNotes, setSelectedExerciseForNotes] = useState<string | null>(null)
  const [selectedExerciseForRpe, setSelectedExerciseForRpe] = useState<string | null>(null)
  ```

- [ ] Add dialogs at end of component:
  - ExerciseNotesDialog
  - CustomRpeDialog

---

### ✅ File 2: WorkoutLogger Component

**Location**: `components/workout-logger.tsx`

**Changes**:
- [ ] Import:
  - `UserPreferenceService` from `@/lib/services/user-preference-service`
  - `ProgressionLabel` component

- [ ] In component state, add:
  ```typescript
  const [userDisplayPreference, setUserDisplayPreference] = useState<RpeRirDisplayMode>('rir')
  const [exerciseNotes, setExerciseNotes] = useState<{ [exerciseId: string]: ExerciseNote }>({})
  const [customRpes, setCustomRpes] = useState<{ [exerciseId: string]: { [setNumber: number]: number } }>({})
  ```

- [ ] In useEffect, load user preference:
  ```typescript
  useEffect(() => {
    const loadUserPreference = async () => {
      const userId = getCurrentUserId() // Get from auth context
      const preference = await UserPreferenceService.getRpeRirDisplayMode(userId)
      setUserDisplayPreference(preference)
    }
    loadUserPreference()
  }, [])
  ```

- [ ] Pass to ExerciseGroups:
  ```typescript
  <ExerciseGroups
    // ... existing props ...
    displayMode={userDisplayPreference}
    blockLevelRpe={getBlockLevelRpe(currentWeek, programWeeks)}
    blockLevelRir={getBlockLevelRir(currentWeek, programWeeks)}
    exerciseNotes={exerciseNotes}
    customRpes={customRpes}
    onExerciseNotesClick={(exerciseId) => handleExerciseNotesClick(exerciseId)}
    onCustomRpeClick={(exerciseId) => handleCustomRpeClick(exerciseId)}
    onSaveExerciseNotes={handleSaveExerciseNotes}
    onSaveCustomRpe={handleSaveCustomRpe}
  />
  ```

---

### ✅ File 3: WorkoutCalendar Component

**Location**: `components/workout-calendar.tsx`

**Changes**:
- [ ] Import `ProgressionLabel` component
- [ ] Import `UserPreferenceService`

- [ ] Add state:
  ```typescript
  const [displayMode, setDisplayMode] = useState<RpeRirDisplayMode>('rir')
  ```

- [ ] Load user preference on mount

- [ ] Update week header to include ProgressionLabel:
  ```typescript
  <div className="flex items-center gap-2">
    <span>Week {weekNumber}</span>
    <ProgressionLabel
      blockLength={programWeeks}
      weekNumber={weekNumber}
      displayMode={displayMode}
    />
  </div>
  ```

---

### ✅ File 4: ProfileSection Component

**Location**: `components/profile-section.tsx`

**Changes**:
- [ ] Import `RpeRirPreferenceToggle` component
- [ ] Import `UserPreferenceService`

- [ ] Find the "Training" tab section

- [ ] Add RpeRirPreferenceToggle:
  ```typescript
  <RpeRirPreferenceToggle
    currentMode={userDisplayMode}
    onSave={async (mode) => {
      const userId = user?.id
      if (userId) {
        await UserPreferenceService.setRpeRirDisplayMode(userId, mode)
        setUserDisplayMode(mode)
      }
    }}
  />
  ```

---

## Implementation Order

1. **ExerciseGroups** - Add component stubs (no logic yet)
2. **WorkoutLogger** - Add state and props passing
3. **WorkoutCalendar** - Add progression labels
4. **ProfileSection** - Add preference toggle

---

## Data Flow

```
WorkoutLogger
  ├─ Load user preference: UserPreferenceService.getRpeRirDisplayMode(userId)
  ├─ Load exercise notes: ExerciseNotesService.getNotesForWeek(...)
  ├─ Load custom RPEs: CustomRpeService.getExerciseRpesForWeek(...)
  │
  ├─→ ExerciseGroups (pass displayMode, notes, RPEs)
  │     ├─ ExerciseNotesBanner (if note exists)
  │     ├─ ExerciseCustomRpeBox (always show)
  │     └─ ExerciseNotesDialog & CustomRpeDialog
  │
  ├─→ WorkoutCalendar (pass displayMode)
  │     └─ ProgressionLabel on week header
  │
  └─→ ProfileSection (pass displayMode)
        └─ RpeRirPreferenceToggle on Training tab
```

---

## Expected Timeline

- ExerciseGroups: 30 minutes (adding components)
- WorkoutLogger: 30 minutes (loading state)
- WorkoutCalendar: 15 minutes (progression label)
- ProfileSection: 15 minutes (preference toggle)

**Total**: 1.5 hours

---

## Notes

- All services use localStorage + Supabase sync
- Components gracefully handle missing data
- User preference is loaded from Supabase and synced globally
- Notes and RPE data persist across sessions

---

## Questions?

If stuck on any file:
1. Let me know which file
2. I'll create the exact code changes needed
3. We'll integrate step by step
