-- myPA schema: profiles + tasks.
-- Idempotent so it can be re-applied safely.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('open', 'done', 'snoozed');
  end if;
end
$$;

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  timezone     text default 'America/Los_Angeles',
  created_at   timestamptz default now()
);

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  -- Server-owned: defaults to the caller's auth.uid() so the client never
  -- writes it. The "own tasks" RLS WITH CHECK also enforces this.
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null,
  raw_input    text,
  notes        text,
  due_at       timestamptz,
  priority     smallint not null default 3 check (priority between 1 and 4),
  status       task_status not null default 'open',
  source       text default 'voice',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_tasks_user_due on tasks (user_id, status, due_at);
