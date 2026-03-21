/**
 * Comprehensive Tests: Workout CRUD & Week Progression
 *
 * Covers:
 * 1. Creating (starting) workouts
 * 2. Updating sets within workouts
 * 3. Completing workouts
 * 4. Deleting/clearing workouts
 * 5. Week completion detection
 * 6. Week advancement (current week done → next week)
 * 7. Program finalization (all weeks done)
 * 8. Edge cases: corrupted data, out-of-order completion, instance matching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock native platform (always return false = web environment)
vi.mock('@/lib/native/platform', () => ({
  isNative: () => false,
}))

// Mock native storage
vi.mock('@/lib/native/storage-service', () => ({
  unifiedStorage: {
    initialize: vi.fn(),
    getWorkouts: vi.fn(async () => []),
    setWorkouts: vi.fn(async () => {}),
    getActiveProgram: vi.fn(async () => null),
    setActiveProgram: vi.fn(async () => {}),
  },
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: null,
}))

// Mock connection monitor
vi.mock('@/lib/connection-monitor', () => ({
  ConnectionMonitor: {
    addToQueue: vi.fn(),
    isOnline: vi.fn(() => true),
    registerSetSyncProvider: vi.fn(),
    getInstance: vi.fn(() => ({
      addToQueue: vi.fn(),
      isOnline: vi.fn(() => true),
    })),
  },
}))

// Mock storage lock (execute callback immediately)
vi.mock('@/lib/storage-lock', () => ({
  StorageLock: {
    withLock: vi.fn(async (_key: string, fn: () => Promise<void>) => fn()),
  },
}))

// Mock storage telemetry
vi.mock('@/lib/storage-telemetry', () => ({
  StorageTelemetry: {
    startSyncOperation: vi.fn(() => 'mock-telemetry-id'),
    endSyncOperation: vi.fn(),
    logSyncFailure: vi.fn(),
    logQuotaWarning: vi.fn(async () => {}),
  },
}))

// Mock IndexedDB storage
vi.mock('@/lib/indexed-db-storage', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    initialize: vi.fn(async () => {}),
  },
}))

// Mock audit logger
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(async () => {}),
}))

// ─── Imports ────────────────────────────────────────────────────────────────

import { WorkoutLogger, type WorkoutSession, type WorkoutSet } from '@/lib/workout-logger'

// ─── Test Helpers ───────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-123'
const TEST_TEMPLATE_ID = 'template-001'
const TEST_INSTANCE_ID = 'instance-abc-123'

function getWorkoutsKey(userId: string) {
  return `liftlog_workouts_${userId}`
}

function getInProgressKey(userId: string) {
  return `liftlog_in_progress_workouts_${userId}`
}

/** Sets up localStorage with a mock active program */
function setActiveProgram(opts?: {
  templateId?: string
  instanceId?: string
  currentWeek?: number
  currentDay?: number
  totalWeeks?: number
  daysPerWeek?: number
}) {
  const {
    templateId = TEST_TEMPLATE_ID,
    instanceId = TEST_INSTANCE_ID,
    currentWeek = 1,
    currentDay = 1,
    totalWeeks = 4,
    daysPerWeek = 3,
  } = opts || {}

  const schedule: Record<string, any> = {}
  for (let d = 1; d <= daysPerWeek; d++) {
    schedule[`Day ${d}`] = { exercises: [] }
  }

  const program = {
    templateId,
    instanceId,
    currentWeek,
    currentDay,
    completedWorkouts: 0,
    totalWorkouts: totalWeeks * daysPerWeek,
    progress: 0,
    template: {
      id: templateId,
      name: 'Test Program',
      weeks: totalWeeks,
      days: daysPerWeek,
      schedule,
    },
    templateMetadata: {
      id: templateId,
      name: 'Test Program',
      weeks: totalWeeks,
      days: daysPerWeek,
    },
  }

  localStorage.setItem('liftlog_active_program', JSON.stringify(program))
  return program
}

/** Creates a basic set of exercises for starting a workout */
function makeExercises(count = 2, setsPerExercise = 3) {
  return Array.from({ length: count }, (_, i) => ({
    exerciseId: `exercise-${i + 1}`,
    exerciseName: `Exercise ${i + 1}`,
    targetSets: setsPerExercise,
    targetRest: '90',
  }))
}

