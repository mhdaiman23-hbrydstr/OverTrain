# WorkoutLogger Integration Code Changes

## File: components/workout-logger/hooks/use-workout-session.ts

### Step 1: Add Imports (after line 21)

```typescript
import { ExerciseNotesService } from "@/lib/services/exercise-notes-service"
import { CustomRpeService } from "@/lib/services/custom-rpe-service"
import { ProgressionConfigService } from "@/lib/services/progression-config-service"
import { UserPreferenceService } from "@/lib/services/user-preference-service"
import type { ExerciseNote, RpeRirDisplayMode } from "@/lib/types/progression"
```

### Step 2: Add State Variables (after line 67, before resolveCategory)

```typescript
  // Exercise notes and RPE data
  const [exerciseNotesData, setExerciseNotesData] = useState<{ [exerciseId: string]: ExerciseNote }>({})
  const [customRpesData, setCustomRpesData] = useState<{ [exerciseId: string]: { [setNumber: number]: number } }>({})
  const [displayMode, setDisplayMode] = useState<RpeRirDisplayMode>('rir')
  const [blockLevelRpe, setBlockLevelRpe] = useState<number | undefined>()
  const [blockLevelRir, setBlockLevelRir] = useState<number | undefined>()
```

### Step 3: Add useEffect Hook for Loading Data (after the main initialization useEffect, around line 200)

Find the end of the first useEffect hook and add this NEW useEffect after it:

```typescript
  // Load user preference, exercise notes, and custom RPE data
  useEffect(() => {
    if (!user?.id || !workout) return

    const loadNotesAndRpeData = async () => {
      try {
        // Get active program for context
        const activeProgram = ProgramStateManager.getActiveProgram()
        if (!activeProgram) return

        // Load user preference
        const preference = await UserPreferenceService.getRpeRirDisplayMode(user.id)
        setDisplayMode(preference)

        // Load exercise notes for current week
        const notes = await ExerciseNotesService.getNotesForWeek(
          user.id,
          activeProgram.instanceId,
          activeProgram.currentWeek
        )
        const notesMap: { [exerciseId: string]: ExerciseNote } = {}
        notes.forEach(note => {
          notesMap[note.exerciseId] = note
        })
        setExerciseNotesData(notesMap)

        // Load custom RPEs for all exercises in current week
        const rpesByExercise: { [exerciseId: string]: { [setNumber: number]: number } } = {}
        for (const exercise of workout.exercises) {
          const exerciseRpes = await CustomRpeService.getExerciseRpesMapForWeek(
            user.id,
            activeProgram.instanceId,
            exercise.exerciseId || exercise.id,
            activeProgram.currentWeek
          )
          if (Object.keys(exerciseRpes).length > 0) {
            rpesByExercise[exercise.id] = exerciseRpes
          }
        }
        setCustomRpesData(rpesByExercise)

        // Get block-level progression
        const progression = ProgressionConfigService.getProgressionForWeek(
          activeProgram.template.weeks,
          activeProgram.currentWeek
        )
        if (progression) {
          setBlockLevelRir(progression.rir)
          setBlockLevelRpe(progression.rpe)
        }
      } catch (error) {
        console.warn('[WorkoutLogger] Failed to load notes/RPE data:', error)
        // Gracefully continue - data is optional
      }
    }

    loadNotesAndRpeData()
  }, [user?.id, workout?.id])
```

### Step 4: Add Save Callbacks (after the useEffect hook, before resolveCategory)

```typescript
  // Save exercise note callback
  const handleSaveExerciseNote = async (exerciseId: string, noteText: string, isPinned: boolean) => {
    if (!user?.id) return

    try {
      const activeProgram = ProgramStateManager.getActiveProgram()
      if (!activeProgram) return

      // Find exercise ID in library
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId)
      if (!exercise) return

      const exerciseLibraryId = exercise.exerciseId || exerciseId

      // Save note
      const savedNote = await ExerciseNotesService.saveNote(
        user.id,
        activeProgram.instanceId,
        exerciseLibraryId,
        activeProgram.currentWeek,
        noteText,
        isPinned
      )

      // Update local state
      setExerciseNotesData(prev => ({
        ...prev,
        [exerciseId]: savedNote
      }))

      toast({
        title: "Note saved",
        description: isPinned ? "This note will repeat next week" : "Note saved for this week only",
      })
    } catch (error) {
      console.error('[WorkoutLogger] Failed to save exercise note:', error)
      toast({
        title: "Error saving note",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  // Save custom RPE callback
  const handleSaveCustomRpe = async (exerciseId: string, rpesBySet: { [setNumber: number]: number }) => {
    if (!user?.id) return

    try {
      const activeProgram = ProgramStateManager.getActiveProgram()
      if (!activeProgram) return

      // Find exercise ID in library
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId)
      if (!exercise) return

      const exerciseLibraryId = exercise.exerciseId || exerciseId

      // Save each set's RPE
      for (const [setNumberStr, rpeValue] of Object.entries(rpesBySet)) {
        const setNumber = parseInt(setNumberStr)
        await CustomRpeService.saveCustomRpe(
          user.id,
          activeProgram.instanceId,
          exerciseLibraryId,
          activeProgram.currentWeek,
          setNumber,
          rpeValue
        )
      }

      // Update local state
      setCustomRpesData(prev => ({
        ...prev,
        [exerciseId]: rpesBySet
      }))

      toast({
        title: "RPE recorded",
        description: `Saved RPE for ${Object.keys(rpesBySet).length} set(s)`,
      })
    } catch (error) {
      console.error('[WorkoutLogger] Failed to save custom RPE:', error)
      toast({
        title: "Error saving RPE",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }
```

