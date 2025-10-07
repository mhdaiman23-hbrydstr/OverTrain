"use client"

import { Button } from "@/components/ui/button"
import { Save, Check, Loader2 } from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"

interface CompletionBarProps {
  workout: WorkoutSession
  isWorkoutBlocked: boolean
  isCompletingWorkout: boolean
  canFinishWorkout: () => boolean
  onCompleteWorkout: () => void
}

export function CompletionBar({ workout, isWorkoutBlocked, isCompletingWorkout, canFinishWorkout, onCompleteWorkout }: CompletionBarProps) {
  if (isWorkoutBlocked) {
    return null
  }

  const renderCompletedState = () => (
    <div className="w-full p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
      <Check className="h-6 w-6 mx-auto mb-2 text-green-600" />
      <p className="font-semibold text-green-700">Workout Completed</p>
      <p className="text-sm text-green-600 mt-1">
        {new Date(workout.endTime || workout.startTime).toLocaleDateString()}
      </p>
    </div>
  )

  const renderActionButton = () => (
    <Button
      onClick={onCompleteWorkout}
      className="w-full gradient-primary text-primary-foreground"
      disabled={!canFinishWorkout() || isCompletingWorkout}
    >
      {isCompletingWorkout ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Completing...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          {canFinishWorkout() ? "Finish Workout" : "Complete exercises to finish"}
        </>
      )}
    </Button>
  )

  return (
    <>
      <div className="lg:hidden pt-4 pb-2">
        {workout.completed ? renderCompletedState() : renderActionButton()}
      </div>

      <div className="hidden lg:block lg:mt-8 lg:ml-64 lg:mr-0 lg:px-4 lg:pr-8">
        {workout.completed ? renderCompletedState() : renderActionButton()}
      </div>
    </>
  )
}
