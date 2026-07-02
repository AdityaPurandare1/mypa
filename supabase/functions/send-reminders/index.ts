// ============================================================================
// send-reminders — P2 SCAFFOLD. NOT deployed, NOT wired in P1.
//
// P1 reminders are in-app only (Notification API while a tab is open — see
// src/hooks/useDueReminders.ts). This function is the future server-driven
// path: a pg_cron job (commented out in 20260701000004_push_scaffold.sql) would
// POST here on a schedule; we'd find tasks coming due and fan out Web Push to
// each user's registered devices via VAPID.
//
// Mirrors the shape of the otter send-push function. deno-check clean.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@mypa.app';
const SHARED_SECRET = Deno.env.get('REMINDERS_SHARED_SECRET') ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Constant-time compare so the shared-secret check can't be timed.
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

interface DueTask {
  id: string;
  user_id: string;
  title: string;
  due_at: string;
}

interface PushSub {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method' });

  if (!SHARED_SECRET) return json(500, { error: 'misconfigured' });
  const got = req.headers.get('x-reminders-secret') ?? '';
  if (!safeEqual(got, SHARED_SECRET)) return json(401, { error: 'bad secret' });
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json(500, { error: 'vapid not configured' });

  // Open tasks due within the next 15 minutes (and not yet in the past window).
  const now = new Date();
  const soon = new Date(now.getTime() + 15 * 60_000);

  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id, user_id, title, due_at')
    .eq('status', 'open')
    .not('due_at', 'is', null)
    .lte('due_at', soon.toISOString())
    .gte('due_at', now.toISOString());
  if (taskErr) return json(500, { error: taskErr.message });

  const dueTasks = (tasks ?? []) as DueTask[];
  if (dueTasks.length === 0) return json(200, { sent: 0, tasks: 0 });

  // Group subscriptions by user so we only query once.
  const userIds = [...new Set(dueTasks.map((t) => t.user_id))];
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (subErr) return json(500, { error: subErr.message });

  const subsByUser = new Map<string, PushSub[]>();
  for (const s of (subs ?? []) as PushSub[]) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  let sent = 0;
  for (const t of dueTasks) {
    const targets = subsByUser.get(t.user_id) ?? [];
    const body = JSON.stringify({ title: 'myPA · task due', body: t.title, url: '/mypa/', tag: `mypa-${t.id}` });
    for (const s of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
  }

  return json(200, { sent, tasks: dueTasks.length });
});
