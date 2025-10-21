import { useCallback, useEffect, useState } from 'react'
import { exerciseService, type Exercise } from '@/lib/services/exercise-library-service'

interface UseExerciseCacheOptions {
  enabled: boolean
}

export const useExerciseCache = ({ enabled }: UseExerciseCacheOptions) => {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const results = await exerciseService.getAllExercises()
      setExercises(results)
      setHasLoaded(true)
    } catch (err) {
      console.error('[ProgramWizard] Failed to load exercises', err)
      const message = err instanceof Error ? err.message : 'Failed to load exercises'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || hasLoaded || isLoading) return

    let cancelled = false
    const fetch = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const results = await exerciseService.getAllExercises()
        if (!cancelled) {
          setExercises(results)
          setHasLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ProgramWizard] Failed to load exercises', err)
          const message = err instanceof Error ? err.message : 'Failed to load exercises'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetch()
    return () => {
      cancelled = true
    }
  }, [enabled, hasLoaded, isLoading])

  return {
    exercises,
    isLoading,
    error,
    refresh: load,
    hasLoaded,
  }
}
