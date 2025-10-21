import { getExerciseTier, type ProgressionTier } from "./progression-tiers"

export interface ExerciseTemplate {
  id: string
  exerciseName: string
  exerciseLibraryId?: string // NEW: Optional UUID reference to exercise_library table (for DB integration)
  category: "compound" | "isolation"
  equipmentType?: string
  tier?: ProgressionTier
  progressionTemplate: {
    [week: string]: {
      sets: number
      repRange: string
      intensity?: string
    }
  }
  autoProgression: {
    enabled: boolean
    progressionType: "weight_based" | "rep_based"
    rules: {
      if_all_sets_completed: string
      if_failed_reps: string
      if_failed_twice: string
    }
  }
  restTime: number // seconds
}

// Helper function to add tier to exercise templates
function addTierToExercise(exercise: Omit<ExerciseTemplate, 'tier'>): ExerciseTemplate {
  return {
    ...exercise,
    tier: getExerciseTier(exercise.exerciseName, exercise.category)
  }
}

export interface WorkoutDay {
  name: string
  exercises: ExerciseTemplate[]
}

export interface ProgressionConfig {
  type: "linear" | "percentage" | "hybrid"
  deloadWeek: number
  compoundProgression?: "linear" | "percentage"
  accessoryProgression?: "linear" | "percentage"
  compoundExercises?: string[]
  linearRules?: {
    weeklyIncrease: number
    deloadWeek: number
  }
  percentageRules?: {
    requiresOneRM: boolean
    percentageProgression: Record<string, { working: number[]; deload?: number[] }>
  }
}

export interface GymTemplate {
  id: string
  name: string
  days: number
  weeks: number
  gender: ("male" | "female")[]
  experience: ("beginner" | "intermediate" | "advanced")[]
  progressionConfig?: ProgressionConfig
  progressionScheme?: {
    type: "linear" | "periodized"
    deloadWeek: number
    progressionRules: {
      compound: {
        successThreshold: string
        weightIncrease: number
        failureResponse: string
      }
      isolation: {
        successThreshold: string
        weightIncrease: number
        failureResponse: string
      }
    }
  }
  ownerUserId?: string | null
  originTemplateId?: string | null
  forkedAt?: string | null
  createdFrom?: string | null
  isPublic?: boolean
  schedule: {
    [key: string]: WorkoutDay
  }
}

// Core gym exercises database
export const gymExercises = {
  compound: [
    "Barbell Back Squat",
    "Barbell Front Squat",
    "Barbell Bench Press",
    "Incline Barbell Press",
    "Barbell Row",
    "Deadlift",
    "Romanian Deadlift",
    "Overhead Press",
    "Pull-ups",
    "Chin-ups",
    "Dips",
  ],
  isolation: [
    "Barbell Curls",
    "Tricep Extensions",
    "Lateral Raises",
    "Leg Curls",
    "Leg Extensions",
    "Calf Raises",
    "Face Pulls",
    "Chest Flys",
  ],
}

// Progression calculation function
export const calculateNextWeekProgression = (exerciseHistory: any[], progressionRules: any) => {
  const lastWorkout = exerciseHistory[exerciseHistory.length - 1]
  const allSetsCompleted = lastWorkout.sets.every((set: any) => set.completed && set.actualReps >= set.performedReps)

  if (allSetsCompleted) {
    return {
      weightIncrease: progressionRules.weightIncrease,
      action: "increase_weight",
      note: `Add ${progressionRules.weightIncrease}`,
    }
  } else {
    return {
      weightIncrease: 0,
      action: "repeat_weight",
      note: "Repeat current weight",
    }
  }
}

/**
 * Adjust rep range for deload week
 * Reduces the rep range by approximately 2 reps
 */
function adjustRepRangeForDeload(repRange: string): string {
  const match = repRange.match(/(\d+)-(\d+)/)
  if (match) {
    const min = Math.max(1, parseInt(match[1]) - 2)
    const max = Math.max(min + 1, parseInt(match[2]) - 2)
    return `${min}-${max}`
  }
  return repRange
}

