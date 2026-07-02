import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Task } from '@/types';

// Home wires useTasks + useDueReminders + all five tabs. Stub the data hook so
// we exercise navigation and the EditTaskSheet wiring deterministically.
const completeSpy = vi.fn().mockResolvedValue(undefined);
const removeSpy = vi.fn().mockResolvedValue(undefined);
const editSpy = vi.fn().mockResolvedValue(undefined);
const snoozeSpy = vi.fn().mockResolvedValue(undefined);
const refetchSpy = vi.fn().mockResolvedValue(undefined);

const oneTask: Task = {
  id: 'home-task',
  user_id: 'u1',
  title: 'Home task',
  raw_input: null,
  notes: null,
  due_at: null,
  priority: 3,
  status: 'open',
  source: 'voice',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  completed_at: null,
};

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [oneTask],
    loading: false,
    error: null,
    refetch: refetchSpy,
    complete: completeSpy,
    snooze: snoozeSpy,
    remove: removeSpy,
    edit: editSpy,
  }),
}));

vi.mock('@/hooks/useDueReminders', () => ({ useDueReminders: () => {} }));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    session: { user: { email: 'dana@example.com', user_metadata: { name: 'Dana' } } },
    signOut: vi.fn(),
  }),
}));

// Deterministic settings.
vi.mock('@/lib/settings', async () => {
  const actual = await vi.importActual<typeof import('./../lib/settings')>('@/lib/settings');
  return { ...actual, getSettings: () => actual.DEFAULT_SETTINGS, setSettings: () => actual.DEFAULT_SETTINGS };
});

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

import { Home } from './Home';

beforeEach(() => {
  vi.stubGlobal('localStorage', mockStorage());
  completeSpy.mockClear();
  removeSpy.mockClear();
  editSpy.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Home tab navigation', () => {
  it('starts on Today', () => {
    render(<Home />);
    expect(screen.getByText(/Good (morning|afternoon|evening), Dana/)).toBeInTheDocument();
  });

  it('switches to Calendar', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    // Calendar renders a month/heading — assert the Today greeting is gone.
    expect(screen.queryByText(/Good (morning|afternoon|evening), Dana/)).not.toBeInTheDocument();
  });

  it('switches to Inbox and shows the empty state', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument();
  });

  it('switches to Settings', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('center Capture button opens the Capture screen', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByRole('heading', { name: 'Capture' })).toBeInTheDocument();
    expect(screen.getByLabelText('Brain dump')).toBeInTheDocument();
  });
});

describe('Home → EditTaskSheet wiring', () => {
  it('tapping a task opens the edit sheet; delete calls remove then closes', async () => {
    render(<Home />);
    fireEvent.click(screen.getByText('Home task'));
    // Sheet is open.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Delete task'));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith('home-task'));
    // Sheet closes after the async delete resolves.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Mark done edits then completes, then closes the sheet once', async () => {
    render(<Home />);
    fireEvent.click(screen.getByText('Home task'));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /Mark done/ }));
    // Combined flow: edit() then complete() as one parent-owned sequence.
    await waitFor(() => expect(editSpy).toHaveBeenCalled());
    await waitFor(() => expect(completeSpy).toHaveBeenCalledWith('home-task'));
    // Sheet closes exactly once, after both settle.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a failing Mark done keeps the sheet open and shows the error', async () => {
    editSpy.mockRejectedValueOnce(new Error('server said no'));
    render(<Home />);
    fireEvent.click(screen.getByText('Home task'));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /Mark done/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('server said no'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // complete() must not run if the edit rejected first.
    expect(completeSpy).not.toHaveBeenCalled();
  });
});
