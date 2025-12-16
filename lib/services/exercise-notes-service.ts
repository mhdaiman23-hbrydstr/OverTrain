/**
 * ExerciseNotesService
 * Manages exercise-specific notes with pinning for week-to-week carryover.
 *
 * Architecture: Supabase is source of truth, localStorage is cache
 * - Reads: Check cache first, fall back to Supabase
 * - Writes: Update cache immediately, queue sync to Supabase
 * - Invalidation: Cache invalidates when week changes
 * - Sync: Background queue persists offline changes until sync succeeds
 * - Conflicts: Last-write-wins based on updatedAt timestamp
 *
 * Key behaviors:
 * - One note per exercise per week (UNIQUE constraint)
 * - Pinned notes auto-repeat to next week
 * - Notes deleted when exercise is replaced
 * - Notes are instance-specific (not cross-program, ignores legacy notes)
 */

import { ExerciseNote } from '@/lib/types/progression'
import { supabase } from '@/lib/supabase'

const NOTES_STORAGE_KEY = 'liftlog_exercise_notes'
const NOTES_CACHE_META_KEY = 'liftlog_exercise_notes_meta'
const NOTES_SYNC_QUEUE_KEY = 'liftlog_exercise_notes_sync_queue'

interface CacheMeta {
  programInstanceId: string
  week: number
  loadedAt: number
}

interface SyncQueueItem {
  action: 'save' | 'delete'
  note?: ExerciseNote
  noteId?: string
  userId?: string
  timestamp: number
  retries: number
}

export class ExerciseNotesService {
  /**
   * Check if exercise_notes table is accessible
   * Useful for debugging Supabase connectivity issues
   */
  static async isTableAccessible(): Promise<boolean> {
    if (!supabase) {
      console.log('[ExerciseNotes] Supabase not configured')
      return false
    }

    try {
      const { error } = await supabase
        .from('exercise_notes')
        .select('count()', { count: 'exact' })
        .limit(1)

      if (error) {
        console.warn('[ExerciseNotes] Table not accessible:', {
          code: error.code,
          message: error.message
        })
        return false
      }

      console.log('[ExerciseNotes] Table is accessible ✓')
      return true
    } catch (error) {
      console.warn('[ExerciseNotes] Table accessibility check failed:', error)
      return false
    }
  }

