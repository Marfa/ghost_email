import { describe, it, expect } from 'vitest';
import { getCollectionWindow, toGhostFilterDate } from './window.js';

describe('getCollectionWindow', () => {
  const now = new Date('2025-07-02T12:00:00.000Z');

  it('uses last 7 days on first run', () => {
    const { from, to, isFirstRun } = getCollectionWindow(null, now, 7);
    expect(isFirstRun).toBe(true);
    expect(to).toEqual(now);
    expect(from.toISOString()).toBe('2025-06-25T12:00:00.000Z');
  });

  it('uses last run timestamp when state exists', () => {
    const last = new Date('2025-06-28T08:00:00.000Z');
    const { from, to, isFirstRun } = getCollectionWindow(last, now, 7);
    expect(isFirstRun).toBe(false);
    expect(from).toEqual(last);
    expect(to).toEqual(now);
  });

  it('respects custom fallback days', () => {
    const { from } = getCollectionWindow(null, now, 3);
    expect(from.toISOString()).toBe('2025-06-29T12:00:00.000Z');
  });
});

describe('toGhostFilterDate', () => {
  it('returns ISO UTC string', () => {
    expect(toGhostFilterDate(new Date('2025-01-15T10:30:00.000Z'))).toBe('2025-01-15T10:30:00.000Z');
  });
});
