import type { WorkoutSession } from "./workout-logger"

export interface ProgressMetrics {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutDuration: number
  strengthGains: { [exerciseId: string]: number }
  weeklyProgress: { week: string; workouts: number; volume: number }[]
  exerciseProgress: { [exerciseId: string]: { date: string; maxWeight: number; totalReps: number }[] }
}

export interface ExerciseStats {
  exerciseId: string
  exerciseName: string
  totalSets: number
  totalReps: number
  maxWeight: number
  averageWeight: number
  lastPerformed: string
  progressTrend: "up" | "down" | "stable"
  frequency: number // times per month
  bestSet: { weight: number; reps: number; date: string }
}

export interface TrainingLoadData {
  date: string
  load: number // volume × RPE
  volume: number
  avgRPE: number
}

export interface ACWRData {
  acuteLoad: number // 7-day average
  chronicLoad: number // 28-day average
  ratio: number
  zone: "safe" | "caution" | "high-risk"
  recommendation: string
}

export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  weight: number
  reps: number
  date: string
  type: "weight" | "reps" | "volume"
}

export interface HeatmapData {
  date: string
  value: number // workout count or volume
  intensity: "low" | "medium" | "high"
}

export interface SmartInsight {
  id: string
  type: "deload" | "progression" | "consistency" | "recovery"
  title: string
  description: string
  actionText: string
  priority: "high" | "medium" | "low"
  actionable: boolean
}

export interface AdvancedAnalytics {
  trainingLoad: TrainingLoadData[]
  acwr: ACWRData
  personalRecords: PersonalRecord[]
  heatmap: HeatmapData[]
  insights: SmartInsight[]
  consistencyScore: number
  topExercises: ExerciseStats[]
}

export class AnalyticsEngine {
  static calculateProgressMetrics(workouts: WorkoutSession[]): ProgressMetrics {
    const completedWorkouts = workouts.filter((w) => w.completed)

    if (completedWorkouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalVolume: 0,
        averageWorkoutDuration: 0,
        strengthGains: {},
        weeklyProgress: [],
        exerciseProgress: {},
      }
    }

    const totalWorkouts = completedWorkouts.length
    const totalVolume = this.calculateTotalVolume(completedWorkouts)
    const averageWorkoutDuration = this.calculateAverageWorkoutDuration(completedWorkouts)
    const strengthGains = this.calculateStrengthGains(completedWorkouts)
    const weeklyProgress = this.calculateWeeklyProgress(completedWorkouts)
    const exerciseProgress = this.calculateExerciseProgress(completedWorkouts)

