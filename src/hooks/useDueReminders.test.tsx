import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDueReminders } from './useDueReminders';
import type { Task } from '@/types';

function task(over: Partial<Task>): Task {
  return {
    id: 'id1',
    user_id: 'u1',
    title: 'Due task',
    raw_input: null,
    notes: null,
    due_at: null,
    priority: 3,
    status: 'open',
    source: 'voice',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    completed_at: null,
    ...over,
  };
}

let notifCtor: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  notifCtor = vi.fn();
  // Mock the Notification global with granted permission.
  const N = notifCtor as unknown as typeof Notification & { permission: string; requestPermission: () => Promise<string> };
  N.permission = 'granted';
  N.requestPermission = vi.fn().mockResolvedValue('granted');
  vi.stubGlobal('Notification', N);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDueReminders', () => {
  it('fires exactly once per due task even across multiple scans', () => {
    const due = new Date(Date.now() + 60_000).toISOString(); // within 5-min window
    const tasks = [task({ id: 'a', due_at: due, status: 'open' })];
    renderHook(() => useDueReminders(tasks));

    // Initial scan fires once.
    expect(notifCtor).toHaveBeenCalledTimes(1);

    // Advance past several scan intervals — must NOT re-fire (deduped).
    vi.advanceTimersByTime(60_000 * 3);
    expect(notifCtor).toHaveBeenCalledTimes(1);
  });

  it('does not fire for far-future or non-open tasks', () => {
    const far = new Date(Date.now() + 3 * 3600_000).toISOString();
    const tasks = [
      task({ id: 'far', due_at: far, status: 'open' }),
      task({ id: 'done', due_at: new Date(Date.now() - 1000).toISOString(), status: 'done' }),
    ];
    renderHook(() => useDueReminders(tasks));
    expect(notifCtor).not.toHaveBeenCalled();
  });
});
