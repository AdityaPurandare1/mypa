import { supabase } from './supabase';
import type { Task, TaskDraft, TaskStatus } from '@/types';

// Data-access layer for tasks. Plain async functions, no React.
//
// We NEVER write user_id on insert. The DB owns it: tasks.user_id defaults to
// auth.uid() (see 20260701000001_schema.sql) and the "own tasks" RLS policy's
// WITH CHECK rejects any row whose user_id != auth.uid(). So the client only
// ever sends task content, and the server stamps ownership.

const COLUMNS =
  'id, user_id, title, raw_input, notes, due_at, priority, status, source, created_at, updated_at, completed_at';

/** All of the caller's tasks, earliest due first (nulls last), then newest. */
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(COLUMNS)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

type NewTaskInput = TaskDraft & { raw_input?: string | null; source?: string | null };

/** Shape a draft into an insert payload. Deliberately omits user_id — the DB
 *  default (auth.uid()) fills it and RLS enforces it. */
function toInsertRow(input: NewTaskInput) {
  return {
    title: input.title.trim(),
    notes: input.notes ?? null,
    due_at: input.due_at ?? null,
    priority: input.priority,
    raw_input: input.raw_input ?? null,
    source: input.source ?? 'voice',
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
  return data as Task;
}

/** Batch insert for Save-all from the confirm sheet. One round trip. */
export async function createTasks(inputs: NewTaskInput[]): Promise<Task[]> {
  if (inputs.length === 0) return [];
  const rows = inputs.map(toInsertRow);
  const { data, error } = await supabase.from('tasks').insert(rows).select(COLUMNS);
  if (error) throw error;
  return (data ?? []) as Task[];
}

/** Patch a task. Only whitelisted fields; never user_id. */
export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'notes' | 'due_at' | 'priority' | 'status' | 'completed_at'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Task;
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
