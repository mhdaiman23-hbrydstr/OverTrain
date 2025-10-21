import { useCallback, useEffect, useState } from 'react'
import { exerciseService, type Exercise } from '@/lib/services/exercise-library-service'
import { programWizardDebugger } from '@/lib/program-wizard-debug'

interface UseExerciseCacheOptions {
  enabled: boolean
}

export const useExerciseCache = ({ enabled }: UseExerciseCacheOptions) => {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const load = useCallback(async (isRetry = false) => {
    try {
      programWizardDebugger.logExerciseLoadingStart()
      setIsLoading(true)
      setError(null)
      
      // Add timeout to prevent infinite loading
      const results = await Promise.race([
        exerciseService.getAllExercises(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Exercise loading timeout')), 10000)
        )
      ])
      
      setExercises(results)
      setHasLoaded(true)
      setRetryCount(0) // Reset retry count on success
      programWizardDebugger.logExerciseLoadingSuccess(results.length)
    } catch (err) {
      console.error('[ProgramWizard] Failed to load exercises', err)
      const message = err instanceof Error ? err.message : 'Failed to load exercises'
      setError(message)
      programWizardDebugger.logExerciseLoadingError(message, retryCount)
      
      // Implement retry logic with exponential backoff
      if (!isRetry && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        programWizardDebugger.logExerciseLoadingRetry(delay)
        console.log(`[ProgramWizard] Retrying exercise loading in ${delay}ms (attempt ${retryCount + 1}/3)`)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          load(true)
        }, delay)
      }
    } finally {
      setIsLoading(false)
    }
  }, [retryCount])

  useEffect(() => {
    if (!enabled || hasLoaded) return

    let cancelled = false
    const fetch = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Add timeout to prevent infinite loading
        const results = await Promise.race([
          exerciseService.getAllExercises(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Exercise loading timeout')), 10000)
          )
        ])
        
        if (!cancelled) {
          setExercises(results)
          setHasLoaded(true)
          setRetryCount(0)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ProgramWizard] Failed to load exercises', err)
          const message = err instanceof Error ? err.message : 'Failed to load exercises'
          setError(message)
          
          // Implement retry logic with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
            console.log(`[ProgramWizard] Retrying exercise loading in ${delay}ms (attempt ${retryCount + 1}/3)`)
            setTimeout(() => {
              if (!cancelled) {
                setRetryCount(prev => prev + 1)
                fetch()
              }
            }, delay)
          }
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
  }, [enabled, hasLoaded, retryCount])

  return {
    exercises,
    isLoading,
    error,
    refresh: () => load(false),
    hasLoaded,
    retryCount,
  }
}
