-- myPA RLS: every user sees only their own profile and tasks.

alter table profiles enable row level security;
alter table tasks    enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "own tasks" on tasks;
create policy "own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
