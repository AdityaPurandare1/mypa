import { useCallback, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useDueReminders } from '@/hooks/useDueReminders';
import type { Task, TaskDraft } from '@/types';
import { setInbox } from '@/lib/inbox';
import { Capture } from './Capture';
import { Agenda } from './Agenda';
import { Calendar } from './Calendar';
import { Inbox } from './Inbox';
import { Settings } from './Settings';
import { EditTaskSheet } from './EditTaskSheet';
import { IconToday, IconCalendar, IconInbox, IconSettings, IconPlus } from './icons';

export type Tab = 'today' | 'calendar' | 'capture' | 'inbox' | 'settings';

const NEUTRAL_TABS: { id: Exclude<Tab, 'capture'>; label: string; Icon: typeof IconToday }[] = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { id: 'inbox', label: 'Inbox', Icon: IconInbox },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
];

export function Home() {
  const [tab, setTab] = useState<Tab>('today');
  const [editing, setEditing] = useState<Task | null>(null);
  const { tasks, complete, reopen, snooze, remove, edit, setSteps, refetch } = useTasks();

  useDueReminders(tasks);

  // Capture stashes parsed drafts, then routes to the Inbox for review.
  const onParsed = useCallback((drafts: TaskDraft[], rawInput: string) => {
    setInbox({ drafts, rawInput });
    setTab('inbox');
  }, []);

  // Row-level quick actions: mutations rethrow after rollback (so the edit
  // sheet can react); for one-tap rows the rollback IS the feedback — swallow
  // the rejection instead of leaving it unhandled.
  const quietComplete = useCallback((id: string) => void complete(id).catch(() => {}), [complete]);
  const quietReopen = useCallback((id: string) => void reopen(id).catch(() => {}), [reopen]);
  const quietSnooze = useCallback(
    (id: string, until: string) => void snooze(id, until).catch(() => {}),
    [snooze],
  );
  const quietRemove = useCallback((id: string) => void remove(id).catch(() => {}), [remove]);
  const quietSetSteps = useCallback(
    (id: string, steps: Parameters<typeof setSteps>[1]) => void setSteps(id, steps).catch(() => {}),
    [setSteps],
  );

  // Left/right groups flank the raised center Capture button.
  const left = NEUTRAL_TABS.slice(0, 2);
  const right = NEUTRAL_TABS.slice(2);

  return (
    // h-dvh + overflow-hidden pin the shell to the viewport so the BODY never
    // scrolls — <main> is the only scroller. This is what keeps the tab bar
    // truly immobile on iOS (a scrolling body drags fixed elements along with
    // the rubber-band bounce and the collapsing URL bar).
    <div className="flex h-dvh flex-col overflow-hidden bg-app text-ink-primary">
      <main className="no-scrollbar mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto overscroll-contain pb-32">
        {tab === 'today' && (
          <Agenda
            tasks={tasks}
            onComplete={quietComplete}
            onReopen={quietReopen}
            onSnooze={quietSnooze}
            onDelete={quietRemove}
            onEdit={setEditing}
            onSetSteps={quietSetSteps}
          />
        )}
        {tab === 'calendar' && <Calendar tasks={tasks} />}
        {tab === 'capture' && <Capture onParsed={onParsed} />}
        {tab === 'inbox' && (
          <Inbox onSaved={() => void refetch()} goToday={() => setTab('today')} goCapture={() => setTab('capture')} />
        )}
        {tab === 'settings' && <Settings />}
      </main>

      {/* Bottom tab bar — fixed, safe-area aware. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-tabbar"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-[14px] pt-[10px]">
          {left.map((t) => (
            <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}

          <button
            onClick={() => setTab('capture')}
            aria-label="Capture"
            aria-pressed={tab === 'capture'}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-btn-primary text-btn-primary-ink shadow-capture transition active:scale-95"
          >
            <IconPlus size={26} />
          </button>

          {right.map((t) => (
            <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>
      </nav>

      {editing && (
        <EditTaskSheet
          task={editing}
          onClose={() => setEditing(null)}
          onComplete={async (id) => {
            await complete(id);
            setEditing(null);
          }}
          onReopen={async (id) => {
            await reopen(id);
            setEditing(null);
          }}
          onDelete={async (id) => {
            await remove(id);
            setEditing(null);
          }}
          onSave={async (patch) => {
            await edit(editing.id, patch);
            setEditing(null);
          }}
          onSaveAndComplete={async (id, patch) => {
            // Edit then complete as one flow; close only after BOTH settle.
            // If either mutation rejects, the sheet stays open and surfaces the
            // error (rethrown from useTasks after rollback).
            await edit(id, patch);
            await complete(id);
            setEditing(null);
          }}
          onSaveAndReopen={async (id, patch) => {
            // Symmetric undo: edit then reopen, close only after both settle.
            await edit(id, patch);
            await reopen(id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TabButton({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: typeof IconToday;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex w-14 flex-col items-center gap-1 transition-colors duration-[120ms] ${
        active ? 'text-ink-primary' : 'text-ink-empty'
      }`}
    >
      <Icon size={23} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
