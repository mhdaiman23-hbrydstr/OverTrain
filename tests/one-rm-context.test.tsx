import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { OneRmProvider, useOneRepMaxes, type OneRepMaxEntry } from '@/components/workout-logger/contexts/one-rm-context'
import type { ReactNode } from 'react'

describe('OneRmContext', () => {
  const mockEntries: OneRepMaxEntry[] = [
    {
      exerciseId: 'bench-press',
      exerciseName: 'Bench Press',
      maxWeight: 225,
      dateTested: Date.now() - 86400000, // 1 day ago
      estimated: false,
    },
    {
      exerciseId: 'squat',
      exerciseName: 'Back Squat',
      maxWeight: 315,
      dateTested: Date.now(),
      estimated: false,
    },
    {
      exerciseId: 'deadlift',
      exerciseName: 'Deadlift',
      maxWeight: 405,
      dateTested: Date.now() - 172800000, // 2 days ago
      estimated: true,
    },
  ]

  describe('OneRmProvider', () => {
    it('should initialize with empty array when no initialData provided', () => {
      const wrapper = ({ children }: { children: ReactNode }) => <OneRmProvider>{children}</OneRmProvider>

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      expect(result.current.oneRepMaxes).toEqual([])
    })

    it('should initialize with provided initialData', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <OneRmProvider initialData={mockEntries}>{children}</OneRmProvider>
      )

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      expect(result.current.oneRepMaxes).toEqual(mockEntries)
    })

    it('should allow updating oneRepMaxes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => <OneRmProvider>{children}</OneRmProvider>

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      act(() => {
        result.current.setOneRepMaxes(mockEntries)
      })

      expect(result.current.oneRepMaxes).toEqual(mockEntries)
    })
  })

  describe('getOneRepMax', () => {
    it('should find entry by exerciseId', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <OneRmProvider initialData={mockEntries}>{children}</OneRmProvider>
      )

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      const entry = result.current.getOneRepMax('bench-press')

      expect(entry).toBeDefined()
      expect(entry?.exerciseId).toBe('bench-press')
      expect(entry?.maxWeight).toBe(225)
    })

    it('should find entry by fallback name (case-insensitive)', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <OneRmProvider initialData={mockEntries}>{children}</OneRmProvider>
      )

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      const entry = result.current.getOneRepMax('non-existent-id', 'bench press')

      expect(entry).toBeDefined()
      expect(entry?.exerciseName).toBe('Bench Press')
      expect(entry?.maxWeight).toBe(225)
    })

    it('should return undefined when exercise not found', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <OneRmProvider initialData={mockEntries}>{children}</OneRmProvider>
      )

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      const entry = result.current.getOneRepMax('non-existent-id')

      expect(entry).toBeUndefined()
    })

    it('should return most recent entry when multiple entries exist', () => {
      const now = Date.now()
      const duplicateEntries: OneRepMaxEntry[] = [
        {
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          maxWeight: 200,
          dateTested: now - 172800000, // 2 days ago
          estimated: false,
        },
        {
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          maxWeight: 225,
          dateTested: now, // Most recent
          estimated: false,
        },
        {
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          maxWeight: 215,
          dateTested: now - 86400000, // 1 day ago
          estimated: false,
        },
      ]

      const wrapper = ({ children }: { children: ReactNode }) => (
        <OneRmProvider initialData={duplicateEntries}>{children}</OneRmProvider>
      )

      const { result } = renderHook(() => useOneRepMaxes(), { wrapper })

      const entry = result.current.getOneRepMax('bench-press')

      // After sorting DESC by date and keeping first occurrence: most recent entry
      expect(entry?.maxWeight).toBe(225) // Most recent entry
      expect(entry?.dateTested).toBe(duplicateEntries[1].dateTested)
    })
  })

  describe('useOneRepMaxes hook', () => {
    it('should throw error when used outside OneRmProvider', () => {
      expect(() => {
        renderHook(() => useOneRepMaxes())
      }).toThrow('useOneRepMaxes must be used within a OneRmProvider')
    })
  })
})
