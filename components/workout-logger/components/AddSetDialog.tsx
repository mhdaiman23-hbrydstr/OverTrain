"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, Info } from "lucide-react"

interface AddSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  onConfirm: (repeatInFollowingWeeks: boolean) => Promise<void>
  isAdding?: boolean
}

export function AddSetDialog({
  open,
  onOpenChange,
  exerciseName,
  onConfirm,
  isAdding = false,
}: AddSetDialogProps) {
  const [repeatInFollowingWeeks, setRepeatInFollowingWeeks] = useState(false)

  const handleConfirm = async () => {
    await onConfirm(repeatInFollowingWeeks)
    setRepeatInFollowingWeeks(false)
  }

  const handleCancel = () => {
    setRepeatInFollowingWeeks(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Set to {exerciseName}</DialogTitle>
          <DialogDescription>
            Add an additional set to this exercise. You can choose to repeat this set in all following weeks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="repeat-sets"
              checked={repeatInFollowingWeeks}
              onCheckedChange={(checked) => setRepeatInFollowingWeeks(checked === true)}
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="repeat-sets" className="text-sm font-medium cursor-pointer">
                Repeat in following weeks
              </Label>
              <p className="text-xs text-muted-foreground">
                If checked, this set will be added to all future workouts for this exercise in this program.
              </p>
            </div>
          </div>
          {repeatInFollowingWeeks && (
            <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                This will modify your program template. The set will appear in all future workouts for this exercise.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isAdding}>
            {isAdding ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </span>
            ) : (
              "Add Set"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