/**
 * Process template to automatically generate deload weeks
 * Takes a simplified template and generates full progression template for all weeks
 * Automatically makes the last week a deload week
 */
export function processTemplateWithDeload(template: GymTemplate): GymTemplate {
  const lastWeek = template.weeks
  
  console.log("[TemplateProcessor] Processing template with automatic deload:", {
    templateId: template.id,
    weeks: template.weeks,
    lastWeekIsDeload: lastWeek
  })
  
  // Deep clone the template to avoid mutations
  const processedTemplate = JSON.parse(JSON.stringify(template))
  
  // Process each day's exercises
  for (const dayKey in processedTemplate.schedule) {
    processedTemplate.schedule[dayKey].exercises = processedTemplate.schedule[dayKey].exercises.map((exercise: ExerciseTemplate) => {
      // Check if progressionTemplate is fully defined for all weeks
      const definedWeeks = Object.keys(exercise.progressionTemplate || {}).length
      
      if (definedWeeks < template.weeks) {
        // Need to generate missing weeks
        const progressionTemplate: { [week: string]: { sets: number; repRange: string; intensity?: string } } = {}
        
        // Get the first week as a base (or default values)
        const baseWeek = exercise.progressionTemplate?.week1 || {
          sets: 3,
          repRange: "8-10"
        }
        
        for (let week = 1; week <= template.weeks; week++) {
          const weekKey = `week${week}`
          
          // If this week is already defined, keep it
          if (exercise.progressionTemplate?.[weekKey]) {
            progressionTemplate[weekKey] = exercise.progressionTemplate[weekKey]
            continue
          }
          
          if (week === lastWeek) {
            // DELOAD WEEK - reduce sets and adjust rep range
            progressionTemplate[weekKey] = {
              sets: Math.max(1, baseWeek.sets - 1), // Reduce sets by 1
              repRange: adjustRepRangeForDeload(baseWeek.repRange),
              intensity: "deload"
            }
          } else {
            // NORMAL WEEK - use base progression
            progressionTemplate[weekKey] = {
              sets: baseWeek.sets,
              repRange: baseWeek.repRange
            }
          }
        }
        
        return {
          ...exercise,
          progressionTemplate
        }
      }
      
      return exercise
    })
  }
  
  console.log("[TemplateProcessor] Template processing complete")
  
  return processedTemplate
}

// Template definitions
// NOTE: All templates now use database-first approach with proper UUIDs
// Legacy hardcoded templates have been replaced with v2 database templates
export const GYM_TEMPLATES: GymTemplate[] = [
  // All templates now use database-first approach with proper UUIDs
  // Legacy hardcoded templates have been replaced with v2 database templates
]

// Template organization by experience and gender
// NOTE: This is now LEGACY - templates are loaded dynamically from database
// Use ProgramStateManager.getAllTemplates() instead
export const gymTemplates = {
  beginner: {
    female: [],
    male: [],
  },
  intermediate: {
    male: [],
    female: [],
  },
  advanced: {
    male: [],
    female: [],
  },
}

// Helper functions
export const getTemplateById = (id: string): GymTemplate | undefined => {
  return GYM_TEMPLATES.find((template) => template.id === id)
}

export const getTemplatesByFilter = (filters: {
  workoutsPerWeek?: number
  gender?: "male" | "female"
  experience?: "beginner" | "intermediate" | "advanced"
}): GymTemplate[] => {
  return GYM_TEMPLATES.filter((template) => {
    if (filters.workoutsPerWeek && template.days !== filters.workoutsPerWeek) {
      return false
    }
    if (filters.gender && !template.gender.includes(filters.gender)) {
      return false
    }
    if (filters.experience && !template.experience.includes(filters.experience)) {
      return false
    }
    return true
  })
}

export const createUserTemplate = (baseTemplate: GymTemplate, customizations: any): GymTemplate => {
  // Function to create custom templates based on existing ones
  return {
    ...baseTemplate,
    id: `custom-${Date.now()}`,
    name: `Custom ${baseTemplate.name}`,
    ...customizations,
  }
}
