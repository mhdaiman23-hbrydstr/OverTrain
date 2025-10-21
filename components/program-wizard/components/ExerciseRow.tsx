import type { ReactNode } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ExerciseInWizard } from '../types'
import { cn } from '@/lib/utils'

interface DragHandlers {
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void
  onDragEnter?: (event: React.DragEvent<HTMLElement>) => void
  onDragOver?: (event: React.DragEvent<HTMLElement>) => void
  onDrop?: (event: React.DragEvent<HTMLElement>) => void
  onDragEnd?: (event: React.DragEvent<HTMLElement>) => void
}

interface ExerciseRowProps {
  exercise: ExerciseInWizard
  onRemove: (tempId: string) => void
  dragHandlers?: DragHandlers
  isDragOver?: boolean
  actionSlot?: ReactNode
  disableDrag?: boolean
}

export function ExerciseRow({
  exercise,
  onRemove,
  dragHandlers,
  isDragOver,
  actionSlot,
  disableDrag,
}: ExerciseRowProps) {
  const isDraggable = !!dragHandlers && !disableDrag

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-dashed border-border/60 bg-background px-3 py-2 transition-colors',
        'hover:border-primary/60',
        isDragOver && 'border-primary bg-primary/5',
      )}
      onDragEnter={event => {
        event.preventDefault()
        dragHandlers?.onDragEnter?.(event)
      }}
      onDragOver={event => {
        event.preventDefault()
        dragHandlers?.onDragOver?.(event)
      }}
      onDrop={event => {
        event.preventDefault()
        dragHandlers?.onDrop?.(event)
      }}
    >
      <button
        type="button"
        className={cn(
          'flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors',
          isDraggable &&
            'cursor-grab active:cursor-grabbing hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        )}
        draggable={isDraggable}
        onDragStart={(e) => { if (e.dataTransfer) { e.dataTransfer.setData('text/plain','reorder'); e.dataTransfer.effectAllowed = 'move'; } dragHandlers?.onDragStart?.(e) }}
        onDragEnd={dragHandlers?.onDragEnd}
        aria-label="Reorder exercise"
        disabled={!isDraggable}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{exercise.exerciseName}</span>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {exercise.category}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-x-3">
          <span>{exercise.muscleGroup}</span>
          {exercise.equipmentType && <span>{exercise.equipmentType}</span>}
          <span>{exercise.restTime}s rest</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {actionSlot}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(exercise.tempId)}
          aria-label={`Remove ${exercise.exerciseName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
