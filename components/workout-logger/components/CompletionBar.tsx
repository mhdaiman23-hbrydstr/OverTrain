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
  const renderCompletedState = () => (
    <div className="w-full px-4 py-3 bg-green-50 border-2 border-green-500 rounded-lg">
      <div className="flex items-center justify-center gap-2">
        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
        <span className="font-semibold text-green-700">Workout Completed</span>
        <span className="text-sm text-green-600">•</span>
        <span className="text-sm text-green-600">
          {new Date(workout.endTime || workout.startTime).toLocaleDateString()}
        </span>
      </div>
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

  // When workout is blocked, still show the spacer to clear bottom nav
  if (isWorkoutBlocked) {
    return (
      <div className="h-20 lg:h-20" />
    )
  }

  return (
    <>
      {/* Mobile & Tablet: Inline at bottom of exercise list, visible when scrolled down */}
      <div className="lg:hidden p-4">
        {workout.completed ? renderCompletedState() : renderActionButton()}
      </div>

      {/* Desktop: Positioned in main content area, respecting sidebar */}
      <div className="hidden lg:block lg:fixed lg:bottom-0 lg:left-64 lg:right-0 lg:bg-background lg:border-t lg:border-border lg:p-4 lg:shadow-lg lg:z-50">
        <div className="max-w-4xl mx-auto px-4">
          {workout.completed ? renderCompletedState() : renderActionButton()}
        </div>
      </div>

      {/* Spacer to clear bottom nav (mobile) and fixed bar (desktop) */}
      <div className="h-20 lg:h-20" />
    </>
  )
}
