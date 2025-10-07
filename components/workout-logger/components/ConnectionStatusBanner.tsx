"use client"

import { WifiOff, Loader2, XCircle } from "lucide-react"
import { ConnectionStatus } from "@/components/workout-logger/hooks/use-connection-status"

interface ConnectionStatusBannerProps {
  status: ConnectionStatus
}

export function ConnectionStatusBanner({ status }: ConnectionStatusBannerProps) {
  if (status === "offline") {
    return (
      <div className="bg-red-50 border-b border-red-200 p-2 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-red-900">
          <WifiOff className="h-4 w-4" />
          <span className="font-medium">Offline - Reconnect to log sets</span>
        </div>
      </div>
    )
  }

  if (status === "syncing") {
    return (
      <div className="bg-blue-50 border-b border-blue-200 p-2 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-blue-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-medium">Logging set...</span>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="bg-orange-50 border-b border-orange-200 p-2 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-orange-900">
          <XCircle className="h-4 w-4" />
          <span className="font-medium">Sync error - Please try again</span>
        </div>
      </div>
    )
  }

  return null
}
