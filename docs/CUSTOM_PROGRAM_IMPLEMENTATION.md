# Custom Program Implementation (Fork Model)

Status: v1 scoped, feature‑flagged (MY_PROGRAMS_ENABLED=false)
Owner: Programs/Logger
Last updated: 2025‑10‑19

## TL;DR
- Fork‑on‑first‑template‑edit: the moment a user applies a template‑level change (e.g., “apply to future” replacement, reorder, set/rep edits), create a user‑owned copy in “My Programs” and continue from that copy.
- Sessions/logging are unchanged. Current session uses the in‑session swap behavior; future sessions come from the forked blueprint.
- Canonical templates remain pristine and read‑only. My Programs are user‑owned blueprints.

## Goals
- Keep the logger stable and unmodified.
- Make ownership and lineage explicit (user‑owned copy with origin pointer).
- Provide clear UX and simple rules (no hidden mappings).

## Feature Flag
- `lib/feature-flags.ts` → `MY_PROGRAMS_ENABLED`
- UI uses server “My Programs” only when the flag is on; otherwise falls back to local saved templates.

## Schema Changes (Additive)
Migration: `migrations/add-custom-program-fields.sql`
- Table: `program_templates`
  - Columns (all NULLABLE, additive):
    - `owner_user_id uuid null references profiles(id) on delete cascade`
    - `origin_template_id uuid null references program_templates(id) on delete set null`
    - `origin_version int null`
    - `forked_at timestamptz null`
    - `origin_name_snapshot text null`
    - `origin_author_snapshot text null`
    - `created_from text null default 'template'`  // 'blank' | 'template' | 'import'
  - Indexes:
    - `idx_program_templates_owner_user_id(owner_user_id)`
    - `idx_program_templates_origin_template_id(origin_template_id)`

RLS (to add in a separate policy migration):
- Canonical (owner_user_id IS NULL): world‑readable (or role‑gated), immutable to non‑admins.
- User‑owned: row‑level read/write only by `owner_user_id`.

## Services

### ProgramTemplateService
- Extends DB type with new columns; compatibility layer converts DB → GymTemplate.
- Canonical templates listing (admin-created only):
  - `getAllTemplates()` → `is_active = true AND owner_user_id IS NULL AND origin_template_id IS NULL`
  - Excludes both user-owned and forked templates
- My Programs listing (user-owned, includes forked with replacements):
  - `getMyPrograms(userId: string)` → `owner_user_id = userId`

File: `lib/services/program-template-service.ts`

### ProgramForkService (new)
- `forkTemplateToMyProgram(templateId: string, ownerUserId: string, options?: { nameOverride?: string }): Promise<string>`
  - Deep‑clones: `program_templates` → `program_template_days` → `program_template_exercises`
  - Sets ownership + origin fields; preserves progression_config per slot.
- `createBlankProgram(ownerUserId: string, name?: string): Promise<string>`
  - Minimal skeleton (1 week/day). `created_from='blank'`.

File: `lib/services/program-fork-service.ts`

## Core Flows

### 1) Apply‑to‑Future (from logger or template view)
- Current session: keep in‑session swap (resets sets/weights as already implemented).
- Future sessions: if this is the first template‑level edit →
  1. Fork the canonical template via `ProgramForkService.forkTemplateToMyProgram(...)`.
  2. Repoint the active run to the new template ID, preserving:
     - `instanceId`, `currentWeek`, `currentDay`, progress counts.
  3. Apply the user’s change to the fork (affects future sessions only).
  4. Save active program (await), then dispatch `programChanged`.

Note: Step (2) repoint logic is not yet wired. See “Integration Points”.

### 2) Build From Scratch (My Programs)
- Create a blank program via `createBlankProgram(ownerUserId, name?)`.
- Open the builder for edits; start a run from this blueprint when ready.

### 3) Start Program (unchanged for v1)
- `ProgramStateManager.setActiveProgram(templateId, progressionOverride?)`
- Clears in‑progress workouts first, saves, syncs, then emits `programChanged`.

