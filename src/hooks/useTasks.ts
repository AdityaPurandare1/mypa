import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, TaskStatus, TaskStep } from '@/types';
import * as api from '@/lib/tasks';

interface UseTasks {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  complete: (id: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  snooze: (id: string, until: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  edit: (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'notes' | 'due_at' | 'priority' | 'status' | 'steps'>>,
  ) => Promise<void>;
  /** Replace a task's step checklist (one-tap toggles from the agenda). */
  setSteps: (id: string, steps: TaskStep[]) => Promise<void>;
}

/**
 * Task list state with optimistic updates + rollback, and refetch-on-focus.
 *
 * Realtime is P2 (see tasks.subscribeTasks). For P1 we keep clients in sync by
 * refetching whenever the tab regains focus/visibility and after every
 * mutation. Mutations apply optimistically and roll back the previous snapshot
 * if the server rejects them, so the UI never blocks on the network.
 */
export function useTasks(): UseTasks {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Latest snapshot for rollback without re-subscribing effects.
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  // Number of mutations currently in flight. A focus/visibility refetch must
  // not clobber optimistic state while a mutation is pending, so we skip its
  // setTasks when this is non-zero. The mutation's own trailing refetch runs
  // after the count drops back to zero.
  const mutationsInFlight = useRef(0);

  const refetch = useCallback(async (skipIfMutating = false) => {
    try {
      const rows = await api.listTasks();
      if (skipIfMutating && mutationsInFlight.current > 0) return;
      setTasks(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();

    const onFocus = () => {
      // Pass skipIfMutating: a focus refetch must not overwrite optimistic
      // state while a mutation is in flight.
      if (document.visibilityState === 'visible') void refetch(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refetch]);

  /**
   * Apply an optimistic map, run the mutation, roll back + refetch on failure.
   * Rethrows after rollback so callers can keep UI (e.g. the edit sheet) open
   * and surface the failure; `error` is also set for passive consumers.
   */
  const mutate = useCallback(
    async (optimistic: (prev: Task[]) => Task[], run: () => Promise<unknown>) => {
      const snapshot = tasksRef.current;
      setTasks(optimistic(snapshot));
      mutationsInFlight.current += 1;
      try {
        await run();
        mutationsInFlight.current -= 1;
        await refetch();
      } catch (e) {
        mutationsInFlight.current -= 1;
        setTasks(snapshot); // rollback
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [refetch],
  );

  const complete = useCallback(
    (id: string) =>
      mutate(
        (prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'done' as TaskStatus, completed_at: new Date().toISOString() } : t,
          ),
        () => api.setStatus(id, 'done'),
      ),
    [mutate],
  );

  /** Undo an accidental complete — back to open, completed_at cleared. */
  const reopen = useCallback(
    (id: string) =>
      mutate(
        (prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'open' as TaskStatus, completed_at: null } : t,
          ),
        () => api.setStatus(id, 'open'),
      ),
    [mutate],
  );

  const snooze = useCallback(
    (id: string, until: string) =>
      mutate(
        (prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: 'snoozed' as TaskStatus, due_at: until } : t)),
        () => api.updateTask(id, { status: 'snoozed', due_at: until }),
      ),
    [mutate],
  );

  const remove = useCallback(
    (id: string) =>
      mutate(
        (prev) => prev.filter((t) => t.id !== id),
        () => api.deleteTask(id),
      ),
    [mutate],
  );

  const edit = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'due_at' | 'priority' | 'status' | 'steps'>>) =>
      mutate(
        (prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        () => api.updateTask(id, patch),
      ),
    [mutate],
  );

  const setSteps = useCallback(
    (id: string, steps: TaskStep[]) =>
      mutate(
        (prev) => prev.map((t) => (t.id === id ? { ...t, steps } : t)),
        () => api.updateTask(id, { steps }),
      ),
    [mutate],
  );

  return { tasks, loading, error, refetch, complete, reopen, snooze, remove, edit, setSteps };
}
