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
      className="w-full gradient-primary text-primary-foreground h-auto py-3 px-4 text-center"
      disabled={!canFinishWorkout() || isCompletingWorkout}
    >
      {isCompletingWorkout ? (
        <span className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
          <span>Completing...</span>
        </span>
      ) : (
        <span className="flex items-center justify-center flex-wrap gap-2">
          <Save className="h-4 w-4 flex-shrink-0" />
          <span className="break-words text-center">
            {canFinishWorkout() ? "Finish Workout" : "Complete Exercises to Finish"}
          </span>
        </span>
      )}
    </Button>
  )

  return (
    <>
      {/* Mobile & Tablet: Fixed bottom bar with proper spacing */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe z-50 shadow-lg">
        {workout.completed ? renderCompletedState() : renderActionButton()}
      </div>

      {/* Desktop: Positioned in main content area, respecting sidebar */}
      <div className="hidden lg:block lg:fixed lg:bottom-0 lg:left-64 lg:right-0 lg:bg-background lg:border-t lg:border-border lg:p-4 lg:shadow-lg lg:z-50">
        <div className="max-w-4xl mx-auto px-4">
          {workout.completed ? renderCompletedState() : renderActionButton()}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed bar */}
      <div className="h-24 lg:h-20" />
    </>
  )
}
