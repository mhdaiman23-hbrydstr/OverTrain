import { useCallback, useMemo, useState } from 'react'
import {
  initialWizardState,
  type DayInWizard,
  type ExerciseInWizard,
  type MuscleGroupSelection,
  type ProgramMetadata,
  type ProgramWizardState,
  type ProgramSource,
  type WizardStep,
} from '../types'
import {
  createEmptyDays,
  generateTempId,
  reindexDays,
  sortExercisesAndUpdateOrder,
} from '../utils'

type ExerciseInput = {
  exerciseLibraryId: string
  exerciseName: string
  muscleGroup: string
  equipmentType: string
  category?: 'compound' | 'isolation'
  restTime?: number
}

interface UseWizardStateResult {
  state: ProgramWizardState
  isDirty: boolean
  setSource: (source: ProgramSource) => void
  setStep: (step: WizardStep) => void
  setDayCount: (count: number) => void
  setSelectedTemplateId: (id: string | null) => void
  setMetadata: (metadata: Partial<ProgramMetadata>) => void
  replaceDays: (days: DayInWizard[], options?: { preserveDayCount?: boolean }) => void
  setDayMuscleGroups: (dayIndex: number, groups: MuscleGroupSelection[]) => void
  setDayExercises: (dayIndex: number, exercises: ExerciseInWizard[]) => void
  addExerciseToDay: (dayIndex: number, exercise: ExerciseInput) => void
  updateExerciseOrder: (dayIndex: number, fromIndex: number, toIndex: number) => void
  removeExerciseFromDay: (dayIndex: number, tempId: string) => void
  updateDayName: (dayIndex: number, name: string) => void
  addDay: () => void
  removeDay: (dayIndex: number) => void
  duplicateDay: (dayIndex: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  markSaved: () => void
}

const cloneExercises = (exercises: ExerciseInWizard[]): ExerciseInWizard[] =>
  exercises.map((exercise, index) => ({
    ...exercise,
    tempId: generateTempId(),
    order: index,
  }))

export function useWizardState(): UseWizardStateResult {
  const [state, setState] = useState<ProgramWizardState>(initialWizardState)
  const [isDirty, setIsDirty] = useState(false)

  const updateState = useCallback((
    updater: (current: ProgramWizardState) => ProgramWizardState,
    options?: { markDirty?: boolean },
  ) => {
    setState(prev => {
      const next = updater(prev)
      if (options?.markDirty === false) {
        return next
      }

      if (next !== prev) {
        setIsDirty(true)
      }
      return next
    })
  }, [])

  const setSource = useCallback((source: ProgramSource) => {
    updateState(() => ({
      ...initialWizardState,
      source,
      step: 'dayCount',
    }), { markDirty: false })
    setIsDirty(false)
  }, [updateState])

  const setStep = useCallback((step: WizardStep) => {
    updateState(prev => ({
      ...prev,
      step,
    }), { markDirty: false })
  }, [updateState])

  const setDayCount = useCallback((count: number) => {
    updateState(prev => {
      const nextDays = prev.days.length === count
        ? reindexDays(prev.days)
        : createEmptyDays(count)

      return {
        ...prev,
        dayCount: count,
        days: nextDays,
      }
    })
  }, [updateState])

  const setSelectedTemplateId = useCallback((id: string | null) => {
    updateState(prev => ({
      ...prev,
      selectedTemplateId: id,
    }))
  }, [updateState])

  const setMetadata = useCallback((metadata: Partial<ProgramMetadata>) => {
    updateState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        ...metadata,
      },
    }))
  }, [updateState])

  const replaceDays = useCallback((days: DayInWizard[], options?: { preserveDayCount?: boolean }) => {
    updateState(prev => ({
      ...prev,
      dayCount: options?.preserveDayCount ? prev.dayCount : days.length,
      days: reindexDays(days),
    }))
  }, [updateState])

  const setDayMuscleGroups = useCallback((dayIndex: number, groups: MuscleGroupSelection[]) => {
    updateState(prev => ({
      ...prev,
      days: prev.days.map((day, index) => (
        index === dayIndex
          ? {
              ...day,
              muscleGroups: groups,
            }
          : day
      )),
    }))
  }, [updateState])

  const setDayExercises = useCallback((dayIndex: number, exercises: ExerciseInWizard[]) => {
    updateState(prev => ({
      ...prev,
      days: prev.days.map((day, index) => (
        index === dayIndex
          ? {
              ...day,
              exercises: sortExercisesAndUpdateOrder(exercises),
            }
          : day
      )),
    }))
  }, [updateState])

  const addExerciseToDay = useCallback((dayIndex: number, exercise: ExerciseInput) => {
    updateState(prev => ({
      ...prev,
      days: prev.days.map((day, index) => {
        if (index !== dayIndex) return day

        const newExercise: ExerciseInWizard = {
          tempId: generateTempId(),
          exerciseLibraryId: exercise.exerciseLibraryId,
          exerciseName: exercise.exerciseName,
          muscleGroup: exercise.muscleGroup,
          equipmentType: exercise.equipmentType,
          order: day.exercises.length,
          category: exercise.category ?? 'compound',
          restTime: exercise.restTime ?? 90,
        }

        return {
          ...day,
          exercises: [...day.exercises, newExercise],
        }
      }),
    }))
  }, [updateState])

  const updateExerciseOrder = useCallback((dayIndex: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    updateState(prev => ({
      ...prev,
      days: prev.days.map((day, index) => {
        if (index !== dayIndex) return day

        const updated = [...day.exercises]
        const [moved] = updated.splice(fromIndex, 1)
        updated.splice(toIndex, 0, moved)
        return {
          ...day,
          exercises: sortExercisesAndUpdateOrder(updated),
        }
      }),
    }))
  }, [updateState])

  const removeExerciseFromDay = useCallback((dayIndex: number, tempId: string) => {
    updateState(prev => ({
      ...prev,
      days: prev.days.map((day, index) => {
        if (index !== dayIndex) return day
        const filtered = day.exercises.filter(exercise => exercise.tempId !== tempId)
        return {
          ...day,
          exercises: sortExercisesAndUpdateOrder(filtered),
        }
      }),
    }))
  }, [updateState])

  const updateDayName = useCallback((dayIndex: number, name: string) => {
    updateState(prev => ({
      ...prev,
      days: prev.days.map((day, index) => (
        index === dayIndex
          ? { ...day, dayName: name }
          : day
      )),
    }))
  }, [updateState])

  const addDay = useCallback(() => {
    updateState(prev => {
      const newDay: DayInWizard = {
        dayNumber: prev.days.length + 1,
        dayName: `Day ${prev.days.length + 1}`,
        muscleGroups: [],
        exercises: [],
      }

      return {
        ...prev,
        dayCount: prev.dayCount + 1,
        days: reindexDays([...prev.days, newDay]),
      }
    })
  }, [updateState])

  const removeDay = useCallback((dayIndex: number) => {
    updateState(prev => {
      const remaining = prev.days.filter((_, index) => index !== dayIndex)
      return {
        ...prev,
        dayCount: Math.max(0, prev.dayCount - 1),
        days: reindexDays(remaining),
      }
    })
  }, [updateState])

  const duplicateDay = useCallback((dayIndex: number) => {
    updateState(prev => {
      const day = prev.days[dayIndex]
      if (!day) return prev

      const duplicated: DayInWizard = {
        dayNumber: prev.days.length + 1,
        dayName: `${day.dayName} Copy`,
        muscleGroups: day.muscleGroups ? [...day.muscleGroups] : [],
        exercises: cloneExercises(day.exercises),
      }

      return {
        ...prev,
        dayCount: prev.dayCount + 1,
        days: reindexDays([...prev.days, duplicated]),
      }
    })
  }, [updateState])

  const setLoading = useCallback((loading: boolean) => {
    updateState(prev => ({
      ...prev,
      isLoading: loading,
    }), { markDirty: false })
  }, [updateState])

  const setError = useCallback((error: string | null) => {
    updateState(prev => ({
      ...prev,
      error,
    }), { markDirty: false })
  }, [updateState])

  const reset = useCallback(() => {
    setState(initialWizardState)
    setIsDirty(false)
  }, [])

  const markSaved = useCallback(() => {
    setIsDirty(false)
  }, [])

  return useMemo(() => ({
    state,
    isDirty,
    setSource,
    setStep,
    setDayCount,
    setSelectedTemplateId,
    setMetadata,
    replaceDays,
    setDayMuscleGroups,
    setDayExercises,
    addExerciseToDay,
    updateExerciseOrder,
    removeExerciseFromDay,
    updateDayName,
    addDay,
    removeDay,
    duplicateDay,
    setLoading,
    setError,
    reset,
    markSaved,
  }), [
    state,
    isDirty,
    setSource,
    setStep,
    setDayCount,
    setSelectedTemplateId,
    setMetadata,
    replaceDays,
    setDayMuscleGroups,
    setDayExercises,
    addExerciseToDay,
    updateExerciseOrder,
    removeExerciseFromDay,
    updateDayName,
    addDay,
    removeDay,
    duplicateDay,
    setLoading,
    setError,
    reset,
    markSaved,
  ])
}
