-- Add is_public column to program_templates for future community sharing
-- Safe additive change: defaults to false for all existing rows

alter table program_templates
  add column if not exists is_public boolean not null default false;

-- Ensure column has an index for future public program queries
create index if not exists idx_program_templates_is_public on program_templates(is_public);

