'use client'

import { useState } from 'react'
import { ExerciseNote } from '@/lib/types/progression'
import { Button } from '@/components/ui/button'

interface ExerciseNotesDialogProps {
  exerciseName: string
  initialNote?: ExerciseNote
  onSave: (noteText: string, isPinned: boolean) => Promise<void>
  onDelete?: () => Promise<void>
  isOpen: boolean
  onClose: () => void
}

/**
 * Exercise Notes Dialog Component
 * Modal for creating/editing exercise notes with pin toggle.
 *
 * Features:
 * - Textarea for note content
 * - Checkbox to pin note (repeats weekly)
 * - Save/Delete/Cancel buttons
 */
export function ExerciseNotesDialog({
  exerciseName,
  initialNote,
  onSave,
  onDelete,
  isOpen,
  onClose
}: ExerciseNotesDialogProps) {
  const [noteText, setNoteText] = useState(initialNote?.noteText || '')
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned || false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!noteText.trim()) {
      setError('Note cannot be empty')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await onSave(noteText, isPinned)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    if (!confirm('Delete this note? This cannot be undone.')) {
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full shadow-lg border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Notes: {exerciseName}</h2>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add coaching notes, form cues, or reminders..."
          className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />

        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-500"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            📌 Pin this note to repeat each week
          </span>
        </label>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500 rounded text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isLoading || !noteText.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Note'}
          </Button>
          {onDelete && (
            <Button
              onClick={handleDelete}
              disabled={isLoading}
              variant="outline"
              className="px-4 border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </Button>
          )}
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
            className="px-4"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
