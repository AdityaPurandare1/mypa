import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Agenda } from './Agenda';
import type { Task } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/settings';

// Agenda reads the auth session for the greeting/monogram.
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: { user: { email: 'michael@hwoodgroup.com', user_metadata: { name: 'Michael' } } } }),
}));

// Keep settings deterministic (carry-overdue ON by default).
vi.mock('@/lib/settings', async () => {
  const actual = await vi.importActual<typeof import('./../lib/settings')>('@/lib/settings');
  return { ...actual, getSettings: () => actual.DEFAULT_SETTINGS };
});

function task(over: Partial<Task>): Task {
  return {
    id: 'id1',
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
});

describe('Agenda (Today)', () => {
  it('flags an overdue open task as carried when carry-forward is on', () => {
    const t = task({ id: 'od', title: 'Overdue thing', due_at: '2000-01-01T00:00:00Z', status: 'open' });
    render(<Agenda tasks={[t]} onComplete={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    const flag = screen.getByTestId('carried-od');
    expect(flag).toBeInTheDocument();
    expect(flag).toHaveTextContent(/Carried/);
  });

  it('shows a no-date open task in today without a carried flag', () => {
    const t = task({ id: 'nd', title: 'Someday thing', due_at: null });
    render(<Agenda tasks={[t]} onComplete={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText('Someday thing')).toBeInTheDocument();
    expect(screen.queryByTestId('carried-nd')).not.toBeInTheDocument();
  });

  it('calls onComplete when the checkbox is tapped', () => {
    const onComplete = vi.fn();
    const t = task({ id: 'x' });
    render(<Agenda tasks={[t]} onComplete={onComplete} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    fireEvent.click(screen.getByLabelText('Complete task'));
    expect(onComplete).toHaveBeenCalledWith('x');
  });

  it('greets the signed-in user by name', () => {
    render(<Agenda tasks={[]} onComplete={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText(/Michael/)).toBeInTheDocument();
  });

  it('shows only the due time with meridian (no invented end time)', () => {
    const due = new Date();
    due.setHours(14, 0, 0, 0); // 2:00 PM today, after the default 08:00 dayStart
    const t = task({ id: 'timed', title: 'Timed thing', due_at: due.toISOString() });
    render(<Agenda tasks={[t]} onComplete={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.getByText('2:00 PM · Focus block')).toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });
});
