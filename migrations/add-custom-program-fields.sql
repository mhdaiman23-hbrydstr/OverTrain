-- Add custom program ownership and origin tracking to program_templates
-- Safe, additive changes only

-- Owner (user-owned My Programs) and Origin (fork source)
alter table program_templates
  add column if not exists owner_user_id uuid null references profiles(id) on delete cascade,
  add column if not exists origin_template_id uuid null references program_templates(id) on delete set null,
  add column if not exists origin_version int null,
  add column if not exists forked_at timestamptz null,
  add column if not exists origin_name_snapshot text null,
  add column if not exists origin_author_snapshot text null,
  add column if not exists created_from text null default 'template';

-- Indexes for common lookups
create index if not exists idx_program_templates_owner_user_id on program_templates(owner_user_id);
create index if not exists idx_program_templates_origin_template_id on program_templates(origin_template_id);

-- Note: RLS policies are handled in separate policy migrations. This file is schema-only.

