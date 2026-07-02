// Typed, localStorage-backed settings with defaults. First-pass persistence
// for the daily-plan tuning and connection toggles (no Supabase migration yet).

export interface Settings {
  /** Target number of tasks that "fit" a day. */
  targetPerDay: number;
  /** Pull open tasks whose due_at is before today into today's plan. */
  carryOverdueForward: boolean;
  /** Day start, "HH:MM" 24h local. */
  dayStart: string;
  /** In-app due-soon reminders (drives useDueReminders' relevance). */
  dueSoonReminders: boolean;
  /** Preferred daily-plan notification time, "HH:MM" 24h local. Stored only —
   *  no scheduler fires it yet (surfaced as "Coming soon" in Settings). */
  dailyPlanNotification: string;
}

export const DEFAULT_SETTINGS: Settings = {
  targetPerDay: 6,
  carryOverdueForward: true,
  dayStart: '08:00',
  dueSoonReminders: true,
  dailyPlanNotification: '07:30',
};

const KEY = 'mypa.settings.v1';

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Read settings, merging any stored partial over the defaults. Never throws. */
export function getSettings(): Settings {
  const store = safeStorage();
  if (!store) return { ...DEFAULT_SETTINGS };
  try {
    const raw = store.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Merge a patch into the stored settings and return the new full value. */
export function setSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  const store = safeStorage();
  if (store) {
    try {
      store.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage full / unavailable — settings simply won't persist.
    }
  }
  return next;
}
