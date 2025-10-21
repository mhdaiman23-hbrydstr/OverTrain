import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus, Shuffle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { DayInWizard, ExerciseInWizard } from '../types'
import { ExerciseRow } from './ExerciseRow'
import { DayNameEditor } from './DayNameEditor'

interface DaySectionProps {
  index: number
  day: DayInWizard
  onRename: (index: number, name: string) => void
  onEditMuscleGroups?: (index: number) => void
  onRandomize?: (index: number) => void
  onRemoveDay?: (index: number) => void
  onRemoveExercise: (dayIndex: number, tempId: string) => void
  onReorderExercise: (dayIndex: number, fromIndex: number, toIndex: number) => void
  renderExerciseActions?: (params: { exercise: ExerciseInWizard; dayIndex: number; exerciseIndex: number }) => ReactNode
}

export function DaySection({
  index,
  day,
  onRename,
  onEditMuscleGroups,
  onRandomize,
  onRemoveDay,
  onRemoveExercise,
  onReorderExercise,
  renderExerciseActions,
}: DaySectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [open, setOpen] = useState(true)

  const handleDragStart = (exerciseIndex: number) => () => {
    setDraggedIndex(exerciseIndex)
  }

  const handleDragEnter = (exerciseIndex: number) => () => {
    if (draggedIndex === null || draggedIndex === exerciseIndex) return
    setDragOverIndex(exerciseIndex)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDrop = (exerciseIndex: number) => () => {
    if (draggedIndex === null) return
    onReorderExercise(index, draggedIndex, exerciseIndex)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/60 bg-card shadow-sm transition-shadow data-[state=open]:shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label={open ? 'Collapse day details' : 'Expand day details'}
            >
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </CollapsibleTrigger>
          <Badge variant="outline" className="text-xs">
            Day {day.dayNumber}
          </Badge>
          <h3 className="text-base font-semibold">{day.dayName}</h3>
        </div>

        <div className="flex items-center gap-1">
          <DayNameEditor dayName={day.dayName} onSave={name => onRename(index, name)} />
          {onEditMuscleGroups && (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onEditMuscleGroups?.(index) }}
              aria-label="Adjust muscle groups"
            >
              <Plus className="size-4" />
            </Button>
          )}
          {onRandomize && (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onRandomize?.(index) }}
              aria-label="Shuffle exercises for this day"
            >
              <Shuffle className="size-4" />
            </Button>
          )}
          {onRemoveDay && (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onRemoveDay?.(index) }}
              className="text-destructive hover:text-destructive"
              aria-label="Delete training day"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-4 py-4 space-y-4">
          {day.muscleGroups && day.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {day.muscleGroups.map(group => (
                <Badge key={`${group.category}:${group.group}`} variant="secondary" className="text-xs">
                  {group.group} x {group.count}
                </Badge>
              ))}
            </div>
          )}

          {day.exercises.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              No exercises added yet. Use the assignment step or randomize button to populate this day.
            </div>
          ) : (
            <div className="space-y-3">
              {day.exercises.map((exercise, exerciseIndex) => (
                <ExerciseRow
                  key={exercise.tempId}
                  exercise={exercise}
                  onRemove={tempId => onRemoveExercise(index, tempId)}
                  actionSlot={renderExerciseActions?.({ exercise, dayIndex: index, exerciseIndex })}
                  dragHandlers={{
                    onDragStart: handleDragStart(exerciseIndex),
                    onDragEnter: handleDragEnter(exerciseIndex),
                    onDragEnd: handleDragEnd,
                    onDrop: handleDrop(exerciseIndex),
                  }}
                  isDragOver={dragOverIndex === exerciseIndex && draggedIndex !== null && draggedIndex !== exerciseIndex}
                />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

