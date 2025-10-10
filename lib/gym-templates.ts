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
  const allSetsCompleted = lastWorkout.sets.every((set: any) => set.completed && set.actualReps >= set.targetReps)

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
export const GYM_TEMPLATES: GymTemplate[] = [
  // ========================================
  // TESTING TEMPLATE - FOR DEVELOPMENT ONLY
  // ========================================
  // 2-Week Test Program - Quick completion testing
  // REMOVE BEFORE PRODUCTION DEPLOYMENT
  {
    id: "test-2week-3day-program",
    name: "2-Week Test Program (DEV ONLY)",
    days: 3,
    weeks: 2,
    gender: ["male", "female"], // Both genders for testing
    experience: ["beginner", "intermediate", "advanced"], // All levels for testing
    progressionScheme: {
      type: "linear",
      deloadWeek: 2, // Week 2 is deload for quick testing
      progressionRules: {
        compound: {
          successThreshold: "all_sets_completed",
          weightIncrease: 5,
          failureResponse: "repeat_week",
        },
        isolation: {
          successThreshold: "all_sets_completed",
          weightIncrease: 2.5,
          failureResponse: "repeat_week",
        },
      },
    },
    schedule: {
      day1: {
        name: "Test Workout A",
        exercises: [
          {
            id: "test-squat-a1",
            exerciseName: "Barbell Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 2, repRange: "6-8", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "test-bench-a1",
            exerciseName: "Bench Press (Flat)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 2, repRange: "6-8", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "test-row-a1",
            exerciseName: "Barbell Bent Over Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 2, repRange: "6-8", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
        ],
      },
      day2: {
        name: "Test Workout B",
        exercises: [
          {
            id: "test-deadlift-b1",
            exerciseName: "Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "5-8" },
              week2: { sets: 2, repRange: "3-5", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_10",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "test-ohp-b1",
            exerciseName: "Barbell Shoulder Press (Standing)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 2, repRange: "6-8", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "test-curls-b1",
            exerciseName: "Barbell Curl (Normal Grip)",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 2, repRange: "8-10", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day3: {
        name: "Test Workout C",
        exercises: [
          {
            id: "test-squat-c1",
            exerciseName: "Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 2, repRange: "6-8", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "test-pullups-c1",
            exerciseName: "Pullup (Normal Grip)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "6-10" },
              week2: { sets: 2, repRange: "4-6", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "rep_based",
              rules: {
                if_all_sets_completed: "increase_reps_1",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_sets",
              },
            },
            restTime: 120,
          },
          {
            id: "test-lateral-c1",
            exerciseName: "Dumbbell Lateral Raise",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 2, repRange: "10-12", intensity: "deload" }, // Deload week
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
    },
  },

  // 3-Day Full Body Beginner Female
  {
    id: "fullbody-3day-beginner-female",
    name: "3-Day Full Body Beginner",
    days: 3,
    weeks: 6,
    gender: ["female"],
    experience: ["beginner"],
    progressionScheme: {
      type: "linear",
      deloadWeek: 6, // Last week is deload
      progressionRules: {
        compound: {
          successThreshold: "all_sets_completed",
          weightIncrease: 2.5,
          failureResponse: "repeat_week",
        },
        isolation: {
          successThreshold: "all_sets_completed",
          weightIncrease: 2.5,
          failureResponse: "repeat_week",
        },
      },
    },
    schedule: {
      day1: {
        name: "Full Body A",
        exercises: [
          {
            id: "squat-f1",
            exerciseName: "Barbell Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "bench-f1",
            exerciseName: "Bench Press (Flat)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "row-f1",
            exerciseName: "Barbell Bent Over Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
        ],
      },
      day2: {
        name: "Full Body B",
        exercises: [
          {
            id: "rdl-f1",
            exerciseName: "Dumbbell RDL",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 150,
          },
          {
            id: "incline-f1",
            exerciseName: "Bench Press (Incline)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "lat-raises-f1",
            exerciseName: "Dumbbell Lateral Raise",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day3: {
        name: "Full Body C",
        exercises: [
          {
            id: "front-squat-f1",
            exerciseName: "Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "ohp-f1",
            exerciseName: "Barbell Shoulder Press (Standing)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "curls-f1",
            exerciseName: "Barbell Curl (Normal Grip)",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
    },
  },

  // 4-Day Upper/Lower Split
  {
    id: "upperlower-4day-intermediate-male",
    name: "4-Day Upper/Lower Split",
    days: 4,
    weeks: 6,
    gender: ["male"],
    experience: ["intermediate"],
    progressionScheme: {
      type: "linear",
      deloadWeek: 6, // Last week is deload
      progressionRules: {
        compound: {
          successThreshold: "all_sets_completed",
          weightIncrease: 5,
          failureResponse: "repeat_week",
        },
        isolation: {
          successThreshold: "all_sets_completed",
          weightIncrease: 2.5,
          failureResponse: "repeat_week",
        },
      },
    },
    schedule: {
      day1: {
        name: "Upper A",
        exercises: [
          {
            id: "bench-ul1",
            exerciseName: "Bench Press (Flat)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "row-ul1",
            exerciseName: "Barbell Bent Over Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "ohp-ul1",
            exerciseName: "Barbell Shoulder Press (Standing)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "curls-ul1",
            exerciseName: "Barbell Curl (Normal Grip)",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "triceps-ul1",
            exerciseName: "Cable Triceps Pushdown (Rope)",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day2: {
        name: "Lower A",
        exercises: [
          {
            id: "squat-ul2",
            exerciseName: "Barbell Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "rdl-ul2",
            exerciseName: "Dumbbell RDL",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "leg-press-ul2",
            exerciseName: "Leg Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_10",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "leg-curl-ul2",
            exerciseName: "Lying Leg Curl",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day3: {
        name: "Upper B",
        exercises: [
          {
            id: "incline-ul3",
            exerciseName: "Bench Press (Incline)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "pull-ups-ul3",
            exerciseName: "Pullup (Normal Grip)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "rep_based",
              rules: {
                if_all_sets_completed: "increase_reps_1",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_sets",
              },
            },
            restTime: 240,
          },
          {
            id: "dips-ul3",
            exerciseName: "Dip (Chest-Focused)",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "rep_based",
              rules: {
                if_all_sets_completed: "increase_reps_1",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_sets",
              },
            },
            restTime: 180,
          },
          {
            id: "lat-raises-ul3",
            exerciseName: "Dumbbell Lateral Raise",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day4: {
        name: "Lower B",
        exercises: [
          {
            id: "front-squat-ul4",
            exerciseName: "Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "deadlift-ul4",
            exerciseName: "Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "5-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_10",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 300,
          },
          {
            id: "leg-ext-ul4",
            exerciseName: "Leg Extension",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "calf-ul4",
            exerciseName: "Calf Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 60,
          },
        ],
      },
    },
  },
]

// Template organization by experience and gender
export const gymTemplates = {
  beginner: {
    female: ["fullbody-3day-beginner-female"],
    male: ["test-2week-3day-program"], // Test template available for all
  },
  intermediate: {
    male: ["upperlower-4day-intermediate-male", "test-2week-3day-program"], // Test template available for all
    female: ["test-2week-3day-program"], // Test template available for all
  },
  advanced: {
    male: ["test-2week-3day-program"], // Test template available for all
    female: ["test-2week-3day-program"], // Test template available for all
  },
}
// ========================================
// IMPORTANT: Remove test template from gymTemplates object before production
// The test template ("test-2week-3day-program") should only be available during development
// ========================================

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
