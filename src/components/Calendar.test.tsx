import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { format } from 'date-fns';
import { Calendar } from './Calendar';
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

describe('Calendar', () => {
  it('shows a dot on a day that has a dated task, and tapping it lists the task', () => {
    // A task due at local noon today, so the yyyy-MM-dd key matches the grid cell.
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const key = format(today, 'yyyy-MM-dd');
    const t = task({ id: 'c1', title: 'Dated task', due_at: today.toISOString() });

    render(<Calendar tasks={[t]} onComplete={() => {}} />);

    expect(screen.getByTestId(`dot-${key}`)).toBeInTheDocument();

    // Today is selected by default; the task should already be listed.
    expect(screen.getByText('Dated task')).toBeInTheDocument();

    // Tapping the day cell keeps it listed (exercise the tap handler).
    fireEvent.click(screen.getByLabelText(format(today, 'EEEE, MMMM d')));
    expect(screen.getByText('Dated task')).toBeInTheDocument();
  });

  it('shows "Nothing scheduled" on an empty day', () => {
    render(<Calendar tasks={[]} onComplete={() => {}} />);
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
  });
});
