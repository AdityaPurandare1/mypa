import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeSpy = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeSpy(...args) },
  },
}));

// Deterministic tz/now so we can assert the body.
vi.mock('./time', () => ({
  deviceTimeZone: () => 'America/New_York',
  nowIso: () => '2026-07-01T12:00:00.000Z',
}));

import { parseTask } from './parseTask';

beforeEach(() => {
  invokeSpy.mockReset();
});

describe('parseTask', () => {
  it('sends text + timezone + now in the invoke body', async () => {
    invokeSpy.mockResolvedValue({ data: { tasks: [{ title: 'Send invoice', priority: 2 }] }, error: null });
    const drafts = await parseTask('send invoice thursday');
    expect(invokeSpy).toHaveBeenCalledWith('parse-task', {
      body: {
        text: 'send invoice thursday',
        timezone: 'America/New_York',
        now: '2026-07-01T12:00:00.000Z',
      },
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('Send invoice');
  });

  it('returns a single blank draft when the edge fn errors', async () => {
    invokeSpy.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const drafts = await parseTask('whatever');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('');
  });

  it('returns a single blank draft when invoke throws', async () => {
    invokeSpy.mockRejectedValue(new Error('network'));
    const drafts = await parseTask('whatever');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('');
  });

  it('degrades to one blank draft on empty tasks', async () => {
    invokeSpy.mockResolvedValue({ data: { tasks: [] }, error: null });
    const drafts = await parseTask('nothing actionable');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('');
  });
});
