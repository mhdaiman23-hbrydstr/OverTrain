# Template Builder UI Update – System Audit

## Overview
- Reimagined the admin Templates route as a two-step flow: a sortable table view for browsing existing templates and a dedicated builder screen for create / edit / duplicate work.
- Added API support for `GET /api/admin/templates/:id`, `PUT /api/admin/templates/:id`, and `DELETE /api/admin/templates/:id` plus shared validation helpers so the UI can load, update, duplicate, and remove templates safely.
- Builder now differentiates between creating and updating templates, showing contextual success messaging and reloading template metadata after save.
- Schedule panel refreshed with tabs, tooltips, and compact cards to improve readability while preserving drag-and-drop behaviour.
- Exercise metadata (muscle group + equipment) now flows from Supabase through the builder and preview, with color-coded badges to improve at-a-glance scanning. Preview dialog widened for desktop consumption.

## Implementation Notes
- All admin template endpoints rely on `requireAdmin` in `app/api/admin/templates/helpers.ts`; reuse this helper for new admin routes to keep auth logic consistent.
- Template payloads are validated through the shared Zod schemas (`templateSchema`, `daySchema`, `exerciseSchema`). Extend these when adding new fields so both POST and PUT remain in sync.
- When transforming exercises, preserve `progressionConfig.metadata` so round-tripping retains per-exercise overrides without silently resetting defaults.
- The table view fetches summaries via `GET /api/admin/templates`; the builder fetches full detail only when needed. Keep this split to avoid loading large payloads unnecessarily.
- `TemplateTable` centralises duplicate/edit/remove actions. Use the dropdown + confirmation pattern again when adding more admin lists requiring destructive actions.
- `mapExerciseConfigToBuilder` now captures `muscleGroup` and `equipmentType`, and a shared `exercise-equipment` palette handles badge styling. Future metadata should be funneled through the same mapping layer and styled via a dedicated helper.
- Exercise library search now hits `name`, `muscle_group`, and `equipment_type` columns in a single request; keep any future metadata queries consolidated so the API stays the one source of truth for filtering.

## Patterns to Follow
- Keep state normalization functions (`mapTemplateDetailToState`, `mapExerciseConfigToBuilder`) isolated; add new progression fields centrally rather than scattering per-component fixes.
- Use optimistic UI banners (e.g., `publishSuccess`) together with toast notifications so admins get clear feedback even when the API returns an empty body.
- Leverage shadcn Tabs + ScrollArea patterns for sidebars: tabs contain the form elements, ScrollArea manages overflow, keeping controls accessible without nesting multiple scrollbars.
- For drag-and-drop lists, wrap `DndContext` with `SortableContext` and derive ordering via `arrayMove`; update the canonical data in a single reducer call to avoid out-of-sync indices.
- When adding new badges or preview elements, compose them from shared helpers (muscle group + equipment) so drag cards, library rows, and modals stay in sync without bespoke CSS.

## Mistakes to Avoid
- Do not bypass `insertTemplateStructure` when adding new template mutations; skipping the helper risks leaving orphaned exercises or days.
- Avoid direct state mutation when loading templates-always map server data into builder-friendly structures to handle missing metadata and prevent crashes.
- Don't call POST for updates: the builder now automatically picks POST vs PUT. Future features should reuse `editingTemplateId` to ensure caches clear and list data refreshes.
- Refrain from hardcoding tier descriptions; use the tooltip/info pattern introduced in `schedule-panel.tsx` so context stays consistent as tier logic evolves.
- Do not strip `muscleGroup` / `equipmentType` when cloning or duplicating exercises; missing metadata breaks badge rendering and causes inconsistent filtering feedback.
