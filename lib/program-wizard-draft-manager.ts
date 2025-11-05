import type { ProgramWizardState } from '@/components/program-wizard/types'

interface ProgramWizardDraftRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  version: number
  state: ProgramWizardState
}

export interface ProgramWizardDraftSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  weeks: number
  days: number
  source: ProgramWizardState['source']
}

interface DraftSavePayload {
  id: string
  name: string
  state: ProgramWizardState
  createdAt?: number
}

const STORAGE_KEY = 'program_wizard_drafts_v1'
const STORAGE_VERSION = 1
const MAX_DRAFTS = 12

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `draft-${Math.random().toString(36).slice(2, 11)}`
}

const deepCloneState = (state: ProgramWizardState): ProgramWizardState => {
  if (typeof structuredClone === 'function') {
    return structuredClone(state)
  }
  return JSON.parse(JSON.stringify(state)) as ProgramWizardState
}

const normalizeName = (name: string | undefined) => {
  const trimmed = name?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'Untitled Draft'
}

const safeLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

const notifyDraftChange = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('programDraftsUpdated'))
}

class ProgramWizardDraftManager {
  private readRecords(): ProgramWizardDraftRecord[] {
    const storage = safeLocalStorage()
    if (!storage) return []

    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return []

      const parsed = JSON.parse(raw) as ProgramWizardDraftRecord[] | { version: number; drafts: ProgramWizardDraftRecord[] }

      if (Array.isArray(parsed)) {
        // Legacy format without versioning
        return parsed.map(record => ({
          ...record,
          version: STORAGE_VERSION,
        }))
      }

      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.drafts)) {
        return parsed.drafts
          .filter(draft => draft && typeof draft === 'object' && typeof draft.id === 'string')
          .map(draft => ({
            ...draft,
            version: draft.version ?? STORAGE_VERSION,
          }))
      }
    } catch (error) {
      console.error('[ProgramWizardDraftManager] Failed to read drafts from storage', error)
    }

    return []
  }

  private writeRecords(records: ProgramWizardDraftRecord[]) {
    const storage = safeLocalStorage()
    if (!storage) return

    try {
      const payload = {
        version: STORAGE_VERSION,
        drafts: records,
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('[ProgramWizardDraftManager] Failed to write drafts to storage', error)
    }
  }

  saveDraft(input: DraftSavePayload): ProgramWizardDraftRecord {
    const stateClone = deepCloneState(input.state)
    const now = Date.now()
    const records = this.readRecords()

    const existingIndex = records.findIndex(record => record.id === input.id)

    if (existingIndex >= 0) {
      const existing = records[existingIndex]
      const updatedRecord: ProgramWizardDraftRecord = {
        ...existing,
        name: normalizeName(input.name),
        state: stateClone,
        updatedAt: now,
      }
      records[existingIndex] = updatedRecord
    } else {
      const newRecord: ProgramWizardDraftRecord = {
        id: input.id,
        name: normalizeName(input.name),
        createdAt: input.createdAt ?? now,
        updatedAt: now,
        state: stateClone,
        version: STORAGE_VERSION,
      }

      records.push(newRecord)
      records.sort((a, b) => b.updatedAt - a.updatedAt)

      if (records.length > MAX_DRAFTS) {
        records.length = MAX_DRAFTS
      }
    }

    this.writeRecords(records)
    notifyDraftChange()

    return records.find(record => record.id === input.id)!
  }

  createDraft(state: ProgramWizardState, name?: string): ProgramWizardDraftRecord {
    const id = generateId()
    return this.saveDraft({
      id,
      name: normalizeName(name ?? state.metadata?.name),
      state,
    })
  }

  getDraft(id: string): ProgramWizardDraftRecord | null {
    return this.readRecords().find(record => record.id === id) ?? null
  }

  getDraftSummaries(): ProgramWizardDraftSummary[] {
    return this.readRecords()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(record => ({
        id: record.id,
        name: normalizeName(record.name),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        weeks: record.state.metadata?.weeks ?? 0,
        days: record.state.days?.length ?? 0,
        source: record.state.source ?? null,
      }))
  }

  deleteDraft(id: string) {
    const records = this.readRecords()
    const next = records.filter(record => record.id !== id)
    this.writeRecords(next)
    notifyDraftChange()
  }

  clearAll() {
    const storage = safeLocalStorage()
    if (!storage) return
    storage.removeItem(STORAGE_KEY)
    notifyDraftChange()
  }

  generateId(): string {
    return generateId()
  }
}

export const programWizardDraftManager = new ProgramWizardDraftManager()