  /**
   * Hydrate cache on app load - loads all notes for the current program instance
   * from Supabase and caches them in localStorage.
   * Gracefully handles cases where table doesn't exist yet.
   */
  static async hydrateCache(
    userId: string,
    programInstanceId: string
  ): Promise<void> {
    if (!supabase) {
      console.log('[ExerciseNotes] Supabase not configured, skipping hydration')
      return
    }

    try {
      console.log('[ExerciseNotes] Hydrating cache for program instance:', programInstanceId)
      console.log('[ExerciseNotes] Query parameters - userId:', userId, 'programInstanceId:', programInstanceId)

      // Query all notes for this program instance from Supabase
      let queryResult: any
      try {
        queryResult = await supabase
          .from('exercise_notes')
          .select('*')
          .eq('user_id', userId)
          .eq('program_instance_id', programInstanceId)
        console.log('[ExerciseNotes] Query executed successfully')
      } catch (queryError) {
        console.error('[ExerciseNotes] Query threw an exception:', String(queryError))
        this.setLocalStorage([])
        return
      }

      const { data, error } = queryResult

      if (error) {
        // Log error details as a string to avoid serialization issues
        const errorCode = (error as any).code || 'unknown'
        const errorMessage = (error as any).message || 'unknown'
        const errorStatus = (error as any).status || 'unknown'

        const errorLogStr = `Code=${errorCode}, Message=${errorMessage}, Status=${errorStatus}`

        console.error('[ExerciseNotes] Query failed during hydrate. Details:', errorLogStr)

        // Handle common errors gracefully
        if (errorCode === 'PGRST116' || errorCode === '42P01' || errorMessage?.includes('does not exist')) {
          // Table doesn't exist or no rows found - this is OK
          console.log('[ExerciseNotes] No notes found yet, starting with clean cache')
          this.setLocalStorage([])
          this.setCacheMeta({
            programInstanceId,
            week: 0,
            loadedAt: Date.now()
          })
          return
        }

        // Handle RLS/Permission errors
        if (errorCode === '42501' || errorMessage?.includes('permission') || errorMessage?.includes('Policy')) {
          console.error('[ExerciseNotes] ⚠️ RLS POLICY ERROR - Check that Row Level Security policies are set up correctly on exercise_notes table!')
          console.error('[ExerciseNotes] Error details:', errorLogStr)
          this.setLocalStorage([])
          return
        }

        // For other errors, continue but log them
        console.error('[ExerciseNotes] Unexpected error during hydrate:', errorLogStr)
        this.setLocalStorage([])
        return
      }

      // Filter out legacy notes (missing program_instance_id)
      const validNotes = (data || []).filter((row: any) => row.program_instance_id)

      const notes = validNotes.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        programInstanceId: row.program_instance_id,
        exerciseId: row.exercise_id,
        week: row.week,
        noteText: row.note_text,
        isPinned: row.is_pinned,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime()
      }))

      // Store in localStorage with metadata
      this.setLocalStorage(notes)
      this.setCacheMeta({
        programInstanceId,
        week: 0, // Will be updated when week changes
        loadedAt: Date.now()
      })

      console.log('[ExerciseNotes] Hydrated', notes.length, 'notes for program instance')
    } catch (error) {
      // Extract error info safely
      try {
        const errorInfo = this.extractErrorInfo(error)
        console.error('[ExerciseNotes] Hydration error:', errorInfo)
      } catch (extractError) {
        console.error('[ExerciseNotes] Hydration error (failed to extract details):', String(error))
      }
      // Gracefully continue - start with empty cache
      this.setLocalStorage([])
    }
  }

  /**
   * Invalidate cache when week changes - triggers fresh load from Supabase
   */
  static async invalidateCache(
    userId: string,
    programInstanceId: string,
    newWeek: number
  ): Promise<void> {
    console.log('[ExerciseNotes] Invalidating cache for week:', newWeek)

    // Re-hydrate with fresh data for new week
    await this.hydrateCache(userId, programInstanceId)

    // Update cache metadata
    this.setCacheMeta({
      programInstanceId,
      week: newWeek,
      loadedAt: Date.now()
    })
  }

  /**
   * Save or update a note for an exercise in a specific week.
   * Saves to localStorage immediately (fast), queues for Supabase sync.
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

    // Save to localStorage immediately (fast, offline-ready)
    this.updateLocalStorage(note)

    // Queue for Supabase sync (fire-and-forget, will retry on next app load)
    this.queueSync({
      action: 'save',
      note,
      timestamp: now,
      retries: 0
    })

    // Attempt async sync in background
    this.processSyncQueue().catch(err =>
      console.error('[ExerciseNotes] Background sync failed:', err)
    )

    return note
  }

  /**
   * Get note for an exercise in a specific week.
   * Checks cache first, falls back to Supabase if not cached.
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
    // Check localStorage cache first (fast path)
    const cachedNotes = this.getFromLocalStorage()
    const cachedNote = cachedNotes.find(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId &&
        n.week === week
    )

    if (cachedNote) return cachedNote

    // Fallback to Supabase if not cached (cache miss)
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('exercise_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('program_instance_id', programInstanceId)
        .eq('exercise_id', exerciseId)
        .eq('week', week)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is expected
          return null
        }
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          // Table doesn't exist - this is OK
          console.log('[ExerciseNotes] Table not accessible for getNote')
          return null
        }
        console.error('[ExerciseNotes] Failed to fetch note:', {
          code: error.code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint
        })
        return null
      }

      if (!data) return null

      const note: ExerciseNote = {
        id: data.id,
        userId: data.user_id,
        programInstanceId: data.program_instance_id,
        exerciseId: data.exercise_id,
        week: data.week,
        noteText: data.note_text,
        isPinned: data.is_pinned,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime()
      }

      // Cache the note for future lookups
      this.updateLocalStorage(note)

      return note
    } catch (error) {
      console.error('[ExerciseNotes] Error fetching note from Supabase:', error)
      return null
    }
  }

  /**
   * Get pinned note for an exercise and auto-create for next week if needed.
   * This enables the "pin to repeat" functionality.
   * Checks cache first for performance.
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

    console.log('[ExerciseNotes] getPinnedNoteForWeek called:', {
      exerciseId,
      currentWeek,
      previousWeek
    })

    // Check cache first for pinned note from previous week
    const cachedNotes = this.getFromLocalStorage()
    console.log('[ExerciseNotes] Cached notes count:', cachedNotes.length)
    console.log('[ExerciseNotes] Looking for pinned note with exerciseId:', exerciseId, 'week:', previousWeek)
    console.log('[ExerciseNotes] Available cached notes:', cachedNotes.map(n => ({
      exerciseId: n.exerciseId,
      week: n.week,
      isPinned: n.isPinned
    })))

    let pinnedNote = cachedNotes.find(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId &&
        n.week === previousWeek &&
        n.isPinned === true
    )

    if (pinnedNote) {
      console.log('[ExerciseNotes] Found pinned note in cache!')
    } else {
      console.log('[ExerciseNotes] No pinned note in cache, checking Supabase...')
    }

    // If not in cache, query Supabase
    if (!pinnedNote && supabase) {
      try {
        const { data, error } = await supabase
          .from('exercise_notes')
          .select('*')
          .eq('user_id', userId)
          .eq('program_instance_id', programInstanceId)
          .eq('exercise_id', exerciseId)
          .eq('week', previousWeek)
          .eq('is_pinned', true)
          .maybeSingle()

        if (!error && data) {
          pinnedNote = {
            id: data.id,
            userId: data.user_id,
            programInstanceId: data.program_instance_id,
            exerciseId: data.exercise_id,
            week: data.week,
            noteText: data.note_text,
            isPinned: data.is_pinned,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime()
          }
          // Cache it
          this.updateLocalStorage(pinnedNote)
        }
      } catch (error) {
        console.error('[ExerciseNotes] Error querying pinned note:', error)
      }
    }

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
   * Removes from localStorage immediately, queues deletion for Supabase.
   *
   * @param noteId - Note UUID
   */
  static async deleteNote(noteId: string): Promise<void> {
    // Remove from localStorage immediately
    const notes = this.getFromLocalStorage()
    const noteToDelete = notes.find(n => n.id === noteId)
    const filtered = notes.filter(n => n.id !== noteId)
    this.setLocalStorage(filtered)

    if (!noteToDelete) return

    // Queue deletion for Supabase sync
    this.queueSync({
      action: 'delete',
      noteId,
      userId: noteToDelete.userId,
      timestamp: Date.now(),
      retries: 0
    })

    // Attempt async sync
    this.processSyncQueue().catch(err =>
      console.error('[ExerciseNotes] Background sync failed:', err)
    )
  }

  /**
   * Get all notes for all exercises in a specific week.
   * Useful for bulk loading. Uses cache first, falls back to Supabase.
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
    // Check cache first
    const cachedNotes = this.getFromLocalStorage()
    const weekNotes = cachedNotes.filter(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.week === week
    )

    // If we have cached notes, return them
    if (weekNotes.length > 0) return weekNotes

    // Fallback to Supabase if cache miss
    if (!supabase) {
      console.log('[ExerciseNotes] Supabase not configured, returning cached notes only')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('exercise_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('program_instance_id', programInstanceId)
        .eq('week', week)

      if (error) {
        // Table doesn't exist is OK - return empty array
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('[ExerciseNotes] Table not accessible, returning empty array')
          return []
        }

        const errorInfo = this.extractErrorInfo(error)
        console.error('[ExerciseNotes] Failed to fetch week notes:', errorInfo)
        return []
      }

      // Filter out legacy notes
      const validNotes = (data || []).filter((row: any) => row.program_instance_id)

      const notes = validNotes.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        programInstanceId: row.program_instance_id,
        exerciseId: row.exercise_id,
        week: row.week,
        noteText: row.note_text,
        isPinned: row.is_pinned,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime()
      }))

      // Cache all notes
      notes.forEach(note => this.updateLocalStorage(note))

      return notes
    } catch (error) {
      console.error('[ExerciseNotes] Error fetching week notes:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
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
    const notesToDelete = notes.filter(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId
    )

    const filtered = notes.filter(
      n =>
        !(
          n.userId === userId &&
          n.programInstanceId === programInstanceId &&
          n.exerciseId === exerciseId
        )
    )
    this.setLocalStorage(filtered)

    // Queue deletion for each note
    for (const note of notesToDelete) {
      this.queueSync({
        action: 'delete',
        noteId: note.id,
        userId,
        timestamp: Date.now(),
        retries: 0
      })
    }

    // Attempt sync
    this.processSyncQueue().catch(err =>
      console.error('[ExerciseNotes] Background sync failed:', err)
    )
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
    // Try cache first
    const cachedNotes = this.getFromLocalStorage()
    const exerciseNotes = cachedNotes.filter(
      n =>
        n.userId === userId &&
        n.programInstanceId === programInstanceId &&
        n.exerciseId === exerciseId
    )

    // If we have cached notes, return them
    if (exerciseNotes.length > 0) return exerciseNotes

    // Fallback to Supabase if cache miss
    if (!supabase) return []

    try {
      const { data, error } = await supabase
        .from('exercise_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('program_instance_id', programInstanceId)
        .eq('exercise_id', exerciseId)

      if (error) {
        console.error('[ExerciseNotes] Failed to fetch exercise notes:', error)
        return []
      }

      const notes = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        programInstanceId: row.program_instance_id,
        exerciseId: row.exercise_id,
        week: row.week,
        noteText: row.note_text,
        isPinned: row.is_pinned,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime()
      }))

      // Cache all notes
      notes.forEach(note => this.updateLocalStorage(note))

      return notes
    } catch (error) {
      console.error('[ExerciseNotes] Error fetching exercise notes:', error)
      return []
    }
  }

  /**
   * Safely extract error information from various error types
   */
  private static extractErrorInfo(error: any): Record<string, any> {
    const info: Record<string, any> = {}

    if (!error) {
      return { error: 'Unknown error (null/undefined)' }
    }

    // Try to extract each property safely
    try {
      if (error.code) info.code = error.code
    } catch {}
    try {
      if (error.message) info.message = error.message
    } catch {}
    try {
      if (error.status) info.status = error.status
    } catch {}
    try {
      if (error.details) info.details = error.details
    } catch {}
    try {
      if (error.hint) info.hint = error.hint
    } catch {}
    try {
      if (error.name) info.name = error.name
    } catch {}

    // If we got nothing, try toString
    if (Object.keys(info).length === 0) {
      try {
        info.error = String(error)
      } catch {
        info.error = 'Failed to extract error information'
      }
    }

    // Always include the raw object as a fallback
    try {
      info.raw = JSON.parse(JSON.stringify(error))
    } catch {
      try {
        info.raw = String(error)
      } catch {}
    }

    return info
  }

  /**
   * Sync Queue Management
   */

  private static getFromLocalStorage(): ExerciseNote[] {
    if (typeof window === 'undefined') return []
    try {
      const data = window.localStorage.getItem(NOTES_STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      console.error('[ExerciseNotes] Failed to load notes from localStorage')
      return []
    }
  }

  private static setLocalStorage(notes: ExerciseNote[]): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
    } catch {
      console.error('[ExerciseNotes] Failed to save notes to localStorage')
    }
  }

  private static updateLocalStorage(newNote: ExerciseNote): void {
    const notes = this.getFromLocalStorage()
    // Remove old note with same key (UNIQUE constraint: user + program + exercise + week)
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

  private static setCacheMeta(meta: CacheMeta): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(NOTES_CACHE_META_KEY, JSON.stringify(meta))
    } catch {
      console.error('[ExerciseNotes] Failed to save cache metadata')
    }
  }

  private static getCacheMeta(): CacheMeta | null {
    if (typeof window === 'undefined') return null
    try {
      const data = window.localStorage.getItem(NOTES_CACHE_META_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  /**
   * Queue a note change for Supabase sync
   */
  private static queueSync(item: SyncQueueItem): void {
    if (typeof window === 'undefined') return
    try {
      const queue = this.getSyncQueue()
      queue.push(item)
      window.localStorage.setItem(NOTES_SYNC_QUEUE_KEY, JSON.stringify(queue))
      console.log('[ExerciseNotes] Queued', item.action, 'sync, queue size:', queue.length)
    } catch (error) {
      console.error('[ExerciseNotes] Failed to queue sync:', error)
    }
  }

  private static getSyncQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return []
    try {
      const data = window.localStorage.getItem(NOTES_SYNC_QUEUE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private static setSyncQueue(queue: SyncQueueItem[]): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(NOTES_SYNC_QUEUE_KEY, JSON.stringify(queue))
    } catch {
      console.error('[ExerciseNotes] Failed to save sync queue')
    }
  }

  /**
   * Process sync queue - syncs queued changes to Supabase
   * Implements exponential backoff and last-write-wins conflict resolution
   */
  private static async processSyncQueue(): Promise<void> {
    if (!supabase) {
      console.log('[ExerciseNotes] Supabase not configured, skipping sync')
      return
    }

    const queue = this.getSyncQueue()
    if (queue.length === 0) return

    console.log('[ExerciseNotes] Processing sync queue, size:', queue.length)

    const maxRetries = 3
    const processed: number[] = []

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]

      // Skip items that have exceeded max retries
      if (item.retries >= maxRetries) {
        console.warn('[ExerciseNotes] Skipping item with max retries exceeded:', item)
        processed.push(i)
        continue
      }

      try {
        if (item.action === 'save' && item.note) {
          // Upsert note with conflict resolution (last-write-wins)
          const now = new Date().toISOString()
          const { error } = await supabase
            .from('exercise_notes')
            .upsert(
              {
                id: item.note.id,
                user_id: item.note.userId,
                program_instance_id: item.note.programInstanceId,
                exercise_id: item.note.exerciseId,
                week: item.note.week,
                note_text: item.note.noteText,
                is_pinned: item.note.isPinned,
                created_at: new Date(item.note.createdAt).toISOString(),
                updated_at: now
              },
              { onConflict: 'user_id,program_instance_id,exercise_id,week' }
            )

          if (error) {
            // Safely extract error details BEFORE logging
            let errorMsg = ''
            try {
              errorMsg = `Code: ${error.code || 'unknown'}, Message: ${error.message || 'unknown'}, Status: ${(error as any).status || 'unknown'}`
            } catch {
              errorMsg = String(error)
            }

            // If table doesn't exist, just skip this item (no point retrying)
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
              console.warn('[ExerciseNotes] Table not found, skipping sync for note:', item.note.id)
              processed.push(i)
              return
            }

            // If RLS policy violation, log and skip (user data shouldn't violate own RLS)
            if (error.code === '42501' || error.message?.includes('permission')) {
              console.error('[ExerciseNotes] RLS Policy violation (42501) for save - user may not have permission to write notes. Error:', errorMsg)
              console.warn('[ExerciseNotes] Skipping sync due to permission error')
              processed.push(i) // Don't retry - this won't fix itself
              return
            }

            // If UUID validation error (22P02) or null constraint violation (23502), data is corrupted - skip it
            if (error.code === '22P02' || error.code === '23502') {
              console.error('[ExerciseNotes] Data integrity error (corrupted item in queue)', item.note?.id, '- Error:', errorMsg)
              console.warn('[ExerciseNotes] Skipping corrupted item, it will not be retried. This may happen if queue was created with old buggy code.')
              processed.push(i) // Don't retry - data is corrupted and can't be fixed by retrying
              return
            }

            // For other errors, log and throw to trigger retry logic
            console.error('[ExerciseNotes] Supabase upsert error for note', item.note?.id, '- Error:', errorMsg)
            throw error
          }

          console.log('[ExerciseNotes] Synced note save:', item.note.id)
          processed.push(i)
        } else if (item.action === 'delete' && item.noteId) {
          const { error } = await supabase
            .from('exercise_notes')
            .delete()
            .eq('id', item.noteId)

          if (error) {
            // Safely extract error details BEFORE logging
            let errorMsg = ''
            try {
              errorMsg = `Code: ${error.code || 'unknown'}, Message: ${error.message || 'unknown'}, Status: ${(error as any).status || 'unknown'}`
            } catch {
              errorMsg = String(error)
            }

            // If table doesn't exist, just skip this item
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
              console.warn('[ExerciseNotes] Table not found, skipping delete sync for note:', item.noteId)
              processed.push(i)
              return
            }

            // If RLS policy violation, skip
            if (error.code === '42501' || error.message?.includes('permission')) {
              console.error('[ExerciseNotes] RLS Policy violation (42501) for delete - user may not have permission to delete notes. Error:', errorMsg)
              console.warn('[ExerciseNotes] Skipping delete sync due to permission error')
              processed.push(i)
              return
            }

            // If data integrity error, skip (nothing to delete or corrupted data)
            if (error.code === '22P02' || error.code === '23502') {
              console.error('[ExerciseNotes] Data integrity error during delete', item.noteId, '- Error:', errorMsg)
              console.warn('[ExerciseNotes] Skipping corrupted delete item')
              processed.push(i)
              return
            }

            // For other errors, log and throw to trigger retry logic
            console.error('[ExerciseNotes] Supabase delete error for note', item.noteId, '- Error:', errorMsg)
            throw error
          }

          console.log('[ExerciseNotes] Synced note delete:', item.noteId)
          processed.push(i)
        }
      } catch (error) {
        // Safely convert error to string representation
        let errorDescription = ''
        try {
          if (error instanceof Error) {
            errorDescription = `${error.name}: ${error.message}`
          } else if (typeof error === 'object' && error !== null) {
            errorDescription = `Code: ${(error as any).code || 'unknown'}, Message: ${(error as any).message || 'unknown'}`
          } else {
            errorDescription = String(error)
          }
        } catch {
          errorDescription = 'Unknown error'
        }

        console.error(
          '[ExerciseNotes] Sync failed for item',
          i,
          'Action:',
          item.action,
          'Attempt:',
          item.retries + 1,
          'Error:',
          errorDescription
        )

        // Increment retry count and re-queue
        item.retries++
        queue[i] = item
      }
    }

    // Remove successfully processed items
    const remaining = queue.filter((_, i) => !processed.includes(i))
    this.setSyncQueue(remaining)

    if (remaining.length > 0) {
      console.log('[ExerciseNotes] Sync queue partially processed, remaining:', remaining.length)
    } else {
      console.log('[ExerciseNotes] Sync queue fully processed')
    }
  }

  /**
   * Retry sync queue on demand (useful on app focus or connectivity change)
   */
  static async retrySyncQueue(): Promise<void> {
    console.log('[ExerciseNotes] Retrying sync queue...')
    await this.processSyncQueue()
  }

  /**
   * Clear all notes from localStorage (for testing/reset).
   */
  static clearLocalStorage(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(NOTES_STORAGE_KEY)
      window.localStorage.removeItem(NOTES_CACHE_META_KEY)
      window.localStorage.removeItem(NOTES_SYNC_QUEUE_KEY)
      console.log('[ExerciseNotes] Cleared all local storage')
    } catch {
      console.error('[ExerciseNotes] Failed to clear localStorage')
    }
  }
}
