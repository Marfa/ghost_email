import { describe, it, expect } from 'vitest';
import { buildPublishedFilter, buildScheduledFilter, getExcludeReason } from './ghost.js';
import { DIGEST_TITLE } from './constants.js';
import type { GhostPostRow } from './ghost.js';

const row = (overrides: Partial<GhostPostRow>): GhostPostRow => ({
  id: '1',
  title: 'Test',
  slug: 'test',
  url: 'https://example.com/test/',
  status: 'published',
  published_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

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

describe('getExcludeReason', () => {
  it('excludes digest by fixed title', () => {
    expect(getExcludeReason(row({ title: DIGEST_TITLE }))).toBe('digest title');
  });

  it('does not exclude regular posts by default', () => {
    expect(getExcludeReason(row({ tags: [{ name: '#weekly-email' }] }))).toBeNull();
  });

  it('excludes by tag only when DIGEST_EXCLUDE_TAG is set', () => {
    expect(getExcludeReason(row({ tags: [{ name: '#weekly-email' }] }), '#weekly-email')).toBe(
      'tag #weekly-email',
    );
  });
});
