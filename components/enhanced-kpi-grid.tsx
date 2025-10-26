"use client"

import { useState } from "react"
import { Trophy, Flame, Calendar, Weight, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { WorkoutSession } from "@/lib/workout-logger"

interface KPICardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  trend?: "up" | "down" | "stable"
  trendValue?: number
  onClick?: () => void
  className?: string
}

function KPICard({ icon, value, label, trend, trendValue, onClick, className }: KPICardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case "down":
        return <TrendingDown className="h-3 w-3 text-red-600" />
      default:
        return <Minus className="h-3 w-3 text-gray-600" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer",
        onClick && "active:scale-95",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              {trendValue && (
                <span className={cn("text-xs font-medium", getTrendColor())}>
                  {trendValue > 0 ? `+${trendValue}%` : `${trendValue}%`}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {label}
          </div>
        </div>
        
        {onClick && (
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full">
              View Details
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SessionDetail {
  date: string
  workoutName: string
  volume: number
  duration: number
  exercises: number
}

interface EnhancedKPIGridProps {
  workouts: WorkoutSession[]
}

export function EnhancedKPIGrid({ workouts }: EnhancedKPIGridProps) {
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([])

  const completedWorkouts = workouts.filter(w => w.completed)
  
  // Calculate KPIs
  const totalWorkouts = completedWorkouts.length
  const totalVolume = completedWorkouts.reduce((sum, w) => 
    sum + w.exercises.reduce((exSum, ex) => 
      exSum + ex.sets.filter(s => s.completed).reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0)
    , 0)

  // Calculate day streak
  const calculateDayStreak = () => {
    if (completedWorkouts.length === 0) return 0
    
    const sortedDates = completedWorkouts
      .map(w => new Date(w.startTime).toISOString().split('T')[0])
      .sort()
      .reverse()
    
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() - i)
      
      if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }

  const dayStreak = calculateDayStreak()
  
  // Format volume
  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`
    }
    return `${Math.round(volume)} kg`
  }

  // Calculate trends (simplified for demo)
  const calculateTrend = (currentValue: number, previousValue: number): "up" | "down" | "stable" => {
    if (previousValue === 0) return "stable"
    const change = ((currentValue - previousValue) / previousValue) * 100
    if (change > 5) return "up"
    if (change < -5) return "down"
    return "stable"
  }

  // Generate session details for drill-down
  const getSessionDetails = (kpiType: string): SessionDetail[] => {
    return completedWorkouts.map(workout => ({
      date: new Date(workout.startTime).toLocaleDateString(),
      workoutName: workout.workoutName,
      volume: workout.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completed).reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0),
      duration: workout.endTime ? Math.round((workout.endTime - workout.startTime) / (1000 * 60)) : 0,
      exercises: workout.exercises.length,
    })).sort((a, b) => b.date.localeCompare(a.date))
  }

  const handleKPIClick = (kpiType: string) => {
    setSelectedKPI(kpiType)
    setSessionDetails(getSessionDetails(kpiType))
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 w-full">
        <KPICard
          icon={<Trophy className="h-5 w-5" />}
          value={totalWorkouts}
          label="Workouts Completed"
          trend="up"
          trendValue={12}
          onClick={() => handleKPIClick("workouts")}
          className="gradient-card border-primary/20"
        />

        <KPICard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          value={dayStreak}
          label="Day Streak"
          trend="up"
          trendValue={8}
          onClick={() => handleKPIClick("streak")}
          className="gradient-card border-orange-500/20"
        />

        <KPICard
          icon={<Calendar className="h-5 w-5" />}
          value={totalWorkouts}
          label="Total Workouts"
          trend="up"
          trendValue={15}
          onClick={() => handleKPIClick("total")}
          className="gradient-card border-blue-500/20"
        />

        <KPICard
          icon={<Weight className="h-5 w-5" />}
          value={formatVolume(totalVolume)}
          label="Total Volume"
          trend="up"
          trendValue={23}
          onClick={() => handleKPIClick("volume")}
          className="gradient-card border-green-500/20"
        />
      </div>

      {/* Drill-down Sheet */}
      <Sheet open={!!selectedKPI} onOpenChange={() => setSelectedKPI(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader className="px-4 pt-6">
            <SheetTitle className="text-left font-semibold">
              {selectedKPI === "workouts" && "Workout Sessions"}
              {selectedKPI === "streak" && "Streak History"}
              {selectedKPI === "total" && "All Workouts"}
              {selectedKPI === "volume" && "Volume Breakdown"}
            </SheetTitle>
          </SheetHeader>
          
          <div className="px-4 pb-6 overflow-y-auto">
            <div className="space-y-3">
              {sessionDetails.map((session, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{session.workoutName}</div>
                      <div className="text-xs text-muted-foreground">{session.date}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {session.exercises} exercises
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Volume</div>
                      <div className="font-medium">{formatVolume(session.volume)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-medium">{session.duration}m</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Exercises</div>
                      <div className="font-medium">{session.exercises}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