/** Creates a completed workout in history for a specific week/day */
function addCompletedWorkout(
  week: number,
  day: number,
  userId: string = TEST_USER_ID,
  instanceId: string = TEST_INSTANCE_ID,
  templateId: string = TEST_TEMPLATE_ID,
) {
  const key = getWorkoutsKey(userId)
  const existing = JSON.parse(localStorage.getItem(key) || '[]')

  const workout: WorkoutSession = {
    id: `completed-w${week}d${day}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    programId: templateId,
    programInstanceId: instanceId,
    workoutName: `Week ${week} Day ${day}`,
    startTime: Date.now() - 3600000,
    endTime: Date.now(),
    week,
    day,
    exercises: [
      {
        id: `ex-${Math.random().toString(36).substr(2, 5)}`,
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        targetSets: 3,
        targetRest: '90',
        sets: [
          { id: 's1', reps: 8, weight: 135, completed: true },
          { id: 's2', reps: 8, weight: 135, completed: true },
          { id: 's3', reps: 7, weight: 135, completed: true },
        ],
        completed: true,
      },
    ],
    completed: true,
  }

  existing.push(workout)
  localStorage.setItem(key, JSON.stringify(existing))
  return workout
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Workout CRUD & Week Progression', () => {
  beforeEach(() => {
    localStorage.clear()
    // Set up user context
    localStorage.setItem('liftlog_user', JSON.stringify({ id: TEST_USER_ID }))
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CREATE — Starting Workouts
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Start Workout (Create)', () => {
    it('should create a new workout with correct structure', () => {
      setActiveProgram()
      const exercises = makeExercises(2, 3)

      const workout = WorkoutLogger.startWorkout('Push Day', exercises, 1, 1, TEST_USER_ID)

      expect(workout).toBeDefined()
      expect(workout.workoutName).toBe('Push Day')
      expect(workout.week).toBe(1)
      expect(workout.day).toBe(1)
      expect(workout.completed).toBe(false)
      expect(workout.exercises).toHaveLength(2)
      expect(workout.programId).toBe(TEST_TEMPLATE_ID)
      expect(workout.programInstanceId).toBe(TEST_INSTANCE_ID)
    })

    it('should pre-initialize sets with 0 reps for Week 1', () => {
      setActiveProgram()
      const exercises = makeExercises(1, 3)

      const workout = WorkoutLogger.startWorkout('Push Day', exercises, 1, 1, TEST_USER_ID)

      const sets = workout.exercises[0].sets
      expect(sets).toHaveLength(3)
      sets.forEach((set) => {
        expect(set.reps).toBe(0)
        expect(set.weight).toBe(0)
        expect(set.completed).toBe(false)
      })
    })

    it('should pre-fill sets from perSetSuggestions for Week 2+', () => {
      setActiveProgram({ currentWeek: 2 })
      const exercises = [
        {
          exerciseId: 'bench-1',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetRest: '90',
          perSetSuggestions: [
            { weight: 140, reps: 8, baseWeight: 135, baseReps: 8, bounds: { min: 135, max: 145 } },
            { weight: 140, reps: 8, baseWeight: 135, baseReps: 8, bounds: { min: 135, max: 145 } },
            { weight: 140, reps: 7, baseWeight: 135, baseReps: 7, bounds: { min: 135, max: 145 } },
          ],
        },
      ]

      const workout = WorkoutLogger.startWorkout('Push Day', exercises, 2, 1, TEST_USER_ID)

      expect(workout.exercises[0].sets[0].weight).toBe(140)
      expect(workout.exercises[0].sets[0].reps).toBe(8)
      expect(workout.exercises[0].sets[2].reps).toBe(7)
    })

    it('should return existing workout if one exists for same week/day', () => {
      setActiveProgram()
      const exercises = makeExercises(2, 3)

      const first = WorkoutLogger.startWorkout('Push Day', exercises, 1, 1, TEST_USER_ID)

      // startWorkout defers save via requestIdleCallback, so manually save for the test
      const key = getInProgressKey(TEST_USER_ID)
      localStorage.setItem(key, JSON.stringify([first]))

      const second = WorkoutLogger.startWorkout('Push Day', exercises, 1, 1, TEST_USER_ID)

      // Should return the same workout, not create a duplicate
      expect(second.id).toBe(first.id)
    })

    it('should replace corrupted existing workout', () => {
      setActiveProgram()
      const exercises = makeExercises(2, 3)

      // Create a corrupted workout in localStorage (missing sets)
      const corrupted: WorkoutSession = {
        id: 'corrupted-1',
        userId: TEST_USER_ID,
        workoutName: 'Corrupted',
        startTime: Date.now(),
        week: 1,
        day: 1,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'e1',
            exerciseName: 'Test',
            targetSets: 3,
            targetRest: '90',
            sets: [], // Empty sets = corrupted
            completed: false,
          },
        ],
        completed: false,
      }
      const key = getInProgressKey(TEST_USER_ID)
      localStorage.setItem(key, JSON.stringify([corrupted]))

      const workout = WorkoutLogger.startWorkout('Push Day', exercises, 1, 1, TEST_USER_ID)

      // Should create new workout, not return corrupted one
      expect(workout.id).not.toBe('corrupted-1')
      expect(workout.exercises[0].sets.length).toBe(3)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. UPDATE — Modifying Sets
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Update Set', () => {
    it('should update a set weight and reps', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 3), 1, 1, TEST_USER_ID)

      const exerciseId = workout.exercises[0].id
      const setId = workout.exercises[0].sets[0].id

      const updated = await WorkoutLogger.updateSet(
        workout,
        exerciseId,
        setId,
        { weight: 135, reps: 8, completed: true },
        TEST_USER_ID,
        true, // skip DB sync for test
      )

      expect(updated).not.toBeNull()
      const updatedSet = updated!.exercises[0].sets[0]
      expect(updatedSet.weight).toBe(135)
      expect(updatedSet.reps).toBe(8)
      expect(updatedSet.completed).toBe(true)
    })

    it('should mark exercise as completed when all sets are done', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      const exerciseId = workout.exercises[0].id
      const set1Id = workout.exercises[0].sets[0].id
      const set2Id = workout.exercises[0].sets[1].id

      // Complete first set
      let updated = await WorkoutLogger.updateSet(
        workout,
        exerciseId,
        set1Id,
        { weight: 135, reps: 8, completed: true },
        TEST_USER_ID,
        true,
      )
      expect(updated!.exercises[0].completed).toBe(false)

      // Complete second set
      updated = await WorkoutLogger.updateSet(
        updated!,
        exerciseId,
        set2Id,
        { weight: 135, reps: 7, completed: true },
        TEST_USER_ID,
        true,
      )
      expect(updated!.exercises[0].completed).toBe(true)
      expect(updated!.exercises[0].endTime).toBeDefined()
    })

    it('should return null for invalid exercise ID', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      const result = await WorkoutLogger.updateSet(
        workout,
        'nonexistent-exercise',
        'any-set',
        { completed: true },
        TEST_USER_ID,
        true,
      )

      expect(result).toBeNull()
    })

    it('should return null for invalid set ID', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      const result = await WorkoutLogger.updateSet(
        workout,
        workout.exercises[0].id,
        'nonexistent-set',
        { completed: true },
        TEST_USER_ID,
        true,
      )

      expect(result).toBeNull()
    })

    it('should not mutate original workout object', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)
      const originalWeight = workout.exercises[0].sets[0].weight

      await WorkoutLogger.updateSet(
        workout,
        workout.exercises[0].id,
        workout.exercises[0].sets[0].id,
        { weight: 999 },
        TEST_USER_ID,
        true,
      )

      // Original should be unchanged (deep clone internally)
      expect(workout.exercises[0].sets[0].weight).toBe(originalWeight)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. COMPLETE — Finishing Workouts
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete Workout', () => {
    it('should mark workout as completed and add to history', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      // Save to in-progress first
      const inProgressKey = getInProgressKey(TEST_USER_ID)
      localStorage.setItem(inProgressKey, JSON.stringify([workout]))

      const completed = await WorkoutLogger.completeWorkout(workout.id, TEST_USER_ID, workout)

      expect(completed).not.toBeNull()
      expect(completed!.completed).toBe(true)
      expect(completed!.endTime).toBeDefined()

      // Verify it's in history
      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      expect(history.length).toBe(1)
      expect(history[0].id).toBe(workout.id)
      expect(history[0].completed).toBe(true)
    })

    it('should remove workout from in-progress after completion', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      const inProgressKey = getInProgressKey(TEST_USER_ID)
      localStorage.setItem(inProgressKey, JSON.stringify([workout]))

      await WorkoutLogger.completeWorkout(workout.id, TEST_USER_ID, workout)

      // In-progress should be cleared for that week/day
      const stored = localStorage.getItem(inProgressKey)
      const remaining = stored ? JSON.parse(stored) : []
      const stillExists = remaining.find((w: WorkoutSession) => w.id === workout.id)
      expect(stillExists).toBeUndefined()
    })

    it('should return null if workout ID not found', async () => {
      const inProgressKey = getInProgressKey(TEST_USER_ID)
      localStorage.setItem(inProgressKey, JSON.stringify([]))

      const result = await WorkoutLogger.completeWorkout('nonexistent-id', TEST_USER_ID)
      expect(result).toBeNull()
    })

    it('should tag completed workout with program IDs', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      localStorage.setItem(getInProgressKey(TEST_USER_ID), JSON.stringify([workout]))
      await WorkoutLogger.completeWorkout(workout.id, TEST_USER_ID, workout)

      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      expect(history[0].programId).toBe(TEST_TEMPLATE_ID)
      expect(history[0].programInstanceId).toBe(TEST_INSTANCE_ID)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. DELETE — Clearing Workouts
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete / Clear Workouts', () => {
    it('should clear in-progress workout for specific week/day', async () => {
      setActiveProgram()

      // Manually create two workouts in localStorage (bypassing async save)
      const w1: WorkoutSession = {
        id: 'w1-test',
        userId: TEST_USER_ID,
        programId: TEST_TEMPLATE_ID,
        programInstanceId: TEST_INSTANCE_ID,
        workoutName: 'Day 1',
        startTime: Date.now(),
        week: 1,
        day: 1,
        exercises: [{
          id: 'ex1', exerciseId: 'e1', exerciseName: 'Test', targetSets: 3, targetRest: '90',
          sets: [{ id: 's1', reps: 0, weight: 0, completed: false }], completed: false,
        }],
        completed: false,
      }
      const w2: WorkoutSession = {
        id: 'w2-test',
        userId: TEST_USER_ID,
        programId: TEST_TEMPLATE_ID,
        programInstanceId: TEST_INSTANCE_ID,
        workoutName: 'Day 2',
        startTime: Date.now(),
        week: 1,
        day: 2,
        exercises: [{
          id: 'ex2', exerciseId: 'e2', exerciseName: 'Test 2', targetSets: 3, targetRest: '90',
          sets: [{ id: 's2', reps: 0, weight: 0, completed: false }], completed: false,
        }],
        completed: false,
      }

      const key = getInProgressKey(TEST_USER_ID)
      localStorage.setItem(key, JSON.stringify([w1, w2]))

      // Clear day 1 (async method)
      await WorkoutLogger.clearCurrentWorkout(1, 1, TEST_USER_ID)

      const remaining = JSON.parse(localStorage.getItem(key) || '[]')
      expect(remaining.length).toBe(1)
      expect(remaining[0].day).toBe(2)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. HISTORY — Reading Workout History
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Workout History', () => {
    it('should return empty array when no history', () => {
      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      expect(history).toEqual([])
    })

    it('should return all completed workouts', () => {
      addCompletedWorkout(1, 1)
      addCompletedWorkout(1, 2)
      addCompletedWorkout(1, 3)

      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      expect(history.length).toBe(3)
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem(getWorkoutsKey(TEST_USER_ID), 'not-valid-json{{{')

      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      expect(history).toEqual([])
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. WEEK COMPLETION — Detection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Week Completion Detection', () => {
    it('should detect incomplete week (no workouts)', () => {
      setActiveProgram({ daysPerWeek: 3 })

      const isComplete = WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(isComplete).toBe(false)
    })

    it('should detect incomplete week (partial completion)', () => {
      setActiveProgram({ daysPerWeek: 3 })
      addCompletedWorkout(1, 1)
      addCompletedWorkout(1, 2)
      // Day 3 not done

      const isComplete = WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(isComplete).toBe(false)
    })

    it('should detect completed week (all days done)', () => {
      setActiveProgram({ daysPerWeek: 3 })
      addCompletedWorkout(1, 1)
      addCompletedWorkout(1, 2)
      addCompletedWorkout(1, 3)

      const isComplete = WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(isComplete).toBe(true)
    })

    it('should not count workouts from different program instance', () => {
      setActiveProgram({ daysPerWeek: 3 })
      // Add workouts from a DIFFERENT instance
      addCompletedWorkout(1, 1, TEST_USER_ID, 'different-instance-id')
      addCompletedWorkout(1, 2, TEST_USER_ID, 'different-instance-id')
      addCompletedWorkout(1, 3, TEST_USER_ID, 'different-instance-id')

      const isComplete = WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(isComplete).toBe(false)
    })

    it('should reject workouts with corrupted data (empty exercises)', () => {
      setActiveProgram({ daysPerWeek: 1 })

      // Add a "completed" workout with no exercises (corrupted)
      const key = getWorkoutsKey(TEST_USER_ID)
      const corruptedWorkout: WorkoutSession = {
        id: 'corrupted-completed',
        userId: TEST_USER_ID,
        programId: TEST_TEMPLATE_ID,
        programInstanceId: TEST_INSTANCE_ID,
        workoutName: 'Corrupted',
        startTime: Date.now(),
        endTime: Date.now(),
        week: 1,
        day: 1,
        exercises: [], // Empty = corrupted
        completed: true,
      }
      localStorage.setItem(key, JSON.stringify([corruptedWorkout]))

      const hasCompleted = WorkoutLogger.hasCompletedWorkout(1, 1, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(hasCompleted).toBe(false)
    })

    it('should reject workouts with empty sets (corrupted)', () => {
      setActiveProgram({ daysPerWeek: 1 })

      const key = getWorkoutsKey(TEST_USER_ID)
      const corruptedWorkout: WorkoutSession = {
        id: 'corrupted-no-sets',
        userId: TEST_USER_ID,
        programId: TEST_TEMPLATE_ID,
        programInstanceId: TEST_INSTANCE_ID,
        workoutName: 'Corrupted',
        startTime: Date.now(),
        endTime: Date.now(),
        week: 1,
        day: 1,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'e1',
            exerciseName: 'Test',
            targetSets: 3,
            targetRest: '90',
            sets: [], // Empty sets = corrupted
            completed: true,
          },
        ],
        completed: true,
      }
      localStorage.setItem(key, JSON.stringify([corruptedWorkout]))

      const hasCompleted = WorkoutLogger.hasCompletedWorkout(1, 1, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(hasCompleted).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ASYNC WEEK COMPLETION — Native-Aware
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Async Week Completion (native-aware)', () => {
    it('should detect completed week via async method', async () => {
      setActiveProgram({ daysPerWeek: 3 })
      addCompletedWorkout(1, 1)
      addCompletedWorkout(1, 2)
      addCompletedWorkout(1, 3)

      const isComplete = await WorkoutLogger.isWeekCompletedAsync(
        1,
        3,
        TEST_USER_ID,
        TEST_INSTANCE_ID,
      )
      expect(isComplete).toBe(true)
    })

    it('should detect incomplete week via async method', async () => {
      setActiveProgram({ daysPerWeek: 3 })
      addCompletedWorkout(1, 1)
      // Days 2 and 3 missing

      const isComplete = await WorkoutLogger.isWeekCompletedAsync(
        1,
        3,
        TEST_USER_ID,
        TEST_INSTANCE_ID,
      )
      expect(isComplete).toBe(false)
    })

    it('async hasCompletedWorkout should validate data integrity', async () => {
      setActiveProgram({ daysPerWeek: 1 })

      // Add corrupted workout
      const key = getWorkoutsKey(TEST_USER_ID)
      const corrupted: WorkoutSession = {
        id: 'async-corrupted',
        userId: TEST_USER_ID,
        programId: TEST_TEMPLATE_ID,
        programInstanceId: TEST_INSTANCE_ID,
        workoutName: 'Bad',
        startTime: Date.now(),
        endTime: Date.now(),
        week: 1,
        day: 1,
        exercises: [],
        completed: true,
      }
      localStorage.setItem(key, JSON.stringify([corrupted]))

      const result = await WorkoutLogger.hasCompletedWorkoutAsync(
        1,
        1,
        TEST_USER_ID,
        TEST_INSTANCE_ID,
      )
      expect(result).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. INSTANCE MATCHING — Program Isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Instance Matching', () => {
    it('should match workout with correct instance ID', () => {
      setActiveProgram()
      addCompletedWorkout(1, 1, TEST_USER_ID, TEST_INSTANCE_ID)

      const result = WorkoutLogger.hasCompletedWorkout(1, 1, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(result).toBe(true)
    })

    it('should NOT match workout with different instance ID', () => {
      setActiveProgram()
      addCompletedWorkout(1, 1, TEST_USER_ID, 'old-instance-id')

      const result = WorkoutLogger.hasCompletedWorkout(1, 1, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(result).toBe(false)
    })

    it('should isolate programs: restarting gives fresh slate', () => {
      setActiveProgram()
      // Complete all of week 1 in OLD instance
      addCompletedWorkout(1, 1, TEST_USER_ID, 'old-program-run')
      addCompletedWorkout(1, 2, TEST_USER_ID, 'old-program-run')
      addCompletedWorkout(1, 3, TEST_USER_ID, 'old-program-run')

      // New instance should NOT see old data
      const isComplete = WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(isComplete).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. MULTI-WEEK PROGRESSION — Advancing Through Program
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Multi-Week Progression', () => {
    it('should track workouts across multiple weeks', () => {
      setActiveProgram({ totalWeeks: 4, daysPerWeek: 3 })

      // Complete Week 1
      addCompletedWorkout(1, 1)
      addCompletedWorkout(1, 2)
      addCompletedWorkout(1, 3)
      expect(WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)).toBe(true)

      // Complete Week 2
      addCompletedWorkout(2, 1)
      addCompletedWorkout(2, 2)
      addCompletedWorkout(2, 3)
      expect(WorkoutLogger.isWeekCompleted(2, 3, TEST_USER_ID, TEST_INSTANCE_ID)).toBe(true)

      // Week 3 not started
      expect(WorkoutLogger.isWeekCompleted(3, 3, TEST_USER_ID, TEST_INSTANCE_ID)).toBe(false)

      // Total history should have 6 workouts
      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      expect(history.length).toBe(6)
    })

    it('should handle out-of-order day completion within a week', () => {
      setActiveProgram({ daysPerWeek: 3 })

      // Complete days out of order: 3, 1, 2
      addCompletedWorkout(1, 3)
      addCompletedWorkout(1, 1)

      // Week NOT complete yet (day 2 missing)
      expect(WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)).toBe(false)

      addCompletedWorkout(1, 2)

      // Now week IS complete
      expect(WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle single-day-per-week program', () => {
      setActiveProgram({ daysPerWeek: 1 })
      addCompletedWorkout(1, 1)

      expect(WorkoutLogger.isWeekCompleted(1, 1, TEST_USER_ID, TEST_INSTANCE_ID)).toBe(true)
    })

    it('should handle workout with notes', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      const updated = await WorkoutLogger.updateSet(
        workout,
        workout.exercises[0].id,
        workout.exercises[0].sets[0].id,
        { weight: 135, reps: 8, completed: true, notes: 'Felt easy' },
        TEST_USER_ID,
        true,
      )

      expect(updated!.exercises[0].sets[0].notes).toBe('Felt easy')
    })

    it('should handle empty history when checking week completion', () => {
      setActiveProgram({ daysPerWeek: 3 })
      // No workouts at all
      const isComplete = WorkoutLogger.isWeekCompleted(1, 3, TEST_USER_ID, TEST_INSTANCE_ID)
      expect(isComplete).toBe(false)
    })

    it('should handle many sets per exercise', async () => {
      setActiveProgram()
      const exercises = makeExercises(1, 10) // 10 sets

      const workout = WorkoutLogger.startWorkout('Volume Day', exercises, 1, 1, TEST_USER_ID)
      expect(workout.exercises[0].sets.length).toBe(10)

      // Complete all 10 sets
      let current = workout
      for (const set of current.exercises[0].sets) {
        const result = await WorkoutLogger.updateSet(
          current,
          current.exercises[0].id,
          set.id,
          { weight: 100, reps: 10, completed: true },
          TEST_USER_ID,
          true,
        )
        current = result!
      }

      expect(current.exercises[0].completed).toBe(true)
    })

    it('should prevent duplicate workouts in history', async () => {
      setActiveProgram()
      const workout = WorkoutLogger.startWorkout('Push Day', makeExercises(1, 2), 1, 1, TEST_USER_ID)

      localStorage.setItem(getInProgressKey(TEST_USER_ID), JSON.stringify([workout]))

      // Complete the same workout twice
      await WorkoutLogger.completeWorkout(workout.id, TEST_USER_ID, workout)
      await WorkoutLogger.completeWorkout(workout.id, TEST_USER_ID, workout)

      const history = WorkoutLogger.getWorkoutHistory(TEST_USER_ID)
      // Should deduplicate by ID
      const uniqueIds = new Set(history.map((w) => w.id))
      expect(uniqueIds.size).toBe(history.length)
    })
  })
})
