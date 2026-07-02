import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getInbox, setInbox, clearInbox } from './inbox';
import type { TaskDraft } from '@/types';

function mockStorage() {
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

const draft = (title: string): TaskDraft => ({ title, notes: null, due_at: null, priority: 3 });

beforeEach(() => {
  vi.stubGlobal('localStorage', mockStorage());
});

describe('inbox stash', () => {
  it('returns null when empty', () => {
    expect(getInbox()).toBeNull();
  });

  it('round-trips drafts + rawInput', () => {
    setInbox({ drafts: [draft('A'), draft('B')], rawInput: 'the dump' });
    const got = getInbox();
    expect(got?.drafts).toHaveLength(2);
    expect(got?.drafts[0].title).toBe('A');
    expect(got?.rawInput).toBe('the dump');
  });

  it('clears the stash', () => {
    setInbox({ drafts: [draft('A')], rawInput: 'x' });
    clearInbox();
    expect(getInbox()).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('mypa.inbox.v1', 'nope');
    expect(getInbox()).toBeNull();
  });

  it('returns null when drafts is not an array', () => {
    localStorage.setItem('mypa.inbox.v1', JSON.stringify({ drafts: 'x', rawInput: 'y' }));
    expect(getInbox()).toBeNull();
  });
});
