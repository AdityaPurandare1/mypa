import { describe, it, expect } from 'vitest';
import {
  deviceTimeZone,
  nowIso,
  toDate,
  formatDue,
  isOverdue,
  isDueToday,
} from './time';

describe('time', () => {
  it('deviceTimeZone returns a non-empty IANA string', () => {
    expect(deviceTimeZone().length).toBeGreaterThan(0);
  });

  it('nowIso returns a parseable ISO string', () => {
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false);
  });

  it('toDate handles null and garbage', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate('not-a-date')).toBeNull();
    expect(toDate('2026-07-03T14:30:00Z')).toBeInstanceOf(Date);
  });

  it('formatDue shows "No date" for null', () => {
    expect(formatDue(null)).toBe('No date');
  });

  it('isOverdue is true for the past, false for the future', () => {
    expect(isOverdue('2000-01-01T00:00:00Z')).toBe(true);
    expect(isOverdue(new Date(Date.now() + 86_400_000).toISOString())).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });

  it('isDueToday matches the current day', () => {
    expect(isDueToday(new Date().toISOString())).toBe(true);
    expect(isDueToday('2000-01-01T00:00:00Z')).toBe(false);
  });
});
