// Pure daily-plan builder for the Today screen. Tasks-only (no calendar-event
// backend) — timed rows come from a task's `due_at`. Deterministic given the
// same inputs, so it's straightforward to unit test.

import { startOfDay } from 'date-fns';
import type { Task } from '@/types';
import type { Settings } from './settings';
import { toDate } from './time';

/** One row in the timeline. `event` rows exist in the type for styling but are
 *  never produced here — there is no event source (tasks-only scope). */
export interface PlanRow {
  kind: 'task' | 'event';
  task: Task;
  /** True when the task was pulled forward from a prior day. */
  carried: boolean;
  /** Local due time as an epoch ms, or null when the task has no date. */
  dueMs: number | null;
}

export interface PlanCapacity {
  /** min(target, plannable count) — "N tasks fit your day". */
  fit: number;
  /** Settings target/day. */
  target: number;
  /** Tasks carried over from a prior day. */
  carried: number;
  /** Tasks completed today (counts toward progress). */
  done: number;
  /** Open, plannable tasks (excludes done). */
  planned: number;
  /** Rough free-focus hours estimate for the sub-meta. */
  focusFreeHours: number;
}

export interface DailyPlan {
  rows: PlanRow[];
  capacity: PlanCapacity;
}

/** Rank: priority ascending (P1 first), then earliest due time, dated before
 *  undated, then created ascending as a stable tiebreak. */
function compareRows(a: PlanRow, b: PlanRow): number {
  if (a.task.priority !== b.task.priority) return a.task.priority - b.task.priority;
  const am = a.dueMs;
  const bm = b.dueMs;
  if (am !== null && bm !== null && am !== bm) return am - bm;
  if (am !== null && bm === null) return -1;
  if (am === null && bm !== null) return 1;
  return a.task.created_at.localeCompare(b.task.created_at);
}

/** Parse a "HH:MM" setting into [hours, minutes], tolerating malformed values
 *  by falling back to midnight. */
function parseHHMM(hhmm: string): [number, number] {
  const [h, m] = hhmm.split(':').map(Number);
  const hours = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0;
  const minutes = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
  return [hours, minutes];
}

/**
 * Build today's plan from the task list.
 *
 * - Includes every open task due today (or with no date).
 * - Carries overdue open tasks (due before today's `dayStart` boundary) forward
 *   and flags them, gated by the carry-overdue-forward setting. A task due
 *   earlier today but before `dayStart` (e.g. 06:00 with an 08:00 day start)
 *   counts as carried.
 * - Includes tasks completed today so they still render (checked) and count
 *   toward `done`.
 * - Ranks by priority then due time.
 *
 * The "today" window starts at today's calendar date at `dayStart` (default
 * 08:00). When `now` is before today's `dayStart`, the plan day is still today
 * — we don't shift back to yesterday; today@dayStart remains the carry boundary.
 */
export function buildDailyPlan(tasks: Task[], now: Date, settings: Settings): DailyPlan {
  const [startH, startM] = parseHHMM(settings.dayStart);
  const midnight = startOfDay(now);
  const calendarDayStart = midnight.getTime();
  // Carry boundary: today's calendar date at the configured dayStart (default
  // 08:00). Tasks due before this are overdue/carried; at/after are today's.
  const dayStart = new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate(), startH, startM).getTime();
  const dayEnd = calendarDayStart + 24 * 60 * 60 * 1000;

  const rows: PlanRow[] = [];
  let done = 0;

  for (const t of tasks) {
    const due = toDate(t.due_at);
    const dueMs = due ? due.getTime() : null;

    // Completed today → keep it visible and count it.
    if (t.status === 'done') {
      const completed = toDate(t.completed_at);
      // "Completed today" spans the calendar day (midnight→midnight), independent
      // of the dayStart carry boundary, so early-morning completions still count.
      const completedToday = completed
        ? completed.getTime() >= calendarDayStart && completed.getTime() < dayEnd
        : false;
      if (completedToday) {
        rows.push({ kind: 'task', task: t, carried: false, dueMs });
        done += 1;
      }
      continue;
    }

    // Only open tasks are planned (snoozed tasks are hidden until they resurface).
    if (t.status !== 'open') continue;

    const overdue = dueMs !== null && dueMs < dayStart;
    const dueToday = dueMs !== null && dueMs >= dayStart && dueMs < dayEnd;
    const noDate = dueMs === null;

    if (overdue) {
      if (!settings.carryOverdueForward) continue; // gated
      rows.push({ kind: 'task', task: t, carried: true, dueMs });
    } else if (dueToday || noDate) {
      rows.push({ kind: 'task', task: t, carried: false, dueMs });
    }
    // Future-dated tasks are not part of today's plan.
  }

  rows.sort(compareRows);

  const openRows = rows.filter((r) => r.task.status === 'open');
  const planned = openRows.length;
  const carried = openRows.filter((r) => r.carried).length;
  const fit = Math.min(settings.targetPerDay, planned);

  // Rough estimate: assume ~1h of focus per remaining planned task against an
  // ~8h working budget. Kept simple and deterministic for the sub-meta.
  const focusFreeHours = Math.max(0, Math.round((8 - planned) * 10) / 10);

  return {
    rows,
    capacity: {
      fit,
      target: settings.targetPerDay,
      carried,
      done,
      planned,
      focusFreeHours,
    },
  };
}
