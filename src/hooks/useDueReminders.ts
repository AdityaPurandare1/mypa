import { useEffect, useRef } from 'react';
import type { Task } from '@/types';
import { getSettings } from '@/lib/settings';

const SCAN_MS = 60_000; // every ~60s
const DUE_SOON_MS = 5 * 60_000; // fire within 5 minutes of due time

/**
 * P1 reminders: while the tab is open, scan open tasks and fire a browser
 * Notification once per task that has just come due (within DUE_SOON_MS) or is
 * overdue. Dedupes by task id so each task notifies at most once per session.
 *
 * This is intentionally client-only — no server push (that's P2, scaffolded in
 * supabase/functions/send-reminders + src/lib/push.ts). Notifications only work
 * while a tab is open.
 */
export function useDueReminders(tasks: Task[]): void {
  const firedRef = useRef<Set<string>>(new Set());
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    if (typeof Notification === 'undefined') return;

    function scan() {
      // Re-read the setting each tick so toggling takes effect without reload.
      // When reminders are off we neither scan nor request permission.
      if (!getSettings().dueSoonReminders) return;
      if (Notification.permission === 'default') {
        void Notification.requestPermission();
        return; // permission not yet resolved this tick — next scan will fire.
      }
      if (Notification.permission !== 'granted') return;
      const now = Date.now();
      for (const t of tasksRef.current) {
        if (t.status !== 'open' || !t.due_at) continue;
        if (firedRef.current.has(t.id)) continue;
        const due = Date.parse(t.due_at);
        if (Number.isNaN(due)) continue;
        // Fire only within a bounded window around the due time — just-came-due
        // or about-to. Don't spam every arbitrarily-old overdue task on open.
        if (due - now >= -DUE_SOON_MS && due - now <= DUE_SOON_MS) {
          firedRef.current.add(t.id);
          try {
            new Notification('myPA · task due', { body: t.title, tag: `mypa-${t.id}` });
          } catch {
            // Some browsers require the SW registration path; ignore failures.
          }
        }
      }
    }

    scan();
    const id = window.setInterval(scan, SCAN_MS);
    return () => window.clearInterval(id);
  }, []);
}
