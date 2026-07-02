import { useEffect, useRef, useState } from 'react';
import type { Task } from '@/types';
import { splitIso, joinIso } from '@/lib/time';

const PRIORITIES = [1, 2, 3, 4] as const;
const PRIORITY_LABEL: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };

type Patch = Partial<Pick<Task, 'title' | 'notes' | 'due_at' | 'priority'>>;

interface Props {
  task: Task;
  onClose: () => void;
  onSave: (patch: Patch) => Promise<void>;
}

export function EditTaskSheet({ task, onClose, onSave }: Props) {
  const initial = splitIso(task.due_at);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [priority, setPriority] = useState(task.priority);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Escape closes the sheet; move focus to the title field on open.
  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function save() {
    setSaving(true);
    await onSave({
      title: title.trim() || task.title,
      notes: notes.trim() || null,
      due_at: joinIso(date, time),
      priority,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md space-y-3 rounded-t-2xl bg-slate-900 p-4 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit task</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <input
          ref={titleRef}
          aria-label="Edit title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-brand"
        />

        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Edit due date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-brand"
          />
          <input
            type="time"
            aria-label="Edit due time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              aria-label={`Priority ${p}`}
              aria-pressed={priority === p}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                priority === p ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>

        <textarea
          aria-label="Edit notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-brand"
        />

        <button
          onClick={() => void save()}
          disabled={saving}
          className="w-full rounded-xl bg-brand py-3 font-medium text-white transition hover:bg-brand-soft disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
