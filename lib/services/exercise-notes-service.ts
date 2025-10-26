/**
 * ExerciseNotesService
 * Manages exercise-specific notes with pinning for week-to-week carryover.
 *
 * Key behaviors:
 * - One note per exercise per week (UNIQUE constraint)
 * - Pinned notes auto-repeat to next week
 * - Notes deleted when exercise is replaced
 * - Notes are instance-specific (not cross-program)
 */

import { ExerciseNote } from '@/lib/types/progression'

const NOTES_STORAGE_KEY = 'liftlog_exercise_notes'

export class ExerciseNotesService {
  /**
   * Save or update a note for an exercise in a specific week.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param week - Week number
   * @param noteText - The note content
   * @param isPinned - Whether note should repeat to next week
   * @returns The saved note
   */
  static async saveNote(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number,
    noteText: string,
    isPinned: boolean
  ): Promise<ExerciseNote> {
    const now = Date.now()
    const noteId = crypto.randomUUID()

    const note: ExerciseNote = {
      id: noteId,
      userId,
      programInstanceId,
      exerciseId,
      week,
      noteText,
      isPinned,
      createdAt: now,
      updatedAt: now
    }

    // Update localStorage immediately
    this.updateLocalStorage(note)

    // TODO: Sync to Supabase async
    // await db.upsert('exercise_notes', note)

    return note
  }

  /**
   * Get note for an exercise in a specific week.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param week - Week number
   * @returns Note or null if not found
   */
  static async getNote(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number
  ): Promise<ExerciseNote | null> {
    // Check localStorage first
    const notes = this.getFromLocalStorage()
    const note = notes.find(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId &&
        n.week === week
    )

    if (note) return note

    // TODO: Query Supabase if not in localStorage
    // const dbNote = await db.query('exercise_notes', {...})
    // return dbNote || null

    return null
  }

  /**
   * Get pinned note for an exercise and auto-create for next week if needed.
   * This enables the "pin to repeat" functionality.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param currentWeek - Current week number
   * @returns Note that was pinned in previous week, or null
   */
  static async getPinnedNoteForWeek(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    currentWeek: number
  ): Promise<ExerciseNote | null> {
    if (currentWeek <= 1) return null // No previous week

    const previousWeek = currentWeek - 1

    // Check localStorage for pinned note from previous week
    const notes = this.getFromLocalStorage()
    const pinnedNote = notes.find(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId &&
        n.week === previousWeek &&
        n.isPinned === true
    )

    if (!pinnedNote) return null

    // Auto-create note for current week (unless already exists)
    const existingNote = await this.getNote(userId, programInstanceId, exerciseId, currentWeek)
    if (existingNote) return existingNote

    // Create new note for current week with same text and pinned status
    const newNote = await this.saveNote(
      userId,
      programInstanceId,
      exerciseId,
      currentWeek,
      pinnedNote.noteText,
      pinnedNote.isPinned
    )

    return newNote
  }

  /**
   * Delete a note.
   *
   * @param noteId - Note UUID
   */
  static async deleteNote(noteId: string): Promise<void> {
    // Remove from localStorage
    const notes = this.getFromLocalStorage()
    const filtered = notes.filter(n => n.id !== noteId)
    this.setLocalStorage(filtered)

    // TODO: Delete from Supabase
    // await db.delete('exercise_notes', noteId)
  }

  /**
   * Get all notes for all exercises in a specific week.
   * Useful for bulk loading.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param week - Week number
   * @returns Array of notes for that week
   */
  static async getNotesForWeek(
    userId: string,
    programInstanceId: string,
    week: number
  ): Promise<ExerciseNote[]> {
    const notes = this.getFromLocalStorage()
    return notes.filter(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.week === week
    )
  }

  /**
   * Delete all notes for an exercise (when exercise is replaced).
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   */
  static async deleteExerciseNotes(
    userId: string,
    programInstanceId: string,
    exerciseId: string
  ): Promise<void> {
    const notes = this.getFromLocalStorage()
    const filtered = notes.filter(
      n =>
        !(
          n.userId === userId &&
          n.programInstanceId === programInstanceId &&
          n.exerciseId === exerciseId
        )
    )
    this.setLocalStorage(filtered)

    // TODO: Delete from Supabase
    // await db.delete('exercise_notes', { exercise_id: exerciseId, user_id: userId })
  }

  /**
   * Get notes for an exercise across all weeks (useful for history view).
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @returns Array of all notes for that exercise in that program
   */
  static async getExerciseNotes(
    userId: string,
    programInstanceId: string,
    exerciseId: string
  ): Promise<ExerciseNote[]> {
    const notes = this.getFromLocalStorage()
    return notes.filter(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId
    )
  }

  /**
   * localStorage helpers
   */

  private static getFromLocalStorage(): ExerciseNote[] {
    if (typeof window === 'undefined') return []
    try {
      const data = window.localStorage.getItem(NOTES_STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      console.error('Failed to load notes from localStorage')
      return []
    }
  }

  private static setLocalStorage(notes: ExerciseNote[]): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
    } catch {
      console.error('Failed to save notes to localStorage')
    }
  }

  private static updateLocalStorage(newNote: ExerciseNote): void {
    const notes = this.getFromLocalStorage()
    // Remove old note with same key
    const filtered = notes.filter(
      n =>
        !(
          n.userId === newNote.userId &&
          n.programInstanceId === newNote.programInstanceId &&
          n.exerciseId === newNote.exerciseId &&
          n.week === newNote.week
        )
    )
    // Add new note
    filtered.push(newNote)
    this.setLocalStorage(filtered)
  }

  /**
   * Clear all notes from localStorage (for testing/reset).
   */
  static clearLocalStorage(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(NOTES_STORAGE_KEY)
    } catch {
      console.error('Failed to clear notes from localStorage')
    }
  }
}
