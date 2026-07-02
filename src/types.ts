// Shared domain types. The DB is the source of truth for column names
// (see supabase/migrations/*.sql); these mirror the `tasks` row shape.

export type TaskStatus = 'open' | 'done' | 'snoozed';

/** A persisted task row as returned by the tasks table. */
export interface Task {
  id: string;
  user_id: string;
  title: string;
  raw_input: string | null;
  notes: string | null;
  due_at: string | null; // ISO timestamptz
  priority: number; // 1 (highest) .. 4 (lowest)
  status: TaskStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/** An unsaved task in the confirm sheet — what Claude proposes and the
 *  user edits before Save-all. No id/user_id yet. */
export interface TaskDraft {
  title: string;
  notes: string | null;
  due_at: string | null; // ISO timestamptz, or null for "no date"
  priority: number; // 1..4
}

/** Raw shape the parse-task edge function returns. */
export interface ParseResult {
  tasks: TaskDraft[];
}
