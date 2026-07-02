import type { TaskDraft } from '@/types';

/** A single blank editable row. Used when Claude returns nothing usable so
 *  the confirm sheet never dead-ends — the user always gets at least one row
 *  they can fill in by hand. */
export function emptyDraft(): TaskDraft {
  return { title: '', notes: null, due_at: null, priority: 3 };
}

function clampPriority(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(4, Math.max(1, Math.round(n)));
}

function coerceString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/** Coerce a due_at into an ISO string or null. Accepts an ISO string; passes
 *  through anything Date can parse, otherwise null. Never throws. */
function coerceDueAt(value: unknown): string | null {
  const s = coerceString(value);
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

function toDraft(raw: unknown): TaskDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = coerceString(r.title) ?? '';
  return {
    title,
    notes: coerceString(r.notes),
    due_at: coerceDueAt(r.due_at),
    priority: clampPriority(r.priority),
  };
}

/**
 * Normalize whatever the parse-task edge function returned into a clean
 * TaskDraft[]. This is the client-side safety net around Claude's output:
 *
 *  - Accepts `{ tasks: [...] }`, a bare array, or a single object.
 *  - Drops entries that aren't objects or that normalize to an empty title.
 *  - Clamps priority to 1..4, coerces due_at to ISO|null.
 *  - Never returns an empty list: bad/empty input yields one blank row so the
 *    confirm sheet is always usable.
 *
 * Pure and total — safe to call on untrusted input.
 */
export function parseDrafts(raw: unknown): TaskDraft[] {
  let list: unknown[] = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    const maybe = (raw as Record<string, unknown>).tasks;
    if (Array.isArray(maybe)) {
      list = maybe;
    } else {
      // A single task object (no wrapper).
      list = [raw];
    }
  }

  const drafts = list
    .map(toDraft)
    .filter((d): d is TaskDraft => d !== null && d.title.length > 0);

  return drafts.length ? drafts : [emptyDraft()];
}
