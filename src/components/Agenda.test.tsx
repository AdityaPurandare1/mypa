import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Agenda } from './Agenda';
import type { Task } from '@/types';

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

describe('Agenda', () => {
  it('flags an overdue open task with a red badge', () => {
    const t = task({ id: 'od', title: 'Overdue thing', due_at: '2000-01-01T00:00:00Z', status: 'open' });
    render(<Agenda tasks={[t]} onComplete={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    const badge = screen.getByTestId('overdue-od');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Overdue/);
  });

  it('does not flag a future task as overdue', () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const t = task({ id: 'fut', due_at: future });
    render(<Agenda tasks={[t]} onComplete={noop} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    expect(screen.queryByTestId('overdue-fut')).not.toBeInTheDocument();
  });

  it('calls onComplete when the checkbox is tapped', () => {
    const onComplete = vi.fn();
    const t = task({ id: 'x' });
    render(<Agenda tasks={[t]} onComplete={onComplete} onSnooze={noop} onDelete={noop} onEdit={noop} />);
    fireEvent.click(screen.getByLabelText('Complete task'));
    expect(onComplete).toHaveBeenCalledWith('x');
  });
});
