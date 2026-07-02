import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { Task } from '@/types';
import { splitIso, joinIso, toDate } from '@/lib/time';
import { prioritySegmentActiveClass } from '@/lib/ui';
import { IconBack, IconTrash, IconCheck, IconCalendar } from './icons';

const PRIORITIES = [1, 2, 3, 4] as const;

type Patch = Partial<Pick<Task, 'title' | 'notes' | 'due_at' | 'priority'>>;

interface Props {
  task: Task;
  onClose: () => void;
  onSave: (patch: Patch) => Promise<void>;
  /** Persist edits AND complete in a single parent-owned flow; the parent
   *  closes the sheet only after both settle. */
  onSaveAndComplete: (id: string, patch: Patch) => Promise<void>;
  /** Persist edits AND reopen (undo a done) in a single parent-owned flow. */
  onSaveAndReopen: (id: string, patch: Patch) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  /** Undo an accidental complete — back to open. Parent closes the sheet. */
  onReopen: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditTaskSheet({
  task,
  onClose,
  onSave,
  onSaveAndComplete,
  onSaveAndReopen,
  onComplete,
  onReopen,
  onDelete,
}: Props) {
  const initial = splitIso(task.due_at);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [priority, setPriority] = useState(task.priority);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Escape closes the sheet; move focus to the title field on open.
  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // Escape uses the raw close (no save) to match the existing cancel semantics.
  }, [onClose]);

  function patch(): Patch {
    return {
      title: title.trim() || task.title,
      notes: notes.trim() || null,
      due_at: joinIso(date, time),
      priority,
    };
  }

  // Persist edits + complete as one parent-owned flow ("Mark done"). The parent
  // closes the sheet only after both settle; a failure keeps it open with an
  // inline error and no premature unmount.
  async function markDone() {
    setBusy(true);
    setError(null);
    try {
      await onSaveAndComplete(task.id, patch());
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Symmetric undo: persist edits + reopen as one parent-owned flow.
  async function markUndone() {
    setBusy(true);
    setError(null);
    try {
      await onSaveAndReopen(task.id, patch());
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Persist edits, then close (back chevron). A failed save keeps the sheet open.
  async function saveAndClose() {
    setBusy(true);
    setError(null);
    try {
      await onSave(patch());
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Circle button / trash: surface failures inline instead of an unhandled
  // rejection (mutations rethrow after rollback). The circle toggles: a done
  // task goes back to open (undo for an accidental complete).
  function toggleDone() {
    setError(null);
    const action = task.status === 'done' ? onReopen : onComplete;
    void action(task.id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }
  function deleteTask() {
    setError(null);
    void onDelete(task.id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  const updated = toDate(task.updated_at);
  const done = task.status === 'done';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app" role="dialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-[22px] pb-6 pt-8">
        {/* Top bar */}
        <div className="flex items-center">
          <button
            onClick={() => void saveAndClose()}
            aria-label="Close"
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary transition-colors duration-[120ms] hover:text-ink-primary"
          >
            <IconBack size={22} />
          </button>
        </div>

        {/* Title row */}
        <div className="mt-5 flex items-start gap-3">
          <button
            onClick={toggleDone}
            aria-label={done ? 'Mark not done' : 'Complete task'}
            className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-[120ms] ${
              done ? 'border-accent-success bg-accent-success text-app' : 'border-ink-empty'
            }`}
          >
            {done && <IconCheck size={13} />}
          </button>
          <input
            ref={titleRef}
            aria-label="Edit title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-[23px] font-bold text-ink-primary outline-none"
          />
        </div>

        {/* Notes */}
        <div className="mt-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">Notes</div>
          <textarea
            aria-label="Edit notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes…"
            className="mt-2 w-full resize-none rounded-[10px] border border-hairline bg-surface p-3 text-[14px] text-ink-secondary placeholder-ink-fainter outline-none"
          />
        </div>

        {/* Due date + time */}
        <div className="mt-4 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-[10px] border border-hairline bg-surface px-3 py-2.5 text-[13px] text-ink-secondary">
            <IconCalendar size={16} className="text-ink-faint" />
            <span className="flex-1">{date ? format(new Date(`${date}T00:00`), 'EEE, MMM d') : 'No date'}</span>
            <input
              type="date"
              aria-label="Edit due date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute h-0 w-0 opacity-0"
            />
          </label>
          <label className="flex w-[120px] items-center rounded-[10px] border border-hairline bg-surface px-3 py-2.5 text-[13px] text-ink-secondary">
            <span className="flex-1">{time || 'Time'}</span>
            <input
              type="time"
              aria-label="Edit due time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="absolute h-0 w-0 opacity-0"
            />
          </label>
        </div>

        {/* Priority segmented control */}
        <div className="mt-4 flex gap-1.5 rounded-full border border-hairline bg-surface p-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              aria-label={`Priority ${p}`}
              aria-pressed={priority === p}
              className={`flex-1 rounded-full py-1.5 text-[12px] transition-colors duration-[120ms] ${
                priority === p ? `font-bold ${prioritySegmentActiveClass(p)}` : 'text-ink-muted'
              }`}
            >
              P{p}
            </button>
          ))}
        </div>

        {/* Meta */}
        <div className="mt-4 text-[11px] text-ink-empty">
          Created via {task.source ?? 'Capture'}
          {updated ? ` · Last updated ${format(updated, 'h:mm a')}` : ''}
        </div>

        <div className="flex-1" />

        {/* Inline save error — the sheet stays open so the edit isn't lost. */}
        {error && <p className="mb-2 text-[13px] text-accent-destructive" role="alert">{error}</p>}

        {/* Footer */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={deleteTask}
            aria-label="Delete task"
            className="flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-full border border-[rgba(212,105,78,0.5)] text-accent-destructive transition-colors duration-[120ms]"
          >
            <IconTrash size={20} />
          </button>
          <button
            onClick={() => void (done ? markUndone() : markDone())}
            disabled={busy}
            className={`flex-1 rounded-full py-3.5 text-[15px] font-bold transition disabled:opacity-50 ${
              done
                ? 'border border-[rgba(245,239,229,0.18)] bg-surface text-ink-card'
                : 'bg-accent-success text-btn-success-ink'
            }`}
          >
            {busy ? 'Saving…' : done ? 'Mark undone' : 'Mark done'}
          </button>
        </div>
      </div>
    </div>
  );
}
