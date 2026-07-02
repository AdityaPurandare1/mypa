import { describe, it, expect } from 'vitest';
import { buildDailyPlan } from './plan';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { Task } from '@/types';

const NOW = new Date('2026-07-01T09:00:00'); // local

function task(over: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u1',
    title: 'T',
    raw_input: null,
    notes: null,
    due_at: null,
    priority: 3,
    status: 'open',
    source: 'voice',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    steps: [],
    completed_at: null,
    ...over,
  };
}

/** ISO for a given local time on 2026-07-01. */
function todayAt(h: number, m = 0): string {
  return new Date(2026, 6, 1, h, m).toISOString();
}

const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });

describe('buildDailyPlan', () => {
  it('returns an empty plan for no tasks', () => {
    const { rows, capacity } = buildDailyPlan([], NOW, settings());
    expect(rows).toHaveLength(0);
    expect(capacity.planned).toBe(0);
    expect(capacity.fit).toBe(0);
    expect(capacity.carried).toBe(0);
    expect(capacity.done).toBe(0);
  });

  it('flags overdue open tasks as carried when carry-forward is on', () => {
    const t = task({ id: 'od', due_at: '2026-06-28T10:00:00Z', priority: 1 });
    const { rows, capacity } = buildDailyPlan([t], NOW, settings({ carryOverdueForward: true }));
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(true);
    expect(capacity.carried).toBe(1);
  });

  it('drops overdue tasks entirely when carry-forward is off', () => {
    const t = task({ id: 'od', due_at: '2026-06-28T10:00:00Z' });
    const { rows, capacity } = buildDailyPlan([t], NOW, settings({ carryOverdueForward: false }));
    expect(rows).toHaveLength(0);
    expect(capacity.carried).toBe(0);
  });

  it('includes today-dated and no-date open tasks', () => {
    const todayTask = task({ id: 'today', due_at: todayAt(14) });
    const noDate = task({ id: 'nd', due_at: null });
    const { rows } = buildDailyPlan([todayTask, noDate], NOW, settings());
    const ids = rows.map((r) => r.task.id);
    expect(ids).toContain('today');
    expect(ids).toContain('nd');
  });

  it('excludes future-dated tasks', () => {
    const future = task({ id: 'fut', due_at: new Date(2026, 6, 5, 10).toISOString() });
    const { rows } = buildDailyPlan([future], NOW, settings());
    expect(rows).toHaveLength(0);
  });

  it('ranks by priority then due time', () => {
    const p2early = task({ id: 'p2', priority: 2, due_at: todayAt(9) });
    const p1late = task({ id: 'p1', priority: 1, due_at: todayAt(17) });
    const p1early = task({ id: 'p1e', priority: 1, due_at: todayAt(11) });
    const { rows } = buildDailyPlan([p2early, p1late, p1early], NOW, settings());
    expect(rows.map((r) => r.task.id)).toEqual(['p1e', 'p1', 'p2']);
  });

  it('counts tasks completed today toward done, ignoring older completions', () => {
    const doneToday = task({ id: 'dt', status: 'done', completed_at: todayAt(8) });
    const doneYesterday = task({ id: 'dy', status: 'done', completed_at: new Date(2026, 5, 30, 8).toISOString() });
    const { rows, capacity } = buildDailyPlan([doneToday, doneYesterday], NOW, settings());
    expect(capacity.done).toBe(1);
    expect(rows.map((r) => r.task.id)).toEqual(['dt']);
  });

  it('caps fit at the target/day setting', () => {
    const many = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}`, due_at: todayAt(10 + (i % 5)) }));
    const { capacity } = buildDailyPlan(many, NOW, settings({ targetPerDay: 6 }));
    expect(capacity.planned).toBe(10);
    expect(capacity.fit).toBe(6);
  });

  it('ignores snoozed tasks', () => {
    const s = task({ id: 's', status: 'snoozed', due_at: todayAt(12) });
    const { rows } = buildDailyPlan([s], NOW, settings());
    expect(rows).toHaveLength(0);
  });

  it('carries a task due today but before dayStart (08:00 boundary)', () => {
    // Due today at 06:00, before the default 08:00 day start → overdue/carried.
    const early = task({ id: 'early', due_at: todayAt(6) });
    const { rows, capacity } = buildDailyPlan([early], NOW, settings({ dayStart: '08:00' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(true);
    expect(capacity.carried).toBe(1);
  });

  it('does not carry a task due today at/after dayStart', () => {
    // Due today at 09:00, at/after the 08:00 day start → today's plan, not carried.
    const later = task({ id: 'later', due_at: todayAt(9) });
    const { rows } = buildDailyPlan([later], NOW, settings({ dayStart: '08:00' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(false);
  });

  it('keeps the plan day as today when now is before dayStart', () => {
    // now = 06:00 today, dayStart = 08:00. A task due today at 10:00 is still
    // today's plan (we do not shift the plan back to yesterday).
    const earlyNow = new Date(2026, 6, 1, 6, 0);
    const t = task({ id: 'ten', due_at: todayAt(10) });
    const { rows } = buildDailyPlan([t], earlyNow, settings({ dayStart: '08:00' }));
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(false);
  });
});
