import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDueReminders } from './useDueReminders';
import { setSettings } from '@/lib/settings';
import type { Task } from '@/types';

function mockStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

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
    steps: [],
    completed_at: null,
    ...over,
  };
}

let notifCtor: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', mockStorage());
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

  it('does not fire (or request permission) when due-soon reminders are off', () => {
    setSettings({ dueSoonReminders: false });
    const perm = (Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission;
    const due = new Date(Date.now() + 60_000).toISOString(); // within window
    const tasks = [task({ id: 'a', due_at: due, status: 'open' })];
    renderHook(() => useDueReminders(tasks));

    expect(notifCtor).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000 * 3);
    expect(notifCtor).not.toHaveBeenCalled();
    expect(perm).not.toHaveBeenCalled();
  });

  it('resumes firing after the setting is toggled back on (re-read per scan)', () => {
    setSettings({ dueSoonReminders: false });
    const due = new Date(Date.now() + 60_000).toISOString();
    const tasks = [task({ id: 'a', due_at: due, status: 'open' })];
    renderHook(() => useDueReminders(tasks));
    expect(notifCtor).not.toHaveBeenCalled();

    // Toggle on — the next scan tick must pick it up without a remount.
    setSettings({ dueSoonReminders: true });
    vi.advanceTimersByTime(60_000);
    expect(notifCtor).toHaveBeenCalledTimes(1);
  });
});
