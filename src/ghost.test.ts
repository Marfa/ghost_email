import { describe, it, expect } from 'vitest';
import { buildPublishedFilter, buildScheduledFilter } from './ghost.js';

describe('buildPublishedFilter', () => {
  it('filters published posts by published_at', () => {
    const from = new Date('2026-07-02T00:00:00.000Z');
    const to = new Date('2026-07-03T00:00:00.000Z');
    expect(buildPublishedFilter(from, to)).toBe(
      "(status:published)+published_at:>'2026-07-02T00:00:00.000Z'+published_at:<='2026-07-03T00:00:00.000Z'",
    );
  });
});

describe('buildScheduledFilter', () => {
  it('filters scheduled posts by updated_at', () => {
    const from = new Date('2026-07-02T00:00:00.000Z');
    const to = new Date('2026-07-03T00:00:00.000Z');
    expect(buildScheduledFilter(from, to)).toBe(
      "(status:scheduled)+updated_at:>'2026-07-02T00:00:00.000Z'+updated_at:<='2026-07-03T00:00:00.000Z'",
    );
  });
});
