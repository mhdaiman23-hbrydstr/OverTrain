/**
 * Comprehensive Tests for Database-First Workout Logger
 * 
 * These tests cover the new data sync service, database-first hook, and
 * integration with the existing workout logger system.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { DataSyncService } from '@/lib/data-sync-service'
import { ConnectionMonitor } from '@/lib/connection-monitor'
import { useWorkoutLoggerDatabaseFirst } from '@/lib/workout-logger-database-first'
import type { WorkoutSession, WorkoutSet } from '@/lib/workout-logger'

type SelectResult = { data: any; error: any }

const createSelectChain = (result: SelectResult = { data: null, error: null }) => {
  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

const createTableQuery = (options: {
  selectResult?: SelectResult
  upsertResult?: { data: any; error: any }
  insertResult?: { data: any; error: any }
  updateResult?: { data: any; error: any }
  deleteResult?: { data: any; error: any }
} = {}) => {
  const selectChain = createSelectChain(options.selectResult)
  return {
    select: vi.fn(() => selectChain),
    upsert: vi.fn().mockResolvedValue(options.upsertResult ?? { data: null, error: null }),
    insert: vi.fn().mockResolvedValue(options.insertResult ?? { data: null, error: null }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue(options.updateResult ?? { data: null, error: null }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue(options.deleteResult ?? { data: null, error: null }),
    })),
  }
}

const resetSupabaseFrom = () => {
  (supabase.from as Mock).mockImplementation(() => createTableQuery())
}

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createTableQuery()),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: null, error: null })
    }
  }
}))

vi.mock('@/lib/connection-monitor', () => ({
  ConnectionMonitor: {
    getStatus: vi.fn(() => 'online'),
    isOnline: vi.fn(() => true),
    updateStatus: vi.fn()
  }
}))

const storageState = new Map<string, string>()
const STORAGE_KEY = 'workout-logger-database-first'
const SYNC_QUEUE_KEY = 'liftlog_sync_queue'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => (storageState.has(key) ? storageState.get(key)! : null)),
  setItem: vi.fn((key: string, value: string) => {
    storageState.set(key, value)
  }),
  removeItem: vi.fn((key: string) => {
    storageState.delete(key)
  }),
  clear: vi.fn(() => {
    storageState.clear()
  })
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const resetLocalStorageMock = () => {
  localStorageMock.getItem.mockImplementation((key: string) => (storageState.has(key) ? storageState.get(key)! : null))
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    storageState.set(key, value)
  })
  localStorageMock.removeItem.mockImplementation((key: string) => {
    storageState.delete(key)
  })
  localStorageMock.clear.mockImplementation(() => {
    storageState.clear()
  })
}

resetLocalStorageMock()

describe('DataSyncService', () => {
  beforeEach(() => {
    storageState.clear()
    vi.clearAllMocks()
    resetLocalStorageMock()
    resetSupabaseFrom()
  })

  describe('saveWorkoutOptimistic', () => {
    it('should save workout to localStorage instantly and queue for database sync', async () => {
      const mockWorkout: WorkoutSession = {
        id: 'test-workout-1',
        userId: 'user-123',
        programId: 'program-1',
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: undefined,
        exercises: [],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      const result = await DataSyncService.saveWorkoutOptimistic(
        mockWorkout,
        'user-123',
        'test-storage-key'
      )

      expect(result.success).toBe(true)
      expect(result.syncId).toMatch(/^workout-test-workout-1-\d+$/)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-storage-key',
        expect.stringContaining('test-workout-1')
      )
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })

      const mockWorkout: WorkoutSession = {
        id: 'test-workout-1',
        userId: 'user-123',
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      const result = await DataSyncService.saveWorkoutOptimistic(
        mockWorkout,
        'user-123',
        'test-storage-key'
      )

      expect(result.success).toBe(false)
    })
  })

  describe('saveSetOptimistic', () => {
    it('should save set instantly and queue for database sync', async () => {
      const mockWorkout: WorkoutSession = {
        id: 'test-workout-1',
        userId: 'user-123',
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [{
          id: 'exercise-1',
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetReps: '8',
          targetRest: '90',
          completed: false,
          sets: [{
            id: 'set-1',
            setNumber: 1,
            completed: false,
            reps: 0,
            weight: 0
          }]
        }],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      const setData: Partial<WorkoutSet> = {
        completed: true,
        reps: 10,
        weight: 135
      }

      const result = await DataSyncService.saveSetOptimistic(
        'test-workout-1',
        'exercise-1',
        'set-1',
        setData,
        'user-123',
        mockWorkout,
        'test-storage-key'
      )

      expect(result.success).toBe(true)
      expect(result.syncId).toMatch(/^set-set-1-\d+$/)
    })
  })

  describe('getSyncStatus', () => {
    it('should return current sync status', () => {
      const status = DataSyncService.getSyncStatus()

      expect(status).toHaveProperty('isOnline')
      expect(status).toHaveProperty('isSyncing')
      expect(status).toHaveProperty('queueSize')
      expect(status).toHaveProperty('hasErrors')
    })
  })

  describe('forceSyncAll', () => {
    it('should process all pending sync operations', async () => {
      const mockSyncQueue = [
        {
          id: 'sync-1',
          type: 'workout' as const,
          data: { workout: { id: 'workout-1' } },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3
        }
      ]

      storageState.set(SYNC_QUEUE_KEY, JSON.stringify(mockSyncQueue))

      await DataSyncService.forceSyncAll()

      expect(JSON.parse(storageState.get(SYNC_QUEUE_KEY) ?? '[]')).toEqual([])
    })
  })
})

describe('useWorkoutLoggerDatabaseFirst', () => {
  const mockUserId = 'test-user-123'
  const mockProgramId = 'test-program-1'

  beforeEach(() => {
    storageState.clear()
    vi.clearAllMocks()
    resetLocalStorageMock()
    resetSupabaseFrom()
  })

  afterEach(() => {
    storageState.clear()
    vi.clearAllMocks()
    resetLocalStorageMock()
    resetSupabaseFrom()
  })

  describe('initialization', () => {
    it('should load existing workout from database', async () => {
      const mockDbWorkout = {
        id: 'workout-1',
        user_id: mockUserId,
        program_id: mockProgramId,
        workout_name: 'Test Workout',
        start_time: Date.now(),
        week: 1,
        day: 1,
        exercises: [],
        notes: null
      }

      const mockSupabaseQuery = {
        data: mockDbWorkout,
        error: null
      }

      ;(supabase.from as Mock).mockImplementationOnce(() =>
        createTableQuery({
          selectResult: mockSupabaseQuery
        })
      )

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.workout).toMatchObject({
        id: 'workout-1',
        userId: mockUserId,
        programId: mockProgramId,
        workoutName: 'Test Workout'
      })
    })

    it('should fallback to localStorage if database has no workout', async () => {
      const mockLocalStorageWorkout: WorkoutSession = {
        id: 'workout-2',
        userId: mockUserId,
        workoutName: 'Local Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      storageState.set(STORAGE_KEY, JSON.stringify([mockLocalStorageWorkout]))

      const mockSupabaseQuery = {
        data: null,
        error: { message: 'No rows found' }
      }

      ;(supabase.from as Mock).mockImplementationOnce(() =>
        createTableQuery({
          selectResult: mockSupabaseQuery
        })
      )

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.workout).toMatchObject({
        id: 'workout-2',
        workoutName: 'Local Workout'
      })
    })
  })

  describe('startWorkout', () => {
    it('should start a new workout and save it', async () => {
      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await act(async () => {
        await result.current.startWorkout('New Workout', 1, 1)
      })

      expect(result.current.workout).toMatchObject({
        workoutName: 'New Workout',
        userId: mockUserId,
        programId: mockProgramId,
        week: 1,
        day: 1,
        completed: false
      })
    })

    it('should throw error for invalid workout name', async () => {
      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await expect(
        act(async () => {
          await result.current.startWorkout('', 1, 1)
        })
      ).rejects.toThrow('Workout name is required')
    })
  })

  describe('completeSet', () => {
    it('should complete a set and update workout', async () => {
      const mockWorkout: WorkoutSession = {
        id: 'workout-1',
        userId: mockUserId,
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [{
          id: 'exercise-1',
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetReps: '8',
          targetRest: '90',
          completed: false,
          sets: [{
            id: 'set-1',
            setNumber: 1,
            completed: false,
            reps: 0,
            weight: 0
          }]
        }],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      storageState.set(STORAGE_KEY, JSON.stringify([mockWorkout]))

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const setData: Partial<WorkoutSet> = {
        completed: true,
        reps: 10,
        weight: 135
      }

      await act(async () => {
        await result.current.completeSet('exercise-1', 'set-1', setData)
      })

      const updatedExercise = result.current.workout?.exercises[0]
      const updatedSet = updatedExercise?.sets[0]

      expect(updatedSet).toMatchObject({
        completed: true,
        reps: 10,
        weight: 135
      })
    })

    it('should throw error when no active workout', async () => {
      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await expect(
        act(async () => {
          await result.current.completeSet('exercise-1', 'set-1', {})
        })
      ).rejects.toThrow('No active workout')
    })
  })

  describe('completeWorkout', () => {
    it('should complete the current workout', async () => {
      const mockWorkout: WorkoutSession = {
        id: 'workout-1',
        userId: mockUserId,
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      storageState.set(STORAGE_KEY, JSON.stringify([mockWorkout]))

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.completeWorkout('Great workout!')
      })

      expect(result.current.workout).toMatchObject({
        completed: true,
        notes: 'Great workout!',
        endTime: expect.any(Number)
      })
    })
  })

  describe('abandonWorkout', () => {
    it('should abandon the current workout', async () => {
      const mockWorkout: WorkoutSession = {
        id: 'workout-1',
        userId: mockUserId,
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      storageState.set(STORAGE_KEY, JSON.stringify([mockWorkout]))

      const mockSupabaseDelete = {
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      }

      ;(supabase.from as Mock).mockImplementationOnce(() => createTableQuery())
      ;(supabase.from as Mock).mockImplementationOnce(() => ({
        delete: vi.fn(() => mockSupabaseDelete)
      }))

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.abandonWorkout()
      })

      expect(result.current.workout).toBeNull()
    })
  })

  describe('sync functionality', () => {
    it('should force sync all pending operations', async () => {
      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      const forceSyncSpy = vi.spyOn(DataSyncService, 'forceSyncAll')

      await act(async () => {
        await result.current.forceSync()
      })

      expect(forceSyncSpy).toHaveBeenCalled()
    })

    it('should clear sync queue', () => {
      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      const clearQueueSpy = vi.spyOn(DataSyncService, 'clearSyncQueue')

      act(() => {
        result.current.clearSyncQueue()
      })

      expect(clearQueueSpy).toHaveBeenCalled()
    })
  })

  describe('utility functions', () => {
    it('should format duration correctly', () => {
      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      expect(result.current.formatDuration(1000)).toBe('1s')
      expect(result.current.formatDuration(60000)).toBe('1m 0s')
      expect(result.current.formatDuration(3600000)).toBe('1h 0m 0s')
    })

    it('should calculate completion stats', async () => {
      const mockWorkout: WorkoutSession = {
        id: 'workout-1',
        userId: mockUserId,
        workoutName: 'Test Workout',
        startTime: Date.now(),
        endTime: null,
        exercises: [{
          id: 'exercise-1',
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetReps: '8',
          targetRest: '90',
          completed: false,
          sets: [
            { id: 'set-1', setNumber: 1, completed: true, reps: 10, weight: 135 },
            { id: 'set-2', setNumber: 2, completed: true, reps: 8, weight: 135 },
            { id: 'set-3', setNumber: 3, completed: false, reps: 0, weight: 0 }
          ]
        }],
        notes: '',
        completed: false,
        week: 1,
        day: 1
      }

      storageState.set(STORAGE_KEY, JSON.stringify([mockWorkout]))

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: mockUserId,
          programId: mockProgramId
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const stats = result.current.getCompletionStats()

      expect(stats).toMatchObject({
        totalSets: 3,
        completedSets: 2,
        completionPercentage: 66.66666666666666,
        totalWeight: 2430 // (10 * 135) + (8 * 135)
      })
    })
  })
})

describe('Integration Tests', () => {
  beforeEach(() => {
    storageState.clear()
    vi.clearAllMocks()
    resetLocalStorageMock()
    resetSupabaseFrom()
  })

  describe('offline functionality', () => {
    it('should work offline and queue operations', async () => {
      ;(ConnectionMonitor.getStatus as Mock).mockReturnValue('offline')

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: 'test-user',
          programId: 'test-program'
        })
      )

      await act(async () => {
        await result.current.startWorkout('Offline Workout', 1, 1)
      })

      expect(result.current.workout).toBeTruthy()
      expect(result.current.syncStatus.isOnline).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSupabaseQuery = {
        data: null,
        error: { message: 'Database connection failed' }
      }

      ;(supabase.from as Mock).mockImplementationOnce(() =>
        createTableQuery({
          selectResult: mockSupabaseQuery
        })
      )

      const { result } = renderHook(() => 
        useWorkoutLoggerDatabaseFirst({
          userId: 'test-user',
          programId: 'test-program'
        })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should fallback to localStorage and not crash
      expect(result.current.error).toBeNull()
    })
  })
})
