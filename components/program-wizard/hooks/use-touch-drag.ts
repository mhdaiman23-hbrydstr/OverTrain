import { useRef, useEffect, useCallback } from 'react'

interface TouchDragCallbacks {
  onDragStart: (exerciseIndex: number) => void
  onDragMove: (exerciseIndex: number) => void
  onDragEnd: () => void
}

export function useTouchDrag(callbacks: TouchDragCallbacks) {
  const touchStartRef = useRef<{ y: number; exerciseIndex: number } | null>(null)
  const isDraggingRef = useRef(false)
  const callbacksRef = useRef(callbacks)

  // Keep callbacks ref in sync
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const handleTouchStart = useCallback(
    (exerciseIndex: number, e: React.TouchEvent<HTMLElement>) => {
      // Only handle if there's at least one touch point
      if (e.touches.length !== 1) return

      touchStartRef.current = {
        y: e.touches[0].clientY,
        exerciseIndex,
      }
      isDraggingRef.current = true
      callbacksRef.current.onDragStart(exerciseIndex)
    },
    []
  )

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!isDraggingRef.current || !touchStartRef.current) return

    // Note: We don't call preventDefault() here because touch events are passive.
    // Instead, use CSS 'touch-action: none' on the draggable container to prevent scrolling.
    // See: ExerciseRow component styling

    const currentY = e.touches[0].clientY

    // Find which exercise we're hovering over
    const allRows = document.querySelectorAll('[data-exercise-row]')
    let hoveredIndex = touchStartRef.current.exerciseIndex

    allRows.forEach((row, index) => {
      const rect = row.getBoundingClientRect()
      if (currentY >= rect.top && currentY <= rect.bottom) {
        hoveredIndex = index
      }
    })

    callbacksRef.current.onDragMove(hoveredIndex)
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
    touchStartRef.current = null
    callbacksRef.current.onDragEnd()
  }, [])

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
