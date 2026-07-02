import { describe, it, expect } from 'vitest';
import { buildDailyPlan } from './plan';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { Task } from '@/types';

// Adversarial edge-case coverage for buildDailyPlan, complementing plan.test.ts.
// Focus: midnight boundaries in local tz, done-today across midnight, overflow
// (silent task loss), duplicate-priority ordering stability, invalid priorities.

const NOW = new Date(2026, 6, 1, 9, 0, 0); // 2026-07-01 09:00 local

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

/** ISO for a given LOCAL time on 2026-07-01. */
function localIso(y: number, mo: number, d: number, h = 0, mi = 0): string {
  return new Date(y, mo, d, h, mi, 0).toISOString();
}

const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });

describe('buildDailyPlan — midnight boundaries (local tz)', () => {
  it('task due 23:59 local YESTERDAY is overdue → carried (when on)', () => {
    const t = task({ id: 'y2359', due_at: localIso(2026, 5, 30, 23, 59) });
    const { rows } = buildDailyPlan([t], NOW, settings({ carryOverdueForward: true }));
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(true);
  });

  it('task due exactly 00:00 local TODAY is before the 08:00 dayStart → carried', () => {
    const t = task({ id: 'today0000', due_at: localIso(2026, 6, 1, 0, 0) });
    const { rows } = buildDailyPlan([t], NOW, settings());
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(true);
  });

  it('task due exactly at dayStart (08:00) local TODAY is dueToday (not carried)', () => {
    const t = task({ id: 'today0800', due_at: localIso(2026, 6, 1, 8, 0) });
    const { rows } = buildDailyPlan([t], NOW, settings());
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(false);
  });

  it('task due 23:59 local TODAY is still part of today (inside [start,end))', () => {
    const t = task({ id: 'today2359', due_at: localIso(2026, 6, 1, 23, 59) });
    const { rows } = buildDailyPlan([t], NOW, settings());
    expect(rows).toHaveLength(1);
    expect(rows[0].carried).toBe(false);
  });

  it('task due 00:00 local TOMORROW is future → excluded', () => {
    const t = task({ id: 'tmrw0000', due_at: localIso(2026, 6, 2, 0, 0) });
    const { rows } = buildDailyPlan([t], NOW, settings());
    expect(rows).toHaveLength(0);
  });
});

describe('buildDailyPlan — done-today across midnight', () => {
  it('completed 00:00 today counts; completed 23:59 yesterday does not', () => {
    const doneStart = task({ id: 'ds', status: 'done', completed_at: localIso(2026, 6, 1, 0, 0) });
    const doneYest = task({ id: 'dy', status: 'done', completed_at: localIso(2026, 5, 30, 23, 59) });
    const { rows, capacity } = buildDailyPlan([doneStart, doneYest], NOW, settings());
    expect(capacity.done).toBe(1);
    expect(rows.map((r) => r.task.id)).toEqual(['ds']);
  });

  it('done task with null completed_at is not counted (completedToday=false)', () => {
    const t = task({ id: 'dn', status: 'done', completed_at: null });
    const { rows, capacity } = buildDailyPlan([t], NOW, settings());
    expect(capacity.done).toBe(0);
    expect(rows).toHaveLength(0);
  });

  it('done task completed later TODAY (e.g. 23:00) still counts even though now=09:00', () => {
    const t = task({ id: 'dl', status: 'done', completed_at: localIso(2026, 6, 1, 23, 0) });
    const { capacity } = buildDailyPlan([t], NOW, settings());
    expect(capacity.done).toBe(1);
  });
});