### Step 5: Return Statement Update (in the return object)

Find the return statement where all the state and handlers are returned. Add these new properties:

```typescript
    // Add these new properties to the returned object
    exerciseNotesData,
    setExerciseNotesData,
    customRpesData,
    setCustomRpesData,
    displayMode,
    blockLevelRpe,
    blockLevelRir,
    handleSaveExerciseNote,
    handleSaveCustomRpe,
```

---

## File: components/workout-logger.tsx

### Step 1: Add Imports (after existing imports)

```typescript
// Add after existing imports at the top
```

(No new imports needed - types are already imported via the hook)

### Step 2: Destructure New Properties (in WorkoutLoggerView, around line 22)

Find the destructuring of `useWorkoutSession`:

```typescript
const {
    // ... existing properties ...
    handleDeleteExercise,
```

Add after the existing properties:

```typescript
    handleDeleteExercise,
    // New properties for notes and RPE
    exerciseNotesData,
    customRpesData,
    displayMode,
    blockLevelRpe,
    blockLevelRir,
    handleSaveExerciseNote,
    handleSaveCustomRpe,
```

### Step 3: Update ExerciseGroups Props (around line 177)

Find the ExerciseGroups component call and add these NEW props (keep all existing props):

```typescript
      <ExerciseGroups
        groupedExercises={groupedExercises}
        workout={workout}
        isWorkoutBlocked={isWorkoutBlocked}
        outOfBoundsExercises={outOfBoundsExercises}
        volumeCompensation={volumeCompensation}
        userOverrides={userOverrides}
        onSetUpdate={handleSetUpdate}
        onWeightBlur={handleWeightInputBlur}
        onCompleteSet={handleCompleteSet}
        onAddSet={handleAddSet}
        onDeleteSet={handleDeleteSet}
        onSkipSet={handleSkipSet}
        onExerciseNotes={handleExerciseNotes}
        onReplaceExercise={handleReplaceExercise}
        onMoveExerciseUp={handleMoveExerciseUp}
        onMoveExerciseDown={handleMoveExerciseDown}
        onSkipAllSets={handleSkipAllSets}
        onDeleteExercise={handleDeleteExercise}
        {/* NEW PROPS - Add these */}
        exerciseNotes={exerciseNotesData}
        customRpes={customRpesData}
        displayMode={displayMode}
        blockLevelRpe={blockLevelRpe}
        blockLevelRir={blockLevelRir}
        onSaveExerciseNote={handleSaveExerciseNote}
        onSaveCustomRpe={handleSaveCustomRpe}
      />
```

---

## Summary

**What was added:**
- 4 service imports
- 5 new state variables
- 1 useEffect hook (loads notes, RPEs, and user preference)
- 2 callback handlers (save note, save RPE)
- Updated hook return object (5 new exports)
- Updated WorkoutLoggerView destructuring (7 new properties)
- Updated ExerciseGroups props (7 new props passed)

**What was NOT changed:**
- Core workout logging logic
- Set/weight input handling
- Exercise completion logic
- Program progression logic
- Any existing callbacks or handlers
- Database schema or structure

**Impact:**
- ✅ Notes and RPE data automatically loaded on workout start
- ✅ Saving notes/RPE integrated seamlessly
- ✅ No disruption to existing functionality
- ✅ Graceful degradation if services fail

---

## Testing Checklist After Integration

- [ ] Workout logs normally (existing functionality works)
- [ ] Notes banner appears when notes exist
- [ ] RPE box appears next to exercise name
- [ ] Can click banner to edit note
- [ ] Can click RPE box to log RPE
- [ ] Saving note works and closes dialog
- [ ] Saving RPE works and closes dialog
- [ ] Data persists when switching between exercises
- [ ] Data persists after workout completion
