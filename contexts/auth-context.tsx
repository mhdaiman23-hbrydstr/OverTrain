"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type User, type AuthState, AuthService } from "@/lib/auth"

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => void
  updateUser: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  })
  const [dataLoaded, setDataLoaded] = useState(false) // Prevent multiple data loading attempts

  useEffect(() => {
    // Check for OAuth callback first
    const checkOAuthCallback = async () => {
      const oauthUser = await AuthService.handleOAuthCallback()
      if (oauthUser) {
        setState({ user: oauthUser, isLoading: false })
        // Load user data from database with comprehensive loading (only if not already loaded)
        if (oauthUser.id && !dataLoaded) {
          await loadUserApplicationData(oauthUser.id)
          setDataLoaded(true)
          // Start periodic sync
          startPeriodicSync(oauthUser.id)
        }
      } else {
        const localUser = AuthService.getUser()
        setState({ user: localUser, isLoading: false })
        // Load user data from database if user exists (only if not already loaded)
        if (localUser && localUser.id && !dataLoaded) {
          await loadUserApplicationData(localUser.id)
          setDataLoaded(true)
          // Start periodic sync
          startPeriodicSync(localUser.id)
        }
      }
    }

    checkOAuthCallback()
  }, [])

  // Comprehensive user data loading
  const loadUserApplicationData = async (userId: string) => {
    console.log('[Auth] Loading comprehensive user application data for:', userId)

    try {
      // Emit loading status events
      const emitStatus = (status: string) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dataLoadingStatus', { detail: { status } }))
        }
      }

      emitStatus('Loading your workout data...')

      // Step 1: Check for port change scenario in development
      if (process.env.NODE_ENV === "development") {
        emitStatus('Checking for data recovery...')
        console.log('[Auth] Development mode: checking for port change scenario')

        // Import DevDataRecovery dynamically
        const { DevDataRecovery } = await import('@/lib/dev-data-recovery')

        // Get recovery statistics for debugging
        await DevDataRecovery.getRecoveryStats(userId)

        const isPortChangeScenario = await DevDataRecovery.detectPortChangeScenario(userId)
        if (isPortChangeScenario) {
          emitStatus('Recovering data from database...')
          console.log('[Auth] Port change detected, initiating recovery')
          const recoverySuccessful = await DevDataRecovery.recoverUserData(userId)
          if (recoverySuccessful) {
            emitStatus('Data recovered successfully!')
            console.log('[Auth] Data recovery completed successfully')
          } else {
            emitStatus('Recovery failed, trying normal loading...')
            console.log('[Auth] Data recovery failed, proceeding with normal loading')
          }
        }
      }

      // Step 2: Load user data from database with smart loading strategy (with error handling)
      try {
        await AuthService.loadUserData(userId, false) // Preserve local data if it exists
      } catch (error) {
        console.warn('[Auth] Database sync failed, continuing with local data:', error)
        emitStatus('Database sync failed, using local data...')
      }

      // Step 3: Check if we have local data, try to load from database if empty
      const { WorkoutLogger } = await import('@/lib/workout-logger')
      const storageKeys = WorkoutLogger.getUserStorageKeys(userId)
      const hasLocalWorkouts = localStorage.getItem(storageKeys.workouts)
      const hasLocalProgress = localStorage.getItem(storageKeys.inProgress)
      const hasActiveProgram = localStorage.getItem("liftlog_active_program")

      const hasLocalData = hasLocalWorkouts || hasLocalProgress || hasActiveProgram

      if (!hasLocalData) {
        emitStatus('Loading workout history from database...')
        console.log('[Auth] No local data found, attempting database load')
        try {
          await AuthService.loadUserData(userId, true) // Force refresh from database
        } catch (error) {
          console.warn('[Auth] Database load failed, will create fresh data:', error)
          emitStatus('Starting with fresh workout data...')
        }
      }

      // Step 4: Ensure data integrity and run cleanup
      emitStatus('Validating workout data...')
      WorkoutLogger.migrateGlobalToUserSpecific(userId)
      WorkoutLogger.migrateCompletedWorkoutsToHistory(userId)
      WorkoutLogger.cleanupSkippedWorkoutsFromHistory(userId) // Remove old skipped workouts
      WorkoutLogger.cleanupCorruptedWorkouts(userId)
      WorkoutLogger.validateAndRepairWorkoutIntegrity(userId)

      // Step 5: Load program state and recalculate if needed
      emitStatus('Loading active programs...')
      const { ProgramStateManager } = await import('@/lib/program-state')
      await ProgramStateManager.recalculateProgress()

      // Step 6: Trigger global update to refresh all components
      if (typeof window !== 'undefined') {
        console.log('[Auth] Dispatching programChanged event to refresh UI')
        window.dispatchEvent(new Event("programChanged"))
      }

      emitStatus('Ready!')

      // Clear the loading status after a short delay
      setTimeout(() => {
        emitStatus('')
        console.log('[Auth] All data loading completed successfully')
      }, 1000)

      console.log('[Auth] User application data loaded successfully')
    } catch (error) {
      console.error('[Auth] Failed to load user application data:', error)
      // Even if loading fails, trigger UI refresh with whatever local data exists
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dataLoadingStatus', { detail: { status: 'Ready!' } }))
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('dataLoadingStatus', { detail: { status: '' } }))
        }, 500)
        window.dispatchEvent(new Event("programChanged"))
      }
    }
  }

  // Cleanup periodic sync when user changes or signs out
  useEffect(() => {
    return () => {
      // Clear any ongoing intervals when component unmounts
      if (typeof window !== 'undefined') {
        // Clear all intervals (simpler approach)
        const maxIntervalId = setTimeout(() => {}, 0)
        for (let i = 1; i < maxIntervalId; i++) {
          clearInterval(i)
        }
      }
    }
  }, [])

  // Periodic sync for fresh data
  const startPeriodicSync = (userId: string) => {
    // Wait a bit before starting periodic sync to avoid interfering with initial data loading
    setTimeout(() => {
      // Sync every 2 minutes to keep data fresh (reduced frequency)
      const syncInterval = setInterval(async () => {
        try {
          const { WorkoutLogger } = await import('@/lib/workout-logger')
          await WorkoutLogger.periodicSync(userId)
        } catch (error) {
          console.error('[Auth] Periodic sync failed:', error)
        }
      }, 120000) // 2 minutes

      // Clear interval on unmount
      return () => clearInterval(syncInterval)
    }, 10000) // Start after 10 seconds
  }

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const user = await AuthService.signIn(email, password)
      setState({ user, isLoading: false })

      // Load comprehensive user data (only if not already loaded)
      if (user && user.id && !dataLoaded) {
        await loadUserApplicationData(user.id)
        setDataLoaded(true)
        // Start periodic sync
        startPeriodicSync(user.id)
      }
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const user = await AuthService.signUp(email, password)
      setState({ user, isLoading: false })
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const signInWithGoogle = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      await AuthService.signInWithGoogle()
      // User will be redirected to Google, then back
      // The OAuth callback will handle setting the user state
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const signOut = () => {
    AuthService.signOut()
    setState({ user: null, isLoading: false })
    setDataLoaded(false) // Reset data loaded flag for next login
  }

  const updateUser = async (updates: Partial<User>) => {
    if (!state.user) return

    try {
      await AuthService.updateProfile(state.user.id, updates)
      const { isAdmin: _ignoredAdminFlag, ...safeUpdates } = updates
      const updatedUser = { ...state.user, ...safeUpdates }
      setState((prev) => ({ ...prev, user: updatedUser }))
    } catch (error) {
      console.error('Failed to update user:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
