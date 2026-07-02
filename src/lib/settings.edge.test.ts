import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSettings, setSettings, DEFAULT_SETTINGS } from './settings';

// Adversarial: localStorage throwing (private mode / quota), partial objects,
// wrong-typed keys, getItem/setItem throwing mid-flight.

const KEY = 'mypa.settings.v1';

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

/** A Storage whose getItem/setItem throw, as Safari private mode does. */
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('settings — hostile localStorage', () => {
  beforeEach(() => vi.stubGlobal('localStorage', mockStorage()));

  it('merges a partial stored object over defaults (missing keys filled)', () => {
    localStorage.setItem(KEY, JSON.stringify({ targetPerDay: 3 }));
    const s = getSettings();
    expect(s.targetPerDay).toBe(3);
    expect(s.dayStart).toBe(DEFAULT_SETTINGS.dayStart);
    expect(s.carryOverdueForward).toBe(DEFAULT_SETTINGS.carryOverdueForward);
  });

  it('stored null literal falls through to defaults without throwing', () => {
    localStorage.setItem(KEY, 'null');
    // JSON.parse("null") === null; spread of null is a no-op, so defaults win.
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('stored array does not throw (spread over defaults ignores numeric keys)', () => {
    localStorage.setItem(KEY, JSON.stringify([1, 2, 3]));
    const s = getSettings();
    // No Settings keys present → still fully valid defaults for known fields.
    expect(s.targetPerDay).toBe(DEFAULT_SETTINGS.targetPerDay);
    expect(s.carryOverdueForward).toBe(DEFAULT_SETTINGS.carryOverdueForward);
  });

  it('wrong-typed stored values pass through (no runtime coercion) — documents behavior', () => {
    localStorage.setItem(KEY, JSON.stringify({ targetPerDay: 'lots', carryOverdueForward: 'yes' }));
    const s = getSettings();
    // NOTE: settings.ts does NOT validate value types, only merges. These are
    // surfaced as-is. This documents current behavior, not necessarily ideal.
    expect(s.targetPerDay).toBe('lots' as unknown as number);
    expect(s.carryOverdueForward).toBe('yes' as unknown as boolean);
  });
});

describe('settings — storage throws (private mode / quota)', () => {
  beforeEach(() => vi.stubGlobal('localStorage', throwingStorage()));

  it('getSettings returns defaults when getItem throws', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('setSettings does not throw when setItem throws, still returns merged value', () => {
    let next: ReturnType<typeof setSettings> | undefined;
    expect(() => {
      next = setSettings({ targetPerDay: 9 });
    }).not.toThrow();
    expect(next?.targetPerDay).toBe(9);
  });
});

describe('settings — localStorage entirely absent', () => {
  it('getSettings returns defaults when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('setSettings returns merged value when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    const next = setSettings({ dayStart: '05:00' });
    expect(next.dayStart).toBe('05:00');
  });
});
