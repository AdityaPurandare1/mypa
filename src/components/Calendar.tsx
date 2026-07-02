import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import type { Task } from '@/types';
import { formatTime, toDate } from '@/lib/time';
import { priorityBgClass } from '@/lib/ui';
import { IconBack, IconForward } from './icons';

interface Props {
  tasks: Task[];
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({ tasks }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [view, setView] = useState<'week' | 'month'>('month');

  // Six-week grid covering the visible month.
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Count of dated tasks per day (yyyy-MM-dd key) — drives density dots.
  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      const d = toDate(t.due_at);
      if (!d) continue;
      const key = format(d, 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const selectedTasks = tasks.filter((t) => {
    const d = toDate(t.due_at);
    return d && isSameDay(d, selected);
  });

  return (
    <div className="flex-1 px-[22px] pb-6 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-[120ms] hover:text-ink-primary"
          >
            <IconBack size={18} />
          </button>
          <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink-primary">{format(cursor, 'MMMM yyyy')}</h2>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-[120ms] hover:text-ink-primary"
          >
            <IconForward size={18} />
          </button>
        </div>
        {/* Week / Month segmented toggle (Month active; Week is a stub). */}
        <div className="flex items-center rounded-full bg-surface p-0.5">
          {(['week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors duration-[120ms] ${
                view === v ? 'bg-btn-primary text-btn-primary-ink' : 'text-ink-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-[0.1em] text-ink-fainter">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const count = countByDay.get(key) ?? 0;
          const inMonth = isSameMonth(day, cursor);
          const isSel = isSameDay(day, selected);
          // Highlight today only when the cursor month contains it (it can
          // appear as a padding cell while browsing adjacent months).
          const today = isToday(day) && inMonth;
          const dots = Math.min(count, 3);
          return (
            <button
              key={key}
              onClick={() => setSelected(day)}
              aria-label={format(day, 'EEEE, MMMM d')}
              aria-pressed={isSel}
              className="flex flex-col items-center justify-center gap-1 py-1"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] transition-colors duration-[120ms] ${
                  today
                    ? 'bg-btn-primary font-bold text-btn-primary-ink'
                    : isSel
                      ? 'font-medium text-ink-primary ring-1 ring-hairline-09'
                      : inMonth
                        ? 'text-ink-secondary'
                        : 'text-ink-trailing'
                }`}
              >
                {format(day, 'd')}
              </span>
              <span className="flex h-1.5 items-center gap-[3px]">
                {dots > 0 && (
                  <span
                    data-testid={`dot-${key}`}
                    className="h-1 w-1 rounded-full bg-accent-event"
                  />
                )}
                {dots > 1 && <span className="h-1 w-1 rounded-full bg-accent-priority" />}
                {dots > 2 && <span className="h-1 w-1 rounded-full bg-accent-success" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-4 border-t border-hairline" />

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
          {format(selected, 'EEEE, MMMM d').toUpperCase()}
        </h3>
        {selectedTasks.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Nothing scheduled.</p>
        ) : (
          selectedTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <div className={`h-9 w-1 flex-shrink-0 rounded-full ${priorityBgClass(t.priority)}`} />
              <div className="min-w-0 flex-1">
                <p
                  className={`break-words text-[13px] font-medium ${
                    t.status === 'done' ? 'text-ink-fainter line-through' : 'text-ink-card'
                  }`}
                >
                  {t.title}
                </p>
                <p className="text-[11px] text-ink-faint">{formatTime(t.due_at) || 'All day'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
