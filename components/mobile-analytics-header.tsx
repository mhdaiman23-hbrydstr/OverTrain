"use client"

import { TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <div className="inline-flex items-center rounded-full bg-muted/50 p-1">
          {periods.map((period) => {
            const isSelected = selectedPeriod === period.value
            return (
              <Button
                key={period.value}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                onClick={() => onPeriodChange(period.value)}
                className={cn(
                  "h-7 rounded-full text-xs font-medium transition-all duration-200",
                  isSelected && "shadow-sm"
                )}
              >
                {period.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
