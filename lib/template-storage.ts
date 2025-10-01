"use client"

import type { GymTemplate } from "./gym-templates"

export interface SavedTemplate extends GymTemplate {
  isCustom: boolean
  createdDate: string
  lastModified: string
}

export interface ProgramHistory {
  id: string
  templateId: string
  name: string
  startDate: string
  endDate?: string
  completionRate: number
  totalWorkouts: number
  completedWorkouts: number
  isActive: boolean
}

export class TemplateStorageManager {
  private static SAVED_TEMPLATES_KEY = "liftlog_saved_templates"
  private static PROGRAM_HISTORY_KEY = "liftlog_program_history"
  private static ACTIVE_PROGRAM_KEY = "liftlog_active_program"

  // Saved Templates Management
  static getSavedTemplates(): SavedTemplate[] {
    if (typeof window === "undefined") return []

    try {
      const saved = localStorage.getItem(this.SAVED_TEMPLATES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error("Error loading saved templates:", error)
      return []
    }
  }

  static saveTemplate(template: GymTemplate, customName?: string): SavedTemplate {
    const savedTemplate: SavedTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name: customName || `Custom ${template.name}`,
      isCustom: true,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    }

    const savedTemplates = this.getSavedTemplates()
    savedTemplates.push(savedTemplate)

    localStorage.setItem(this.SAVED_TEMPLATES_KEY, JSON.stringify(savedTemplates))
    return savedTemplate
  }

  static updateSavedTemplate(templateId: string, updates: Partial<SavedTemplate>): boolean {
    const savedTemplates = this.getSavedTemplates()
    const index = savedTemplates.findIndex((t) => t.id === templateId)

    if (index === -1) return false

    savedTemplates[index] = {
      ...savedTemplates[index],
      ...updates,
      lastModified: new Date().toISOString(),
    }

    localStorage.setItem(this.SAVED_TEMPLATES_KEY, JSON.stringify(savedTemplates))
    return true
  }

  static deleteSavedTemplate(templateId: string): boolean {
    const savedTemplates = this.getSavedTemplates()
    const filtered = savedTemplates.filter((t) => t.id !== templateId)

    if (filtered.length === savedTemplates.length) return false

    localStorage.setItem(this.SAVED_TEMPLATES_KEY, JSON.stringify(filtered))
    return true
  }

  // Program History Management
  static getProgramHistory(): ProgramHistory[] {
    if (typeof window === "undefined") return []

    try {
      const history = localStorage.getItem(this.PROGRAM_HISTORY_KEY)
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error("Error loading program history:", error)
      return []
    }
  }

  static startProgram(templateId: string, templateName: string): ProgramHistory {
    // End any currently active program
    this.endActiveProgram()

    const newProgram: ProgramHistory = {
      id: `program-${Date.now()}`,
      templateId,
      name: templateName,
      startDate: new Date().toISOString(),
      completionRate: 0,
      totalWorkouts: 0,
      completedWorkouts: 0,
      isActive: true,
    }

    const history = this.getProgramHistory()
    history.push(newProgram)

    localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))
    localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(newProgram))

    return newProgram
  }

  static updateProgramProgress(programId: string, completedWorkouts: number, totalWorkouts: number): boolean {
    const history = this.getProgramHistory()
    const index = history.findIndex((p) => p.id === programId)

    if (index === -1) return false

    const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

    history[index] = {
      ...history[index],
      completedWorkouts,
      totalWorkouts,
      completionRate,
    }

    localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))

    // Update active program if this is the active one
    if (history[index].isActive) {
      localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(history[index]))
    }

    return true
  }

  static endProgram(programId: string): boolean {
    const history = this.getProgramHistory()
    const index = history.findIndex((p) => p.id === programId)

    if (index === -1) return false

    history[index] = {
      ...history[index],
      endDate: new Date().toISOString(),
      isActive: false,
    }

    localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))

    // Clear active program if this was the active one
    if (history[index].isActive) {
      localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    }

    return true
  }

  static getActiveProgram(): ProgramHistory | null {
    if (typeof window === "undefined") return null

    try {
      const active = localStorage.getItem(this.ACTIVE_PROGRAM_KEY)
      return active ? JSON.parse(active) : null
    } catch (error) {
      console.error("Error loading active program:", error)
      return null
    }
  }

  private static endActiveProgram(): void {
    const activeProgram = this.getActiveProgram()
    if (activeProgram) {
      this.endProgram(activeProgram.id)
    }
  }

  // Utility Methods
  static exportTemplates(): string {
    const savedTemplates = this.getSavedTemplates()
    return JSON.stringify(savedTemplates, null, 2)
  }

  static importTemplates(jsonData: string): boolean {
    try {
      const templates = JSON.parse(jsonData) as SavedTemplate[]

      // Validate the data structure
      if (!Array.isArray(templates)) return false

      const currentTemplates = this.getSavedTemplates()
      const mergedTemplates = [...currentTemplates, ...templates]

      localStorage.setItem(this.SAVED_TEMPLATES_KEY, JSON.stringify(mergedTemplates))
      return true
    } catch (error) {
      console.error("Error importing templates:", error)
      return false
    }
  }

  static clearAllData(): void {
    localStorage.removeItem(this.SAVED_TEMPLATES_KEY)
    localStorage.removeItem(this.PROGRAM_HISTORY_KEY)
    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
  }
}

// Progression tracking utilities
export const calculateWeeklyProgression = (exerciseHistory: any[], progressionRules: any) => {
  if (!exerciseHistory.length) return null

  const lastWorkout = exerciseHistory[exerciseHistory.length - 1]
  const allSetsCompleted = lastWorkout.sets.every((set: any) => set.completed && set.actualReps >= set.targetReps)

  if (allSetsCompleted) {
    return {
      weightIncrease: progressionRules.weightIncrease,
      action: "increase_weight",
      note: `Add ${progressionRules.weightIncrease}lbs next week`,
    }
  } else {
    const failedSets = lastWorkout.sets.filter((set: any) => !set.completed || set.actualReps < set.targetReps).length

    if (failedSets <= 1) {
      return {
        weightIncrease: 0,
        action: "repeat_weight",
        note: "Repeat current weight, focus on form",
      }
    } else {
      return {
        weightIncrease: -Math.round(lastWorkout.weight * 0.1),
        action: "reduce_weight",
        note: "Reduce weight by 10% and rebuild",
      }
    }
  }
}
