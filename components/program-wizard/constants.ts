/**
 * Program Wizard Constants
 * Muscle group categories and other configuration
 */

export const MUSCLE_GROUP_CATEGORIES = {
  'upper-push': {
    label: 'Upper Push',
    groups: ['Chest', 'Shoulders', 'Triceps'],
  },
  'upper-pull': {
    label: 'Upper Pull',
    groups: ['Back', 'Biceps', 'Traps'],
  },
  'legs': {
    label: 'Legs',
    groups: ['Quads', 'Glutes', 'Hamstrings', 'Calves'],
  },
  'accessories': {
    label: 'Accessories',
    groups: ['Abs', 'Forearms', 'Neck', 'Other'],
  },
} as const

export type MuscleGroupCategory = keyof typeof MUSCLE_GROUP_CATEGORIES

export const ALL_MUSCLE_GROUPS = Object.values(MUSCLE_GROUP_CATEGORIES)
  .flatMap(cat => cat.groups)
  .sort()

export const DEFAULT_PROGRESSION_CONFIG = {
  progressionTemplate: {
    week1: { sets: 3, repRange: '8-10' },
    week2: { sets: 3, repRange: '8-10' },
    week3: { sets: 3, repRange: '8-10' },
    week4: { sets: 3, repRange: '6-8', intensity: 'deload' },
  },
  autoProgression: {
    enabled: true,
    progressionType: 'weight_based',
    rules: {
      if_all_sets_completed: 'increase_weight',
      if_failed_reps: 'repeat_weight',
      if_failed_twice: 'decrease_weight',
    },
  },
}

export const AVAILABLE_DAY_COUNTS = [3, 4, 5, 6, 7]
export const AVAILABLE_WEEKS = [4, 5, 6, 7, 8]
export const AVAILABLE_GENDERS = ['male', 'female']
export const AVAILABLE_EXPERIENCE = ['beginner', 'intermediate', 'advanced']

export const STEPPER_STEPS = {
  source: { label: 'Create Method', order: 1 },
  dayCount: { label: 'Training Schedule', order: 2 },
  templateSelect: { label: 'Choose Template', order: 3 },
  muscleGroupSelect: { label: 'Muscle Groups', order: 4 },
  exerciseAssign: { label: 'Select Exercises', order: 5 },
  dayBuilder: { label: 'Build Program', order: 6 },
  finalize: { label: 'Finalize', order: 7 },
} as const
