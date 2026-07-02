import { useEffect, useRef, useState } from 'react';
import type { TaskDraft } from '@/types';
import { emptyDraft } from '@/lib/parseDrafts';
import { splitIso, joinIso, formatDue, formatTime } from '@/lib/time';
import * as api from '@/lib/tasks';
import { priorityBorderClass } from '@/lib/ui';
import { IconBack } from './icons';

const PRIORITIES = [1, 2, 3, 4] as const;

interface Props {
  initial: TaskDraft[];
  rawInput: string;
  /** Back / discard — leaves the review without saving. */
  onClose: () => void;
  /** Called after a successful batch save. */
  onSaved: () => void;
}

/** Priority badge — P1 is tan-outlined, P2–P4 neutral-outlined. */
function PriorityBadge({ priority }: { priority: number }) {
  const p1 = priority === 1;
  return (
    <span
      className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        p1
          ? 'border-[rgba(210,164,110,0.4)] text-accent-priority'
          : 'border-[rgba(245,239,229,0.18)] text-ink-muted'
      }`}
    >
      P{priority}
    </span>
  );
}

export function ConfirmSheet({ initial, rawInput, onClose, onSaved }: Props) {
  const [drafts, setDrafts] = useState<TaskDraft[]>(initial.length ? initial : [emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Discard guard: when there are drafts with content, confirm before dropping
  // them. Blank/empty drafts discard without a prompt. Used by the Discard
  // button, the back chevron, and Escape. Kept in a ref so the keydown listener
  // always sees the current draft count without re-subscribing.
  const requestCloseRef = useRef<() => void>(() => onClose());
  requestCloseRef.current = () => {
    const filled = drafts.some((d) => d.title.trim().length > 0);
    if (filled) {
      const n = drafts.filter((d) => d.title.trim().length > 0).length;
      if (!window.confirm(`Discard ${n} parsed ${n === 1 ? 'task' : 'tasks'}?`)) return;
    }
    onClose();
  };
  const requestClose = () => requestCloseRef.current();

  // Escape closes the review; move focus to the first title field on open.
  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function patch(i: number, p: Partial<TaskDraft>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...p } : d)));
  }
  function removeRow(i: number) {
    setDrafts((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addRow() {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }

  async function saveAll() {
    const keep = drafts.filter((d) => d.title.trim().length > 0);
    if (keep.length === 0) {
      setError('Add a title to at least one task.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createTasks(keep.map((d) => ({ ...d, raw_input: rawInput })));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  const keepCount = drafts.filter((d) => d.title.trim()).length;

  return (
    <div className="flex min-h-full flex-1 flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center gap-3 px-[22px] pb-2 pt-8">
        <button
          onClick={requestClose}
          aria-label="Back"
          className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary transition-colors duration-[120ms] hover:text-ink-primary"
        >
          <IconBack size={22} />
        </button>
        <div>
          <h2 className="text-[20px] font-bold text-ink-primary">
            Review {keepCount} {keepCount === 1 ? 'task' : 'tasks'}
          </h2>
          <p className="text-[12px] text-ink-muted">Edit anything, then save all.</p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-[22px] py-3">
        {drafts.map((d, i) => {
          const { date, time } = splitIso(d.due_at);
          return (
            <div
              key={i}
              className={`rounded-[12px] border bg-surface p-[14px] ${priorityBorderClass(d.priority)}`}
            >
              <div className="flex items-start gap-2">
                <input
                  ref={i === 0 ? firstFieldRef : undefined}
                  aria-label={`Title ${i + 1}`}
                  placeholder="Task title"
                  value={d.title}
                  onChange={(e) => patch(i, { title: e.target.value })}
                  className="flex-1 bg-transparent text-[14px] font-medium text-ink-card placeholder-ink-fainter outline-none"
                />
                <PriorityBadge priority={d.priority} />
                <button
                  onClick={() => removeRow(i)}
                  aria-label={`Remove task ${i + 1}`}
                  className="text-[15px] text-ink-fainter transition-colors duration-[120ms] hover:text-accent-destructive"
                >
                  ×
                </button>
              </div>

              {/* Date + time chips (native pickers styled as chips). */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <label className="relative flex items-center rounded-chip bg-chip px-2.5 py-1 text-[11px] text-ink-secondary">
                  <span>{date ? formatDue(d.due_at).split(' · ')[0] : 'No date'}</span>
                  <input
                    type="date"
                    aria-label={`Due date ${i + 1}`}
                    value={date}
                    onChange={(e) => patch(i, { due_at: joinIso(e.target.value, time) })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <label className="relative flex items-center rounded-chip bg-chip px-2.5 py-1 text-[11px] text-ink-secondary">
                  <span>{time ? formatTime(d.due_at) : 'No time'}</span>
                  <input
                    type="time"
                    aria-label={`Due time ${i + 1}`}
                    value={time}
                    onChange={(e) => patch(i, { due_at: joinIso(date, e.target.value) })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>

              {/* Priority picker */}
              <div className="mt-2.5 flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => patch(i, { priority: p })}
                    aria-label={`Priority ${p}`}
                    aria-pressed={d.priority === p}
                    className={`flex-1 rounded-full py-1 text-[11px] font-medium transition-colors duration-[120ms] ${
                      d.priority === p
                        ? 'bg-accent-priority font-bold text-btn-primary-ink'
                        : 'bg-chip text-ink-muted'
                    }`}
                  >
                    P{p}
                  </button>
                ))}
              </div>

              <textarea
                aria-label={`Notes ${i + 1}`}
                placeholder="Notes (optional)"
                value={d.notes ?? ''}
                onChange={(e) => patch(i, { notes: e.target.value || null })}
                rows={2}
                className="mt-2.5 w-full resize-none rounded-[10px] border border-hairline bg-app px-3 py-2 text-[13px] text-ink-secondary placeholder-ink-fainter outline-none"
              />
            </div>
          );
        })}

        <button
          onClick={addRow}
          className="w-full rounded-[12px] border border-dashed border-hairline-08 py-2.5 text-[13px] text-ink-muted transition-colors duration-[120ms] hover:text-ink-secondary"
        >
          + Add another
        </button>
      </div>

      <div className="space-y-2 border-t border-hairline px-[22px] py-3">
        {error && <p className="text-[13px] text-accent-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={requestClose}
            className="rounded-full border border-[rgba(245,239,229,0.18)] px-5 py-3 text-[15px] font-medium text-ink-secondary transition-colors duration-[120ms] hover:text-ink-primary"
          >
            Discard
          </button>
          <button
            onClick={() => void saveAll()}
            disabled={saving}
            className="flex-1 rounded-full bg-accent-success py-3 text-[15px] font-bold text-btn-success-ink transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save all ${keepCount || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
