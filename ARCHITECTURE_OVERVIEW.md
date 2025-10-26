# Architecture Overview: Exercise Notes & Custom RPE

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WORKOUT LOGGER (Main Component)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Calendar Modal (Week Selection)                                    │  │
│  │ ┌──────────────────────────────────────────────────────────────┐   │  │
│  │ │ Week 1 · RIR 3  [ProgressionLabel]                           │   │  │
│  │ │ Week 2 · RPE 9  [ProgressionLabel]                           │   │  │
│  │ │ Week 3 · RIR 2  [ProgressionLabel]                           │   │  │
│  │ └──────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              ↓                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Exercise List                                                       │  │
│  │                                                                     │  │
│  │ Exercise: Deadlift (Conventional) [RPE]                           │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ NOTE: Focus on hip drive, keep chest up 📌                 │   │  │
│  │ │ [ExerciseNotesBanner] - Click to edit                      │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                     │  │
│  │ Set 1: [weight input] [reps input] [ ]  [RPE box - grey]  X      │  │
│  │ Set 2: [weight input] [reps input] [ ]  [RPE box - grey]  X      │  │
│  │ Set 3: [weight input] [reps input] [ ]  [RPE box - grey]  X      │  │
│  │                                           ↓ Click to open dialog    │  │
│  │                       [CustomRpeDialog opens]                      │  │
│  │                       Set 1 RPE: [8.5]                            │  │
│  │                       Set 2 RPE: [9.0]                            │  │
│  │                       Set 3 RPE: [7.5]                            │  │
│  │                       [Save RPE] [Cancel]                         │  │
│  │                                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ ProgressionConfigService    │  │ ExerciseNotesService           │   │
│  ├─────────────────────────────┤  ├─────────────────────────────────┤   │
│  │ • getProgressionForWeek()    │  │ • saveNote()                   │   │
│  │ • getRirForWeek()           │  │ • getNote()                    │   │
│  │ • getRpeForWeek()           │  │ • getPinnedNoteForWeek()       │   │
│  │ • getDefaultPattern()        │  │ • deleteNote()                 │   │
│  │ • loadFromDatabase()         │  │ • getNotesForWeek()            │   │
│  └──────────────┬──────────────┘  └────────────┬────────────────────┘   │
│                 │                               │                        │
│                 ↓                               ↓                        │
│            [CACHE]                        [localStorage +              │
│         Default patterns                   Supabase sync]             │
│         hardcoded in code                                              │
│                                                                           │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐   │
│  │ CustomRpeService             │  │ UserPreferenceService          │   │
│  ├──────────────────────────────┤  ├────────────────────────────────┤   │
│  │ • saveCustomRpe()            │  │ • getRpeRirDisplayMode()       │   │
│  │ • getCustomRpe()             │  │ • setRpeRirDisplayMode()       │   │
│  │ • getExerciseRpesForWeek()    │  │                                │   │
│  │ • deleteCustomRpe()          │  │                                │   │
│  └──────────────┬───────────────┘  └──────────────┬─────────────────┘   │
│                 │                                  │                     │
│                 ↓                                  ↓                     │
│            [localStorage +                   [profiles table]           │
│             Supabase sync]                 [rpe_rir_display_mode]     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ program_progression_config                                       │   │
│  │ ┌─────────────────────────────────────────────────────────────┐  │   │
│  │ │ id | template_id | block_len | week | rir | rpe | created  │  │   │
│  │ │ ─────────────────────────────────────────────────────────── │  │   │
│  │ │ 1  | abc-def     | 6         | 1    | 3   | 7   | ...      │  │   │
│  │ │ 2  | abc-def     | 6         | 2    | 3   | 7   | ...      │  │   │
│  │ │ 3  | abc-def     | 6         | 3    | 2   | 8   | ...      │  │   │
│  │ │ ...                                                          │  │   │
│  │ └─────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ exercise_notes                                                    │   │
│  │ ┌─────────────────────────────────────────────────────────────┐  │   │
│  │ │ id | user_id | prog_inst | exercise_id | week | text | pin │  │   │
│  │ │ ─────────────────────────────────────────────────────────── │  │   │
│  │ │ 1  | xyz-123 | prog-001  | ex-deadlift | 1    | ... | T   │  │   │
│  │ │ 2  | xyz-123 | prog-001  | ex-deadlift | 2    | ... | T   │  │   │
│  │ │ ...                                                          │  │   │
│  │ └─────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ exercise_custom_rpe                                              │   │
│  │ ┌─────────────────────────────────────────────────────────────┐  │   │
│  │ │ id | user_id | prog_inst | exercise_id | week | set | rpe  │  │   │
│  │ │ ─────────────────────────────────────────────────────────── │  │   │
│  │ │ 1  | xyz-123 | prog-001  | ex-deadlift | 1    | 1   | 8.5  │  │   │
│  │ │ 2  | xyz-123 | prog-001  | ex-deadlift | 1    | 2   | 9.0  │  │   │
│  │ │ 3  | xyz-123 | prog-001  | ex-deadlift | 1    | 3   | 7.5  │  │   │
│  │ │ ...                                                          │  │   │
│  │ └─────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ profiles (existing table - UPDATE)                              │   │
│  │ ┌─────────────────────────────────────────────────────────────┐  │   │
│  │ │ id | email | ... | rpe_rir_display_mode |                  │  │   │
│  │ │ ─────────────────────────────────────────────────────────── │  │   │
│  │ │ xyz-123 | user@... | ... | 'rir' |                         │  │   │
│  │ └─────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Feature Lifecycle

