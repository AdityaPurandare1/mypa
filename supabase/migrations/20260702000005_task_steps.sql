-- Add a JSONB `steps` column to tasks for sub-task checklists.
-- Shape: array of { id: text, title: text, done: boolean }.
-- Idempotent so it can be re-applied safely. RLS is unchanged — the existing
-- row-level "own tasks" policies already cover this column.

alter table public.tasks add column if not exists steps jsonb not null default '[]'::jsonb;
