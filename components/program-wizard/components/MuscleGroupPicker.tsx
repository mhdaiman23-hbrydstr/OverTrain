import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MUSCLE_GROUP_CATEGORIES } from '../constants'
import type { MuscleGroupSelection } from '../types'

type SelectionMap = Record<string, MuscleGroupSelection>

const MAX_COUNT_PER_GROUP = 6

interface MuscleGroupPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selection: MuscleGroupSelection[]
  onSave: (selection: MuscleGroupSelection[]) => void
}

export function MuscleGroupPicker({ open, onOpenChange, selection, onSave }: MuscleGroupPickerProps) {
  const [localSelection, setLocalSelection] = useState<SelectionMap>({})

  useEffect(() => {
    const mapped: SelectionMap = {}
    selection.forEach(item => {
      const key = `${item.category}:${item.group}`
      mapped[key] = { ...item }
    })
    setLocalSelection(mapped)
  }, [selection, open])

  const totalSelected = useMemo(() => {
    return Object.values(localSelection).reduce((total, item) => total + item.count, 0)
  }, [localSelection])

  const updateGroup = (category: MuscleGroupSelection['category'], group: string, delta: number) => {
    setLocalSelection(prev => {
      const key = `${category}:${group}`
      const current = prev[key] ?? { category, group, count: 0 }
      const nextCount = Math.min(MAX_COUNT_PER_GROUP, Math.max(0, current.count + delta))

      if (nextCount === 0) {
        const { [key]: _toRemove, ...rest } = prev
        return rest
      }

      return {
        ...prev,
        [key]: {
          category,
          group,
          count: nextCount,
        },
      }
    })
  }

  const handleSave = () => {
    onSave(Object.values(localSelection))
    onOpenChange(false)
  }

  const handleClear = () => {
    setLocalSelection({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl mx-auto" showCloseButton={false}>
        <DialogHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <DialogTitle>Select muscle groups</DialogTitle>
            <DialogDescription>
              Choose the focus areas for this day. Use + / − to set how many exercises you want per muscle group.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] pr-2">
          <div className="space-y-6">
            {Object.entries(MUSCLE_GROUP_CATEGORIES).map(([categoryKey, info]) => (
              <div key={categoryKey} className="space-y-3">
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {info.label}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {info.groups.map(group => {
                    const key = `${categoryKey}:${group}`
                    const selected = localSelection[key]?.count ?? 0
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{group}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => updateGroup(categoryKey as MuscleGroupSelection['category'], group, -1)}
                            disabled={selected === 0}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">{selected}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => updateGroup(categoryKey as MuscleGroupSelection['category'], group, 1)}
                            disabled={selected >= MAX_COUNT_PER_GROUP}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between items-center gap-3">
          <div className="text-sm text-muted-foreground">Total exercises planned: {totalSelected}</div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleSave} disabled={totalSelected === 0}>
              Save groups
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