### 1. Progression Label Display

```
WorkoutLogger Mounts
  │
  ├─→ Read: activeProgram.template.totalWeeks (e.g., 6)
  │
  └─→ Calendar Modal Renders
      │
      └─→ For Each Week:
          │
          ├─→ ProgressionLabel Component Mounts
          │
          ├─→ Query: UserPreferenceService.getRpeRirDisplayMode(userId)
          │   Result: 'rir' | 'rpe' | 'off'
          │
          ├─→ If displayMode !== 'off':
          │   │
          │   ├─→ Query: ProgressionConfigService.getProgressionForWeek(6, 1)
          │   │   Result: { week: 1, rir: 3, rpe: 7 }
          │   │
          │   └─→ Render: "Week 1 · RIR 3" OR "Week 1 · RPE 7"
          │
          └─→ If displayMode === 'off':
              Render: "Week 1"
```

### 2. Exercise Notes Flow

```
User Loads Exercise for Week
  │
  ├─→ ExerciseNotesService.getNote(userId, progInstId, exerciseId, week)
  │   Queries: Supabase exercise_notes table
  │   Result: { noteText, isPinned, ... } or null
  │
  ├─→ If note exists:
  │   │
  │   └─→ ExerciseNotesBanner Renders
  │       │
  │       ├─→ Click → ExerciseNotesDialog Opens
  │       │
  │       └─→ User Edits:
  │           ├─→ Change noteText
  │           ├─→ Toggle isPinned checkbox
  │           ├─→ Click Save
  │           │
  │           └─→ ExerciseNotesService.saveNote(...)
  │               │
  │               ├─→ Save to Supabase
  │               └─→ Update localStorage
  │
  └─→ If note PINNED and Week N:
      │
      └─→ When Week N+1 Loads:
          │
          ├─→ ExerciseNotesService.getPinnedNoteForWeek(...)
          │   │
          │   └─→ Auto-create note in Week N+1 (if not exists)
          │
          └─→ User sees same note again

    If Exercise REPLACED:
      │
      └─→ Note DELETED (hard delete, not cascade)
```

### 3. Custom RPE Per-Set Flow

```
User Clicks ExerciseCustomRpeBox
  │
  ├─→ CustomRpeDialog Opens
  │
  ├─→ Query: CustomRpeService.getExerciseRpesForWeek(...)
  │   Result: { 1: 8.5, 2: 9.0, 3: 7.5 } or {}
  │
  ├─→ User Enters RPE for Each Set:
  │   Set 1: 8.5
  │   Set 2: 9.0
  │   Set 3: 7.5
  │
  ├─→ Click Save
  │
  ├─→ For Each Set:
  │   │
  │   └─→ CustomRpeService.saveCustomRpe(userId, progInstId, exerciseId, week, setNum, rpeValue)
  │       │
  │       ├─→ Save to Supabase
  │       └─→ Update localStorage
  │
  ├─→ ExerciseCustomRpeBox Updates:
  │   ├─→ Color changes from grey → blue
  │   ├─→ Shows "9" (average or selected RPE)
  │
  └─→ In History/Analytics:
      User can view "I did RPE 8.5 on set 1" independently
      from block-level RIR/RPE
```

### 4. User Preference Toggle

```
User Opens Profile → Training Tab
  │
  ├─→ RpeRirPreferenceToggle Component Renders
  │
  ├─→ Query: UserPreferenceService.getRpeRirDisplayMode(userId)
  │   Result: 'rir' | 'rpe' | 'off'
  │
  ├─→ Radio Buttons Display:
  │   ○ Show RIR
  │   ○ Show RPE
  │   ○ Off
  │
  ├─→ User Selects 'rpe'
  │
  ├─→ Click Save
  │
  ├─→ UserPreferenceService.setRpeRirDisplayMode(userId, 'rpe')
  │   │
  │   ├─→ Update Supabase profiles table
  │   └─→ Dispatch global event (preference changed)
  │
  └─→ All ProgressionLabel Components Re-Render:
      │
      └─→ Now Show: "Week 1 · RPE 7" (instead of "Week 1 · RIR 3")
```

