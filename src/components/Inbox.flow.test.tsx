import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Integration-style: real inbox stash (localStorage) → Inbox renders ConfirmSheet
// → Save calls createTasks once and clears the stash; Discard clears the stash;
// empty/corrupt stash shows the empty state without crashing.

const createTasksSpy = vi.fn();
vi.mock('@/lib/tasks', () => ({
  createTasks: (...a: unknown[]) => createTasksSpy(...a),
}));

import { Inbox } from './Inbox';
import { setInbox, getInbox, clearInbox } from '@/lib/inbox';
import type { TaskDraft } from '@/types';

const draft = (title: string): TaskDraft => ({ title, notes: null, due_at: null, priority: 3, steps: [] });

function mockStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', mockStorage());
  createTasksSpy.mockReset();
  createTasksSpy.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllGlobals());

describe('Inbox flow', () => {
  it('renders one card per stashed draft', () => {
    setInbox({ drafts: [draft('Alpha'), draft('Beta'), draft('Gamma')], rawInput: 'dump' });
    render(<Inbox onSaved={() => {}} goToday={() => {}} goCapture={() => {}} />);
    expect(screen.getByLabelText('Title 1')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Title 2')).toHaveValue('Beta');
    expect(screen.getByLabelText('Title 3')).toHaveValue('Gamma');
    expect(screen.getByRole('heading', { name: /Review 3 tasks/ })).toBeInTheDocument();
  });

  it('Save all calls createTasks once, then clears stash and navigates to Today', async () => {
    setInbox({ drafts: [draft('Alpha'), draft('Beta')], rawInput: 'my dump' });
    const onSaved = vi.fn();
    const goToday = vi.fn();
    render(<Inbox onSaved={onSaved} goToday={goToday} goCapture={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Save all/ }));

    await waitFor(() => expect(createTasksSpy).toHaveBeenCalledTimes(1));
    const rows = createTasksSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].raw_input).toBe('my dump');

    await waitFor(() => expect(goToday).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    // Stash cleared after save.
    expect(getInbox()).toBeNull();
  });

  it('Discard confirms, clears the stash and routes to Capture (no save)', () => {
    setInbox({ drafts: [draft('Alpha')], rawInput: 'x' });
    const goCapture = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Inbox onSaved={() => {}} goToday={() => {}} goCapture={goCapture} />);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(confirm).toHaveBeenCalled();
    expect(goCapture).toHaveBeenCalledTimes(1);
    expect(createTasksSpy).not.toHaveBeenCalled();
    expect(getInbox()).toBeNull();
    confirm.mockRestore();
  });

  it('Discard declined keeps the stash and stays put', () => {
    setInbox({ drafts: [draft('Alpha')], rawInput: 'x' });
    const goCapture = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Inbox onSaved={() => {}} goToday={() => {}} goCapture={goCapture} />);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(goCapture).not.toHaveBeenCalled();
    expect(getInbox()).not.toBeNull();
    confirm.mockRestore();
  });

  it('empty stash shows the empty state with a Capture CTA', () => {
    clearInbox();
    const goCapture = vi.fn();
    render(<Inbox onSaved={() => {}} goToday={() => {}} goCapture={goCapture} />);
    expect(screen.getByText('Nothing to review.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Capture something' }));
    expect(goCapture).toHaveBeenCalledTimes(1);
  });

  it('empty drafts array (valid stash, zero drafts) still shows the empty state', () => {
    setInbox({ drafts: [], rawInput: 'nothing parsed' });
    render(<Inbox onSaved={() => {}} goToday={() => {}} goCapture={() => {}} />);
    expect(screen.getByText('Nothing to review.')).toBeInTheDocument();
  });

  it('corrupt stash JSON does not crash Inbox — falls to empty state', () => {
    localStorage.setItem('mypa.inbox.v1', '{ this is not json');
    expect(() =>
      render(<Inbox onSaved={() => {}} goToday={() => {}} goCapture={() => {}} />),
    ).not.toThrow();
    expect(screen.getByText('Nothing to review.')).toBeInTheDocument();
  });
});
