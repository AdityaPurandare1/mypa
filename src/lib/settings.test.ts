import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSettings, setSettings, DEFAULT_SETTINGS } from './settings';

// Minimal in-memory localStorage mock.
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

beforeEach(() => {
  vi.stubGlobal('localStorage', mockStorage());
});

describe('settings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a patch and merges over defaults', () => {
    setSettings({ targetPerDay: 9, carryOverdueForward: false });
    const s = getSettings();
    expect(s.targetPerDay).toBe(9);
    expect(s.carryOverdueForward).toBe(false);
    // Untouched keys keep their defaults.
    expect(s.dayStart).toBe(DEFAULT_SETTINGS.dayStart);
    expect(s.dueSoonReminders).toBe(DEFAULT_SETTINGS.dueSoonReminders);
  });

  it('returns the full merged value from setSettings', () => {
    const next = setSettings({ dailyPlanNotification: '06:15' });
    expect(next.dailyPlanNotification).toBe('06:15');
    expect(next.targetPerDay).toBe(DEFAULT_SETTINGS.targetPerDay);
  });

  it('falls back to defaults on corrupt stored JSON', () => {
    localStorage.setItem('mypa.settings.v1', '{not json');
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
