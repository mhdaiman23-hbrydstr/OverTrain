export interface Exercise {
  id: string
  name: string
  category: "compound" | "isolation" | "cardio"
  muscleGroups: string[]
  equipment: string[]
  difficulty: "beginner" | "intermediate" | "advanced"
  instructions: string[]
}

export interface WorkoutDay {
  id: string
  name: string
  exercises: {
    exerciseId: string
    sets: number
    reps: string
    rest: string
    notes?: string
  }[]
}

export interface Program {
  id: string
  name: string
  description: string
  duration: string
  difficulty: "beginner" | "intermediate" | "advanced"
  goals: string[]
  gender: "male" | "female" | "unisex"
  equipment: string[]
  daysPerWeek: number
  workoutDays: WorkoutDay[]
}

// Exercise Database
export const EXERCISES: Exercise[] = [
  // Compound Movements
  {
    id: "squat",
    name: "Barbell Back Squat",
    category: "compound",
    muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"],
    equipment: ["Full gym access"],
    difficulty: "intermediate",
    instructions: [
      "Position barbell on upper back",
      "Stand with feet shoulder-width apart",
      "Lower by bending knees and hips",
      "Keep chest up and knees tracking over toes",
      "Return to starting position",
    ],
  },
  {
    id: "deadlift",
    name: "Conventional Deadlift",
    category: "compound",
    muscleGroups: ["hamstrings", "glutes", "back", "traps"],
    equipment: ["Full gym access"],
    difficulty: "intermediate",
    instructions: [
      "Stand with feet hip-width apart",
      "Grip barbell with hands outside legs",
      "Keep back straight, chest up",
      "Lift by extending hips and knees",
      "Lower with control",
    ],
  },
  {
    id: "bench-press",
    name: "Barbell Bench Press",
    category: "compound",
    muscleGroups: ["chest", "shoulders", "triceps"],
    equipment: ["Full gym access"],
    difficulty: "intermediate",
    instructions: [
      "Lie on bench with feet flat on floor",
      "Grip barbell slightly wider than shoulders",
      "Lower bar to chest with control",
      "Press up to full arm extension",
      "Keep core tight throughout",
    ],
  },
  {
    id: "push-up",
    name: "Push-Up",
    category: "compound",
    muscleGroups: ["chest", "shoulders", "triceps", "core"],
    equipment: ["Bodyweight only"],
    difficulty: "beginner",
    instructions: [
      "Start in plank position",
      "Lower body until chest nearly touches floor",
      "Push back up to starting position",
      "Keep body in straight line",
      "Engage core throughout",
    ],
  },
  {
    id: "pull-up",
    name: "Pull-Up",
    category: "compound",
    muscleGroups: ["back", "biceps"],
    equipment: ["Pull-up bar"],
    difficulty: "intermediate",
    instructions: [
      "Hang from bar with overhand grip",
      "Pull body up until chin over bar",
      "Lower with control",
      "Keep core engaged",
      "Full range of motion",
    ],
  },
  // Add more exercises...
  {
    id: "dumbbell-row",
    name: "Dumbbell Row",
    category: "compound",
    muscleGroups: ["back", "biceps"],
    equipment: ["Home gym (dumbbells, barbell)"],
    difficulty: "beginner",
    instructions: [
      "Bend over with dumbbell in one hand",
      "Support body with other hand",
      "Pull dumbbell to hip",
      "Lower with control",
      "Keep back straight",
    ],
  },
]