---

## localStorage Structure (In-Memory Caching)

```typescript
// Key: liftlog_in_progress_workouts_{userId}
[
  {
    id: "session-123",
    workoutName: "Lower Body Power",
    exercises: [
      {
        id: "ex-deadlift-1",
        exerciseName: "Deadlift (Conventional)",
        exerciseId: "lib-deadlift-uuid",
        sets: [...],

        // NEW: Notes for this exercise
        notes: {
          id: "note-1",
          noteText: "Focus on hip drive, keep chest up",
          isPinned: true,
          createdAt: 1729XXX000,
          updatedAt: 1729XXX000
        },

        // NEW: Custom RPE per set (set number → RPE value)
        customRpeBySet: {
          "1": 8.5,
          "2": 9.0,
          "3": 7.5
        }
      }
    ]
  }
]

// Key: liftlog_user_preferences_{userId}
{
  rpeRirDisplayMode: 'rir' | 'rpe' | 'off'
  // Additional preferences can be added here
}
```

---

## Request Flow: End-to-End Example

### Scenario: User logs Week 3 of 6-week program, records notes and RPE

```
1. USER OPENS APP
   └─ WorkoutLogger loads activeProgram (6-week block)

2. USER OPENS CALENDAR MODAL
   └─ For Week 3:
      ├─ ProgressionLabel queries: getRirForWeek(6, 3) → 2
      ├─ ProgressionLabel queries: getRpeForWeek(6, 3) → 8
      └─ Display depends on user preference:
         ├─ If 'rir': "Week 3 · RIR 2"
         ├─ If 'rpe': "Week 3 · RPE 8"
         └─ If 'off': "Week 3"

3. USER SELECTS WEEK 3
   └─ ExerciseList renders for Week 3

4. USER CLICKS EXERCISE: "Deadlift"
   └─ ExerciseList checks:
      ├─ ExerciseNotesService.getNote(userId, progId, exerciseId, 3)
      │  └─ Result: null (no note yet)
      └─ ExerciseCustomRpeBox renders (grey, no value)

5. USER CLICKS "NOTE" AREA
   └─ ExerciseNotesDialog opens
      ├─ User types: "Focus on hip drive"
      ├─ User checks: "Pin this note"
      ├─ User clicks Save
      └─ ExerciseNotesService.saveNote(...)
         ├─ Saves to Supabase
         ├─ Updates localStorage
         └─ ExerciseNotesBanner now shows note

6. USER CLICKS RPE BOX
   └─ CustomRpeDialog opens
      ├─ Set 1: User enters 8.5
      ├─ Set 2: User enters 9.0
      ├─ Set 3: User enters 7.5
      ├─ User clicks Save
      └─ CustomRpeService.saveCustomRpe(...)
         ├─ Saves each set to Supabase
         ├─ Updates localStorage
         └─ ExerciseCustomRpeBox changes color → blue, shows "9"

7. USER ADVANCES TO WEEK 4 (NEXT WEEK)
   └─ WorkoutLogger calls: ProgramStateManager.completeWorkout()
      ├─ Advances week from 3 → 4
      ├─ ExerciseNotesService.getPinnedNoteForWeek(userId, progId, exerciseId, 4)
      │  └─ Finds pinned note from Week 3
      │  └─ Auto-creates note for Week 4
      └─ ExerciseCustomRpeBox resets (grey again)
         └─ New session = new RPE entries

8. USER OPENS HISTORY
   └─ Can see:
      ├─ Week 3 exercises with recorded RPE per set (8.5, 9.0, 7.5)
      └─ Actual block-level was RIR 2 (RPE 8)
         Different from user's custom effort!
```

---

## State Management Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    GLOBAL STATE CHANGES                         │
└────────────────────────────────────────────────────────────────┘

UserPreference Updated
  │
  ├─→ Event: "userPreferenceChanged"
  │
  ├─→ All ProgressionLabel components receive event
  │
  └─→ Trigger Re-render:
     └─→ Updated display (RIR → RPE or vice versa)

Note Saved/Updated
  │
  ├─→ localStorage updated immediately
  │
  ├─→ Supabase sync async in background
  │
  └─→ ExerciseNotesBanner re-renders:
     └─→ Shows updated text/pin status

