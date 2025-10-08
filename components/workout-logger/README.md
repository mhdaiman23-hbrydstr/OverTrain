# Workout Logger Architecture

## Overview

The Workout Logger has been refactored from a monolithic 2,100+ line component into a modular, testable architecture. This document explains the new structure and patterns.

## Directory Structure

```
components/workout-logger/
├── workout-logger.tsx              # Main orchestrator component
├── components/                     # Presentational components
│   ├── WorkoutHeader.tsx          # Header with program info, calendar toggle, menu
│   ├── ConnectionStatusBanner.tsx  # Network connection status indicator
│   ├── WeekAccessBanner.tsx       # Displays week blocking/access messages
│   ├── ProgressionNoteBanner.tsx  # Shows progression guidance notes
│   ├── ExerciseGroups.tsx         # Renders grouped exercises
│   ├── CompletionBar.tsx          # Workout completion progress & actions
│   └── WorkoutDialogs.tsx         # All modal dialogs (notes, summary, etc.)
├── hooks/                          # Custom React hooks for business logic
│   ├── use-workout-session.ts     # Core workout state management
│   ├── use-connection-status.ts   # Network monitoring
│   └── use-one-rm-persistence.ts  # 1RM data synchronization with localStorage
├── contexts/                       # React Context providers
│   └── one-rm-context.tsx         # OneRmProvider for 1RM data
└── types.ts                        # Shared TypeScript type definitions
```

## OneRmProvider Pattern

### Purpose

The `OneRmProvider` context manages one-rep-max (1RM) values across the workout logger, enabling percentage-based progression engines to calculate target weights based on user strength data.

### Architecture

```typescript
<OneRmProvider initialData={cachedEntries}>
  <WorkoutLoggerView {...props} />
</OneRmProvider>
```

### Key Features

1. **Centralized 1RM Storage**: Single source of truth for all 1RM data
2. **Fast Lookups**: Memoized Map-based lookups by exercise ID and name
3. **Recency Priority**: Automatically returns most recent 1RM when duplicates exist
4. **Persistence**: Syncs with localStorage via `use-one-rm-persistence` hook

### Data Model

```typescript
interface OneRepMaxEntry {
  exerciseId: string       // Unique exercise identifier
  exerciseName: string     // Display name (used for fallback lookup)
  maxWeight: number        // Maximum weight lifted for 1 rep
  dateTested: number       // Timestamp of when 1RM was recorded
  estimated?: boolean      // Whether value is estimated vs. tested
}
```

### Usage

**In Components:**

```typescript
import { useOneRepMaxes } from '@/components/workout-logger/contexts/one-rm-context'

function ExerciseComponent({ exerciseId, exerciseName }) {
  const { getOneRepMax, oneRepMaxes, setOneRepMaxes } = useOneRepMaxes()

  // Lookup by ID (preferred)
  const entry = getOneRepMax(exerciseId)

  // Lookup by name fallback
  const entryByName = getOneRepMax('unknown-id', exerciseName)

  // Update 1RM data
  const handleUpdate = () => {
    setOneRepMaxes([
      ...oneRepMaxes,
      {
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        maxWeight: 225,
        dateTested: Date.now(),
        estimated: false,
      }
    ])
  }
}
```

**Persistence Hook:**

```typescript
import { useOneRmPersistence } from '@/components/workout-logger/hooks/use-one-rm-persistence'

function WorkoutSession() {
  const { oneRepMaxes } = useOneRepMaxes()

  // Automatically syncs oneRepMaxes to localStorage when changed
  useOneRmPersistence(userId)
}
```

### Lookup Logic

The provider implements intelligent lookup with fallback:

1. **Primary**: Lookup by `exerciseId` in exercise map
2. **Fallback**: Lookup by `exerciseName` (case-insensitive) in name map
3. **Recency**: When multiple entries exist, returns most recent by `dateTested`

Example:

