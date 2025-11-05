import { DEFAULT_PROGRESSION_CONFIG } from './constants'
import type {
  DayInWizard,
  ExerciseInWizard,
  ProgramWizardState,
  MuscleGroupSelection,
} from './types'

const isolationKeywords = [
  'curl',
  'extension',
  'raise',
  'fly',
  'crunch',
  'plank',
  'shrug',
  'pullover',
  'lateral',
  'calf',
  'pressdown',
  'pulldown',
  'kickback',
]

export const generateTempId = (): string => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `tmp-${Math.random().toString(36).slice(2, 11)}`
}

export const createEmptyDays = (count: number): DayInWizard[] => {
  return Array.from({ length: count }, (_, index) => ({
    dayNumber: index + 1,
    dayName: `Day ${index + 1}`,
    muscleGroups: [],
    exercises: [],
  }))
}

export const reindexDays = (days: DayInWizard[]): DayInWizard[] => {
  return days.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
  }))
}

export const inferExerciseCategory = (exerciseName: string, muscleGroup: string): 'compound' | 'isolation' => {
  const name = exerciseName.toLowerCase()
  if (isolationKeywords.some(keyword => name.includes(keyword))) {
    return 'isolation'
  }

  const accessoryGroups = ['abs', 'forearms', 'neck', 'calves']
  if (accessoryGroups.includes(muscleGroup.toLowerCase())) {
    return 'isolation'
  }

  return 'compound'
}

export const convertTemplateToWizardDays = (template: any): DayInWizard[] => {
  if (!template?.days || !Array.isArray(template.days)) {
    return []
  }

  const sortedDays = [...template.days].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0))

  return sortedDays.map((day: any, index: number) => {
    const exercises: ExerciseInWizard[] = (day.exercises ?? []).map((exercise: any, exerciseIndex: number) => {
      const exerciseName = exercise.exercise?.name ?? exercise.exercise_name ?? 'Exercise'
      const muscleGroup = exercise.exercise?.muscle_group ?? exercise.muscle_group ?? ''
      const equipmentType = exercise.exercise?.equipment_type ?? exercise.equipment_type ?? ''

      return {
        tempId: generateTempId(),
        exerciseLibraryId: exercise.exercise_id ?? exercise.exerciseId ?? '',
        exerciseName,
        muscleGroup,
        equipmentType,
        order: exercise.exercise_order ?? exerciseIndex,
        category: exercise.category ?? inferExerciseCategory(exerciseName, muscleGroup),
        restTime: exercise.rest_time_seconds ?? 90,
      }
    })

    const sortedExercises = exercises.sort((a, b) => a.order - b.order).map((exercise, position) => ({
      ...exercise,
      order: position,
    }))

    return {
      dayNumber: index + 1,
      dayName: day.day_name ?? `Day ${index + 1}`,
      muscleGroups: [],
      exercises: sortedExercises,
    }
  })
}

export const generateProgressionConfig = (
  exercise: ExerciseInWizard,
  totalWeeks: number,
) => {
  const progressionTemplate: Record<string, { sets: number; repRange: string; intensity?: string }> = {}

  for (let week = 1; week <= totalWeeks; week++) {
    const isDeloadWeek = week === totalWeeks
    progressionTemplate[`week${week}`] = {
      sets: isDeloadWeek ? 2 : 3,
      repRange: exercise.category === 'compound' ? '6-8' : '8-12',
      intensity: isDeloadWeek ? 'deload' : undefined,
    }
  }

  return {
    progressionTemplate,
    autoProgression: DEFAULT_PROGRESSION_CONFIG.autoProgression,
  }
}

export const getMissingMuscleGroupAssignments = (day: DayInWizard): Array<{ group: string; missing: number }> => {
  if (!day.muscleGroups || day.muscleGroups.length === 0) {
    return []
  }

  return day.muscleGroups
    .map((selection: MuscleGroupSelection) => {
      const count = day.exercises.filter(exercise =>
        exercise.muscleGroup.toLowerCase() === selection.group.toLowerCase(),
      ).length
      const missing = selection.count - count
      if (missing > 0) {
        return {
          group: selection.group,
          missing,
        }
      }
      return null
    })
    .filter((value): value is { group: string; missing: number } => value !== null)
}

export const hasRequiredMuscleGroupExercises = (day: DayInWizard): boolean => {
  return getMissingMuscleGroupAssignments(day).length === 0
}

export const validateWizardState = (state: ProgramWizardState) => {
  const errors: string[] = []

  if (!state.metadata.name.trim()) {
    errors.push('Program name is required.')
  }

  if (state.days.length === 0) {
    errors.push('Add at least one training day.')
  }

  if (state.metadata.weeks <= 0) {
    errors.push('Set the program length in weeks.')
  }

  if (state.days.length !== state.dayCount) {
    errors.push('Day count and configured days are out of sync.')
  }

  if (state.metadata.deloadWeek > state.metadata.weeks) {
    errors.push('Deload week must be within program length.')
  }

  state.days.forEach(day => {
    if (!day.dayName.trim()) {
      errors.push(`Day ${day.dayNumber} needs a name.`)
    }

    if (day.exercises.length === 0) {
      errors.push(`Day ${day.dayNumber} needs at least one exercise.`)
    }

    if (!hasRequiredMuscleGroupExercises(day)) {
      errors.push(`Day ${day.dayNumber} is missing exercises for selected muscle groups.`)
    }
  })

  const uniqueNames = new Set(state.days.map(day => day.dayName.trim().toLowerCase()))
  if (uniqueNames.size !== state.days.length) {
    errors.push('Day names must be unique.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const sortExercisesAndUpdateOrder = (exercises: ExerciseInWizard[]): ExerciseInWizard[] => {
  return exercises
    .sort((a, b) => a.order - b.order)
    .map((exercise, index) => ({
      ...exercise,
      order: index,
    }))
}
