'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus, Shuffle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { DayInWizard, ExerciseInWizard } from '../types'
import { DayNameEditor } from './DayNameEditor'
import { SortableExerciseRow } from './SortableExerciseRow'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

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
  onAddExercise?: (dayIndex: number) => void
  disableAddExercise?: boolean
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
  onAddExercise,
  disableAddExercise,
}: DaySectionProps) {
  const [open, setOpen] = useState(true)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const items = useMemo(() => day.exercises.map(exercise => exercise.tempId), [day.exercises])

  const handleAddExerciseClick = () => {
    onAddExercise?.(index)
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

        <div className="flex items-center gap-1" onClick={event => event.stopPropagation()}>
          <DayNameEditor dayName={day.dayName} onSave={name => onRename(index, name)} />
          {onEditMuscleGroups && (
            <Button
              variant="ghost"
              size="icon"
              onClick={event => {
                event.stopPropagation()
                onEditMuscleGroups?.(index)
              }}
              aria-label="Adjust muscle groups"
            >
              <Plus className="size-4" />
            </Button>
          )}
          {onRandomize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={event => {
                event.stopPropagation()
                onRandomize?.(index)
              }}
              aria-label="Shuffle exercises for this day"
            >
              <Shuffle className="size-4" />
            </Button>
          )}
          {onRemoveDay && (
            <Button
              variant="ghost"
              size="icon"
              onClick={event => {
                event.stopPropagation()
                onRemoveDay?.(index)
              }}
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
              <p>No exercises added yet. Use the assignment step or randomize button to populate this day.</p>
              {onAddExercise && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleAddExerciseClick}
                  disabled={disableAddExercise}
                >
                  <Plus className="mr-2 size-4" />
                  Add exercise
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event: DragStartEvent) => {
                  if (typeof event.active.id === 'string') {
                    setActiveExerciseId(event.active.id)
                  }
                }}
                onDragCancel={() => setActiveExerciseId(null)}
                onDragEnd={(event: DragEndEvent) => {
                  setActiveExerciseId(null)
                  const { active, over } = event
                  if (!over) return

                  const dataFromIndex = active.data.current?.sortable?.index as number | undefined
                  const dataToIndex = over.data.current?.sortable?.index as number | undefined

                  const fallbackFromIndex = day.exercises.findIndex(exercise => exercise.tempId === active.id)
                  const fallbackToIndex = day.exercises.findIndex(exercise => exercise.tempId === over.id)

                  const sourceIndex = typeof dataFromIndex === 'number' ? dataFromIndex : fallbackFromIndex
                  const targetIndex = typeof dataToIndex === 'number' ? dataToIndex : fallbackToIndex

                  if (sourceIndex === -1 || targetIndex === -1) {
                    return
                  }

                  if (sourceIndex !== targetIndex) {
                    onReorderExercise(index, sourceIndex, targetIndex)
                  }
                }}
              >
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  {day.exercises.map((exercise, exerciseIndex) => (
                    <SortableExerciseRow
                      key={exercise.tempId}
                      exercise={exercise}
                      onRemove={tempId => onRemoveExercise(index, tempId)}
                      actionSlot={renderExerciseActions?.({ exercise, dayIndex: index, exerciseIndex })}
                      isActive={activeExerciseId === exercise.tempId}
                      onMoveUp={() => onReorderExercise(index, exerciseIndex, Math.max(0, exerciseIndex - 1))}
                      onMoveDown={() => onReorderExercise(index, exerciseIndex, Math.min(day.exercises.length - 1, exerciseIndex + 1))}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {onAddExercise && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleAddExerciseClick}
                  disabled={disableAddExercise}
                >
                  <Plus className="mr-2 size-4" />
                  Add exercise
                </Button>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
