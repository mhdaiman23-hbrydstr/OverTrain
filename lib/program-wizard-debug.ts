// Program Wizard Debug Utilities
// Provides debugging tools and enhanced error handling for the Program Wizard

export interface DebugState {
  exerciseLoading: {
    isLoading: boolean
    hasLoaded: boolean
    error: string | null
    retryCount: number
    exerciseCount: number
    lastLoadTime: number | null
  }
  swapButtons: {
    totalFound: number
    enabledCount: number
    disabledCount: number
  }
  dropdownState: {
    isOpen: boolean
    targetExercise: string | null
    searchValue: string
    resultCount: number
  }
}

class ProgramWizardDebugger {
  private static instance: ProgramWizardDebugger
  private debugState: DebugState = {
    exerciseLoading: {
      isLoading: false,
      hasLoaded: false,
      error: null,
      retryCount: 0,
      exerciseCount: 0,
      lastLoadTime: null,
    },
    swapButtons: {
      totalFound: 0,
      enabledCount: 0,
      disabledCount: 0,
    },
    dropdownState: {
      isOpen: false,
      targetExercise: null,
      searchValue: '',
      resultCount: 0,
    },
  }

  static getInstance(): ProgramWizardDebugger {
    if (!ProgramWizardDebugger.instance) {
      ProgramWizardDebugger.instance = new ProgramWizardDebugger()
    }
    return ProgramWizardDebugger.instance
  }

  // Exercise loading debug methods
  logExerciseLoadingStart() {
    this.debugState.exerciseLoading.isLoading = true
    this.debugState.exerciseLoading.lastLoadTime = Date.now()
    console.log('[ProgramWizard Debug] Exercise loading started')
  }

  logExerciseLoadingSuccess(exerciseCount: number) {
    this.debugState.exerciseLoading.isLoading = false
    this.debugState.exerciseLoading.hasLoaded = true
    this.debugState.exerciseLoading.error = null
    this.debugState.exerciseLoading.exerciseCount = exerciseCount
    this.debugState.exerciseLoading.retryCount = 0
    
    const loadTime = this.debugState.exerciseLoading.lastLoadTime
      ? Date.now() - this.debugState.exerciseLoading.lastLoadTime
      : 0
    
    console.log(`[ProgramWizard Debug] Exercise loading success: ${exerciseCount} exercises loaded in ${loadTime}ms`)
  }

  logExerciseLoadingError(error: string, retryCount: number) {
    this.debugState.exerciseLoading.isLoading = false
    this.debugState.exerciseLoading.error = error
    this.debugState.exerciseLoading.retryCount = retryCount
    console.error(`[ProgramWizard Debug] Exercise loading failed (attempt ${retryCount + 1}):`, error)
  }

  logExerciseLoadingRetry(delay: number) {
    console.log(`[ProgramWizard Debug] Retrying exercise loading in ${delay}ms`)
  }

  // Swap button debug methods
  analyzeSwapButtons() {
    const buttons = document.querySelectorAll('button[aria-label*="Replace"]')
    const enabled = Array.from(buttons).filter(btn => !(btn as HTMLButtonElement).disabled)
    const disabled = Array.from(buttons).filter(btn => (btn as HTMLButtonElement).disabled)

    this.debugState.swapButtons = {
      totalFound: buttons.length,
      enabledCount: enabled.length,
      disabledCount: disabled.length,
    }

    console.log(`[ProgramWizard Debug] Swap button analysis: ${buttons.length} total, ${enabled.length} enabled, ${disabled.length} disabled`)
    
    if (disabled.length > 0) {
      console.warn('[ProgramWizard Debug] Disabled swap buttons found:', disabled.map(btn => btn.getAttribute('aria-label')))
    }

    return this.debugState.swapButtons
  }

