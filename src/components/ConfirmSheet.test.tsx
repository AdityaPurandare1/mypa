import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const createTasksSpy = vi.fn();
vi.mock('@/lib/tasks', () => ({
  createTasks: (...a: unknown[]) => createTasksSpy(...a),
}));

import { ConfirmSheet } from './ConfirmSheet';
import type { TaskDraft } from '@/types';

const draft = (title: string): TaskDraft => ({ title, notes: null, due_at: null, priority: 3 });

beforeEach(() => {
  createTasksSpy.mockReset();
  createTasksSpy.mockResolvedValue([]);
});

describe('ConfirmSheet', () => {
  it('renders one card per draft and can edit a title', () => {
    render(<ConfirmSheet initial={[draft('A'), draft('B')]} rawInput="raw" onClose={() => {}} onSaved={() => {}} />);
    const t1 = screen.getByLabelText('Title 1') as HTMLInputElement;
    expect(t1.value).toBe('A');
    fireEvent.change(t1, { target: { value: 'Edited' } });
    expect((screen.getByLabelText('Title 1') as HTMLInputElement).value).toBe('Edited');
  });

  it('adds and removes rows', () => {
    render(<ConfirmSheet initial={[draft('A')]} rawInput="raw" onClose={() => {}} onSaved={() => {}} />);
    fireEvent.click(screen.getByText('+ Add another'));
    expect(screen.getByLabelText('Title 2')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove task 2'));
    expect(screen.queryByLabelText('Title 2')).not.toBeInTheDocument();
  });

  it('saves all drafts in a single batch call and fires onSaved once', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<ConfirmSheet initial={[draft('A'), draft('B')]} rawInput="raw" onClose={onClose} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /Save all/ }));
    await waitFor(() => expect(createTasksSpy).toHaveBeenCalledTimes(1));
    const rows = createTasksSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].raw_input).toBe('raw');
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    // The Inbox host handles clearing + navigation on save; onClose is the
    // separate Discard/back path and must NOT fire on a successful save.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Discard confirms before dropping drafts with content, then invokes onClose', () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ConfirmSheet initial={[draft('A')]} rawInput="raw" onClose={onClose} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirm).toHaveBeenCalledWith('Discard 1 parsed task?');
    expect(onClose).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it('Discard cancels (does NOT close) when the user declines the confirm', () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ConfirmSheet initial={[draft('A'), draft('B')]} rawInput="raw" onClose={onClose} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirm).toHaveBeenCalledWith('Discard 2 parsed tasks?');
    expect(onClose).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('Discard skips the confirm when all drafts are blank', () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, 'confirm');
    render(<ConfirmSheet initial={[draft('')]} rawInput="raw" onClose={onClose} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it('blocks save when every title is empty', async () => {
    render(<ConfirmSheet initial={[draft('')]} rawInput="raw" onClose={() => {}} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(screen.getByText(/Add a title/)).toBeInTheDocument());
    expect(createTasksSpy).not.toHaveBeenCalled();
  });
});
