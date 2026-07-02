import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTasks } from '@/hooks/useTasks';
import { useDueReminders } from '@/hooks/useDueReminders';
import type { Task } from '@/types';
import { Capture } from './Capture';
import { Agenda } from './Agenda';
import { Calendar } from './Calendar';
import { EditTaskSheet } from './EditTaskSheet';

type Tab = 'capture' | 'agenda' | 'calendar';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'capture', label: 'Capture', icon: '🎙' },
  { id: 'agenda', label: 'Agenda', icon: '☑' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
];

export function Home() {
  const [tab, setTab] = useState<Tab>('capture');
  const [editing, setEditing] = useState<Task | null>(null);
  const { signOut } = useAuth();
  const { tasks, complete, snooze, remove, edit, refetch } = useTasks();

  useDueReminders(tasks);

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Desktop top nav */}
      <header className="hidden items-center justify-between border-b border-slate-800 px-4 py-3 sm:flex">
        <span className="text-lg font-bold text-white">myPA</span>
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id ? 'bg-brand text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button onClick={() => void signOut()} className="text-sm text-slate-400 hover:text-white">
          Sign out
        </button>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto pb-20 sm:pb-6">
        {tab === 'capture' && <Capture onSaved={() => void refetch()} />}
        {tab === 'agenda' && (
          <Agenda
            tasks={tasks}
            onComplete={complete}
            onSnooze={snooze}
            onDelete={remove}
            onEdit={setEditing}
          />
        )}
        {tab === 'calendar' && <Calendar tasks={tasks} onComplete={complete} />}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-800 bg-slate-900 sm:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            aria-pressed={tab === t.id}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              tab === t.id ? 'text-brand-soft' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {editing && (
        <EditTaskSheet
          task={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await edit(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