// Program Templates
export const PROGRAM_TEMPLATES: Program[] = [
  {
    id: "beginner-full-body",
    name: "Beginner Full Body",
    description:
      "Perfect for those new to strength training. Focuses on learning proper form and building a foundation.",
    duration: "6 weeks",
    difficulty: "beginner",
    goals: ["General fitness", "Build muscle mass", "Build lean muscle"],
    gender: "unisex",
    equipment: ["Full gym access"],
    daysPerWeek: 3,
    workoutDays: [
      {
        id: "day-a",
        name: "Full Body A",
        exercises: [
          { exerciseId: "squat", sets: 3, reps: "8-12", rest: "2-3 min" },
          { exerciseId: "bench-press", sets: 3, reps: "8-12", rest: "2-3 min" },
          { exerciseId: "dumbbell-row", sets: 3, reps: "8-12", rest: "2-3 min" },
        ],
      },
      {
        id: "day-b",
        name: "Full Body B",
        exercises: [
          { exerciseId: "deadlift", sets: 3, reps: "5-8", rest: "3-4 min" },
          { exerciseId: "push-up", sets: 3, reps: "8-15", rest: "1-2 min" },
          { exerciseId: "pull-up", sets: 3, reps: "5-10", rest: "2-3 min" },
        ],
      },
    ],
  },
  {
    id: "female-toning",
    name: "Female Toning Program",
    description:
      "Designed specifically for women looking to tone and sculpt their physique with lean muscle development.",
    duration: "6 weeks",
    difficulty: "beginner",
    goals: ["Tone and sculpt", "Build lean muscle", "General fitness"],
    gender: "female",
    equipment: ["Full gym access", "Home gym (dumbbells, barbell)"],
    daysPerWeek: 4,
    workoutDays: [
      {
        id: "upper-body",
        name: "Upper Body Sculpt",
        exercises: [
          { exerciseId: "push-up", sets: 3, reps: "10-15", rest: "1-2 min" },
          { exerciseId: "dumbbell-row", sets: 3, reps: "12-15", rest: "1-2 min" },
        ],
      },
      {
        id: "lower-body",
        name: "Lower Body Tone",
        exercises: [{ exerciseId: "squat", sets: 4, reps: "12-15", rest: "1-2 min" }],
      },
    ],
  },
  {
    id: "male-strength",
    name: "Male Strength Builder",
    description: "Focused on building raw strength and muscle mass for men. Progressive overload emphasis.",
    duration: "6 weeks",
    difficulty: "intermediate",
    goals: ["Build muscle mass", "Increase strength", "Powerlifting"],
    gender: "male",
    equipment: ["Full gym access"],
    daysPerWeek: 4,
    workoutDays: [
      {
        id: "chest-triceps",
        name: "Chest & Triceps",
        exercises: [{ exerciseId: "bench-press", sets: 4, reps: "6-8", rest: "3-4 min" }],
      },
      {
        id: "back-biceps",
        name: "Back & Biceps",
        exercises: [
          { exerciseId: "deadlift", sets: 4, reps: "5-6", rest: "4-5 min" },
          { exerciseId: "pull-up", sets: 4, reps: "8-12", rest: "2-3 min" },
        ],
      },
    ],
  },
  {
    id: "bodyweight-home",
    name: "Home Bodyweight Program",
    description: "No equipment needed! Perfect for home workouts using just your bodyweight.",
    duration: "6 weeks",
    difficulty: "beginner",
    goals: ["General fitness", "Lose weight", "Lose fat"],
    gender: "unisex",
    equipment: ["Bodyweight only"],
    daysPerWeek: 5,
    workoutDays: [
      {
        id: "bodyweight-full",
        name: "Full Body Bodyweight",
        exercises: [{ exerciseId: "push-up", sets: 3, reps: "8-15", rest: "1-2 min" }],
      },
    ],
  },
]

export class ProgramRecommendationEngine {
  static recommendPrograms(userProfile: {
    gender: "male" | "female"
    experience: "beginner" | "intermediate" | "advanced"
    goals: string[]
    equipment: string[]
    workoutDays: string
  }): Program[] {
    const daysPerWeek = this.parseDaysPerWeek(userProfile.workoutDays)

    return PROGRAM_TEMPLATES.filter((program) => {
      // Filter by gender (unisex programs work for everyone)
      const genderMatch = program.gender === "unisex" || program.gender === userProfile.gender

      // Filter by experience level (allow same level or one below)
      const experienceMatch = this.isExperienceLevelSuitable(program.difficulty, userProfile.experience)

      // Filter by goals (at least one goal should match)
      const goalMatch = program.goals.some((goal) => userProfile.goals.includes(goal))

      // Filter by equipment availability
      const equipmentMatch = program.equipment.some((eq) => userProfile.equipment.includes(eq))

      // Filter by workout frequency
      const frequencyMatch = Math.abs(program.daysPerWeek - daysPerWeek) <= 1

      return genderMatch && experienceMatch && goalMatch && equipmentMatch && frequencyMatch
    })
      .sort((a, b) => {
        // Sort by relevance score
        const scoreA = this.calculateRelevanceScore(a, userProfile)
        const scoreB = this.calculateRelevanceScore(b, userProfile)
        return scoreB - scoreA
      })
      .slice(0, 3) // Return top 3 recommendations
  }

  private static parseDaysPerWeek(workoutDays: string): number {
    const match = workoutDays.match(/(\d+)/)
    return match ? Number.parseInt(match[1]) : 3
  }

  private static isExperienceLevelSuitable(programLevel: string, userLevel: string): boolean {
    const levels = ["beginner", "intermediate", "advanced"]
    const programIndex = levels.indexOf(programLevel)
    const userIndex = levels.indexOf(userLevel)

    // Allow programs at user's level or one level below
    return programIndex <= userIndex
  }

  private static calculateRelevanceScore(program: Program, userProfile: any): number {
    let score = 0

    // Gender match bonus
    if (program.gender === userProfile.gender) score += 10
    else if (program.gender === "unisex") score += 5

    // Experience level exact match bonus
    if (program.difficulty === userProfile.experience) score += 15

    // Goal matches
    const goalMatches = program.goals.filter((goal) => userProfile.goals.includes(goal)).length
    score += goalMatches * 5

    // Equipment matches
    const equipmentMatches = program.equipment.filter((eq) => userProfile.equipment.includes(eq)).length
    score += equipmentMatches * 3

    return score
  }

  static getExerciseById(id: string): Exercise | undefined {
    return EXERCISES.find((exercise) => exercise.id === id)
  }
}
