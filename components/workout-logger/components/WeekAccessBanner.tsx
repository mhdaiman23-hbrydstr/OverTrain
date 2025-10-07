"use client"

import { Lock } from "lucide-react"

interface WeekAccessBannerProps {
  isBlocked: boolean
  isFullyBlocked: boolean
  message: string
}

export function WeekAccessBanner({ isBlocked, isFullyBlocked, message }: WeekAccessBannerProps) {
  if (!isBlocked) return null

  return (
    <div className={`border-b p-3 text-center ${isFullyBlocked ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-center justify-center gap-2">
        <Lock className={`h-4 w-4 ${isFullyBlocked ? "text-red-600" : "text-blue-600"}`} />
        <p className={`text-sm font-medium ${isFullyBlocked ? "text-red-900" : "text-blue-900"}`}>{message}</p>
      </div>
    </div>
  )
}
