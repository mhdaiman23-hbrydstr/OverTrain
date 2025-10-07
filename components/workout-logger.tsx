"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { WorkoutCompletionDialog } from "@/components/workout-completion-dialog"
import { MuscleGroupStats } from "@/components/muscle-group-stats"
import { WorkoutCalendar } from "@/components/workout-calendar"
import { ExerciseLibrary } from "@/components/exercise-library"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"
import { WorkoutLoggerProps } from "@/components/workout-logger/types"
import { useConnectionStatus } from "@/components/workout-logger/hooks/use-connection-status"
import { useWorkoutSession } from "@/components/workout-logger/hooks/use-workout-session"
import {
  Save,
  MoreVertical,
  FileText,
  BarChart3,
  Plus,
  AlertTriangle,
  SkipForward,
  Trash2,
  Check,
  Calendar,
  Minus,
  Lock,
  ArrowUp,
  ArrowDown,
  Replace,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"


export function WorkoutLoggerComponent({ initialWorkout, onComplete, onCancel, onViewAnalytics }: WorkoutLoggerProps) {
  const {
    workout,
    setWorkout,
    showNotesDialog,
    setShowNotesDialog,
    showSummaryDialog,
    setShowSummaryDialog,
    showAddExerciseDialog,
    setShowAddExerciseDialog,
    showEndWorkoutDialog,
    setShowEndWorkoutDialog,
    showEndProgramDialog,
    setShowEndProgramDialog,
    showCompletionDialog,
    setShowCompletionDialog,
    completedWorkout,
    setCompletedWorkout,
    workoutNotes,
    setWorkoutNotes,
    endWorkoutConfirmation,
    setEndWorkoutConfirmation,
    endProgramConfirmation,
    setEndProgramConfirmation,
    showCalendar,
    setShowCalendar,
    showMuscleGroupStats,
    setShowMuscleGroupStats,
    isWorkoutBlocked,
    setIsWorkoutBlocked,
    isFullyBlocked,
    setIsFullyBlocked,
    blockedMessage,
    setBlockedMessage,
    programName,
    setProgramName,
    showExerciseNotesDialog,
    setShowExerciseNotesDialog,
    selectedExerciseId,
    setSelectedExerciseId,
    exerciseNotes,
    setExerciseNotes,
    showExerciseLibrary,
    setShowExerciseLibrary,
    replaceExerciseId,
    setReplaceExerciseId,
    showProgressionBanner,
    setShowProgressionBanner,
    progressionBannerMessage,
    setProgressionBannerMessage,
    isCompletingWorkout,
    setIsCompletingWorkout,
    userOverrides,
    setUserOverrides,
    volumeCompensation,
    setVolumeCompensation,
    pendingOutOfBoundsWarnings,
    setPendingOutOfBoundsWarnings,
    outOfBoundsExercises,
    setOutOfBoundsExercises,
    debounceTimerRef,
    boundsCheckTimerRef,
    handleSetUpdate,
    handleWeightInputBlur,
    handleCompleteSet,
    handleCompleteWorkout,
    handleCompletionDialogClose,
    handleViewMuscleGroupStats,
    handleCancelWorkout,
    handleSaveNotes,
    handleEndWorkout,
    handleEndProgram,
    handleAddSet,
    handleDeleteSet,
    handleSkipSet,
    handleExerciseNotes,
    handleSaveExerciseNotes,
    handleReplaceExercise,
    handleMoveExerciseUp,
    handleMoveExerciseDown,
    handleSkipAllSets,
    handleDeleteExercise,
    handleSelectExerciseFromLibrary,
    handleStartNextWorkout,
    handleWorkoutClick,
    handleMuscleGroupStatsClose,
    getWorkoutSummary,
    getWorkoutProgress,
    getMuscleGroupColor,
    canFinishWorkout,
    displayExercises,
    groupedExercises,
  } = useWorkoutSession({ initialWorkout, onComplete, onCancel, onViewAnalytics })

  const connectionStatus = useConnectionStatus()
  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No workout to log</p>
            <Button variant="outline" onClick={onCancel} className="mt-4 bg-transparent">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <>
      <div className="min-h-screen bg-background pb-20 lg:pb-4">
        <div className="sticky top-0 bg-background border-b border-border/50 z-[60] shadow-sm backdrop-blur-sm bg-background/95">
          <div className="w-full px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                {programName && (
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">{programName}</div>
                )}
                <h1 className="text-lg sm:text-xl font-bold truncate leading-tight">{workout?.workoutName}</h1>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Week {workout?.week || 1}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`h-9 w-9 sm:h-10 sm:w-10 p-0 ${showCalendar ? "bg-muted" : ""}`}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md hover:bg-accent hover:text-accent-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[100]">
                    <DropdownMenuItem onClick={() => setShowNotesDialog(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Workout Notes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSummaryDialog(true)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Summary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAddExerciseDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exercise
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowEndWorkoutDialog(true)}
                      className="text-orange-600 focus:text-orange-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      End Workout
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowEndProgramDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      End Program
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <Progress value={getWorkoutProgress()} className="w-full h-1.5 sm:h-2" />
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        {connectionStatus === 'offline' && (
          <div className="bg-red-50 border-b border-red-200 p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-red-900">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">Offline - Reconnect to log sets</span>
            </div>
          </div>
        )}
        {connectionStatus === 'syncing' && (
          <div className="bg-blue-50 border-b border-blue-200 p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">Logging set...</span>
            </div>
          </div>
        )}
        {/* Removed 'synced' banner for better UX - success is logged to console only */}
        {connectionStatus === 'error' && (
          <div className="bg-orange-50 border-b border-orange-200 p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-orange-900">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">Sync error - Please try again</span>
            </div>
          </div>
        )}

        {/* Calendar Section - Sticky below header */}
        {showCalendar && (
          <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm w-full sticky top-[100px] sm:top-[120px] z-50 shadow-sm">
            <WorkoutCalendar
              onWorkoutClick={handleWorkoutClick}
              selectedWeek={workout?.week}
              selectedDay={workout?.day}
            />
          </div>
        )}

        {/* Progression Notes Banner - Only show if previous week/day is incomplete */}
        {workout?.week &&
         workout?.week > 1 &&
         workout?.notes &&
         !isWorkoutBlocked &&
         !hasCompletedPreviousWorkout && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Week {workout.week}, Day {workout.day}:</span> {workout.notes}
            </p>
          </div>
        )}

        {/* Week Access Banner - Show when accessing Current Week + 1 before current week is completed */}
        {isWorkoutBlocked && !isFullyBlocked && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-900 font-medium">
                Complete Current Week to Start Logging
              </p>
            </div>
          </div>
        )}

        {/* Progression banner removed - using pre-filled weights instead */}

        
        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workout Notes</DialogTitle>
              <DialogDescription>Add notes about your workout, how you felt, or any observations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your workout notes here..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNotes}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showExerciseNotesDialog} onOpenChange={setShowExerciseNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exercise Notes</DialogTitle>
              <DialogDescription>
                Add notes about this exercise, technique cues, or form observations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your exercise notes here..."
                value={exerciseNotes}
                onChange={(e) => setExerciseNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExerciseNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveExerciseNotes}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Workout Summary</DialogTitle>
              <DialogDescription>Overview of your current workout progress.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                const summary = getWorkoutSummary()
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{summary.completedSets}</div>
                      <div className="text-sm text-muted-foreground">Completed Sets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{summary.skippedSets}</div>
                      <div className="text-sm text-muted-foreground">Skipped Sets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{summary.totalSets}</div>
                      <div className="text-sm text-muted-foreground">Total Sets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{summary.exercises}</div>
                      <div className="text-sm text-muted-foreground">Exercises</div>
                    </div>
                  </div>
                )
              })()}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowSummaryDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddExerciseDialog} onOpenChange={setShowAddExerciseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
              <DialogDescription>Add an extra exercise to your current workout template.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center p-8 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4" />
                <p>Exercise selection feature coming soon...</p>
                <p className="text-sm">You'll be able to browse and add exercises from our database.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddExerciseDialog(false)}>
                Cancel
              </Button>
              <Button disabled>Add Exercise</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEndWorkoutDialog} onOpenChange={setShowEndWorkoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <Check className="h-5 w-5" />
                End Workout
              </DialogTitle>
              <DialogDescription>
                This will mark all remaining sets as skipped and complete your current workout. You'll be able to start the next workout.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium">
                  To confirm, please type "End Workout" in the field below:
                </p>
              </div>
              <Input
                placeholder="Type 'End Workout' to confirm"
                value={endWorkoutConfirmation}
                onChange={(e) => setEndWorkoutConfirmation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEndWorkoutDialog(false)
                  setEndWorkoutConfirmation("")
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleEndWorkout}
                disabled={endWorkoutConfirmation !== "End Workout"}
              >
                End Workout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEndProgramDialog} onOpenChange={setShowEndProgramDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                End Program
              </DialogTitle>
              <DialogDescription>
                This will mark all remaining sets as skipped and end your current program. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  To confirm, please type "End Program" in the field below:
                </p>
              </div>
              <Input
                placeholder="Type 'End Program' to confirm"
                value={endProgramConfirmation}
                onChange={(e) => setEndProgramConfirmation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEndProgramDialog(false)
                  setEndProgramConfirmation("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndProgram}
                disabled={endProgramConfirmation !== "End Program"}
              >
                End Program
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="w-full max-w-full mx-auto px-3 sm:px-4 overflow-x-hidden">
          {Object.entries(groupedExercises).map(([muscleGroup, exercises]) => (
            <div key={muscleGroup}>
              {exercises.map((exercise, index) => {
                // Get muscle group for current and previous exercise
                const currentMuscleGroup = getExerciseMuscleGroup(exercise.exerciseName)
                const previousMuscleGroup = index > 0 ? getExerciseMuscleGroup(exercises[index - 1].exerciseName) : null
                const isNewMuscleGroup = currentMuscleGroup !== previousMuscleGroup

                return (
                  <div key={exercise.id}>
                    {/* Muscle Group Header - only show when muscle group changes */}
                    {isNewMuscleGroup && (
                      <div className="flex items-center gap-2 py-3 px-1 mt-4">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-1 h-5 bg-primary rounded-full" />
                          <h3 className="text-xs font-bold uppercase tracking-wide text-primary">{currentMuscleGroup}</h3>
                        </div>
                      </div>
                    )}

                    {/* Out of Bounds Warning Banner - Per Exercise */}
                    {outOfBoundsExercises[exercise.id] && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-2 mt-2">
                        <div className="text-xs text-yellow-800">
                          ⚠️ Set {outOfBoundsExercises[exercise.id].setNumber}: Weight out of range ({Math.round(outOfBoundsExercises[exercise.id].min)}-{Math.round(outOfBoundsExercises[exercise.id].max)} lbs). Enter reps manually.
                        </div>
                      </div>
                    )}

                    {/* Exercise Card - Flat list style */}
                    <div className="border-b border-border/30 relative bg-background hover:bg-muted/20 transition-colors">
                      <div className="py-3 px-1 sm:py-4 sm:px-2">
                        
                        <div className="flex items-center justify-between pb-3">
                          <div className="flex-1">
                            <h4 className="text-base font-medium">{exercise.exerciseName}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{(exercise as any).equipmentType || "BARBELL"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[100]">
                                <DropdownMenuItem onClick={() => handleExerciseNotes(exercise.id)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Exercise notes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReplaceExercise(exercise.id)}>
                                  <Replace className="h-4 w-4 mr-2" />
                                  Replace
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {workout && workout.exercises.findIndex((ex) => ex.id === exercise.id) > 0 && (
                                  <DropdownMenuItem onClick={() => handleMoveExerciseUp(exercise.id)}>
                                    <ArrowUp className="h-4 w-4 mr-2" />
                                    Move up
                                  </DropdownMenuItem>
                                )}
                                {workout && workout.exercises.findIndex((ex) => ex.id === exercise.id) < workout.exercises.length - 1 && (
                                  <DropdownMenuItem onClick={() => handleMoveExerciseDown(exercise.id)}>
                                    <ArrowDown className="h-4 w-4 mr-2" />
                                    Move down
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSkipAllSets(exercise.id)}>
                                  <SkipForward className="h-4 w-4 mr-2" />
                                  Skip all sets
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteExercise(exercise.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete exercise
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      <div className="px-1 pb-2 sm:px-2 relative">
                        {isFullyBlocked ? (
                          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-center p-3">
                            <div className="text-center px-2 max-w-full">
                              <Lock className="h-7 w-7 mx-auto mb-2 text-destructive" />
                              <p className="text-xs font-medium text-destructive leading-tight">
                                {blockedMessage || "Complete previous weeks before accessing this workout"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          isWorkoutBlocked && (
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-2 mb-3 flex items-center gap-2">
                              <Lock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              <p className="text-xs text-orange-800 leading-tight">
                                {blockedMessage || "Complete previous week before accessing this workout"}
                              </p>
                            </div>
                          )
                        )}

                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase mb-3">
                          <div className="col-span-1"></div>
                          <div className="col-span-4 text-center">WEIGHT</div>
                          <div className="col-span-3 text-center">REPS</div>
                          <div className="col-span-3 text-center">LOG</div>
                          <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-2">
                          {exercise.sets.map((set, setIndex) => (
                            <div key={set.id} className="space-y-0">
                              <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
                              <div className="col-span-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="z-[100]">
                                    <DropdownMenuItem onClick={() => handleAddSet(exercise.id, set.id)}>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add set below
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSkipSet(exercise.id, set.id)}>
                                      <SkipForward className="h-4 w-4 mr-2" />
                                      Skip set
                                    </DropdownMenuItem>
                                    {exercise.sets.length > 1 && (
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteSet(exercise.id, set.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete set
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  value={set.weight || ""}
                                  onChange={(e) =>
                                    handleSetUpdate(exercise.id, set.id, "weight", Number.parseFloat(e.target.value) || 0)
                                  }
                                  onBlur={() => handleWeightInputBlur(exercise.id, set.id)}
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder={
                                    (exercise as any).suggestedWeight && (exercise as any).suggestedWeight > 0
                                      ? `${(exercise as any).suggestedWeight} lbs`
                                      : ""
                                  }
                                  step="2.5"
                                  disabled={isWorkoutBlocked}
                                  title={
                                    (exercise as any).progressionNote ||
                                    ((exercise as any).suggestedWeight && (exercise as any).suggestedWeight > 0
                                      ? `Suggested: ${(exercise as any).suggestedWeight} lbs`
                                      : "")
                                  }
                                />
                              </div>

                              <div className="col-span-3">
                                <Input
                                  type="number"
                                  value={set.reps || ""}
                                  onChange={(e) =>
                                    handleSetUpdate(exercise.id, set.id, "reps", Number.parseInt(e.target.value) || 0)
                                  }
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder=""
                                  disabled={isWorkoutBlocked}
                                />
                              </div>

                              <div className="col-span-3">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    console.log("[v0] 🎯 SET CLICK - Before handleCompleteSet:", {
                                      exerciseId: exercise.id,
                                      exerciseName: exercise.exerciseName,
                                      setId: set.id,
                                      setIndex,
                                      currentState: {
                                        reps: set.reps,
                                        weight: set.weight,
                                        completed: set.completed,
                                        skipped: set.skipped
                                      }
                                    })
                                    handleCompleteSet(exercise.id, set.id)
                                  }}
                                  disabled={isWorkoutBlocked}
                                  variant="ghost"
                                  className={`w-full h-10 border-2 ${
                                    set.completed
                                      ? (set.reps === 0 && set.weight === 0) || set.skipped
                                        ? "bg-blue-50 border-blue-500 text-blue-700"
                                        : "bg-green-50 border-green-500 text-green-700"
                                      : "border-border/50 hover:border-primary"
                                  }`}
                                >
                                  {(() => {
                                    const showingMinus = set.completed && ((set.reps === 0 && set.weight === 0) || set.skipped)
                                    if (showingMinus) {
                                      console.log("[v0] 🔵 RENDERING MINUS (—) for set:", {
                                        exerciseName: exercise.exerciseName,
                                        setIndex,
                                        setId: set.id,
                                        reps: set.reps,
                                        weight: set.weight,
                                        completed: set.completed,
                                        skipped: set.skipped,
                                        reason: set.skipped ? "skipped=true" : "reps=0 AND weight=0"
                                      })
                                    }
                                    if (set.completed) {
                                      if ((set.reps === 0 && set.weight === 0) || set.skipped) {
                                        return <Minus className="h-5 w-5 text-blue-600" />
                                      } else {
                                        return <Check className="h-5 w-5 text-green-600" />
                                      }
                                    } else {
                                      return <div className="w-5 h-5 border-2 border-border rounded" />
                                    }
                                  })()}
                                </Button>
                              </div>

                                <div className="col-span-1 text-center">
                                  <span className="text-sm font-medium text-muted-foreground">{setIndex + 1}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          <div className="lg:hidden pt-4 pb-2">
            {!isWorkoutBlocked && (
              <>
                {workout.completed ? (
                  <div className="w-full p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
                    <Check className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold text-green-700">Workout Completed</p>
                    <p className="text-sm text-green-600 mt-1">
                      {new Date(workout.endTime || workout.startTime).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleCompleteWorkout}
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
                )}
              </>
            )}
          </div>

          {/* Desktop Finish Workout Bar Inline */}
          <div className="hidden lg:block lg:mt-8 lg:ml-64 lg:mr-0 lg:px-4 lg:pr-8">
            {!isWorkoutBlocked && (
              <>
                {workout.completed ? (
                  <div className="w-full p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
                    <Check className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold text-green-700">Workout Completed</p>
                    <p className="text-sm text-green-600 mt-1">
                      {new Date(workout.endTime || workout.startTime).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleCompleteWorkout}
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
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <WorkoutCompletionDialog
        workout={completedWorkout}
        open={showCompletionDialog}
        onClose={handleCompletionDialogClose}
        onViewMuscleGroupStats={handleViewMuscleGroupStats}
        onStartNextWorkout={handleStartNextWorkout}
      />

      <MuscleGroupStats open={showMuscleGroupStats} onClose={handleMuscleGroupStatsClose} />

      <ExerciseLibrary
        open={showExerciseLibrary}
        onOpenChange={setShowExerciseLibrary}
        onSelectExercise={handleSelectExerciseFromLibrary}
        currentExerciseName={
          replaceExerciseId ? workout?.exercises.find((ex) => ex.id === replaceExerciseId)?.exerciseName : undefined
        }
      />
    </>
  )
}
