'use client'

import { ExerciseNote } from '@/lib/types/progression'

interface ExerciseNotesBannerProps {
  note: ExerciseNote
  onEdit: () => void
}

/**
 * Exercise Notes Banner Component
 * Displays above exercise name when notes exist.
 *
 * Visual style:
 * - Yellow/gold background (bg-yellow-600/20)
 * - Yellow left border (border-l-4 border-yellow-500)
 * - Small text with pin icon if pinned
 * - Clickable to edit
 */
export function ExerciseNotesBanner({ note, onEdit }: ExerciseNotesBannerProps) {
  return (
    <button
      onClick={onEdit}
      className="w-full px-3 py-2 mb-2 bg-yellow-600/20 border-l-4 border-yellow-500 rounded text-yellow-100 text-sm hover:bg-yellow-600/30 transition cursor-pointer text-left"
      title="Click to edit note"
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold mt-0.5 flex-shrink-0">NOTE</span>
        <span className="flex-1 truncate">{note.noteText}</span>
        {note.isPinned && <span className="text-xs flex-shrink-0">📌</span>}
      </div>
    </button>
  )
}
