import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const authState = { session: null as unknown, loading: true };
vi.mock('./lib/auth', () => ({
  useAuth: () => authState,
}));

// Home pulls in useTasks / useDueReminders; stub it so the gate test stays focused.
vi.mock('./components/Home', () => ({ Home: () => <div>HOME</div> }));

import App from './App';

beforeEach(() => {
  authState.session = null;
  authState.loading = true;
});

describe('App auth gate', () => {
  it('shows the splash while loading', () => {
    authState.loading = true;
    render(<App />);
    expect(screen.getByText('myPA')).toBeInTheDocument();
    expect(screen.queryByText('HOME')).not.toBeInTheDocument();
  });

  it('shows sign-in when signed out', () => {
    authState.loading = false;
    authState.session = null;
    render(<App />);
    expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();
  });

  it('shows Home when a session exists', () => {
    authState.loading = false;
    authState.session = { user: { id: 'u1' } };
    render(<App />);
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
});
