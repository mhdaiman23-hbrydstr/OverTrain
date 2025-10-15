"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export interface OneRepMaxEntry {
  exerciseName: string
  oneRepMax: number
}

interface OneRmContextValue {
  oneRepMaxes: OneRepMaxEntry[]
  setOneRepMaxes: (entries: OneRepMaxEntry[]) => void
  setOneRepMax: (entry: OneRepMaxEntry) => void
  removeOneRepMax: (exerciseName: string) => void
  getOneRepMax: (exerciseName: string) => OneRepMaxEntry | undefined
  clearOneRepMaxes: () => void
}

const OneRmContext = createContext<OneRmContextValue | undefined>(undefined)

interface OneRmProviderProps {
  children: ReactNode
  initialData?: OneRepMaxEntry[]
}

export const OneRmProvider = ({ children, initialData }: OneRmProviderProps) => {
  const [entries, setEntries] = useState<OneRepMaxEntry[]>(() => initialData ?? [])

  const setOneRepMax = useCallback((entry: OneRepMaxEntry) => {
    setEntries((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.exerciseName.toLowerCase() === entry.exerciseName.toLowerCase()
      )

      if (existingIndex === -1) {
        return [...prev, entry]
      }

      const next = prev.slice()
      next[existingIndex] = entry
      return next
    })
  }, [])

  const removeOneRepMax = useCallback((exerciseName: string) => {
    setEntries((prev) =>
      prev.filter((entry) => entry.exerciseName.toLowerCase() !== exerciseName.toLowerCase())
    )
  }, [])

  const getOneRepMax = useCallback(
    (exerciseName: string) =>
      entries.find((entry) => entry.exerciseName.toLowerCase() === exerciseName.toLowerCase()),
    [entries]
  )

  const clearOneRepMaxes = useCallback(() => {
    setEntries([])
  }, [])

  const value = useMemo<OneRmContextValue>(
    () => ({
      oneRepMaxes: entries,
      setOneRepMaxes: setEntries,
      setOneRepMax,
      removeOneRepMax,
      getOneRepMax,
      clearOneRepMaxes,
    }),
    [entries, setOneRepMax, removeOneRepMax, getOneRepMax, clearOneRepMaxes]
  )

  return <OneRmContext.Provider value={value}>{children}</OneRmContext.Provider>
}

export const useOneRepMaxes = () => {
  const context = useContext(OneRmContext)
  if (!context) {
    throw new Error("useOneRepMaxes must be used within a OneRmProvider")
  }
  const { oneRepMaxes, setOneRepMaxes, setOneRepMax, removeOneRepMax, getOneRepMax, clearOneRepMaxes } = context
  return {
    oneRepMaxes,
    setOneRepMaxes,
    setOneRepMax,
    removeOneRepMax,
    getOneRepMax,
    clearOneRepMaxes,
  }
}
