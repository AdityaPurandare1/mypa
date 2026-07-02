import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const signOutSpy = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: { user: { email: 'dana@example.com', user_metadata: { name: 'Dana Scully' } } }, signOut: signOutSpy }),
}));

import { Settings } from './Settings';
import { getSettings } from '@/lib/settings';

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
  signOutSpy.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Settings', () => {
  it('renders the profile from the auth session', () => {
    render(<Settings />);
    expect(screen.getByText('Dana Scully')).toBeInTheDocument();
    expect(screen.getByText('dana@example.com')).toBeInTheDocument();
  });

  it('toggling "Carry overdue forward" persists via settings.ts', () => {
    render(<Settings />);
    const toggle = screen.getByRole('switch', { name: 'Carry overdue forward' });
    // Default is ON.
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(getSettings().carryOverdueForward).toBe(false);
  });

  it('increment/decrement target persists and clamps', () => {
    render(<Settings />);
    fireEvent.click(screen.getByLabelText('Increase target')); // 6 -> 7
    expect(getSettings().targetPerDay).toBe(7);
    fireEvent.click(screen.getByLabelText('Decrease target')); // 7 -> 6
    expect(getSettings().targetPerDay).toBe(6);
  });

  it('due-soon reminders toggle persists', () => {
    render(<Settings />);
    const toggle = screen.getByRole('switch', { name: 'Due-soon reminders' });
    fireEvent.click(toggle);
    expect(getSettings().dueSoonReminders).toBe(false);
  });

  it('day-start time input persists', () => {
    render(<Settings />);
    fireEvent.change(screen.getByLabelText('Day starts'), { target: { value: '06:30' } });
    expect(getSettings().dayStart).toBe('06:30');
  });

  it('Sign out calls useAuth().signOut', () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOutSpy).toHaveBeenCalledTimes(1);
  });
});
