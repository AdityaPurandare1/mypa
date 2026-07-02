import { describe, it, expect } from 'vitest';
import { parseDrafts, emptyDraft } from './parseDrafts';

describe('parseDrafts', () => {
  it('parses a valid { tasks: [...] } wrapper', () => {
    const out = parseDrafts({
      tasks: [
        { title: 'Send invoice', notes: null, due_at: '2026-07-02T17:00:00Z', priority: 2 },
        { title: 'Block deck', notes: 'reserve crew', due_at: '2026-07-03T09:00:00Z', priority: 3 },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe('Send invoice');
    expect(out[1].notes).toBe('reserve crew');
  });

  it('parses a bare array', () => {
    const out = parseDrafts([{ title: 'Only one' }]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Only one');
    expect(out[0].priority).toBe(3); // default
  });

  it('parses a single object (no wrapper)', () => {
    const out = parseDrafts({ title: 'Lonely task', priority: 1 });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Lonely task');
    expect(out[0].priority).toBe(1);
  });

  it('returns one blank draft for a garbage string', () => {
    const out = parseDrafts('totally not json');
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(emptyDraft());
  });

  it('returns one blank draft for an empty array', () => {
    const out = parseDrafts([]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(emptyDraft());
  });

  it('returns one blank draft for null/undefined', () => {
    expect(parseDrafts(null)).toEqual([emptyDraft()]);
    expect(parseDrafts(undefined)).toEqual([emptyDraft()]);
  });

  it('clamps priority into 1..4', () => {
    const out = parseDrafts({
      tasks: [
        { title: 'a', priority: 0 },
        { title: 'b', priority: 9 },
        { title: 'c', priority: 2.6 },
      ],
    });
    expect(out.map((d) => d.priority)).toEqual([1, 4, 3]);
  });

  it('coerces bad due_at to null', () => {
    const out = parseDrafts({ tasks: [{ title: 'x', due_at: 'someday' }] });
    expect(out[0].due_at).toBeNull();
  });

  it('drops entries with empty titles', () => {
    const out = parseDrafts({
      tasks: [{ title: '   ' }, { title: 'kept' }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('kept');
  });

  it('parses the two-task brain-dump shape into 2 drafts', () => {
    // "send invoice Thursday / block deck Friday"
    const out = parseDrafts({
      tasks: [
        { title: 'Send invoice', notes: null, due_at: '2026-07-02T17:00:00Z', priority: 2 },
        { title: 'Block deck', notes: null, due_at: '2026-07-03T17:00:00Z', priority: 3 },
      ],
    });
    expect(out).toHaveLength(2);
    out.forEach((d) => expect(d.title.split(/\s+/).length).toBeLessThanOrEqual(6));
  });
});
