import {
  format,
  isToday,
  isPast,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';

/** The browser's IANA timezone, e.g. "America/Los_Angeles". Falls back to
 *  a sane default in environments that don't expose Intl (rare). We send
 *  this to the edge fn so Claude resolves relative dates ("Thursday") in
 *  the user's local frame, not the server's. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  } catch {
    return 'America/Los_Angeles';
  }
}

/** Current instant as an ISO string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Parse an ISO string to a Date, tolerating null. */
export function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Mon, Jul 3 · 2:30 PM" style label for a due date. Time is omitted when
 *  the due date has no meaningful time-of-day component (midnight local). */
export function formatDue(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return 'No date';
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime ? format(d, 'EEE, MMM d · h:mm a') : format(d, 'EEE, MMM d');
}

/** Time-only label, "2:30 PM". */
export function formatTime(iso: string | null | undefined): string {
  const d = toDate(iso);
  return d ? format(d, 'h:mm a') : '';
}

/** Split an ISO string into <input type=date> + <input type=time> values in
 *  the browser's local timezone. Returns empty strings for null. */
export function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Recombine date + time inputs (local) into an ISO string, or null. */
export function joinIso(date: string, time: string): string | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '09:00').split(':').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 9, mm ?? 0);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

/** True when a due date is in the past. */
export function isOverdue(iso: string | null | undefined): boolean {
  const d = toDate(iso);
  return d ? isPast(d) : false;
}

/** True when a due date lands today (local). */
export function isDueToday(iso: string | null | undefined): boolean {
  const d = toDate(iso);
  return d ? isToday(d) : false;
}

export { isSameDay, startOfDay, format };
