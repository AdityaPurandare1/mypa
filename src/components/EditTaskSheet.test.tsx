import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTaskSheet } from './EditTaskSheet';
import type { Task } from '@/types';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    user_id: 'u1',
    title: 'Original title',
    raw_input: null,
    notes: null,
    due_at: null,
    priority: 3,
    status: 'open',
    source: 'voice',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T12:00:00Z',
    completed_at: null,
    ...over,
  };
}

function setup(over: Partial<Task> = {}, overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  const onClose = vi.fn();
  const onSave = overrides.onSave ?? vi.fn().mockResolvedValue(undefined);
  const onSaveAndComplete = overrides.onSaveAndComplete ?? vi.fn().mockResolvedValue(undefined);
  const onComplete = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <EditTaskSheet
      task={task(over)}
      onClose={onClose}
      onSave={onSave}
      onSaveAndComplete={onSaveAndComplete}
      onComplete={onComplete}
      onDelete={onDelete}
    />,
  );
  return { onClose, onSave, onSaveAndComplete, onComplete, onDelete };
}

describe('EditTaskSheet', () => {
  it('Mark done saves + completes via one combined handler', async () => {
    const { onSaveAndComplete, onSave, onComplete } = setup();
    fireEvent.change(screen.getByLabelText('Edit title'), { target: { value: 'New title' } });
    fireEvent.click(screen.getByRole('button', { name: /Mark done/ }));

    // Single parent-owned flow: edit+complete happen together, not as two
    // separate sheet-driven calls (avoids the unmount race).
    await waitFor(() => expect(onSaveAndComplete).toHaveBeenCalledTimes(1));
    expect(onSaveAndComplete.mock.calls[0][0]).toBe('t1');
    expect(onSaveAndComplete.mock.calls[0][1]).toMatchObject({ title: 'New title', priority: 3 });
    // markDone must NOT drive the separate save/complete callbacks itself.
    expect(onSave).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('a failing Mark done keeps the sheet open and surfaces the error', async () => {
    const onSaveAndComplete = vi.fn().mockRejectedValue(new Error('server said no'));
    setup({}, { onSaveAndComplete });
    fireEvent.click(screen.getByRole('button', { name: /Mark done/ }));
    // Error surfaces inline; the dialog is still mounted.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('server said no'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Button re-enabled so the user can retry.
    expect(screen.getByRole('button', { name: /Mark done/ })).not.toBeDisabled();
  });

  it('empty title falls back to the original title on save', async () => {
    const { onSaveAndComplete } = setup();
    fireEvent.change(screen.getByLabelText('Edit title'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Mark done/ }));
    await waitFor(() => expect(onSaveAndComplete).toHaveBeenCalled());
    expect(onSaveAndComplete.mock.calls[0][1].title).toBe('Original title');
  });

  it('Escape cancels WITHOUT saving (raw close)', () => {
    const { onClose, onSave } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('back chevron saves and closes', async () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText('Edit title'), { target: { value: 'Edited on close' } });
    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].title).toBe('Edited on close');
  });

  it('delete fires onDelete with the id', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(onDelete).toHaveBeenCalledWith('t1');
  });

  it('changing priority is reflected in the saved patch', async () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText('Priority 1'));
    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].priority).toBe(1);
  });

  it('notes trimmed to null when blank', async () => {
    const { onSave } = setup({ notes: 'has notes' });
    fireEvent.change(screen.getByLabelText('Edit notes'), { target: { value: '  ' } });
    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].notes).toBeNull();
  });

  it('renders a checked complete control for an already-done task', () => {
    setup({ status: 'done', completed_at: '2026-07-01T13:00:00Z' });
    expect(screen.getByLabelText('Completed')).toBeInTheDocument();
  });
});
