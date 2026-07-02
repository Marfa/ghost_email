import { describe, it, expect } from 'vitest';
import { buildDigestHtml, escapeHtml, pickExcerpt, stripHtml } from './build-html.js';

describe('pickExcerpt', () => {
  it('prefers custom_excerpt', () => {
    expect(pickExcerpt('Custom', '<p>Auto</p>')).toBe('Custom');
  });

  it('strips HTML from excerpt', () => {
    expect(pickExcerpt(null, '<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });
});

describe('buildDigestHtml', () => {
  it('builds digest with button links', () => {
    const html = buildDigestHtml(
      [{ title: 'Test', slug: 'test', url: 'https://example.com/test/', excerpt: 'Summary' }],
      'Intro',
    );
    expect(html).toContain('<p>Intro</p>');
    expect(html).toContain('<h3 id="test">Test</h3>');
    expect(html).toContain('class="kg-btn kg-btn-accent"');
    expect(html).toContain('https://example.com/test/');
  });

  it('escapes HTML in titles', () => {
    const html = buildDigestHtml(
      [{ title: 'A & B', slug: 'ab', url: 'https://x/', excerpt: 'ok' }],
      'go',
    );
    expect(html).toContain('A &amp; B');
  });
});

describe('stripHtml', () => {
  it('collapses whitespace', () => {
    expect(stripHtml('<p>a\n  b</p>')).toBe('a b');
  });
});

describe('escapeHtml', () => {
  it('escapes special chars', () => {
    expect(escapeHtml('<">&')).toBe('&lt;&quot;&gt;&amp;');
  });
});
