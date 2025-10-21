import type { ReactNode } from 'react'
import { GripVertical, Trash2, ChevronUp, ChevronDown, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function ExerciseRow({
  exercise,
  onRemove,
  dragHandlers,
  isDragOver,
  actionSlot,
  disableDrag,
  onMoveUp,
  onMoveDown,
}: ExerciseRowProps) {
  const isDraggable = !!dragHandlers && !disableDrag

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-dashed border-border/60 bg-background px-3 py-2 transition-colors',
        'hover:border-primary/60',
        isDraggable && 'cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02] active:scale-[1.02]',
        isDragOver && 'border-primary bg-primary/5 shadow-lg scale-[1.02]',
      )}
      draggable={isDraggable}
      onDragStart={(e) => { 
        if (e.dataTransfer) { 
          e.dataTransfer.setData('text/plain','reorder'); 
          e.dataTransfer.effectAllowed = 'move'; 
        } 
        dragHandlers?.onDragStart?.(e) 
      }}
      onDragEnd={dragHandlers?.onDragEnd}
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
      onTouchStart={(e) => {
        // Enable touch events for mobile drag functionality
        if (isDraggable) {
          e.stopPropagation()
          // Add haptic feedback on touch devices if available
          if ('vibrate' in navigator) {
            navigator.vibrate(50)
          }
        }
      }}
      onTouchMove={(e) => {
        if (isDraggable) {
          // Only prevent default if we're actually dragging
          // This allows scrolling when not actively dragging
          e.stopPropagation()
        }
      }}
      onTouchEnd={(e) => {
        if (isDraggable) {
          e.stopPropagation()
        }
      }}
      aria-label={`Exercise: ${exercise.exerciseName}${isDraggable ? ' - Drag to reorder' : ''}`}
    >
      {/* Subtle drag indicator */}
      {isDraggable && (
        <div className="flex items-center justify-center text-muted-foreground/30">
          <GripVertical className="size-4" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm flex-1" title={exercise.exerciseName}>{exercise.exerciseName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span title={exercise.muscleGroup}>{exercise.muscleGroup}</span>
          {exercise.equipmentType && (
            <>
              <span className="text-border/40">•</span>
              <span title={exercise.equipmentType}>{exercise.equipmentType}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
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
