"use client"

import { useEffect } from "react"
import { useOneRepMaxes } from "@/components/workout-logger/contexts/one-rm-context"
import { loadOneRepMaxes, saveOneRepMaxes } from "@/lib/one-rm-storage"

export function useOneRmPersistence(userId?: string) {
  const { oneRepMaxes, setOneRepMaxes } = useOneRepMaxes()

  useEffect(() => {
    const entries = loadOneRepMaxes()
    if (entries.length > 0) {
      setOneRepMaxes(entries)
    }
  }, [setOneRepMaxes])

  useEffect(() => {
    saveOneRepMaxes(oneRepMaxes)
  }, [oneRepMaxes])

  // TODO: integrate with Supabase when backend ready
  useEffect(() => {
    if (!userId) return
    // loadOneRepMaxesFromDatabase(userId).then((entries) => {
    //   if (entries.length > 0) {
    //     setOneRepMaxes(entries)
    //   }
    // })
  }, [userId, setOneRepMaxes])
}
