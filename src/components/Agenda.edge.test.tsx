import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Agenda } from './Agenda';
import type { Task } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/settings';

// Mutable auth session so we can exercise the monogram/name fallbacks.
const authState = { session: null as unknown };
vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}));

// Deterministic settings, target=6 for overflow tests.
vi.mock('@/lib/settings', async () => {
  const actual = await vi.importActual<typeof import('./../lib/settings')>('@/lib/settings');
  return { ...actual, getSettings: () => ({ ...actual.DEFAULT_SETTINGS, targetPerDay: 6 }) };
});

function task(over: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u1',
    title: 'A task',
    raw_input: null,
    notes: null,
    due_at: null,
    priority: 3,
    status: 'open',
    source: 'voice',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    completed_at: null,
    ...over,
  };
}

const noop = () => {};

beforeEach(() => {
  expect(DEFAULT_SETTINGS.carryOverdueForward).toBe(true);
  authState.session = { user: { email: 'michael@hwoodgroup.com', user_metadata: { name: 'Michael' } } };
});

describe('Agenda — empty & fallback states', () => {
  it('shows the empty timeline state with zero tasks', () => {
    render(<Agenda tasks={[]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText(/Nothing planned yet/)).toBeInTheDocument();
  });

  it('falls back to "there" + monogram "Y" when the user has no name/email', () => {
    authState.session = { user: { user_metadata: {} } };
    render(<Agenda tasks={[]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    // greeting name → "there"; monogram → fullName "You" → "Y".
    expect(screen.getByText(/there/)).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
  });

  it('uses the email local-part when no metadata name is present', () => {
    authState.session = { user: { email: 'dana@example.com', user_metadata: {} } };
    render(<Agenda tasks={[]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText(/dana/)).toBeInTheDocument();
  });

  it('renders a null-due_at task in the timeline with "No time · Anytime"', () => {
    const t = task({ id: 'nd', title: 'Someday', due_at: null });
    render(<Agenda tasks={[t]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText('Someday')).toBeInTheDocument();
    expect(screen.getByText(/No time · Anytime/)).toBeInTheDocument();
  });
});

describe('Agenda — overflow (no silent task loss)', () => {
  it('renders ALL plannable tasks even when more than targetPerDay (6)', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}`, title: `Task ${i}`, due_at: null }));
    render(<Agenda tasks={tasks} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    // Every one of the 10 titles must be present — none dropped.
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Task ${i}`)).toBeInTheDocument();
    }
    // Capacity card still reports the capped fit.
    expect(screen.getByText(/6 tasks fit your day/)).toBeInTheDocument();
  });
});

describe('Agenda — actions & progress', () => {
  it('onComplete fires with the right id when the row checkbox is tapped', () => {
    const onComplete = vi.fn();
    const t = task({ id: 'zz', title: 'Ship it' });
    render(<Agenda tasks={[t]} onComplete={onComplete} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    fireEvent.click(screen.getByLabelText('Complete task'));
    expect(onComplete).toHaveBeenCalledWith('zz');
  });

  it('onEdit fires with the task when the title is tapped', () => {
    const onEdit = vi.fn();
    const t = task({ id: 'ee', title: 'Edit me' });
    render(<Agenda tasks={[t]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit me'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.calls[0][0].id).toBe('ee');
  });

  it('reflects a completed-today task in the "done" count', () => {
    const now = new Date();
    const doneToday = task({
      id: 'd1',
      title: 'Done already',
      status: 'done',
      completed_at: now.toISOString(),
    });
    const open = task({ id: 'o1', title: 'Still open', due_at: null });
    render(<Agenda tasks={[doneToday, open]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText(/1 done/)).toBeInTheDocument();
  });

  it('snooze +1d fires with a future ISO for an already-open task', () => {
    const onSnooze = vi.fn();
    const t = task({ id: 'sn', title: 'Snooze me', due_at: null });
    render(<Agenda tasks={[t]} onComplete={noop} onReopen={noop} onSnooze={onSnooze} onDelete={noop} onEdit={noop} />);
    fireEvent.click(screen.getByLabelText('Snooze one day'));
    expect(onSnooze).toHaveBeenCalledTimes(1);
    const [id, until] = onSnooze.mock.calls[0];
    expect(id).toBe('sn');
    expect(new Date(until).getTime()).toBeGreaterThan(Date.now());
  });

  it('delete fires with the right id', () => {
    const onDelete = vi.fn();
    const t = task({ id: 'del', title: 'Delete me' });
    render(<Agenda tasks={[t]} onComplete={noop} onReopen={noop} onSnooze={noop} onDelete={onDelete} onEdit={noop} />);
    // Row-level delete button is labeled "Delete".
    const row = screen.getByText('Delete me').closest('div')!;
    const del = within(row.parentElement!.parentElement!).getByLabelText('Delete');
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledWith('del');
  });
});
