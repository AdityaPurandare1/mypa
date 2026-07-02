import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture what gets passed to .insert()/.select(). We build a chainable mock
// whose terminal methods resolve, mirroring the supabase-js builder shape.
const insertSpy = vi.fn();
const selectSpy = vi.fn();
// Rows the terminal list resolver returns; tests set this to exercise reads.
let listRows: unknown[] = [];

vi.mock('./supabase', () => {
  function makeBuilder() {
    const builder: Record<string, unknown> = {};
    builder.insert = (payload: unknown) => {
      insertSpy(payload);
      return builder;
    };
    builder.select = (cols?: unknown) => {
      selectSpy(cols);
      return builder;
    };
    builder.order = () => builder;
    builder.eq = () => builder;
    builder.single = () => Promise.resolve({ data: { id: 'x' }, error: null });
    // `select()` (list) resolves as a thenable list too.
    builder.then = (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: listRows, error: null });
    return builder;
  }
  return {
    supabase: {
      from: () => makeBuilder(),
    },
  };
});

import { createTask, createTasks, listTasks } from './tasks';

beforeEach(() => {
  insertSpy.mockClear();
  selectSpy.mockClear();
  listRows = [];
});

describe('tasks data layer', () => {
  it('createTask insert payload never contains user_id', async () => {
    await createTask({ title: 'Send invoice', notes: null, due_at: null, priority: 2, steps: [] });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const payload = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('user_id');
    expect(payload.title).toBe('Send invoice');
    expect(payload.source).toBe('voice');
  });

  it('createTasks batches all rows in a single insert with no user_id', async () => {
    await createTasks([
      { title: 'A', notes: null, due_at: null, priority: 1, steps: [] },
      { title: 'B', notes: null, due_at: null, priority: 3, steps: [] },
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

  it('createTasks maps draft steps to TaskStep objects with ids and done:false', async () => {
    await createTasks([
      { title: 'Compound', notes: null, due_at: null, priority: 2, steps: ['  A ', '', 'B'] },
    ]);
    const rows = insertSpy.mock.calls[0][0] as Array<{ steps: Array<Record<string, unknown>> }>;
    // Blank step dropped; each surviving step gets a string id + done:false.
    expect(rows[0].steps).toHaveLength(2);
    expect(rows[0].steps.map((s) => s.title)).toEqual(['A', 'B']);
    rows[0].steps.forEach((s) => {
      expect(typeof s.id).toBe('string');
      expect((s.id as string).length).toBeGreaterThan(0);
      expect(s.done).toBe(false);
    });
  });

  it('select column list includes steps', async () => {
    await createTask({ title: 'x', notes: null, due_at: null, priority: 3, steps: [] });
    expect(selectSpy).toHaveBeenCalled();
    expect(String(selectSpy.mock.calls[0][0])).toContain('steps');
  });

  it('listTasks normalizes missing/null steps to []', async () => {
    // A pre-migration row (no steps key) and an explicit-null row.
    listRows = [
      { id: '1', title: 'pre-migration' },
      { id: '2', title: 'null steps', steps: null },
      { id: '3', title: 'real', steps: [{ id: 's1', title: 'do', done: true }] },
    ];
    const out = await listTasks();
    expect(out[0].steps).toEqual([]);
    expect(out[1].steps).toEqual([]);
    expect(out[2].steps).toEqual([{ id: 's1', title: 'do', done: true }]);
  });
});
