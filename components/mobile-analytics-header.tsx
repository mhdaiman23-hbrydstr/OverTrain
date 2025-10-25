"use client"

import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileAnalyticsHeaderProps {
  selectedPeriod: string
  onPeriodChange: (period: string) => void
}

const periods = [
  { value: "7d", label: "7d" },
  { value: "28d", label: "28d" },
  { value: "90d", label: "90d" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
]

export function MobileAnalyticsHeader({ selectedPeriod, onPeriodChange }: MobileAnalyticsHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm dark:bg-background/95">
      <div className="text-center space-y-1 px-4 py-3 relative z-10">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground dark:text-foreground light:text-slate-900">Analytics</h1>
        </div>
        <p className="text-xs text-muted-foreground dark:text-muted-foreground light:text-slate-600">Track your fitness progress</p>
      </div>

      <div className="flex justify-center px-4 pb-3">
        <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/70 p-1">
          {periods.map((period) => {
            const isSelected = selectedPeriod === period.value
            return (
              <button
                key={period.value}
                onClick={() => onPeriodChange(period.value)}
                className={cn(
                  "h-7 rounded-full text-xs font-medium transition-all duration-200 px-3 whitespace-nowrap border border-transparent",
                  isSelected
                    ? "border-primary/60 bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {period.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
