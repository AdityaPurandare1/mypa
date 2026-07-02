import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { addMonths, format, subMonths } from 'date-fns';
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

    render(<Calendar tasks={[t]} />);

    expect(screen.getByTestId(`dot-${key}`)).toBeInTheDocument();

    // Today is selected by default; the task should already be listed.
    expect(screen.getByText('Dated task')).toBeInTheDocument();

    // Tapping the day cell keeps it listed (exercise the tap handler).
    fireEvent.click(screen.getByLabelText(format(today, 'EEEE, MMMM d')));
    expect(screen.getByText('Dated task')).toBeInTheDocument();
  });

  it('shows "Nothing scheduled" on an empty day', () => {
    render(<Calendar tasks={[]} />);
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
  });

  it('next/prev month chevrons move the cursor and update the grid', () => {
    const now = new Date();
    render(<Calendar tasks={[]} />);
    expect(screen.getByRole('heading', { name: format(now, 'MMMM yyyy') })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Next month'));
    const next = addMonths(now, 1);
    expect(screen.getByRole('heading', { name: format(next, 'MMMM yyyy') })).toBeInTheDocument();
    // The grid follows the cursor: the 15th of next month is a rendered cell
    // (mid-month days never appear as adjacent-month padding).
    const midNext = new Date(next.getFullYear(), next.getMonth(), 15);
    expect(screen.getByLabelText(format(midNext, 'EEEE, MMMM d'))).toBeInTheDocument();

    // Back twice lands on the previous month.
    fireEvent.click(screen.getByLabelText('Previous month'));
    fireEvent.click(screen.getByLabelText('Previous month'));
    const prev = subMonths(now, 1);
    expect(screen.getByRole('heading', { name: format(prev, 'MMMM yyyy') })).toBeInTheDocument();
  });
});
