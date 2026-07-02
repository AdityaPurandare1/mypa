-- ============================================================================
-- P2 SCAFFOLD — Web Push. Table + RLS only. NOT wired in P1.
--
-- The reminders shipped in P1 are in-app only (Notification API while the tab
-- is open — see src/hooks/useDueReminders.ts). This table exists so a future
-- server-driven push (send-reminders edge fn) has somewhere to store device
-- subscriptions. No trigger fires it yet; scheduling is commented out below.
-- ============================================================================

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists push_subs_select_own on push_subscriptions;
create policy push_subs_select_own
  on push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists push_subs_insert_own on push_subscriptions;
create policy push_subs_insert_own
  on push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists push_subs_update_own on push_subscriptions;
create policy push_subs_update_own
  on push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subs_delete_own on push_subscriptions;
create policy push_subs_delete_own
  on push_subscriptions for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- P2 scheduling (COMMENTED OUT — enable when send-reminders is deployed):
--
--   create extension if not exists pg_cron with schema extensions;
--   create extension if not exists pg_net  with schema extensions;
--
--   -- Every 5 minutes, POST to the send-reminders edge fn to fan out
--   -- notifications for tasks coming due. The fn URL + shared secret would be
--   -- read from GUCs set via:
--   --   alter database postgres set app.reminders_endpoint = '...';
--   --   alter database postgres set app.reminders_secret   = '...';
--   select cron.schedule(
--     'mypa-send-reminders',
--     '*/5 * * * *',
--     $cron$
--       select net.http_post(
--         url     := current_setting('app.reminders_endpoint', true),
--         headers := jsonb_build_object(
--                      'Content-Type', 'application/json',
--                      'x-reminders-secret', current_setting('app.reminders_secret', true)
--                    ),
--         body    := '{}'::jsonb
--       );
--     $cron$
--   );
-- ----------------------------------------------------------------------------
