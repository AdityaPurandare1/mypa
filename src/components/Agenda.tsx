import { addDays, addWeeks } from 'date-fns';
import type { Task } from '@/types';
import { formatDue, isOverdue, isDueToday, toDate } from '@/lib/time';

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
  onSnooze: (id: string, until: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

type Bucket = 'Overdue' | 'Today' | 'Upcoming' | 'No date';

function bucketOf(t: Task): Bucket {
  if (!t.due_at) return 'No date';
  if (isOverdue(t.due_at) && t.status === 'open') return 'Overdue';
  if (isDueToday(t.due_at)) return 'Today';
  return 'Upcoming';
}

const ORDER: Bucket[] = ['Overdue', 'Today', 'Upcoming', 'No date'];

const PRIORITY_DOT: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-400',
  3: 'bg-slate-500',
  4: 'bg-slate-700',
};

function TaskRow({ task, onComplete, onSnooze, onDelete, onEdit }: { task: Task } & Omit<Props, 'tasks'>) {
  const overdue = isOverdue(task.due_at) && task.status === 'open';
  const done = task.status === 'done';
  // Snooze anchors on the later of now / the current due date, so snoozing an
  // already-overdue task never lands it further in the past.
  const now = new Date();
  const due = toDate(task.due_at);
  const snoozeBase = due && due.getTime() > now.getTime() ? due : now;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
      <button
        onClick={() => onComplete(task.id)}
        aria-label={done ? 'Completed' : 'Complete task'}
        className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 ${
          done ? 'border-brand bg-brand' : 'border-slate-600 hover:border-brand'
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <span className={`truncate font-medium ${done ? 'text-slate-500 line-through' : 'text-white'}`}>
            {task.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          {overdue ? (
            <span
              data-testid={`overdue-${task.id}`}
              className="rounded bg-red-500/20 px-1.5 py-0.5 font-medium text-red-400"
            >
              Overdue · {formatDue(task.due_at)}
            </span>
          ) : (
            <span className="text-slate-400">{formatDue(task.due_at)}</span>
          )}
        </div>
        {task.notes && <p className="mt-1 truncate text-xs text-slate-500">{task.notes}</p>}
      </div>
      <div className="flex flex-shrink-0 gap-1 text-slate-500">
        <button onClick={() => onEdit(task)} aria-label="Edit" className="px-1.5 hover:text-white">
          ✎
        </button>
        <button
          onClick={() => onSnooze(task.id, addDays(snoozeBase, 1).toISOString())}
          aria-label="Snooze one day"
          className="px-1.5 hover:text-white"
        >
          +1d
        </button>
        <button
          onClick={() => onSnooze(task.id, addWeeks(snoozeBase, 1).toISOString())}
          aria-label="Snooze one week"
          className="px-1.5 hover:text-white"
        >
          +1w
        </button>
        <button onClick={() => onDelete(task.id)} aria-label="Delete" className="px-1.5 hover:text-red-400">
          🗑
        </button>
      </div>
    </div>
  );
}

export function Agenda({ tasks, ...actions }: Props) {
  const buckets: Record<Bucket, Task[]> = { Overdue: [], Today: [], Upcoming: [], 'No date': [] };
  for (const t of tasks) buckets[bucketOf(t)].push(t);

  const hasAny = tasks.length > 0;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-6">
      {!hasAny && <p className="pt-12 text-center text-slate-500">No tasks yet. Capture a brain-dump to start.</p>}
      {ORDER.map((b) =>
        buckets[b].length ? (
          <section key={b} className="space-y-2">
            <h2 className={`text-sm font-semibold ${b === 'Overdue' ? 'text-red-400' : 'text-slate-400'}`}>
              {b} <span className="text-slate-600">({buckets[b].length})</span>
            </h2>
            <div className="space-y-2">
              {buckets[b].map((t) => (
                <TaskRow key={t.id} task={t} {...actions} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
