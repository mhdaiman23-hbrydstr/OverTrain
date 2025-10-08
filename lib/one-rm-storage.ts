import { OneRepMaxEntry } from "@/components/workout-logger/contexts/one-rm-context"

const STORAGE_KEY = "liftlog_one_rep_maxes"

export function loadOneRepMaxes(): OneRepMaxEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (entry) =>
          typeof entry.exerciseId === "string" &&
          typeof entry.exerciseName === "string" &&
          typeof entry.maxWeight === "number" &&
          typeof entry.dateTested === "number",
      )
    }
  } catch (error) {
    console.error("[OneRM] Failed to load entries from storage:", error)
  }
  return []
}

export function saveOneRepMaxes(entries: OneRepMaxEntry[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error("[OneRM] Failed to save entries to storage:", error)
  }
}

export async function syncOneRepMaxesToDatabase(_entries: OneRepMaxEntry[], _userId?: string) {
  // TODO: integrate with Supabase once schema is ready
  return
}

export async function loadOneRepMaxesFromDatabase(_userId: string): Promise<OneRepMaxEntry[]> {
  // TODO: fetch from Supabase once schema is ready
  return []
}
