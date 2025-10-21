import { useEffect, useState } from 'react'
import { PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface DayNameEditorProps {
  dayName: string
  onSave: (name: string) => void
  triggerLabel?: string
}

export function DayNameEditor({ dayName, onSave, triggerLabel = 'Rename day' }: DayNameEditorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(dayName)

  useEffect(() => {
    if (open) {
      setValue(dayName)
    }
  }, [dayName, open])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSave(trimmed)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={triggerLabel}>
          <PencilLine className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Rename training day</DialogTitle>
          <DialogDescription>Give this day a descriptive name so it is easy to recognize later.</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSubmit()
            }
          }}
          autoFocus
          placeholder="e.g. Upper Push"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!value.trim()}>
            Save name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