Custom RPE Saved
  │
  ├─→ localStorage updated immediately
  │
  ├─→ Supabase sync async in background
  │
  └─→ ExerciseCustomRpeBox re-renders:
     └─→ Updates color/value display

Week Advances
  │
  ├─→ Check for pinned notes
  │
  ├─→ Auto-create notes for new week
  │
  └─→ Reset custom RPE (new week = new RPE entries)
```

---

## Performance Considerations

### Caching Strategy

```
ProgressionConfigService
  │
  ├─→ First Call: getRirForWeek(6, 1)
  │   └─→ Load hardcoded defaults (fast)
  │   └─→ Cache in memory
  │
  ├─→ Second Call: getRirForWeek(6, 2)
  │   └─→ Return from cache (instant)
  │
  └─→ Database Query (lazy):
      └─→ Only if custom template with overrides
      └─→ Happens async, doesn't block UI
```

### localStorage Sync

```
Save Operation (e.g., saveNote):
  │
  ├─→ Immediate: Update localStorage
  │   └─→ UI re-renders instantly
  │
  └─→ Async: Upload to Supabase
      └─→ No blocking, no wait

Load Operation (e.g., getNote):
  │
  ├─→ Check localStorage first
  │   └─→ If found, return (instant)
  │
  └─→ If not found, query Supabase
      └─→ Cache result in localStorage
      └─→ Return to UI
```

---

## Backward Compatibility

### For Users Without Preference Set

```
Default: rpe_rir_display_mode = 'rir'
  │
  └─→ All users see RIR labels by default
  └─→ Can change anytime in Settings
```

### For Programs Without Progression Config

```
Query: getProgressionForWeek(6, 1)
  │
  ├─→ Check database for custom config (not found)
  │
  └─→ Fall back to hardcoded defaults
      └─→ Return: { rir: 3, rpe: 7 }
      └─→ No error, graceful fallback
```

### For Old Workouts Without Notes/RPE

```
Query: getNote(userId, progId, exerciseId, week)
  │
  └─→ No database record (program ended before feature release)
      │
      └─→ Return: null
      └─→ ExerciseNotesBanner: Don't render
      └─→ ExerciseCustomRpeBox: Render (grey, empty)
```

---

## Future Enhancements

1. **Custom Progression Templates**
   - Allow users to create custom RIR/RPE patterns
   - Save to database instead of hardcoded defaults

2. **Analytics by RPE**
   - Chart: RPE progression over program
   - Compare: Block-level vs custom per-set RPE

3. **AI Coaching**
   - Auto-suggest adjustments based on RPE pattern
   - "Your last 3 sets averaged RPE 9.2, consider reducing weight"

4. **Note Templates**
   - Predefined coaching cues for common exercises
   - Quick-select vs free-form text

5. **Multi-User Coaching**
   - Coach adds notes, athletes see them
   - Notes attributed to coach

---

## Key Constraints & Assumptions

1. **exercise_library.id exists** - All exercises linked to library
2. **instanceId always present** - Every program/template copy has unique ID
3. **Block length is fixed** - Program weeks = 4, 5, 6, 7, or 8
4. **Notes per week** - Only one note per exercise per week
5. **RPE per set** - Custom RPE is independent from block-level RPE
6. **Pinning is automatic** - Pinned notes repeat Week N → Week N+1 only
7. **Exercise replacement deletes notes** - Notes tied to exercise, not week

---

## Testing Strategy

### Unit Tests

```
ProgressionConfigService
  ✓ getProgressionForWeek returns correct values
  ✓ getRirForWeek handles all block lengths
  ✓ getRpeForWeek supports decimals
  ✓ getDefaultProgressionPattern hardcoded correctly

ExerciseNotesService
  ✓ saveNote creates/updates correctly
  ✓ getPinnedNoteForWeek auto-repeats
  ✓ deleteNote removes from DB
  ✓ Unique constraint prevents duplicate notes per week

CustomRpeService
  ✓ saveCustomRpe per set
  ✓ getExerciseRpesForWeek batch load
  ✓ RPE validation (1-10, decimals)
  ✓ Unique constraint prevents duplicate per set
```

### Integration Tests

```
Full Workflow
  ✓ User loads program → sees correct RIR/RPE label
  ✓ User saves note → appears in UI
  ✓ User pins note → repeats next week
  ✓ User sets RPE → saved per set
  ✓ User preferences saved → affects all labels
```

### E2E Tests

```
Real Scenarios
  ✓ 6-week program, Week 1 to Week 6
  ✓ Pin notes from Week 1, verify Week 2-6 show them
  ✓ Change preference mid-program, labels update
  ✓ History view shows custom RPE per set
  ✓ Replace exercise, notes disappear
```

