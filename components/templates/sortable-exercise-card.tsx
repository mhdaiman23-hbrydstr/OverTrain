"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { ReactNode } from "react"
import { Card } from "@/components/ui/card"

interface SortableExerciseCardProps {
  id: string
  children: ReactNode
  isDragging?: boolean
}

export function SortableExerciseCard({
  id,
  children,
  isDragging = false,
}: SortableExerciseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const isActive = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isActive ? "z-50" : ""}`}
    >
      <Card
        className={`p-3 border-2 transition-colors ${
          isActive
            ? "border-primary/50 bg-accent/50"
            : "border-border hover:border-border/80"
        }`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-2 mb-3 cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-accent/30 transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">Drag to reorder</span>
        </div>

        {/* Content */}
        <div className="pl-6">{children}</div>
      </Card>
    </div>
  )
}
