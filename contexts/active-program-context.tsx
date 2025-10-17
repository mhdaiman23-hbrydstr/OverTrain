"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { ProgramStateManager, type ActiveProgram } from "@/lib/program-state"

interface ActiveProgramContextType {
  activeProgram: ActiveProgram | null
  isLoading: boolean
  refresh: () => Promise<void>
}

const ActiveProgramContext = createContext<ActiveProgramContextType | undefined>(undefined)

export function ActiveProgramProvider({ children }: { children: ReactNode }) {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      const program = await ProgramStateManager.getActiveProgram({ refreshTemplate: true })
      setActiveProgram(program)
    } catch (error) {
      console.error("[ActiveProgramContext] Failed to load active program:", error)
      setActiveProgram(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    refresh()

    // Listen for program changes
    const handleProgramChanged = () => {
      console.log("[ActiveProgramContext] Program changed, refreshing...")
      refresh()
    }

    const handleProgramEnded = () => {
      console.log("[ActiveProgramContext] Program ended, clearing state...")
      setActiveProgram(null)
      setIsLoading(false)
    }

    window.addEventListener("programChanged", handleProgramChanged)
    window.addEventListener("programEnded", handleProgramEnded)

    return () => {
      window.removeEventListener("programChanged", handleProgramChanged)
      window.removeEventListener("programEnded", handleProgramEnded)
    }
  }, [refresh])

  const value = useMemo(
    () => ({ activeProgram, isLoading, refresh }),
    [activeProgram, isLoading, refresh]
  )

  return <ActiveProgramContext.Provider value={value}>{children}</ActiveProgramContext.Provider>
}

export function useActiveProgram() {
  const context = useContext(ActiveProgramContext)
  if (context === undefined) {
    throw new Error("useActiveProgram must be used within an ActiveProgramProvider")
  }
  return context
}
