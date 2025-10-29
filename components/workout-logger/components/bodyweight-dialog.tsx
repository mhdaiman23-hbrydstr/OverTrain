"use client"

import { Dispatch, SetStateAction, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface BodyweightDialogProps {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
  bodyweightValue: string
  onBodyweightChange: Dispatch<SetStateAction<string>>
  onSave: (bodyweight: number) => Promise<void>
  existingBodyweight?: number
}

export function BodyweightDialog({
  open,
  onOpenChange,
  bodyweightValue,
  onBodyweightChange,
  onSave,
  existingBodyweight,
}: BodyweightDialogProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const bodyweight = parseFloat(bodyweightValue)
    if (isNaN(bodyweight) || bodyweight <= 0) {
      return
    }

    setIsSaving(true)
    try {
      await onSave(bodyweight)
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = bodyweightValue && !isNaN(parseFloat(bodyweightValue)) && parseFloat(bodyweightValue) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Your Bodyweight</DialogTitle>
          <DialogDescription>
            This will fill all sets for the bodyweight exercise with your current weight.
            {existingBodyweight && ` Your saved weight is ${existingBodyweight} kg.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bodyweight (kg)</label>
            <Input
              type="number"
              placeholder="Enter your bodyweight"
              value={bodyweightValue}
              onChange={(e) => onBodyweightChange(e.target.value)}
              disabled={isSaving}
              autoFocus
              step="0.5"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onBodyweightChange("")
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? (
              <span className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                <span>Saving...</span>
              </span>
            ) : (
              "Save Bodyweight"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
