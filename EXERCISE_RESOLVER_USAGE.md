# Exercise Resolver Usage Guide

## ⚠️ Important: Non-Breaking Change

The `ExerciseResolver` service is **completely optional** and does **NOT** modify any existing workout logger functionality. It's a read-only service that templates can use when ready.

**Current workout logger functionality remains 100% unchanged.**

---

## What It Does

The Exercise Resolver translates exercise identifiers to database Exercise objects:

- **UUID** → Exercise object
- **Exercise name** → Exercise object
- **Slug** (e.g., "barbell-bench-press") → Exercise object

---

## Basic Usage

```typescript
import { exerciseResolver } from '@/lib/services/exercise-resolver'

// Resolve by UUID (from database)
const exercise1 = await exerciseResolver.resolve('a1b2c3d4-uuid-from-db')

// Resolve by name
const exercise2 = await exerciseResolver.resolve('Barbell Bench Press')

// Resolve by slug (backwards compatibility with old workout data)
const exercise3 = await exerciseResolver.resolve('barbell-bench-press')

// All return the same Exercise object:
// {
//   id: 'a1b2c3d4-uuid-from-db',
//   name: 'Barbell Bench Press',
//   muscleGroup: 'Chest',
//   equipmentType: 'Barbell'
// }
```

---

## Batch Resolution (More Efficient)

```typescript
const exerciseIds = ['barbell-bench-press', 'barbell-back-squat', 'deadlift']

const results = await exerciseResolver.resolveMany(exerciseIds)

for (const [id, exercise] of results) {
  if (exercise) {
    console.log(`${id} → ${exercise.name}`)
  }
}
```

---

## Cache Warming (Optional Performance Optimization)

Load all exercises into memory on app startup:

```typescript
// In app initialization
await exerciseResolver.warmCache()

// Now all subsequent resolve() calls are instant (from cache)
const exercise = await exerciseResolver.resolve('barbell-bench-press')
```

---

## Integration Examples

### Example 1: Template Loading (Future Use)

```typescript
// lib/program-state.ts (FUTURE - NOT IMPLEMENTED YET)
import { exerciseResolver } from '@/lib/services/exercise-resolver'

static async getCurrentWorkout() {
  const workout = template.schedule[dayKey]

  const exercises = await Promise.all(
    workout.exercises.map(async (exercise) => {
      // Try to get from DB first
      const dbExercise = await exerciseResolver.resolve(
        exercise.exerciseLibraryId || exercise.exerciseName
      )

      return {
        exerciseId: dbExercise?.id || exercise.exerciseName.toLowerCase().replace(/\s+/g, "-"),
        exerciseName: dbExercise?.name || exercise.exerciseName,
        targetSets: exercise.progressionTemplate.week1?.sets || 3,
        targetReps: exercise.progressionTemplate.week1?.repRange || "8-10",
        targetRest: exercise.restTime,
        muscleGroup: dbExercise?.muscleGroup || exercise.category,
      }
    })
  )

  return { name: workout.name, exercises }
}
```

### Example 2: Exercise Library Component (Already Working)

```typescript
// components/exercise-library.tsx (ALREADY IMPLEMENTED)
import { exerciseService } from '@/lib/services/exercise-library-service'

// Component uses exerciseService directly, no resolver needed
const exercises = await exerciseService.getAllExercises()
```

### Example 3: Migration Script (Populate Template UUIDs)

```typescript
// scripts/populate-template-uuids.ts
import { exerciseResolver } from '@/lib/services/exercise-resolver'
import { GYM_TEMPLATES } from '@/lib/gym-templates'

async function populateUUIDs() {
  for (const template of GYM_TEMPLATES) {
    for (const dayKey in template.schedule) {
      for (const exercise of template.schedule[dayKey].exercises) {
        const dbExercise = await exerciseResolver.getByName(exercise.exerciseName)

        if (dbExercise) {
          exercise.exerciseLibraryId = dbExercise.id
          console.log(`✓ ${exercise.exerciseName} → ${dbExercise.id}`)
        } else {
          console.warn(`✗ Not found: ${exercise.exerciseName}`)
        }
      }
    }
  }
}
```

---

## Performance Characteristics

### Without Cache
- First lookup: ~50-100ms (DB query)
- Subsequent lookups: ~50-100ms each

### With Cache Warming
- First lookup (after warm): <1ms (in-memory)
- Cache TTL: 5 minutes
- Cache clears automatically and refreshes

### Memory Usage
- ~200 exercises × 200 bytes ≈ 40KB
- Negligible memory footprint

---

## Error Handling

The resolver never throws errors - it returns `null` if exercise not found:

```typescript
const exercise = await exerciseResolver.resolve('non-existent-exercise')

if (!exercise) {
  console.warn('Exercise not found, using fallback')
  // Handle gracefully
}
```

---

## Testing

Run tests to verify resolver works:

```bash
npm run test -- lib/services/exercise-resolver.test.ts
```

---

## FAQ

### Q: Will this break existing workouts?
**A:** No. The resolver is read-only and doesn't modify any existing code.

### Q: Do I need to use this now?
**A:** No. It's available when templates are ready to integrate with DB.

### Q: What if the database is down?
**A:** The app requires network, so database should always be available. If it's down, the resolver returns `null` and you can fall back to exercise names.

### Q: Can I use this for workout history?
**A:** Yes! You can resolve old slugs like "barbell-bench-press" to get current exercise details from DB.

### Q: Is caching automatic?
**A:** Yes. Resolver caches automatically for 5 minutes. You can optionally warm the cache on startup.

---

## Next Steps

1. ✅ **Resolver created** - Ready to use
2. ⏳ **Update templates** - Add `exerciseLibraryId` field (optional)
3. ⏳ **Populate UUIDs** - Run migration script to add UUIDs to templates
4. ⏳ **Integrate with program state** - Use resolver in `getCurrentWorkout()`
5. ⏳ **Test thoroughly** - Ensure no breaking changes

---

## Support

If you encounter issues:
1. Check Supabase connection (environment variables)
2. Verify `exercise_library` table exists and is populated
3. Check console for resolver error logs
4. Try clearing cache: `exerciseResolver.clearCache()`

---

**Status:** ✅ Ready to use
**Breaking Changes:** None
**Dependencies:** `lib/services/exercise-library-service.ts`
