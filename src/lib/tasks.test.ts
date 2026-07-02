import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture what gets passed to .insert(). We build a chainable mock whose
// terminal methods resolve, mirroring the supabase-js builder shape.
const insertSpy = vi.fn();

vi.mock('./supabase', () => {
  function makeBuilder() {
    const rows: unknown[] = [];
    const builder: Record<string, unknown> = {};
    builder.insert = (payload: unknown) => {
      insertSpy(payload);
      return builder;
    };
    builder.select = () => builder;
    builder.single = () => Promise.resolve({ data: { id: 'x' }, error: null });
    // `select()` after insert resolves as a thenable list too.
    builder.then = (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null });
    return builder;
  }
  return {
    supabase: {
      from: () => makeBuilder(),
    },
  };
});

import { createTask, createTasks } from './tasks';

beforeEach(() => {
  insertSpy.mockClear();
});

describe('tasks data layer', () => {
  it('createTask insert payload never contains user_id', async () => {
    await createTask({ title: 'Send invoice', notes: null, due_at: null, priority: 2 });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const payload = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('user_id');
    expect(payload.title).toBe('Send invoice');
    expect(payload.source).toBe('voice');
  });

  it('createTasks batches all rows in a single insert with no user_id', async () => {
    await createTasks([
      { title: 'A', notes: null, due_at: null, priority: 1 },
      { title: 'B', notes: null, due_at: null, priority: 3 },
    ]);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const rows = insertSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(2);
    rows.forEach((r) => expect(r).not.toHaveProperty('user_id'));
    expect(rows.map((r) => r.title)).toEqual(['A', 'B']);
  });

  it('createTasks short-circuits on empty input (no insert)', async () => {
    const out = await createTasks([]);
    expect(out).toEqual([]);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
