"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WorkoutLogger } from "@/lib/workout-logger"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"
import { ProgramStateManager } from "@/lib/program-state"

interface MuscleGroupStatsProps {
  open: boolean
  onClose: () => void
}

interface MuscleGroupData {
  name: string
  avgSets: number
  weeklyData: (number | null)[]
}

export function MuscleGroupStats({ open, onClose }: MuscleGroupStatsProps) {
  const [muscleGroupStats, setMuscleGroupStats] = useState<MuscleGroupData[]>([])

  useEffect(() => {
    const loadStats = async () => {
      const workouts = WorkoutLogger.getWorkoutHistory()
      const activeProgram = await ProgramStateManager.getActiveProgram()

      if (!activeProgram) {
        setMuscleGroupStats([])
        return
      }

      // Guard against corrupted localStorage (workouts must be an array)
      if (!Array.isArray(workouts)) {
        console.warn('[MuscleGroupStats] Workouts is not an array, resetting stats')
        setMuscleGroupStats([])
        return
      }

    // Calculate which week each workout belongs to
    const programStartDate = new Date(activeProgram.startDate)
    const weeklyMuscleData = new Map<number, Map<string, number>>() // week -> muscleGroup -> sets

    workouts.forEach((workout) => {
      // LAZY-LOAD FIX: Use templateId from activeProgram instead of full template
      if (!workout.completed || workout.programId !== activeProgram.templateId) return

      const workoutDate = new Date(workout.startTime)
      const daysSinceStart = Math.floor((workoutDate.getTime() - programStartDate.getTime()) / (1000 * 60 * 60 * 24))
      const weekNumber = Math.floor(daysSinceStart / 7) + 1

      if (!weeklyMuscleData.has(weekNumber)) {
        weeklyMuscleData.set(weekNumber, new Map())
      }

      const weekData = weeklyMuscleData.get(weekNumber)!

      workout.exercises.forEach((exercise) => {
        // Prefer DB-provided muscle group when available; otherwise fall back to heuristic.
        const safeName = typeof (exercise as any)?.exerciseName === 'string'
          ? (exercise as any).exerciseName
          : (typeof (exercise as any)?.name === 'string' ? (exercise as any).name : '')

        const muscleGroup: string = (exercise as any)?.muscle_group ?? getExerciseMuscleGroup(safeName)

        const setsArray = Array.isArray((exercise as any)?.sets) ? (exercise as any).sets : []
        const completedSets = setsArray.filter((set: any) => set?.completed && (set?.reps ?? 0) > 0).length

        weekData.set(muscleGroup, (weekData.get(muscleGroup) || 0) + completedSets)
      })
    })

    // Get current week
    const currentDate = new Date()
    const daysSinceStart = Math.floor((currentDate.getTime() - programStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const currentWeek = Math.floor(daysSinceStart / 7) + 1

    // Prepare data for display
    const muscleGroups = ["CHEST", "BACK", "TRICEPS", "BICEPS", "SHOULDERS", "QUADS", "GLUTES", "HAMSTRINGS", "CALVES"]
    const maxWeeks = Math.max(currentWeek, 4) // Show at least 4 weeks

    const stats = muscleGroups
      .map((muscleGroup) => {
        const weeklyData: (number | null)[] = []
        let totalSets = 0
        let weeksWithData = 0

        for (let week = 1; week <= maxWeeks; week++) {
          const weekData = weeklyMuscleData.get(week)
          const sets = weekData?.get(muscleGroup) || null
          weeklyData.push(sets)
          if (sets !== null) {
            totalSets += sets
            weeksWithData++
          }
        }

        return {
          name: muscleGroup.charAt(0) + muscleGroup.slice(1).toLowerCase(),
          avgSets: weeksWithData > 0 ? Math.round(totalSets / weeksWithData) : 0,
          weeklyData,
        }
      })
      .filter((group) => group.avgSets > 0) // Only show muscle groups with data

      setMuscleGroupStats(stats)
    }

    loadStats()
  }, [open])

  const getIntensityColor = (sets: number | null, maxSets: number) => {
    if (sets === null || sets === 0) return "bg-muted text-muted-foreground"
    const intensity = sets / maxSets
    if (intensity >= 0.8) return "bg-slate-800 text-white"
    if (intensity >= 0.6) return "bg-slate-700 text-white"
    if (intensity >= 0.4) return "bg-slate-500 text-white"
    if (intensity >= 0.2) return "bg-slate-400 text-slate-900"
    return "bg-slate-300 text-slate-900"
  }

  const maxSets = useMemo(() => {
    return Math.max(
      ...muscleGroupStats.flatMap((group) => group.weeklyData.filter((sets): sets is number => sets !== null)),
      1,
    )
  }, [muscleGroupStats])

  const maxWeeks = muscleGroupStats[0]?.weeklyData.length || 4

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Muscle group stats</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-normal text-muted-foreground"></th>
                  {Array.from({ length: maxWeeks }, (_, i) => (
                    <th key={i} className="text-center py-3 px-2 font-normal text-muted-foreground text-sm">
                      wk {i + 1}
                    </th>
                  ))}
                  <th className="text-center py-3 px-2 font-normal text-muted-foreground text-sm">DL</th>
                </tr>
              </thead>
              <tbody>
                {muscleGroupStats.map((group) => (
                  <tr key={group.name} className="border-b">
                    <td className="py-4 px-2">
                      <div className="font-semibold">{group.name}</div>
                      <div className="text-sm text-muted-foreground">{group.avgSets} avg sets</div>
                    </td>
                    {group.weeklyData.map((sets, weekIndex) => (
                      <td key={weekIndex} className="text-center py-4 px-2">
                        <div
                          className={`inline-flex items-center justify-center w-12 h-12 rounded font-medium ${getIntensityColor(
                            sets,
                            maxSets,
                          )}`}
                        >
                          {sets || 0}
                        </div>
                      </td>
                    ))}
                    <td className="text-center py-4 px-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded font-medium bg-muted text-muted-foreground">
                        0
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
