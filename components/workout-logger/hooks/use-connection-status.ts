"use client"

import { useEffect, useState } from "react"
import { ConnectionMonitor, type ConnectionStatus } from "@/lib/connection-monitor"

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("online")

  useEffect(() => {
    ConnectionMonitor.initialize()

    const unsubscribe = ConnectionMonitor.subscribe((nextStatus) => {
      setStatus(nextStatus)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return status
}
