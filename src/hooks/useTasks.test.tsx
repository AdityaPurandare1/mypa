import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/lib/tasks', () => ({
  listTasks: vi.fn(),
  setStatus: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import * as api from '@/lib/tasks';
import { useTasks } from './useTasks';
import type { Task } from '@/types';

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    user_id: 'u1',
    title: 'T' + id,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTasks', () => {
  it('loads tasks on mount', async () => {
    (api.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue([task('1'), task('2')]);
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toHaveLength(2);
  });

  it('rolls back the optimistic change when a mutation fails', async () => {
    (api.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue([task('1', { status: 'open' })]);
    (api.setStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('server said no'));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      // mutate now rethrows after rollback so callers can react; swallow here.
      await expect(result.current.complete('1')).rejects.toThrow('server said no');
    });

    // Optimistic flip to 'done' must have been rolled back to 'open'.
    expect(result.current.tasks[0].status).toBe('open');
    expect(result.current.error).toContain('server said no');
    // refetch is NOT called on a failed mutation (we roll back instead).
    expect(api.listTasks).toHaveBeenCalledTimes(1);
  });

  it('refetches after a successful mutation', async () => {
    (api.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue([task('1')]);
    (api.setStatus as ReturnType<typeof vi.fn>).mockResolvedValue(task('1', { status: 'done' }));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.complete('1');
    });

    // initial load + post-mutation refetch
    expect(api.listTasks).toHaveBeenCalledTimes(2);
  });
});
