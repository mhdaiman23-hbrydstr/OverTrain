'use client'

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ExerciseInWizard } from '../types'
import { ExerciseRow } from './ExerciseRow'
import { cn } from '@/lib/utils'

interface SortableExerciseRowProps {
  exercise: ExerciseInWizard
  onRemove: (tempId: string) => void
  actionSlot?: ReactNode
  isActive?: boolean
}

export function SortableExerciseRow({
  exercise,
  onRemove,
  actionSlot,
  isActive = false,
}: SortableExerciseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.tempId })

  const style = useMemo<CSSProperties>(() => {
    const result: CSSProperties = {}
    const transformString = CSS.Transform.toString(transform)
    if (transformString) {
      result.transform = transformString
    }
    if (transition) {
      result.transition = transition
    }
    return result
  }, [transform, transition])

  const dragging = isDragging || isActive

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative touch-manipulation',
        dragging && 'z-20',
      )}
    >
      <ExerciseRow
        exercise={exercise}
        onRemove={onRemove}
        actionSlot={actionSlot}
        dragHandle={
          <button
            type="button"
            className="flex h-full items-center justify-center rounded-md border border-transparent px-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing touch-none"
            aria-label="Drag to reorder exercise"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
        isDragging={dragging}
      />
    </div>
  )
}