```typescript
// Multiple entries for same exercise
const entries = [
  { exerciseId: 'bench', maxWeight: 200, dateTested: day1 },
  { exerciseId: 'bench', maxWeight: 225, dateTested: day3 },  // ← Returned (most recent)
  { exerciseId: 'bench', maxWeight: 215, dateTested: day2 },
]

getOneRepMax('bench') // Returns 225 (most recent)
```

### Integration with Progression Engines

Progression engines receive 1RM data through the router:

```typescript
// In use-workout-session.ts
const oneRepMaxPayload = useMemo(() => ({
  getOneRepMax,
  allOneRepMaxes: oneRepMaxes,
}), [getOneRepMax, oneRepMaxes])

// Passed to ProgressionInput
const progression = calculateProgression(exercise, {
  ...otherInputs,
  oneRepMaxes: oneRepMaxPayload,
})
```

Engines can then use 1RM for calculations:

```typescript
// In a progression engine
function calculateProgression(input: ProgressionInput) {
  const oneRm = input.oneRepMaxes?.getOneRepMax(input.exercise.exerciseId)

  if (oneRm) {
    // Percentage-based progression
    return {
      targetWeight: oneRm.maxWeight * 0.80, // 80% of 1RM
      strategy: 'percentage-based',
    }
  }

  // Fallback to linear progression
  return linearProgression(input)
}
```

## Component Communication Flow

```
WorkoutLoggerComponent (wraps with OneRmProvider)
  ↓
OneRmProvider (provides 1RM context)
  ↓
WorkoutLoggerView (main orchestrator)
  ↓
useWorkoutSession (business logic)
  ├→ useOneRepMaxes (read 1RM data)
  ├→ useOneRmPersistence (sync to localStorage)
  ↓
Components (WorkoutHeader, ExerciseGroups, etc.)
  ↓
Event handlers (handleSetUpdate, handleCompleteSet, etc.)
  ↓
Progression router (calculates next workout targets with 1RM)
```

## Testing

### Unit Tests

- **one-rm-context.test.tsx**: Tests provider, lookup logic, persistence
- **workout-logger-components.test.tsx**: Tests individual UI components
- **progression-router.registry.test.ts**: Tests progression strategy routing

### Running Tests

```bash
# All tests
npm run test -- --run

# Specific test file
npm run test -- --run tests/one-rm-context.test.tsx

# Watch mode
npm run test
```

## Migration Notes

### Before Refactor

```typescript
// Monolithic 2,100+ line component
function WorkoutLoggerComponent() {
  // All state, handlers, UI in one file
  // Hard to test, hard to maintain
}
```

### After Refactor

```typescript
// Modular architecture with clear separation
function WorkoutLoggerComponent(props) {
  return (
    <OneRmProvider>
      <WorkoutLoggerView {...props} />
    </OneRmProvider>
  )
}

// Hooks handle business logic
// Components handle presentation
// Context handles shared state
```

### Benefits

1. **Testability**: Individual components and hooks can be tested in isolation
2. **Maintainability**: Clear file boundaries and single responsibilities
3. **Reusability**: Components can be used in other contexts
4. **Performance**: Better memoization opportunities with smaller components
5. **Developer Experience**: Easier to locate and modify specific functionality

## Future Enhancements

1. **1RM UI**: Add user interface for inputting/editing 1RM values
2. **Auto-estimation**: Calculate estimated 1RM from workout performance
3. **Exercise Library Integration**: Link 1RM tracking with exercise library
4. **Historical Tracking**: Track 1RM changes over time for progress analytics
5. **Export/Import**: Allow users to backup and restore 1RM data

## Related Documentation

- [WORKOUT_LOGGER_REFACTOR_PLAN.md](../../WORKOUT_LOGGER_REFACTOR_PLAN.md) - Complete refactor roadmap
- [CLAUDE.md](../../CLAUDE.md) - Project-wide architecture documentation
- [tests/](../../tests/) - Test files and examples
