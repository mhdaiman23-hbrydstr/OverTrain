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
            side="left"
            className="max-w-xs"
            content={
              <div className="space-y-1">
                <p className="font-semibold">How to read this chart</p>
                <p className="text-xs">Each square represents one day of the past 12 weeks.</p>
                <p className="mt-2 text-xs">
                  <strong>Color intensity:</strong>
                  <br />
                  Lighter = fewer workouts | Darker = more workouts
                </p>
                <p className="mt-2 text-xs">Tap a day to see the exact number of completed workouts.</p>
              </div>
            }
          >
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="How to read the consistency chart"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
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