    return {
      totalWorkouts,
      totalVolume,
      averageWorkoutDuration,
      strengthGains,
      weeklyProgress,
      exerciseProgress,
    }
  }

  static getExerciseStats(workouts: WorkoutSession[]): ExerciseStats[] {
    const completedWorkouts = workouts.filter((w) => w.completed)
    const exerciseMap = new Map<
      string,
      {
        exerciseName: string
        sets: { weight: number; reps: number; date: string }[]
      }
    >()

    // Collect all exercise data
    completedWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!exerciseMap.has(exercise.exerciseId)) {
          exerciseMap.set(exercise.exerciseId, {
            exerciseName: exercise.exerciseName,
            sets: [],
          })
        }

        const exerciseData = exerciseMap.get(exercise.exerciseId)!
        exercise.sets.forEach((set) => {
          if (set.completed && set.weight > 0 && set.reps > 0) {
            exerciseData.sets.push({
              weight: set.weight,
              reps: set.reps,
              date: new Date(workout.startTime).toISOString().split("T")[0],
            })
          }
        })
      })
    })

    // Calculate stats for each exercise
    return Array.from(exerciseMap.entries())
      .map(([exerciseId, data]) => {
        const sets = data.sets
        if (sets.length === 0) {
          return {
            exerciseId,
            exerciseName: data.exerciseName,
            totalSets: 0,
            totalReps: 0,
            maxWeight: 0,
            averageWeight: 0,
            lastPerformed: "",
            progressTrend: "stable" as const,
            frequency: 0,
            bestSet: { weight: 0, reps: 0, date: "" },
          }
        }

        const totalSets = sets.length
        const totalReps = sets.reduce((sum, set) => sum + set.reps, 0)
        const maxWeight = Math.max(...sets.map((set) => set.weight))
        const averageWeight = sets.reduce((sum, set) => sum + set.weight, 0) / sets.length
        const lastPerformed = sets[sets.length - 1].date
        const progressTrend = this.calculateProgressTrend(sets)
        
        // Calculate frequency (times per month)
        const uniqueDays = new Set(sets.map(s => s.date.split('-').slice(0, 2).join('-'))).size
        const frequency = Math.round((uniqueDays / Math.max(1, sets.length / 30)) * 10) / 10
        
        // Find best set (highest volume)
        const bestSet = sets.reduce((best, current) => {
          const currentVolume = current.weight * current.reps
          const bestVolume = best.weight * best.reps
          return currentVolume > bestVolume ? current : best
        })

        return {
          exerciseId,
          exerciseName: data.exerciseName,
          totalSets,
          totalReps,
          maxWeight,
          averageWeight: Math.round(averageWeight * 10) / 10,
          lastPerformed,
          progressTrend,
          frequency,
          bestSet,
        }
      })
      .sort((a, b) => b.totalSets - a.totalSets)
  }

  static calculateAdvancedAnalytics(workouts: WorkoutSession[]): AdvancedAnalytics {
    const completedWorkouts = workouts.filter((w) => w.completed)
    
    if (completedWorkouts.length === 0) {
      return {
        trainingLoad: [],
        acwr: { acuteLoad: 0, chronicLoad: 0, ratio: 0, zone: "safe", recommendation: "No data available" },
        personalRecords: [],
        heatmap: [],
        insights: [],
        consistencyScore: 0,
        topExercises: [],
      }
    }

    const trainingLoad = this.calculateTrainingLoad(completedWorkouts)
    const acwr = this.calculateACWR(trainingLoad)
    const personalRecords = this.calculatePersonalRecords(completedWorkouts)
    const heatmap = this.calculateHeatmap(completedWorkouts)
    const insights = this.generateSmartInsights(completedWorkouts, acwr)
    const consistencyScore = this.calculateConsistencyScore(completedWorkouts)
    const topExercises = this.getExerciseStats(workouts).slice(0, 6)

    return {
      trainingLoad,
      acwr,
      personalRecords,
      heatmap,
      insights,
      consistencyScore,
      topExercises,
    }
  }

  private static calculateTrainingLoad(workouts: WorkoutSession[]): TrainingLoadData[] {
    const dailyLoad = new Map<string, { volume: number; totalRPE: number; setCount: number }>()

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime).toISOString().split("T")[0]
      let volume = 0
      let totalRPE = 0
      let setCount = 0

      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed) {
            volume += set.weight * set.reps
            // Use default RPE of 7 since it's not stored in WorkoutSet
            totalRPE += 7
            setCount++
          }
        })
      })

      const avgRPE = setCount > 0 ? totalRPE / setCount : 7
      const load = volume * (avgRPE / 10) // Normalized load

      if (!dailyLoad.has(date)) {
        dailyLoad.set(date, { volume: 0, totalRPE: 0, setCount: 0 })
      }

      const existing = dailyLoad.get(date)!
      existing.volume += volume
      existing.totalRPE += totalRPE
      existing.setCount += setCount
    })

    return Array.from(dailyLoad.entries())
      .map(([date, data]) => ({
        date,
        load: data.volume * (data.setCount > 0 ? (data.totalRPE / data.setCount) / 10 : 0.7),
        volume: data.volume,
        avgRPE: data.setCount > 0 ? Math.round((data.totalRPE / data.setCount) * 10) / 10 : 7,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Last 30 days
  }

  private static calculateACWR(trainingLoad: TrainingLoadData[]): ACWRData {
    if (trainingLoad.length < 7) {
      return {
        acuteLoad: 0,
        chronicLoad: 0,
        ratio: 0,
        zone: "safe",
        recommendation: "Need more data to calculate ACWR",
      }
    }

    const recent7Days = trainingLoad.slice(-7)
    const recent28Days = trainingLoad.slice(-28)

    const acuteLoad = recent7Days.reduce((sum, day) => sum + day.load, 0) / 7
    const chronicLoad = recent28Days.length > 0 ? recent28Days.reduce((sum, day) => sum + day.load, 0) / 28 : acuteLoad

    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0

    let zone: "safe" | "caution" | "high-risk"
    let recommendation: string

    if (ratio < 0.8) {
      zone = "safe"
      recommendation = "Training load is well-managed. Continue current progression."
    } else if (ratio < 1.3) {
      zone = "caution"
      recommendation = "Approaching high training load. Consider lighter session this week."
    } else {
      zone = "high-risk"
      recommendation = "High training load detected. Recommend deload week for recovery."
    }

    return {
      acuteLoad: Math.round(acuteLoad),
      chronicLoad: Math.round(chronicLoad),
      ratio: Math.round(ratio * 100) / 100,
      zone,
      recommendation,
    }
  }

  private static calculatePersonalRecords(workouts: WorkoutSession[]): PersonalRecord[] {
    const exerciseRecords = new Map<string, { name: string; weight: number; reps: number; date: string }>()

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime).toISOString().split("T")[0]

      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed) {
            const key = exercise.exerciseId

            if (!exerciseRecords.has(key)) {
              exerciseRecords.set(key, { name: exercise.exerciseName || exercise.exerciseId || "Unknown", weight: 0, reps: 0, date: "" })
            }

            const current = exerciseRecords.get(key)!

            // Check for weight PR
            if (set.weight > current.weight) {
              current.weight = set.weight
              current.reps = set.reps
              current.date = date
            }
          }
        })
      })
    })

    return Array.from(exerciseRecords.entries())
      .map(([exerciseId, record]) => ({
        exerciseId,
        exerciseName: record.name,
        weight: record.weight,
        reps: record.reps,
        date: record.date,
        type: "weight" as const,
      }))
      .filter(pr => pr.weight > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
  }

  private static calculateHeatmap(workouts: WorkoutSession[]): HeatmapData[] {
    const dailyData = new Map<string, number>()

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime).toISOString().split("T")[0]
      dailyData.set(date, (dailyData.get(date) || 0) + 1)
    })

    return Array.from(dailyData.entries()).map(([date, value]) => {
      let intensity: "low" | "medium" | "high"
      if (value === 1) intensity = "low"
      else if (value === 2) intensity = "medium"
      else intensity = "high"

      return { date, value, intensity }
    })
  }

  private static generateSmartInsights(workouts: WorkoutSession[], acwr: ACWRData): SmartInsight[] {
    const insights: SmartInsight[] = []

    // ACWR-based insights
    if (acwr.zone === "high-risk") {
      insights.push({
        id: "deload-recommendation",
        type: "deload",
        title: "Deload Recommended",
        description: "Your training load is in the high-risk zone. A deload week will help prevent overtraining.",
        actionText: "Schedule Deload Week",
        priority: "high",
        actionable: true,
      })
    }

    // Consistency insights
    const recentWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.startTime)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      return workoutDate > twoWeeksAgo
    })

    if (recentWorkouts.length < 3) {
      insights.push({
        id: "consistency-reminder",
        type: "consistency",
        title: "Build Consistency",
        description: "You've had fewer than 3 workouts in the past 2 weeks. Consistency is key to progress.",
        actionText: "Schedule Next Workout",
        priority: "medium",
        actionable: true,
      })
    }

    // Progression insights
    const exerciseStats = this.getExerciseStats(workouts)
    const stagnantExercises = exerciseStats.filter(ex => ex.progressTrend === "stable" && ex.totalSets > 10)

    if (stagnantExercises.length > 0) {
      insights.push({
        id: "progression-opportunity",
        type: "progression",
        title: "Time to Progress",
        description: `Consider increasing weight or reps on ${stagnantExercises[0].exerciseName} to break through plateau.`,
        actionText: "View Exercise Details",
        priority: "medium",
        actionable: true,
      })
    }

    return insights
  }

  private static calculateConsistencyScore(workouts: WorkoutSession[]): number {
    if (workouts.length === 0) return 0

    const last30Days = workouts.filter(w => {
      const workoutDate = new Date(w.startTime)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return workoutDate > thirtyDaysAgo
    })

    const uniqueDays = new Set(last30Days.map(w => 
      new Date(w.startTime).toISOString().split("T")[0]
    )).size

    return Math.round((uniqueDays / 30) * 100)
  }

  private static calculateTotalVolume(workouts: WorkoutSession[]): number {
    return workouts.reduce((total, workout) => {
      return (
        total +
        workout.exercises.reduce((exerciseTotal, exercise) => {
          return (
            exerciseTotal +
            exercise.sets.reduce((setTotal, set) => {
              return set.completed ? setTotal + set.weight * set.reps : setTotal
            }, 0)
          )
        }, 0)
      )
    }, 0)
  }

  private static calculateAverageWorkoutDuration(workouts: WorkoutSession[]): number {
    const durations = workouts.filter((w) => w.endTime).map((w) => (w.endTime! - w.startTime) / (1000 * 60)) // Convert to minutes

    return durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0
  }

  private static calculateStrengthGains(workouts: WorkoutSession[]): { [exerciseId: string]: number } {
    const exerciseData = new Map<string, number[]>()

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const maxWeight = Math.max(...exercise.sets.filter((s) => s.completed).map((s) => s.weight))
        if (maxWeight > 0) {
          if (!exerciseData.has(exercise.exerciseId)) {
            exerciseData.set(exercise.exerciseId, [])
          }
          exerciseData.get(exercise.exerciseId)!.push(maxWeight)
        }
      })
    })

    const gains: { [exerciseId: string]: number } = {}
    exerciseData.forEach((weights, exerciseId) => {
      if (weights.length >= 2) {
        const firstWeight = weights[0]
        const lastWeight = weights[weights.length - 1]
        gains[exerciseId] = firstWeight > 0 ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) : 0
      }
    })

    return gains
  }

  private static calculateWeeklyProgress(
    workouts: WorkoutSession[],
  ): { week: string; workouts: number; volume: number }[] {
    const weeklyData = new Map<string, { workouts: number; volume: number }>()

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime)
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
      const weekKey = weekStart.toISOString().split("T")[0]

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { workouts: 0, volume: 0 })
      }

      const weekData = weeklyData.get(weekKey)!
      weekData.workouts += 1
      weekData.volume += workout.exercises.reduce((total, exercise) => {
        return (
          total +
          exercise.sets.reduce((setTotal, set) => {
            return set.completed ? setTotal + set.weight * set.reps : setTotal
          }, 0)
        )
      }, 0)
    })

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8) // Last 8 weeks
  }

  private static calculateExerciseProgress(workouts: WorkoutSession[]): {
    [exerciseId: string]: { date: string; maxWeight: number; totalReps: number }[]
  } {
    const exerciseProgress: { [exerciseId: string]: { date: string; maxWeight: number; totalReps: number }[] } = {}

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime).toISOString().split("T")[0]

      workout.exercises.forEach((exercise) => {
        if (!exerciseProgress[exercise.exerciseId]) {
          exerciseProgress[exercise.exerciseId] = []
        }

        const completedSets = exercise.sets.filter((s) => s.completed)
        if (completedSets.length > 0) {
          const maxWeight = Math.max(...completedSets.map((s) => s.weight))
          const totalReps = completedSets.reduce((sum, s) => sum + s.reps, 0)

          exerciseProgress[exercise.exerciseId].push({
            date,
            maxWeight,
            totalReps,
          })
        }
      })
    })

    return exerciseProgress
  }

  private static calculateProgressTrend(
    sets: { weight: number; reps: number; date: string }[],
  ): "up" | "down" | "stable" {
    if (sets.length < 3) return "stable"

    const recent = sets.slice(-3)
    const older = sets.slice(-6, -3)

    if (older.length === 0) return "stable"

    const recentAvg = recent.reduce((sum, set) => sum + set.weight, 0) / recent.length
    const olderAvg = older.reduce((sum, set) => sum + set.weight, 0) / older.length

    const change = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0

    if (change > 0.05) return "up"
    if (change < -0.05) return "down"
    return "stable"
  }
}
