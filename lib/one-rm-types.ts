export interface OneRepMaxEntry {
  exerciseId: string
  exerciseName: string
  maxWeight: number
  dateTested: number
  estimated?: boolean
}

export const DEFAULT_ONE_RM_EXERCISES: OneRepMaxEntry[] = [
  {
    exerciseId: "squat",
    exerciseName: "Back Squat",
    maxWeight: 0,
    dateTested: Date.now(),
  },
  {
    exerciseId: "bench-press",
    exerciseName: "Bench Press",
    maxWeight: 0,
    dateTested: Date.now(),
  },
  {
    exerciseId: "deadlift",
    exerciseName: "Deadlift",
    maxWeight: 0,
    dateTested: Date.now(),
  },
]
