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
import { formatDue, toDate } from '@/lib/time';

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({ tasks, onComplete }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());

  // Six-week grid covering the visible month.
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Count of dated tasks per day (yyyy-MM-dd key).
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
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setCursor((c) => subMonths(c, 1))}
          aria-label="Previous month"
          className="rounded-lg px-3 py-1 text-slate-300 hover:bg-slate-800"
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold text-white">{format(cursor, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Next month"
          className="rounded-lg px-3 py-1 text-slate-300 hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const count = countByDay.get(key) ?? 0;
          const inMonth = isSameMonth(day, cursor);
          const isSel = isSameDay(day, selected);
          return (
            <button
              key={key}
              onClick={() => setSelected(day)}
              aria-label={format(day, 'EEEE, MMMM d')}
              aria-pressed={isSel}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                isSel ? 'bg-brand text-white' : inMonth ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600'
              } ${isToday(day) && !isSel ? 'ring-1 ring-brand' : ''}`}
            >
              <span>{format(day, 'd')}</span>
              {count > 0 && (
                <span
                  data-testid={`dot-${key}`}
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-brand-soft'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">{format(selected, 'EEEE, MMMM d')}</h3>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        ) : (
          selectedTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <button
                onClick={() => onComplete(t.id)}
                aria-label="Complete task"
                className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${
                  t.status === 'done' ? 'border-brand bg-brand' : 'border-slate-600 hover:border-brand'
                }`}
              />
              <div className="min-w-0">
                <p className={`truncate ${t.status === 'done' ? 'text-slate-500 line-through' : 'text-white'}`}>
                  {t.title}
                </p>
                <p className="text-xs text-slate-400">{formatDue(t.due_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