  // Dropdown debug methods
  logDropdownOpen(exerciseName: string) {
    this.debugState.dropdownState.isOpen = true
    this.debugState.dropdownState.targetExercise = exerciseName
    console.log(`[ProgramWizard Debug] Dropdown opened for exercise: ${exerciseName}`)
  }

  logDropdownClose() {
    this.debugState.dropdownState.isOpen = false
    this.debugState.dropdownState.targetExercise = null
    this.debugState.dropdownState.searchValue = ''
    this.debugState.dropdownState.resultCount = 0
    console.log('[ProgramWizard Debug] Dropdown closed')
  }

  logDropdownSearch(searchValue: string, resultCount: number) {
    this.debugState.dropdownState.searchValue = searchValue
    this.debugState.dropdownState.resultCount = resultCount
    console.log(`[ProgramWizard Debug] Dropdown search: "${searchValue}" -> ${resultCount} results`)
  }

  // Randomize debug methods
  logRandomizeAttempt(dayIndex: number, exerciseCount: number, muscleGroups: string[]) {
    console.log(`[ProgramWizard Debug] Randomize attempt: Day ${dayIndex}, ${exerciseCount} exercises, groups: ${muscleGroups.join(', ')}`)
  }

  logRandomizeResult(dayIndex: number, oldCount: number, newCount: number) {
    console.log(`[ProgramWizard Debug] Randomize result: Day ${dayIndex}, ${oldCount} -> ${newCount} exercises`)
    
    if (newCount === 0) {
      console.error('[ProgramWizard Debug] Randomize resulted in zero exercises - this should not happen!')
    }
    
    if (newCount < oldCount) {
      console.warn(`[ProgramWizard Debug] Randomize reduced exercise count from ${oldCount} to ${newCount}`)
    }
  }

  // Performance monitoring
  measurePerformance<T>(operation: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      const end = performance.now()
      console.log(`[ProgramWizard Debug] ${operation}: ${(end - start).toFixed(2)}ms`)
      return result
    } catch (error) {
      const end = performance.now()
      console.error(`[ProgramWizard Debug] ${operation} failed after ${(end - start).toFixed(2)}ms:`, error)
      throw error
    }
  }

  // Get current debug state
  getDebugState(): DebugState {
    return { ...this.debugState }
  }

  // Print comprehensive debug report
  printDebugReport() {
    const state = this.getDebugState()
    
    console.group('[ProgramWizard Debug Report]')
    console.log('Exercise Loading:', state.exerciseLoading)
    console.log('Swap Buttons:', state.swapButtons)
    console.log('Dropdown State:', state.dropdownState)
    console.groupEnd()
  }

  // Reset debug state
  reset() {
    this.debugState = {
      exerciseLoading: {
        isLoading: false,
        hasLoaded: false,
        error: null,
        retryCount: 0,
        exerciseCount: 0,
        lastLoadTime: null,
      },
      swapButtons: {
        totalFound: 0,
        enabledCount: 0,
        disabledCount: 0,
      },
      dropdownState: {
        isOpen: false,
        targetExercise: null,
        searchValue: '',
        resultCount: 0,
      },
    }
    console.log('[ProgramWizard Debug] Debug state reset')
  }
}

// Export singleton instance
export const programWizardDebugger = ProgramWizardDebugger.getInstance()

// Global debug functions for console access
declare global {
  interface Window {
    programWizardDebug: {
      getState: () => DebugState
      printReport: () => void
      analyzeButtons: () => { totalFound: number; enabledCount: number; disabledCount: number }
      reset: () => void
    }
  }
}

// Make debug functions available globally for easy console access
if (typeof window !== 'undefined') {
  window.programWizardDebug = {
    getState: () => programWizardDebugger.getDebugState(),
    printReport: () => programWizardDebugger.printDebugReport(),
    analyzeButtons: () => programWizardDebugger.analyzeSwapButtons(),
    reset: () => programWizardDebugger.reset(),
  }
  
  console.log('[ProgramWizard Debug] Debug tools available at window.programWizardDebug')
}
