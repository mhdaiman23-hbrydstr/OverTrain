import { getExerciseTier, type ProgressionTier } from "./progression-tiers"

export interface ExerciseTemplate {
  id: string
  exerciseName: string
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
      note: `Add ${progressionRules.weightIncrease}lbs`,
    }
  } else {
    return {
      weightIncrease: 0,
      action: "repeat_weight",
      note: "Repeat current weight",
    }
  }
}

// Template definitions
export const GYM_TEMPLATES: GymTemplate[] = [
  // 3-Day Full Body Beginner Templates
  {
    id: "fullbody-3day-beginner-male",
    name: "3-Day Full Body Beginner",
    days: 3,
    weeks: 6,
    gender: ["male"],
    experience: ["beginner"],
    progressionConfig: {
      type: "linear",
      deloadWeek: 6,
      linearRules: {
        weeklyIncrease: 0.025,
        deloadWeek: 6
      }
    },
    progressionScheme: {
      type: "linear",
      deloadWeek: 6,
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
        name: "Full Body A",
        exercises: [
          addTierToExercise({
            id: "squat-1",
            exerciseName: "Barbell Back Squat",
            category: "compound",
            equipmentType: "BARBELL",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "9-11" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 4, repRange: "8-10" },
              week5: { sets: 4, repRange: "7-9" },
              week6: { sets: 2, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          }),
          {
            id: "bench-1",
            exerciseName: "Barbell Bench Press",
            category: "compound",
            equipmentType: "BARBELL",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 4, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "row-1",
            exerciseName: "Barbell Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 4, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "ohp-1",
            exerciseName: "Overhead Press",
            category: "compound",
            equipmentType: "BARBELL",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "curls-1",
            exerciseName: "Barbell Curls",
            category: "isolation",
            equipmentType: "BARBELL",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day2: {
        name: "Full Body B",
        exercises: [
          {
            id: "deadlift-1",
            exerciseName: "Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "5-8" },
              week2: { sets: 3, repRange: "5-8" },
              week3: { sets: 3, repRange: "5-8" },
              week4: { sets: 2, repRange: "3-5", intensity: "deload" },
              week5: { sets: 4, repRange: "5-8" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "incline-1",
            exerciseName: "Incline Barbell Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "pullups-1",
            exerciseName: "Pull-ups",
            category: "compound",
            equipmentType: "BODYWEIGHT",
            progressionTemplate: {
              week1: { sets: 3, repRange: "5-8" },
              week2: { sets: 3, repRange: "5-8" },
              week3: { sets: 3, repRange: "5-8" },
              week4: { sets: 2, repRange: "3-5", intensity: "deload" },
              week5: { sets: 3, repRange: "5-8" },
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
            id: "dips-1",
            exerciseName: "Dips",
            category: "compound",
            equipmentType: "BODYWEIGHT",
            progressionTemplate: {
              week1: { sets: 3, repRange: "6-10" },
              week2: { sets: 3, repRange: "6-10" },
              week3: { sets: 3, repRange: "6-10" },
              week4: { sets: 2, repRange: "4-6", intensity: "deload" },
              week5: { sets: 3, repRange: "6-10" },
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
            id: "lateral-raises-1",
            exerciseName: "Lateral Raises",
            category: "isolation",
            equipmentType: "DUMBBELL",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
              week5: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
            id: "front-squat-1",
            exerciseName: "Barbell Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "row-2",
            exerciseName: "Barbell Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "ohp-2",
            exerciseName: "Overhead Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 3, repRange: "8-10" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "rdl-1",
            exerciseName: "Romanian Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-12" },
              week2: { sets: 3, repRange: "8-12" },
              week3: { sets: 3, repRange: "8-12" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
              week5: { sets: 3, repRange: "8-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "tricep-ext-1",
            exerciseName: "Tricep Extensions",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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

  // 4-Day Intermediate Percentage-Based Template
  {
    id: "percentage-4day-intermediate-male",
    name: "4-Day Percentage-Based Intermediate",
    days: 4,
    weeks: 6,
    gender: ["male"],
    experience: ["intermediate", "advanced"],
    progressionConfig: {
      type: "percentage",
      deloadWeek: 4,
      percentageRules: {
        requiresOneRM: true,
        percentageProgression: {
          week1: { working: [75, 80, 85] },
          week2: { working: [77.5, 82.5, 87.5] },
          week3: { working: [80, 85, 90] },
          week4: { working: [70, 75, 80], deload: [60, 65, 70] },
          week5: { working: [82.5, 87.5, 92.5] },
          week6: { working: [85, 90, 95] }
        }
      }
    },
    progressionScheme: {
      type: "periodized",
      deloadWeek: 4,
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
        name: "Upper Body Strength",
        exercises: [
          addTierToExercise({
            id: "bench-perc1",
            exerciseName: "Barbell Bench Press",
            category: "compound",
            equipmentType: "BARBELL",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "5-7" },
              week3: { sets: 4, repRange: "4-6" },
              week4: { sets: 3, repRange: "8-10", intensity: "deload" },
              week5: { sets: 4, repRange: "3-5" },
              week6: { sets: 3, repRange: "2-4" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "percentage_based",
                if_failed_reps: "repeat_percentage",
                if_failed_twice: "reduce_percentage_5",
              },
            },
            restTime: 240,
          }),
          // ... more exercises
        ],
      },
      // ... more days
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
      deloadWeek: 4,
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
            exerciseName: "Barbell Back Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 4, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "bench-f1",
            exerciseName: "Barbell Bench Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "row-f1",
            exerciseName: "Barbell Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
            exerciseName: "Romanian Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 150,
          },
          {
            id: "incline-f1",
            exerciseName: "Incline Barbell Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "lat-raises-f1",
            exerciseName: "Lateral Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
              week5: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
            exerciseName: "Barbell Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "ohp-f1",
            exerciseName: "Overhead Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
              week5: { sets: 3, repRange: "10-12" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 120,
          },
          {
            id: "curls-f1",
            exerciseName: "Barbell Curls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
              week5: { sets: 3, repRange: "12-15" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
      deloadWeek: 4,
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
            exerciseName: "Barbell Bench Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "6-8" },
              week3: { sets: 4, repRange: "6-8" },
              week4: { sets: 3, repRange: "4-6", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "row-ul1",
            exerciseName: "Barbell Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "6-8" },
              week3: { sets: 4, repRange: "6-8" },
              week4: { sets: 3, repRange: "4-6", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "ohp-ul1",
            exerciseName: "Overhead Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "pullups-ul1",
            exerciseName: "Pull-ups",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-12" },
              week2: { sets: 3, repRange: "8-12" },
              week3: { sets: 3, repRange: "8-12" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
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
            id: "curls-ul1",
            exerciseName: "Barbell Curls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "triceps-ul1",
            exerciseName: "Tricep Extensions",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
            exerciseName: "Barbell Back Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "6-8" },
              week3: { sets: 4, repRange: "6-8" },
              week4: { sets: 3, repRange: "4-6", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "rdl-ul2",
            exerciseName: "Romanian Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "leg-curls-ul2",
            exerciseName: "Leg Curls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "calf-raises-ul2",
            exerciseName: "Calf Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
              week2: { sets: 4, repRange: "15-20" },
              week3: { sets: 4, repRange: "15-20" },
              week4: { sets: 3, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 60,
          },
        ],
      },
      day3: {
        name: "Upper B",
        exercises: [
          {
            id: "incline-ul3",
            exerciseName: "Incline Barbell Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-10" },
              week2: { sets: 4, repRange: "8-10" },
              week3: { sets: 4, repRange: "8-10" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "dips-ul3",
            exerciseName: "Dips",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-12" },
              week2: { sets: 3, repRange: "8-12" },
              week3: { sets: 3, repRange: "8-12" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
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
            id: "face-pulls-ul3",
            exerciseName: "Face Pulls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "15-20" },
              week2: { sets: 3, repRange: "15-20" },
              week3: { sets: 3, repRange: "15-20" },
              week4: { sets: 2, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
            id: "deadlift-ul4",
            exerciseName: "Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "5-6" },
              week2: { sets: 3, repRange: "5-6" },
              week3: { sets: 3, repRange: "5-6" },
              week4: { sets: 2, repRange: "3-4", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 300,
          },
          {
            id: "front-squat-ul4",
            exerciseName: "Barbell Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "leg-ext-ul4",
            exerciseName: "Leg Extensions",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "calf-raises-ul4",
            exerciseName: "Calf Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
              week2: { sets: 4, repRange: "15-20" },
              week3: { sets: 4, repRange: "15-20" },
              week4: { sets: 3, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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

  // 6-Day Push/Pull/Legs
  {
    id: "ppl-6day-intermediate-male",
    name: "6-Day Push/Pull/Legs",
    days: 6,
    weeks: 6,
    gender: ["male"],
    experience: ["intermediate", "advanced"],
    progressionScheme: {
      type: "linear",
      deloadWeek: 4,
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
        name: "Push A",
        exercises: [
          {
            id: "bench-ppl1",
            exerciseName: "Barbell Bench Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "6-8" },
              week3: { sets: 4, repRange: "6-8" },
              week4: { sets: 3, repRange: "4-6", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "ohp-ppl1",
            exerciseName: "Overhead Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-10" },
              week2: { sets: 4, repRange: "8-10" },
              week3: { sets: 4, repRange: "8-10" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "incline-ppl1",
            exerciseName: "Incline Barbell Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "dips-ppl1",
            exerciseName: "Dips",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
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
            id: "lat-raises-ppl1",
            exerciseName: "Lateral Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "12-15" },
              week2: { sets: 4, repRange: "12-15" },
              week3: { sets: 4, repRange: "12-15" },
              week4: { sets: 3, repRange: "10-12", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "triceps-ppl1",
            exerciseName: "Tricep Extensions",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day2: {
        name: "Pull A",
        exercises: [
          {
            id: "deadlift-ppl2",
            exerciseName: "Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "5-6" },
              week2: { sets: 3, repRange: "5-6" },
              week3: { sets: 3, repRange: "5-6" },
              week4: { sets: 2, repRange: "3-4", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 300,
          },
          {
            id: "row-ppl2",
            exerciseName: "Barbell Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "6-8" },
              week3: { sets: 4, repRange: "6-8" },
              week4: { sets: 3, repRange: "4-6", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "pullups-ppl2",
            exerciseName: "Pull-ups",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-12" },
              week2: { sets: 4, repRange: "8-12" },
              week3: { sets: 4, repRange: "8-12" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
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
            id: "face-pulls-ppl2",
            exerciseName: "Face Pulls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
              week2: { sets: 4, repRange: "15-20" },
              week3: { sets: 4, repRange: "15-20" },
              week4: { sets: 3, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "curls-ppl2",
            exerciseName: "Barbell Curls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day3: {
        name: "Legs A",
        exercises: [
          {
            id: "squat-ppl3",
            exerciseName: "Barbell Back Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "6-8" },
              week2: { sets: 4, repRange: "6-8" },
              week3: { sets: 4, repRange: "6-8" },
              week4: { sets: 3, repRange: "4-6", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 240,
          },
          {
            id: "rdl-ppl3",
            exerciseName: "Romanian Deadlift",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 3, repRange: "8-10" },
              week2: { sets: 3, repRange: "8-10" },
              week3: { sets: 3, repRange: "8-10" },
              week4: { sets: 2, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "leg-curls-ppl3",
            exerciseName: "Leg Curls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "calf-raises-ppl3",
            exerciseName: "Calf Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
              week2: { sets: 4, repRange: "15-20" },
              week3: { sets: 4, repRange: "15-20" },
              week4: { sets: 3, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 60,
          },
        ],
      },
      day4: {
        name: "Push B",
        exercises: [
          {
            id: "incline-ppl4",
            exerciseName: "Incline Barbell Press",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-10" },
              week2: { sets: 4, repRange: "8-10" },
              week3: { sets: 4, repRange: "8-10" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "dips-ppl4",
            exerciseName: "Dips",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "10-12" },
              week2: { sets: 4, repRange: "10-12" },
              week3: { sets: 4, repRange: "10-12" },
              week4: { sets: 3, repRange: "8-10", intensity: "deload" },
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
            id: "lat-raises-ppl4",
            exerciseName: "Lateral Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "12-15" },
              week2: { sets: 4, repRange: "12-15" },
              week3: { sets: 4, repRange: "12-15" },
              week4: { sets: 3, repRange: "10-12", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "triceps-ppl4",
            exerciseName: "Tricep Extensions",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day5: {
        name: "Pull B",
        exercises: [
          {
            id: "row-ppl5",
            exerciseName: "Barbell Row",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-10" },
              week2: { sets: 4, repRange: "8-10" },
              week3: { sets: 4, repRange: "8-10" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "pullups-ppl5",
            exerciseName: "Pull-ups",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-12" },
              week2: { sets: 4, repRange: "8-12" },
              week3: { sets: 4, repRange: "8-12" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
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
            id: "face-pulls-ppl5",
            exerciseName: "Face Pulls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
              week2: { sets: 4, repRange: "15-20" },
              week3: { sets: 4, repRange: "15-20" },
              week4: { sets: 3, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "curls-ppl5",
            exerciseName: "Barbell Curls",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "10-12" },
              week2: { sets: 3, repRange: "10-12" },
              week3: { sets: 3, repRange: "10-12" },
              week4: { sets: 2, repRange: "8-10", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
        ],
      },
      day6: {
        name: "Legs B",
        exercises: [
          {
            id: "front-squat-ppl6",
            exerciseName: "Barbell Front Squat",
            category: "compound",
            progressionTemplate: {
              week1: { sets: 4, repRange: "8-10" },
              week2: { sets: 4, repRange: "8-10" },
              week3: { sets: 4, repRange: "8-10" },
              week4: { sets: 3, repRange: "6-8", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 180,
          },
          {
            id: "leg-ext-ppl6",
            exerciseName: "Leg Extensions",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 3, repRange: "12-15" },
              week2: { sets: 3, repRange: "12-15" },
              week3: { sets: 3, repRange: "12-15" },
              week4: { sets: 2, repRange: "10-12", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
                if_failed_reps: "repeat_weight",
                if_failed_twice: "reduce_weight_10_percent",
              },
            },
            restTime: 90,
          },
          {
            id: "calf-raises-ppl6",
            exerciseName: "Calf Raises",
            category: "isolation",
            progressionTemplate: {
              week1: { sets: 4, repRange: "15-20" },
              week2: { sets: 4, repRange: "15-20" },
              week3: { sets: 4, repRange: "15-20" },
              week4: { sets: 3, repRange: "12-15", intensity: "deload" },
            },
            autoProgression: {
              enabled: true,
              progressionType: "weight_based",
              rules: {
                if_all_sets_completed: "increase_weight_2.5lbs",
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
    male: ["fullbody-3day-beginner-male", "upperlower-4day-intermediate-male"],
    female: ["fullbody-3day-beginner-female"],
  },
  intermediate: {
    male: ["ppl-6day-intermediate-male", "upperlower-4day-intermediate-male"],
    female: [
      "ppl-6day-intermediate-male", // Can be used by females too
    ],
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