## Integration Points (Planned Wiring)
- ProgramsSection / TemplateDetailView:
  - On first template‑level edit or explicit “Apply to future”, gate with confirm:
    - “Create a copy in My Programs and continue?”
  - Call `forkTemplateToMyProgram` then repoint the active run to the new templateId.
- ProgramStateManager repoint helper (proposed signature):
  - `repointActiveProgramToTemplate(newTemplateId: string): Promise<void>`
    - Loads new template (GymTemplate), swaps `templateId/template`, preserves state & `instanceId`.
    - `await saveActiveProgram(...)`, then `window.dispatchEvent(new Event('programChanged'))`.

Note: Keep repointing atomic and awaited before firing events (see Dev Rules).

## Logger & Calendar Behavior (No Change)
- Workout logger flows, event sequencing, and DB sync patterns remain unchanged.
- Historical calendar uses `ProgramTemplateService.getTemplate(templateId)` for day labels, no active‑program reads in `readOnly` mode.

Files:
- Logger hooks and flows: `components/workout-logger/hooks/use-workout-session.ts`
- Calendar: `components/workout-calendar.tsx`
- History helpers: `lib/history.ts`

## Validation Against Development Rules
- Data integrity: All state writes use `saveActiveProgram(...)` with DB upsert awaited before `programChanged`.
- Workout completion: Check‑before‑complete → complete → advance‑if‑new → background DB sync → events.
- Read‑only calendar: no active‑program fetch; day labels from DB; no spinner flash.
- DB sync pattern: UPDATE with `.select()` → INSERT fallback for in‑progress workouts.

## Rollout Plan
1) Add‑only schema (done).
2) RLS policy migration (pending; see below).
3) Wire My Programs tab under flag (partial: server listing gated; local fallback remains).
4) Wire fork + repoint flow under flag.
5) Internal testing; then enable flag gradually.

## Test Plan
- Start program baseline: start, log sets, complete; no regressions.
- Session‑only replacement: in‑session reset, no fork.
- Apply‑to‑future → fork + repoint: current workout unaffected; next session uses fork blueprint.
- From‑scratch: create My Program, start run, complete week; verify parity with template runs.
- History/Calendar: historical program rendering uses DB day_name with no spinner in read‑only.
- RLS: owner can CRUD their My Programs; cannot edit canonical.

## RLS Policy Sketch (to implement)
- Canonical (owner_user_id IS NULL):
  - SELECT for authenticated users; INSERT/UPDATE/DELETE restricted to admins.
- User‑owned (owner_user_id = auth.uid()):
  - SELECT/INSERT/UPDATE/DELETE allowed.
- Sub‑tables (`program_template_days`, `program_template_exercises`):
  - Enforce via joins to parent’s ownership.

## Telemetry (Optional)
- fork_created, run_repointed, blank_program_created, my_programs_listed, template_loaded.

## Future Enhancements
- Rebase mechanism: merge upstream template changes into a fork.
- Overlay/patch model instead of deep clone (trade complexity for smaller storage).
- Manage replacements UI across the blueprint (per‑slot ops, multi‑day replace).
- Per‑run snapshot copy at run start (if you want runs immune to later blueprint edits).

## Related Files
- Migration: `migrations/add-custom-program-fields.sql`
- Feature flag: `lib/feature-flags.ts`
- Services: `lib/services/program-template-service.ts`, `lib/services/program-fork-service.ts`
- State: `lib/program-state.ts`
- UI: `components/programs-section.tsx`, `components/template-detail-view.tsx`
- Logger & Calendar: `components/workout-logger/**/*`, `components/workout-calendar.tsx`

---

Questions before wiring repoint flow?
- Confirm default behavior: “Apply to future” triggers fork + repoint for canonical templates; direct edits on My Programs modify the blueprint (do not auto‑migrate an ongoing run).
- For v1, keep runs referencing the live blueprint vs a per‑run snapshot? Recommendation: runs reference blueprint; document that edits won’t affect an ongoing run unless explicitly migrated (future feature).

