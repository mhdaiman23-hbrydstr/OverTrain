"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { WorkoutCompletionDialog } from "@/components/workout-completion-dialog"
import { MuscleGroupStats } from "@/components/muscle-group-stats"
import { WorkoutCalendar } from "@/components/workout-calendar"
import { ExerciseLibrary } from "@/components/exercise-library"
import { WorkoutLoggerProps } from "@/components/workout-logger/types"
import { WorkoutHeader } from "@/components/workout-logger/components/WorkoutHeader"
import { ConnectionStatusBanner } from "@/components/workout-logger/components/ConnectionStatusBanner"
import { WeekAccessBanner } from "@/components/workout-logger/components/WeekAccessBanner"
import { ProgressionNoteBanner } from "@/components/workout-logger/components/ProgressionNoteBanner"
import { ExerciseGroups } from "@/components/workout-logger/components/ExerciseGroups"
import { CompletionBar } from "@/components/workout-logger/components/CompletionBar"
import { WorkoutDialogs } from "@/components/workout-logger/components/WorkoutDialogs"
import { useConnectionStatus } from "@/components/workout-logger/hooks/use-connection-status"
import { useWorkoutSession } from "@/components/workout-logger/hooks/use-workout-session"
import { OneRmProvider } from "@/components/workout-logger/contexts/one-rm-context"


function WorkoutLoggerView({ initialWorkout, onComplete, onCancel, onViewAnalytics }: WorkoutLoggerProps) {
  const {
    workout,
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
    completedWorkout,
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
    isFullyBlocked,
    blockedMessage,
    programName,
    showExerciseNotesDialog,
    setShowExerciseNotesDialog,
    exerciseNotes,
    setExerciseNotes,
    showExerciseLibrary,
    setShowExerciseLibrary,
    replaceExerciseId,
    setReplaceExerciseId,
    isCompletingWorkout,
    userOverrides,
    volumeCompensation,
    outOfBoundsExercises,
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
    canFinishWorkout,
    groupedExercises,
    hasCompletedPreviousWorkout,
  } = useWorkoutSession({ initialWorkout, onComplete, onCancel })

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

  const progress = getWorkoutProgress()

  return (
    <>
      <WorkoutHeader
        programName={programName}
        workoutName={workout.workoutName}
        week={workout.week}
        day={workout.day}
        progress={progress}
        showCalendar={showCalendar}
        onToggleCalendar={() => setShowCalendar((prev) => !prev)}
        onOpenNotes={() => setShowNotesDialog(true)}
        onOpenSummary={() => setShowSummaryDialog(true)}
        onOpenAddExercise={() => setShowAddExerciseDialog(true)}
        onOpenEndWorkout={() => setShowEndWorkoutDialog(true)}
        onOpenEndProgram={() => setShowEndProgramDialog(true)}
      />

      <ConnectionStatusBanner status={connectionStatus} />

      {showCalendar && (
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm w-full sticky top-[100px] sm:top-[120px] z-50 shadow-sm">
          <WorkoutCalendar onWorkoutClick={handleWorkoutClick} selectedWeek={workout.week} selectedDay={workout.day} />
        </div>
      )}

      {!isWorkoutBlocked && !hasCompletedPreviousWorkout && workout.notes && (
        <ProgressionNoteBanner week={workout.week} day={workout.day} note={workout.notes} />
      )}

      <WeekAccessBanner isBlocked={isWorkoutBlocked} isFullyBlocked={isFullyBlocked} message={blockedMessage} />

      <WorkoutDialogs
        showNotesDialog={showNotesDialog}
        setShowNotesDialog={setShowNotesDialog}
        workoutNotes={workoutNotes}
        setWorkoutNotes={setWorkoutNotes}
        onSaveNotes={handleSaveNotes}
        showExerciseNotesDialog={showExerciseNotesDialog}
        setShowExerciseNotesDialog={setShowExerciseNotesDialog}
        exerciseNotes={exerciseNotes}
        setExerciseNotes={setExerciseNotes}
        onSaveExerciseNotes={handleSaveExerciseNotes}
        showSummaryDialog={showSummaryDialog}
        setShowSummaryDialog={setShowSummaryDialog}
        getWorkoutSummary={getWorkoutSummary}
        showAddExerciseDialog={showAddExerciseDialog}
        setShowAddExerciseDialog={setShowAddExerciseDialog}
        showEndWorkoutDialog={showEndWorkoutDialog}
        setShowEndWorkoutDialog={setShowEndWorkoutDialog}
        endWorkoutConfirmation={endWorkoutConfirmation}
        setEndWorkoutConfirmation={setEndWorkoutConfirmation}
        onEndWorkout={handleEndWorkout}
        showEndProgramDialog={showEndProgramDialog}
        setShowEndProgramDialog={setShowEndProgramDialog}
        endProgramConfirmation={endProgramConfirmation}
        setEndProgramConfirmation={setEndProgramConfirmation}
        onEndProgram={handleEndProgram}
      />

      <ExerciseGroups
        groupedExercises={groupedExercises}
        workout={workout}
        isWorkoutBlocked={isWorkoutBlocked}
        outOfBoundsExercises={outOfBoundsExercises}
        volumeCompensation={volumeCompensation}
        userOverrides={userOverrides}
        onSetUpdate={handleSetUpdate}
        onWeightBlur={handleWeightInputBlur}
        onCompleteSet={handleCompleteSet}
        onAddSet={handleAddSet}
        onDeleteSet={handleDeleteSet}
        onSkipSet={handleSkipSet}
        onExerciseNotes={handleExerciseNotes}
        onReplaceExercise={handleReplaceExercise}
        onMoveExerciseUp={handleMoveExerciseUp}
        onMoveExerciseDown={handleMoveExerciseDown}
        onSkipAllSets={handleSkipAllSets}
        onDeleteExercise={handleDeleteExercise}
      />

      <CompletionBar
        workout={workout}
        isWorkoutBlocked={isWorkoutBlocked}
        isCompletingWorkout={isCompletingWorkout}
        canFinishWorkout={canFinishWorkout}
        onCompleteWorkout={handleCompleteWorkout}
      />

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
          replaceExerciseId ? workout.exercises.find((ex) => ex.id === replaceExerciseId)?.exerciseName : undefined
        }
      />
    </>
  )
}




export function WorkoutLoggerComponent(props: WorkoutLoggerProps) {
  return (
    <OneRmProvider>
      <WorkoutLoggerView {...props} />
    </OneRmProvider>
  )
}

