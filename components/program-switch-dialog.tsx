"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ProgramSwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProgramName: string
  newProgramName: string
  completionPercentage: number
  onConfirm: () => void
}

export function ProgramSwitchDialog({
  open,
  onOpenChange,
  currentProgramName,
  newProgramName,
  completionPercentage,
  onConfirm,
}: ProgramSwitchDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch Program?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                You currently have <span className="font-semibold text-foreground">{currentProgramName}</span> active
                with <span className="font-semibold text-foreground">{Math.round(completionPercentage)}%</span>{" "}
                completion.
              </div>
              <div>
                Starting <span className="font-semibold text-foreground">{newProgramName}</span> will move your current
                program to history. You can always view your progress in the History tab.
              </div>
              <div className="text-sm">Do you want to proceed?</div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
            Yes, Switch Program
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
