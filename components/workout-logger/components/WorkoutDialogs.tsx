"use client"

import { Dispatch, SetStateAction } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, AlertTriangle, Loader2 } from "lucide-react"
import { BodyweightDialog } from "./bodyweight-dialog"

interface WorkoutDialogsProps {
  showNotesDialog: boolean
  setShowNotesDialog: Dispatch<SetStateAction<boolean>>
  workoutNotes: string
  setWorkoutNotes: Dispatch<SetStateAction<string>>
  onSaveNotes: () => void

  showExerciseNotesDialog: boolean
  setShowExerciseNotesDialog: Dispatch<SetStateAction<boolean>>
  exerciseNotes: string
  setExerciseNotes: Dispatch<SetStateAction<string>>
  onSaveExerciseNotes: () => void

  showSummaryDialog: boolean
  setShowSummaryDialog: Dispatch<SetStateAction<boolean>>
  getWorkoutSummary: () => { completedSets: number; skippedSets: number; totalSets: number; exercises: number }

  showEndWorkoutDialog: boolean
  setShowEndWorkoutDialog: Dispatch<SetStateAction<boolean>>
  endWorkoutConfirmation: string
  setEndWorkoutConfirmation: Dispatch<SetStateAction<string>>
  onEndWorkout: () => void

  showEndProgramDialog: boolean
  setShowEndProgramDialog: Dispatch<SetStateAction<boolean>>
  endProgramConfirmation: string
  setEndProgramConfirmation: Dispatch<SetStateAction<string>>
  onEndProgram: () => void
  isCompletingWorkout?: boolean
// Bodyweight dialog props  showBodyweightDialog: boolean  setShowBodyweightDialog: Dispatch<SetStateAction<boolean>>  bodyweightInput: string  setBodyweightInput: Dispatch<SetStateAction<string>>  onSaveBodyweight: (bodyweight: number) => Promise<void>  userBodyweight?: number
}

export function WorkoutDialogs({
  showNotesDialog,
  setShowNotesDialog,
  workoutNotes,
  setWorkoutNotes,
  onSaveNotes,
  showExerciseNotesDialog,
  setShowExerciseNotesDialog,
  exerciseNotes,
  setExerciseNotes,
  onSaveExerciseNotes,
  showSummaryDialog,
  setShowSummaryDialog,
  getWorkoutSummary,
  showEndWorkoutDialog,
  setShowEndWorkoutDialog,
  endWorkoutConfirmation,
  setEndWorkoutConfirmation,
  onEndWorkout,
  showEndProgramDialog,
  setShowEndProgramDialog,
  endProgramConfirmation,
  setEndProgramConfirmation,
  onEndProgram,
  isCompletingWorkout = false,
showBodyweightDialog,  setShowBodyweightDialog,  bodyweightInput,  setBodyweightInput,  onSaveBodyweight,  userBodyweight,
}: WorkoutDialogsProps) {
  return (
    <>
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
            <Button onClick={onSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExerciseNotesDialog} onOpenChange={setShowExerciseNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exercise Notes</DialogTitle>
            <DialogDescription>Add notes about this exercise, technique cues, or form observations.</DialogDescription>
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
            <Button onClick={onSaveExerciseNotes}>Save Notes</Button>
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

      {/* Add Exercise Dialog moved to AddExerciseDialog component */}

      <Dialog open={showEndWorkoutDialog} onOpenChange={setShowEndWorkoutDialog}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Check className="h-5 w-5" />
              End Workout
            </DialogTitle>
            <DialogDescription>
              This will mark all remaining sets as skipped and complete your current workout. You'll be able to start the next workout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800 font-medium">
                To confirm, please type "End Workout" in the field below:
              </p>
            </div>
            <Input
              placeholder="Type 'End Workout' to confirm"
              value={endWorkoutConfirmation}
              onChange={(e) => setEndWorkoutConfirmation(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border/30">
            <Button
              variant="outline"
              onClick={() => {
                setShowEndWorkoutDialog(false)
                setEndWorkoutConfirmation("")
              }}
              disabled={isCompletingWorkout}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={onEndWorkout}
              disabled={endWorkoutConfirmation.toLowerCase() !== "end workout" || isCompletingWorkout}
            >
              {isCompletingWorkout ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                  <span>Ending...</span>
                </span>
              ) : (
                "End Workout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndProgramDialog} onOpenChange={setShowEndProgramDialog}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              End Program
            </DialogTitle>
            <DialogDescription>
              This will mark all remaining sets as skipped and end your current program. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                To confirm, please type "End Program" in the field below:
              </p>
            </div>
            <Input
              placeholder="Type 'End Program' to confirm"
              value={endProgramConfirmation}
              onChange={(e) => setEndProgramConfirmation(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border/30">
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
              onClick={onEndProgram}
              disabled={endProgramConfirmation.toLowerCase() !== "end program" || isCompletingWorkout}
            >
              {isCompletingWorkout ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                  <span>Ending...</span>
                </span>
              ) : (
                "End Program"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
<BodyweightDialog        open={showBodyweightDialog}        onOpenChange={setShowBodyweightDialog}        bodyweightValue={bodyweightInput}        onBodyweightChange={setBodyweightInput}        onSave={onSaveBodyweight}        existingBodyweight={userBodyweight}      />
    </>
  )
}
