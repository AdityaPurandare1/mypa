import { useEffect, useRef, useState } from 'react';
import type { TaskDraft } from '@/types';
import { emptyDraft } from '@/lib/parseDrafts';
import { splitIso, joinIso } from '@/lib/time';
import * as api from '@/lib/tasks';

const PRIORITIES = [1, 2, 3, 4] as const;
const PRIORITY_LABEL: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };

interface Props {
  initial: TaskDraft[];
  rawInput: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ConfirmSheet({ initial, rawInput, onClose, onSaved }: Props) {
  const [drafts, setDrafts] = useState<TaskDraft[]>(initial.length ? initial : [emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Escape closes the sheet; move focus to the first title field on open.
  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-slate-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Review tasks</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {drafts.map((d, i) => {
            const { date, time } = splitIso(d.due_at);
            return (
              <div key={i} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={i === 0 ? firstFieldRef : undefined}
                    aria-label={`Title ${i + 1}`}
                    placeholder="Task title"
                    value={d.title}
                    onChange={(e) => patch(i, { title: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-brand"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    aria-label={`Remove task ${i + 1}`}
                    className="rounded-lg px-2 py-2 text-slate-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    aria-label={`Due date ${i + 1}`}
                    value={date}
                    onChange={(e) => patch(i, { due_at: joinIso(e.target.value, time) })}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-brand"
                  />
                  <input
                    type="time"
                    aria-label={`Due time ${i + 1}`}
                    value={time}
                    onChange={(e) => patch(i, { due_at: joinIso(date, e.target.value) })}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-brand"
                  />
                </div>

                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => patch(i, { priority: p })}
                      aria-label={`Priority ${p}`}
                      aria-pressed={d.priority === p}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                        d.priority === p
                          ? 'bg-brand text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>

                <textarea
                  aria-label={`Notes ${i + 1}`}
                  placeholder="Notes (optional)"
                  value={d.notes ?? ''}
                  onChange={(e) => patch(i, { notes: e.target.value || null })}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-brand"
                />
              </div>
            );
          })}

          <button
            onClick={addRow}
            className="w-full rounded-xl border border-dashed border-slate-700 py-2 text-sm text-slate-400 hover:border-brand hover:text-white"
          >
            + Add another
          </button>
        </div>

        <div className="space-y-2 border-t border-slate-800 px-4 py-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={() => void saveAll()}
            disabled={saving}
            className="w-full rounded-xl bg-brand py-3 font-medium text-white transition hover:bg-brand-soft disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save ${drafts.filter((d) => d.title.trim()).length || ''} task${
              drafts.filter((d) => d.title.trim()).length === 1 ? '' : 's'
            }`}
          </button>
        </div>
      </div>
    </div>
  );
}
