# Template Builder UI Update – System Audit

## Overview
- Converted the Template Builder into a two-pane admin tool: searchable template list on the left, builder/editor workspace on the right.
- Added API support for `GET /api/admin/templates/:id` and `PUT /api/admin/templates/:id` plus shared validation helpers so the UI can load, edit, and resave templates.
- Builder now differentiates between creating and updating templates, showing contextual success messaging and reloading template metadata after save.
- Schedule panel refreshed with tabs, tooltips, and compact cards to improve readability while preserving drag-and-drop behaviour.

## Implementation Notes
- All admin template endpoints rely on `requireAdmin` in `app/api/admin/templates/helpers.ts`; reuse this helper for new admin routes to keep auth logic consistent.
- Template payloads are validated through the shared Zod schemas (`templateSchema`, `daySchema`, `exerciseSchema`). Extend these when adding new fields so both POST and PUT remain in sync.
- When transforming exercises, preserve `progressionConfig.metadata` so round-tripping retains per-exercise overrides without silently resetting defaults.
- The UI loads summaries first (`GET /api/admin/templates`) and fetches full detail only when a template is selected; follow this pattern to keep the list snappy.

## Patterns to Follow
- Keep state normalization functions (`mapTemplateDetailToState`, `mapExerciseConfigToBuilder`) isolated; add new progression fields centrally rather than scattering per-component fixes.
- Use optimistic UI banners (e.g., `publishSuccess`) together with toast notifications so admins get clear feedback even when the API returns an empty body.
- Leverage shadcn Tabs + ScrollArea patterns for sidebars: tabs contain the form elements, ScrollArea manages overflow, keeping controls accessible without nesting multiple scrollbars.
- For drag-and-drop lists, wrap `DndContext` with `SortableContext` and derive ordering via `arrayMove`; update the canonical data in a single reducer call to avoid out-of-sync indices.

## Mistakes to Avoid
- Do not bypass `insertTemplateStructure` when adding new template mutations; skipping the helper risks leaving orphaned exercises or days.
- Avoid direct state mutation when loading templates—always map server data into builder-friendly structures to handle missing metadata and prevent crashes.
- Don’t call POST for updates: the builder now automatically picks POST vs PUT. Future features should reuse `editingTemplateId` to ensure caches clear and list data refreshes.
- Refrain from hardcoding tier descriptions; use the tooltip/info pattern introduced in `schedule-panel.tsx` so context stays consistent as tier logic evolves.