describe('buildDailyPlan — overflow / silent task loss', () => {
  it('returns EVERY plannable row even past targetPerDay (Agenda renders rows, not fit)', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      task({ id: `t${i}`, due_at: localIso(2026, 6, 1, 8 + i) }),
    );
    const { rows, capacity } = buildDailyPlan(many, NOW, settings({ targetPerDay: 6 }));
    // All 12 are returned — the target only caps the "fits your day" number.
    expect(rows).toHaveLength(12);
    expect(capacity.planned).toBe(12);
    expect(capacity.fit).toBe(6);
  });

  it('fit never exceeds planned even if target is larger', () => {
    const two = [task({ due_at: localIso(2026, 6, 1, 10) }), task({ due_at: localIso(2026, 6, 1, 11) })];
    const { capacity } = buildDailyPlan(two, NOW, settings({ targetPerDay: 20 }));
    expect(capacity.fit).toBe(2);
  });
});

describe('buildDailyPlan — ordering stability & duplicate priorities', () => {
  it('same priority + same due time falls back to created_at ascending (stable)', () => {
    const a = task({ id: 'a', priority: 2, due_at: localIso(2026, 6, 1, 10), created_at: '2026-06-01T00:00:00Z' });
    const b = task({ id: 'b', priority: 2, due_at: localIso(2026, 6, 1, 10), created_at: '2026-06-02T00:00:00Z' });
    const { rows } = buildDailyPlan([b, a], NOW, settings());
    expect(rows.map((r) => r.task.id)).toEqual(['a', 'b']);
  });

  it('dated tasks sort before undated tasks at the same priority', () => {
    const dated = task({ id: 'dated', priority: 2, due_at: localIso(2026, 6, 1, 15) });
    const undated = task({ id: 'undated', priority: 2, due_at: null, created_at: '2020-01-01T00:00:00Z' });
    const { rows } = buildDailyPlan([undated, dated], NOW, settings());
    expect(rows.map((r) => r.task.id)).toEqual(['dated', 'undated']);
  });
});

describe('buildDailyPlan — invalid / unusual priority values', () => {
  it('does not crash on out-of-range priorities and orders numerically', () => {
    const p0 = task({ id: 'p0', priority: 0, due_at: localIso(2026, 6, 1, 10) });
    const p9 = task({ id: 'p9', priority: 9, due_at: localIso(2026, 6, 1, 10) });
    const { rows } = buildDailyPlan([p9, p0], NOW, settings());
    // Pure numeric compare: 0 before 9.
    expect(rows.map((r) => r.task.id)).toEqual(['p0', 'p9']);
  });

  it('NaN priority does not throw (documents current sort behavior)', () => {
    const nan = task({ id: 'nan', priority: Number.NaN, due_at: localIso(2026, 6, 1, 10) });
    const ok = task({ id: 'ok', priority: 2, due_at: localIso(2026, 6, 1, 11) });
    expect(() => buildDailyPlan([nan, ok], NOW, settings())).not.toThrow();
    const { rows } = buildDailyPlan([nan, ok], NOW, settings());
    expect(rows).toHaveLength(2);
  });
});

describe('buildDailyPlan — malformed/edge inputs', () => {
  it('unparseable due_at ISO is treated as no-date (still planned today)', () => {
    const t = task({ id: 'bad', due_at: 'not-a-date' });
    const { rows } = buildDailyPlan([t], NOW, settings());
    expect(rows).toHaveLength(1);
    expect(rows[0].dueMs).toBeNull();
    expect(rows[0].carried).toBe(false);
  });

  it('focusFreeHours clamps at 0 and never goes negative for a heavy day', () => {
    const many = Array.from({ length: 20 }, (_, i) => task({ id: `h${i}`, due_at: localIso(2026, 6, 1, 8) }));
    const { capacity } = buildDailyPlan(many, NOW, settings());
    expect(capacity.focusFreeHours).toBe(0);
  });

  it('snoozed task with a due_at today is still hidden', () => {
    const s = task({ id: 's', status: 'snoozed', due_at: localIso(2026, 6, 1, 12) });
    const { rows } = buildDailyPlan([s], NOW, settings());
    expect(rows).toHaveLength(0);
  });
});
