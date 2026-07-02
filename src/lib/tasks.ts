import { supabase } from './supabase';
import type { Task, TaskDraft, TaskStatus, TaskStep } from '@/types';

// Data-access layer for tasks. Plain async functions, no React.
//
// We NEVER write user_id on insert. The DB owns it: tasks.user_id defaults to
// auth.uid() (see 20260701000001_schema.sql) and the "own tasks" RLS policy's
// WITH CHECK rejects any row whose user_id != auth.uid(). So the client only
// ever sends task content, and the server stamps ownership.

const COLUMNS =
  'id, user_id, title, raw_input, notes, due_at, priority, status, source, steps, created_at, updated_at, completed_at';

/** Normalize a row's `steps` into a clean TaskStep[]. Rows from a pre-migration
 *  cache (or a stale API) may lack the column or return null — treat both as an
 *  empty checklist so reads never crash. Non-array values are dropped. */
function normalizeSteps(value: unknown): TaskStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      id: typeof s.id === 'string' ? s.id : crypto.randomUUID(),
      title: typeof s.title === 'string' ? s.title : '',
      done: s.done === true,
    }));
}

/** Coerce a raw row into a Task with a guaranteed `steps` array. */
function normalizeTask(row: unknown): Task {
  const r = (row ?? {}) as Record<string, unknown>;
  return { ...(r as unknown as Task), steps: normalizeSteps(r.steps) };
}

/** All of the caller's tasks, earliest due first (nulls last), then newest. */
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(COLUMNS)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeTask);
}

type NewTaskInput = TaskDraft & { raw_input?: string | null; source?: string | null };

/** Shape a draft into an insert payload. Deliberately omits user_id — the DB
 *  default (auth.uid()) fills it and RLS enforces it. */
function toInsertRow(input: NewTaskInput) {
  // Draft steps are plain titles; stamp an id + done:false for each. Blank
  // titles are dropped so the checklist never carries empty rows.
  const steps: TaskStep[] = (input.steps ?? [])
    .map((title) => (typeof title === 'string' ? title.trim() : ''))
    .filter((title) => title.length > 0)
    .map((title) => ({ id: crypto.randomUUID(), title, done: false }));
  return {
    title: input.title.trim(),
    notes: input.notes ?? null,
    due_at: input.due_at ?? null,
    priority: input.priority,
    raw_input: input.raw_input ?? null,
    source: input.source ?? 'voice',
    steps,
  };
}

/** Insert a single task. */
export async function createTask(input: NewTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(toInsertRow(input))
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return normalizeTask(data);
}

/** Batch insert for Save-all from the confirm sheet. One round trip. */
export async function createTasks(inputs: NewTaskInput[]): Promise<Task[]> {
  if (inputs.length === 0) return [];
  const rows = inputs.map(toInsertRow);
  const { data, error } = await supabase.from('tasks').insert(rows).select(COLUMNS);
  if (error) throw error;
  return (data ?? []).map(normalizeTask);
}

/** Patch a task. Only whitelisted fields; never user_id. */
export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'notes' | 'due_at' | 'priority' | 'status' | 'completed_at' | 'steps'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return normalizeTask(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

/** Set status, stamping completed_at when moving to done. */
export async function setStatus(id: string, status: TaskStatus): Promise<Task> {
  return updateTask(id, {
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  });
}

/**
 * P2 — realtime subscription seam. Currently a typed no-op that returns an
 * unsubscribe function. Phase 1 relies on refetch-on-focus + refetch-after-
 * mutation instead. Wire this to `supabase.channel(...).on('postgres_changes',
 * ...)` when realtime lands.
 */
export function subscribeTasks(_onChange: () => void): () => void {
  // P2
  return () => {};
}
