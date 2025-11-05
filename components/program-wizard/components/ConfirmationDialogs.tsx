import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={value => !value && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ExitConfirmationProps {
  open: boolean
  onStay: () => void
  onSaveDraft: () => void
  onDiscard: () => void
}

export function ExitConfirmation({ open, onStay, onSaveDraft, onDiscard }: ExitConfirmationProps) {
  return (
    <AlertDialog open={open} onOpenChange={value => {
      if (!value) {
        onStay()
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard Your Custom Program?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved progress. Save a draft to finish later or discard the current changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row sm:items-center sm:justify-between">
          <AlertDialogCancel onClick={onStay}>Keep Editing</AlertDialogCancel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={onSaveDraft}>
              Save draft &amp; exit
            </Button>
            <AlertDialogAction
              onClick={onDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard changes
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
