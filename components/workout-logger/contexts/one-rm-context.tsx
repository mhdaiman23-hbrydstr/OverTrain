"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

export interface OneRepMaxEntry {
  exerciseId: string
  exerciseName: string
  maxWeight: number
  dateTested: number
  estimated?: boolean
}

interface OneRmContextValue {
  oneRepMaxes: OneRepMaxEntry[]
  setOneRepMaxes: (entries: OneRepMaxEntry[]) => void
  getOneRepMax: (exerciseId: string, fallbackName?: string) => OneRepMaxEntry | undefined
}

const OneRmContext = createContext<OneRmContextValue | undefined>(undefined)

export function OneRmProvider({ children, initialData }: { children: ReactNode; initialData?: OneRepMaxEntry[] }) {
  const [oneRepMaxes, setOneRepMaxes] = useState<OneRepMaxEntry[]>(initialData ?? [])

  const value = useMemo<OneRmContextValue>(() => {
    const lookupByExercise = new Map<string, OneRepMaxEntry>()
    const lookupByName = new Map<string, OneRepMaxEntry>()

    oneRepMaxes
      .slice()
      .sort((a, b) => b.dateTested - a.dateTested)
      .forEach((entry) => {
        if (entry.exerciseId) {
          lookupByExercise.set(entry.exerciseId, entry)
        }
        lookupByName.set(entry.exerciseName.toLowerCase(), entry)
      })

    return {
      oneRepMaxes,
      setOneRepMaxes,
      getOneRepMax: (exerciseId: string, fallbackName?: string) =>
        lookupByExercise.get(exerciseId) ||
        (fallbackName ? lookupByName.get(fallbackName.toLowerCase()) : undefined),
    }
  }, [oneRepMaxes])

  return <OneRmContext.Provider value={value}>{children}</OneRmContext.Provider>
}

export function useOneRepMaxes() {
  const ctx = useContext(OneRmContext)
  if (!ctx) {
    throw new Error("useOneRepMaxes must be used within a OneRmProvider")
  }
  return ctx
}
