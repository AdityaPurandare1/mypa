import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getInbox, setInbox, clearInbox } from './inbox';
import type { TaskDraft } from '@/types';

// Adversarial: partial stash objects, non-string rawInput, storage throwing,
// storage absent, round-trip fidelity.

const KEY = 'mypa.inbox.v1';
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

function throwingStorage(): Storage {
  return {
    getItem: () => {
      throw new DOMException('denied', 'SecurityError');
    },
    setItem: () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    },
    removeItem: () => {
      throw new DOMException('denied');
    },
    clear: () => {},
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

afterEach(() => vi.unstubAllGlobals());

describe('inbox stash — partial / malformed objects', () => {
  beforeEach(() => vi.stubGlobal('localStorage', mockStorage()));

  it('missing rawInput defaults to empty string when drafts is a valid array', () => {
    localStorage.setItem(KEY, JSON.stringify({ drafts: [draft('A')] }));
    const got = getInbox();
    expect(got?.drafts).toHaveLength(1);
    expect(got?.rawInput).toBe('');
  });

  it('non-string rawInput is coerced to empty string', () => {
    localStorage.setItem(KEY, JSON.stringify({ drafts: [draft('A')], rawInput: 42 }));
    expect(getInbox()?.rawInput).toBe('');
  });

  it('null stored literal returns null', () => {
    localStorage.setItem(KEY, 'null');
    expect(getInbox()).toBeNull();
  });

  it('empty drafts array round-trips as a valid (but empty) stash', () => {
    setInbox({ drafts: [], rawInput: 'dump' });
    const got = getInbox();
    // getInbox does not null out an empty array — it returns {drafts:[],...}.
    // Inbox.tsx treats drafts.length===0 as the empty state.
    expect(got).not.toBeNull();
    expect(got?.drafts).toHaveLength(0);
    expect(got?.rawInput).toBe('dump');
  });

  it('drafts array with junk elements is passed through untouched (no per-item validation)', () => {
    localStorage.setItem(KEY, JSON.stringify({ drafts: [{ nonsense: true }, 5, null], rawInput: 'x' }));
    const got = getInbox();
    // NOTE: getInbox only checks Array.isArray(drafts); it does NOT validate
    // each element. ConfirmSheet must tolerate malformed drafts. Documents behavior.
    expect(got?.drafts).toHaveLength(3);
  });

  it('round-trips full drafts with dates/notes/priority', () => {
    const d: TaskDraft = { title: 'Pay rent', notes: 'via app', due_at: '2026-07-01T17:00:00.000Z', priority: 1, steps: [] };
    setInbox({ drafts: [d], rawInput: 'pay rent at 5' });
    const got = getInbox();
    expect(got?.drafts[0]).toEqual(d);
    expect(got?.rawInput).toBe('pay rent at 5');
  });
});

describe('inbox stash — storage throws / absent', () => {
  it('getInbox returns null when getItem throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(getInbox()).toBeNull();
  });

  it('setInbox does not throw when setItem throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(() => setInbox({ drafts: [draft('A')], rawInput: 'x' })).not.toThrow();
  });

  it('clearInbox does not throw when removeItem throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(() => clearInbox()).not.toThrow();
  });

  it('getInbox returns null when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(getInbox()).toBeNull();
  });
});
