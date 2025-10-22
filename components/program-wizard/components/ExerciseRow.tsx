'use client'

import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExerciseInWizard } from '../types'
import { cn } from '@/lib/utils'

interface ExerciseRowProps {
  exercise: ExerciseInWizard
  onRemove: (tempId: string) => void
  isDragOver?: boolean
  actionSlot?: ReactNode
}

export function ExerciseRow({
  exercise,
  onRemove,
  isDragOver,
  actionSlot,
}: ExerciseRowProps) {

  return (
    <div
      data-exercise-row
      className={cn(
        'flex items-center gap-3 rounded-md border border-dashed border-border/60 bg-background px-3 py-2 transition-all duration-200',
        'hover:border-primary/60',
        isDragOver && 'border-primary bg-primary/5 shadow-lg scale-[1.02]',
      )}
      aria-label={`Exercise: ${exercise.exerciseName}`}
    >

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
          className="text-destructive hover:text-destructive touch-manipulation min-h-[44px] min-w-[44px]"
          onClick={() => onRemove(exercise.tempId)}
          aria-label={`Remove ${exercise.exerciseName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
