import { supabase } from "./supabase"
import { WorkoutLogger } from "./workout-logger"
import { ProgramStateManager } from "./program-state"

export class DevDataRecovery {
  private static readonly isDevelopment = process.env.NODE_ENV === "development"

  /**
   * Detects if localStorage is empty but user should have data (port change scenario)
   */
  static async detectPortChangeScenario(userId: string): Promise<boolean> {
    if (!this.isDevelopment || !userId) return false

    try {
      console.log("[DevDataRecovery] Checking for port change scenario...")

      // Check if localStorage is empty for workout data
      const storageKeys = WorkoutLogger.getUserStorageKeys(userId)
      const hasLocalWorkoutData = !!localStorage.getItem(storageKeys.workouts)
      const hasLocalInProgressData = !!localStorage.getItem(storageKeys.inProgress)
      const hasLocalProgramData = !!localStorage.getItem("liftlog_active_program")

      console.log("[DevDataRecovery] Local storage status:", {
        hasLocalWorkoutData,
        hasLocalInProgressData,
        hasLocalProgramData,
        userId
      })

      // If localStorage is empty, check if user has data in Supabase
      if (!hasLocalWorkoutData && !hasLocalInProgressData && !hasLocalProgramData) {
        const hasDatabaseData = await this.checkForDatabaseData(userId)
        console.log("[DevDataRecovery] Database has data:", hasDatabaseData)
        return hasDatabaseData
      }

      return false
    } catch (error) {
      console.error("[DevDataRecovery] Error detecting port change:", error)
      return false
    }
  }

  /**
   * Checks if user has data in Supabase database
   */
  private static async checkForDatabaseData(userId: string): Promise<boolean> {
    if (!supabase) {
      console.log("[DevDataRecovery] Supabase not configured")
      return false
    }

    try {
      // Check for workout data
      const { data: workouts, error: workoutsError } = await supabase
        .from("workouts")
        .select("count")
        .eq("user_id", userId)
        .limit(1)

      if (workoutsError) {
        console.error("[DevDataRecovery] Error checking workouts:", workoutsError)
        return false
      }

      // Check for active program data
      const { data: programs, error: programsError } = await supabase
        .from("active_programs")
        .select("count")
        .eq("user_id", userId)
        .limit(1)

      if (programsError) {
        console.error("[DevDataRecovery] Error checking programs:", programsError)
        return false
      }

      const hasWorkouts = workouts && workouts.length > 0
      const hasPrograms = programs && programs.length > 0

      console.log("[DevDataRecovery] Database data found:", {
        hasWorkouts,
        hasPrograms,
        workoutsCount: workouts?.length || 0,
        programsCount: programs?.length || 0
      })

      return hasWorkouts || hasPrograms
    } catch (error) {
      console.error("[DevDataRecovery] Error checking database data:", error)
      return false
    }
  }

  /**
   * Recovers all user data from Supabase
   */
  static async recoverUserData(userId: string): Promise<boolean> {
    if (!this.isDevelopment || !userId) {
      console.log("[DevDataRecovery] Skipping recovery - not in development or no user ID")
      return false
    }

    try {
      console.log("[DevDataRecovery] Starting data recovery for user:", userId)

      // Load workout data
      await WorkoutLogger.loadFromDatabase(userId, true)
      console.log("[DevDataRecovery] Workout data loaded")

      // Load program state
      await ProgramStateManager.loadFromDatabase(userId)
      console.log("[DevDataRecovery] Program state loaded")

      // Verify recovery worked
      const storageKeys = WorkoutLogger.getUserStorageKeys(userId)
      const hasLocalWorkoutData = !!localStorage.getItem(storageKeys.workouts)
      const hasLocalProgramData = !!localStorage.getItem("liftlog_active_program")

      const recoverySuccessful = hasLocalWorkoutData || hasLocalProgramData
      console.log("[DevDataRecovery] Recovery status:", {
        successful: recoverySuccessful,
        hasWorkoutData: hasLocalWorkoutData,
        hasProgramData: hasLocalProgramData
      })

      return recoverySuccessful
    } catch (error) {
      console.error("[DevDataRecovery] Error during data recovery:", error)
      return false
    }
  }

  /**
   * Clears localStorage completely (useful for testing)
   */
  static clearAllUserData(userId: string): void {
    if (!this.isDevelopment) return

    try {
      console.log("[DevDataRecovery] Clearing all user data for testing")

      const storageKeys = WorkoutLogger.getUserStorageKeys(userId)
      localStorage.removeItem(storageKeys.workouts)
      localStorage.removeItem(storageKeys.inProgress)
      localStorage.removeItem("liftlog_active_program")
      localStorage.removeItem("liftlog_user")
      localStorage.removeItem("liftlog_program_history")

      console.log("[DevDataRecovery] All user data cleared")
    } catch (error) {
      console.error("[DevDataRecovery] Error clearing data:", error)
    }
  }

  /**
   * Gets recovery statistics for debugging
   */
  static async getRecoveryStats(userId: string): Promise<void> {
    if (!this.isDevelopment || !userId) return

    try {
      console.log("[DevDataRecovery] === Recovery Statistics ===")

      const storageKeys = WorkoutLogger.getUserStorageKeys(userId)
      const localWorkouts = localStorage.getItem(storageKeys.workouts)
      const localProgram = localStorage.getItem("liftlog_active_program")

      console.log("[DevDataRecovery] Local storage:")
      console.log(`  Workouts data: ${localWorkouts ? 'Present (' + localWorkouts.length + ' chars)' : 'Missing'}`)
      console.log(`  Program data: ${localProgram ? 'Present (' + localProgram.length + ' chars)' : 'Missing'}`)

      if (supabase) {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id, workout_name, week, day, completed")
          .eq("user_id", userId)
          .limit(5)

        const { data: programs } = await supabase
          .from("active_programs")
          .select("template_id, current_week, current_day")
          .eq("user_id", userId)
          .limit(1)

        console.log("[DevDataRecovery] Database:")
        console.log(`  Recent workouts: ${workouts?.length || 0}`)
        console.log(`  Active programs: ${programs?.length || 0}`)

        if (workouts && workouts.length > 0) {
          console.log("  Recent workout details:", workouts)
        }
        if (programs && programs.length > 0) {
          console.log("  Active program details:", programs[0])
        }
      }

      console.log("[DevDataRecovery] === End Recovery Statistics ===")
    } catch (error) {
      console.error("[DevDataRecovery] Error getting stats:", error)
    }
  }
}

// Attach to window for development debugging
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).DevDataRecovery = DevDataRecovery
  console.log("[DevDataRecovery] Development tools available at window.DevDataRecovery")
}