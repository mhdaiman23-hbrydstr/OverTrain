import type { ProgramHistoryEntry } from "./program-state"
import { ProgramStateManager } from "./program-state"
import type { WorkoutSession } from "./workout-logger"

export interface HistoricalProgramInfo {
  templateId: string
  instanceId: string
  name: string
  totalWeeks: number
  daysPerWeek: number
}

export function getHistoricalWorkouts(instanceId: string, userId?: string): WorkoutSession[] {
  return ProgramStateManager.getHistoricalProgramWorkouts(instanceId, userId) as WorkoutSession[]
}

export function buildHistoricalProgram(
  entry: ProgramHistoryEntry,
  workouts: WorkoutSession[]
): HistoricalProgramInfo {
  const totalWeeks = Math.max(...workouts.map(w => w.week || 1), 1)
  const daysPerWeek = Math.max(...workouts.map(w => w.day || 1), 3)

  return {
    templateId: entry.templateId,
    instanceId: entry.instanceId || entry.id,
    name: entry.name,
    totalWeeks,
    daysPerWeek,
  }
}

export function getHistoricalProgramData(
  entry: ProgramHistoryEntry,
  userId?: string
): { historicalProgram: HistoricalProgramInfo; historicalWorkouts: WorkoutSession[] } {
  const historicalWorkouts = getHistoricalWorkouts(entry.instanceId || entry.id, userId)
  const historicalProgram = buildHistoricalProgram(entry, historicalWorkouts)
  return { historicalProgram, historicalWorkouts }
}

