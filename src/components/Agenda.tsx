import { addDays, addWeeks, format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import type { Task } from '@/types';
import { toDate } from '@/lib/time';
import { getSettings } from '@/lib/settings';
import { buildDailyPlan, type PlanRow } from '@/lib/plan';
import { displayName, monogram } from '@/lib/user';
import { priorityBorderClass, priorityBgClass } from '@/lib/ui';
import { IconCheck } from './icons';

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
  onSnooze: (id: string, until: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Sub-line for a timed task. Tasks only carry a due time (no duration), so we
 *  show just that time with an unambiguous meridian — no invented end. */
function timeSubline(dueMs: number | null): string {
  if (dueMs === null) return 'No time · Anytime';
  return `${format(new Date(dueMs), 'h:mm a')} · Focus block`;
}

function TimeLabel({ dueMs }: { dueMs: number | null }) {
  return (
    <div className="pt-[9px] text-[11px] font-medium text-ink-secondary">
      {dueMs === null ? '' : format(new Date(dueMs), 'h:mm')}
    </div>
  );
}

function TaskRow({
  row,
  now,
  onComplete,
  onReopen,
  onSnooze,
  onDelete,
  onEdit,
}: { row: PlanRow; now: Date } & Omit<Props, 'tasks'>) {
  const { task, carried, dueMs } = row;
  const done = task.status === 'done';
  const due = toDate(task.due_at);
  const snoozeBase = due && due.getTime() > now.getTime() ? due : now;

  return (
    <div className="grid grid-cols-[44px_1fr] gap-2">
      <TimeLabel dueMs={dueMs} />
      <div className="flex gap-2">
        {/* left rail — takes the row's priority hue; sage once done */}
        <div
          className={`w-[3px] flex-shrink-0 rounded-full ${
            done ? 'bg-accent-success' : priorityBgClass(task.priority)
          }`}
        />
        <div
          className={`min-w-0 flex-1 rounded-[9px] border bg-surface p-3 transition-colors duration-[120ms] ${priorityBorderClass(
            task.priority,
            carried,
          )}`}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <button
              onClick={() => (done ? onReopen(task.id) : onComplete(task.id))}
              aria-label={done ? 'Mark not done' : 'Complete task'}
              className={`mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-[120ms] ${
                done ? 'border-accent-success bg-accent-success text-app' : 'border-ink-empty'
              }`}
            >
              {done && <IconCheck size={12} />}
            </button>

            <button onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
              <div className="flex items-start gap-2">
                <span
                  className={`min-w-0 break-words text-[13px] font-medium ${
                    done ? 'text-ink-fainter line-through' : 'text-ink-primary'
                  }`}
                >
                  {task.title}
                </span>
                {!done && task.priority <= 2 && (
                  <span
                    className={`mt-[5px] h-[7px] w-[7px] flex-shrink-0 rounded-full ${priorityBgClass(task.priority)}`}
                  />
                )}
              </div>
              <div className="mt-0.5 text-[11px]">
                {carried ? (
                  <span data-testid={`carried-${task.id}`} className="text-[#FFB74D]">
                    Carried from yesterday · P{task.priority}
                  </span>
                ) : (
                  <span className="text-ink-muted">{timeSubline(dueMs)}</span>
                )}
              </div>
            </button>

            {/* keep existing snooze/delete affordances */}
            <div className="flex flex-shrink-0 items-center gap-1 text-ink-empty">
              <button
                onClick={() => onSnooze(task.id, addDays(snoozeBase, 1).toISOString())}
                aria-label="Snooze one day"
                className="px-1 text-[11px] transition-colors duration-[120ms] hover:text-ink-secondary"
              >
                +1d
              </button>
              <button
                onClick={() => onSnooze(task.id, addWeeks(snoozeBase, 1).toISOString())}
                aria-label="Snooze one week"
                className="px-1 text-[11px] transition-colors duration-[120ms] hover:text-ink-secondary"
              >
                +1w
              </button>
              <button
                onClick={() => onDelete(task.id)}
                aria-label="Delete"
                className="px-1 text-[13px] transition-colors duration-[120ms] hover:text-accent-destructive"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Agenda({ tasks, ...actions }: Props) {
  const { session } = useAuth();
  const now = new Date();
  const settings = getSettings();
  const plan = buildDailyPlan(tasks, now, settings);
  const { rows, capacity } = plan;

  const name = displayName(session?.user);
  const initial = monogram(session?.user);

  // Progress segments: done + planned within the target.
  const total = Math.max(capacity.target, capacity.done + capacity.planned, 1);
  const donePct = (capacity.done / total) * 100;
  const plannedPct = (Math.min(capacity.planned, capacity.target) / total) * 100;

  return (
    <div className="flex-1 px-[22px] pb-6 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            {format(now, 'EEE')} · {format(now, 'MMM d').toUpperCase()}
          </div>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.01em] text-ink-primary">
            {greeting(now)}, {name}
          </h1>
        </div>
        <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-chip-alt text-[15px] font-medium text-ink-card">
          {initial}
        </div>
      </div>

      {/* Capacity card */}
      <div className="mt-5 rounded-[12px] border border-hairline bg-surface px-[14px] py-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink-secondary">
            {capacity.fit} {capacity.fit === 1 ? 'task fits' : 'tasks fit'} your day
          </span>
          {capacity.carried > 0 && (
            <span className="text-[12px] text-[#FFB74D]">{capacity.carried} carried over</span>
          )}
        </div>
        <div className="mt-2.5 flex h-1.5 gap-1 overflow-hidden rounded-full bg-rail">
          {donePct > 0 && <div className="h-full rounded-full bg-[#42D392]" style={{ width: `${donePct}%` }} />}
          {plannedPct > 0 && (
            <div className="h-full rounded-full bg-[#4DA3FF]" style={{ width: `${plannedPct}%` }} />
          )}
        </div>
        <div className="mt-2 text-[11px] text-ink-fainter">
          ~{capacity.focusFreeHours}h focus free · {capacity.done} done
        </div>
      </div>

      {/* Timeline */}
      {rows.length === 0 ? (
        <p className="pt-12 text-center text-[13px] text-ink-muted">
          Nothing planned yet. Tap ＋ to capture your day.
        </p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {rows.map((row) => (
            <TaskRow key={row.task.id} row={row} now={now} {...actions} />
          ))}
        </div>
      )}
    </div>
  );
}
