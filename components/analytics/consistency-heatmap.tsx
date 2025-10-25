"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle } from "lucide-react"
import { MobileTooltip } from "@/components/ui/mobile-tooltip"
import { cn } from "@/lib/utils"
import type { HeatmapData } from "@/lib/analytics"

interface ConsistencyHeatmapProps {
  heatmap: HeatmapData[]
}

export function ConsistencyHeatmap({ heatmap }: ConsistencyHeatmapProps) {
  const weeks = useMemo(() => {
    if (!heatmap || heatmap.length === 0) return []

    // Get the last 12 weeks
    const now = new Date()
    const weeks = []

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i))
      weekStart.setHours(0, 0, 0, 0)

      const weekDays = []
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + day)
        const dateStr = date.toISOString().split('T')[0]

        const workoutData = heatmap.find(h => h.date === dateStr)
        weekDays.push({
          date: dateStr,
          day: date.getDay(),
          value: workoutData?.value || 0,
          intensity: workoutData?.intensity || 'low',
        })
      }
      weeks.push(weekDays)
    }

    return weeks
  }, [heatmap])

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return 'bg-primary'
      case 'medium':
        return 'bg-primary/60'
      case 'low':
        return 'bg-primary/20'
      default:
        return 'bg-muted'
    }
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Consistency</CardTitle>
          <MobileTooltip
            content={
              <div className="space-y-1">
                <p className="font-semibold">How to Read This Chart:</p>
                <p className="text-xs">Each square represents one day of the past 12 weeks.</p>
                <p className="text-xs mt-2">
                  <strong>Color Intensity:</strong><br/>
                  Lighter = fewer workouts | Darker = more workouts
                </p>
                <p className="text-xs mt-2">
                  Hover over a day to see the exact number of workouts completed.
                </p>
              </div>
            }
            side="left"
            className="max-w-xs"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
          </MobileTooltip>
        </div>
      </CardHeader>
      <CardContent>
        {weeks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>No workout data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-0.5">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-0.5">
                  {week.map((day, dayIdx) => (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className={cn(
                        "w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-offset-1",
                        getIntensityColor(day.intensity)
                      )}
                      title={`${day.date}: ${day.value} workout${day.value !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                {['low', 'medium', 'high'].map(intensity => (
                  <div
                    key={intensity}
                    className={cn("w-2 h-2 rounded-sm", getIntensityColor(intensity))}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
