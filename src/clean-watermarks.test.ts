import { describe, it, expect } from 'vitest';
import { cleanAiMarks } from './clean-watermarks.js';
import { buildDigestHtml } from './build-html.js';

describe('cleanAiMarks', () => {
  it('returns empty input unchanged', () => {
    expect(cleanAiMarks('')).toEqual({ text: '', removedCount: 0, replacedCount: 0 });
  });

  it('strips zero-width space and soft hyphen', () => {
    const { text, removedCount } = cleanAiMarks('Hello\u200bWorld\u00ad!');
    expect(text).toBe('HelloWorld!');
    expect(removedCount).toBe(2);
  });

  it('normalizes exotic spaces', () => {
    const { text, replacedCount } = cleanAiMarks('a\u2003b\u3000c');
    expect(text).toBe('a b c');
    expect(replacedCount).toBe(2);
  });

  it('strips tag characters', () => {
    const { text, removedCount } = cleanAiMarks(`hi${String.fromCodePoint(0xe0041)}there`);
    expect(text).toBe('hithere');
    expect(removedCount).toBe(1);
  });

  it('strips bidi overrides', () => {
    const { text } = cleanAiMarks('ab\u202eef');
    expect(text).not.toContain('\u202e');
    expect(text).toBe('abef');
  });

  it('preserves normal text including Russian', () => {
    const raw = 'Приветствую. Normal ASCII and café — fine.';
    expect(cleanAiMarks(raw)).toEqual({ text: raw, removedCount: 0, replacedCount: 0 });
  });

  it('does not map Cyrillic lookalikes to Latin', () => {
    const raw = 'p\u0430y';
    expect(cleanAiMarks(raw).text).toBe(raw);
  });

  it('preserves emoji VS16', () => {
    const raw = 'Balance returns. \u2696\ufe0f';
    expect(cleanAiMarks(raw).text).toBe(raw);
  });

  it('preserves ZWJ family emoji', () => {
    const raw = 'Family time: \u{1F468}\u200D\u{1F469}\u200D\u{1F467}';
    expect(cleanAiMarks(raw).text).toBe(raw);
  });

  it('preserves ZWJ chain', () => {
    const raw = '\u2764\ufe0f\u200d\u{1F525}';
    expect(cleanAiMarks(raw).text).toBe(raw);
  });

  it('strips floating emoji glue', () => {
    const { text, removedCount } = cleanAiMarks('a\u200db\ufe0f');
    expect(text).toBe('ab');
    expect(removedCount).toBe(2);
  });

  it('preserves script joiners', () => {
    for (const raw of ['\u0645\u06cc\u200c\u0631\u0648\u0645', '\u0915\u094d\u200d\u0937']) {
      expect(cleanAiMarks(raw).text).toBe(raw);
    }
  });

  it('preserves flag tag sequences', () => {
    const raw = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}';
    expect(cleanAiMarks(raw).text).toBe(raw);
  });

  it('preserves orthographic Arabic Cf', () => {
    const raw = 'x\u0600y\u06ddz';
    expect(cleanAiMarks(raw).text).toBe(raw);
  });

  it('strips joiners between Latin letters', () => {
    for (const raw of ['a\u200db', 'a\u200cb', 'ab\u200c']) {
      const { text } = cleanAiMarks(raw);
      expect(text).not.toContain('\u200c');
      expect(text).not.toContain('\u200d');
    }
  });

  it('keeps HTML tags while scrubbing text', () => {
    const { text } = cleanAiMarks('<p>Hello\u200bWorld</p>');
    expect(text).toBe('<p>HelloWorld</p>');
  });

  it('scrubs marks in assembled digest html', () => {
    const html = buildDigestHtml(
      [
        {
          title: 'Test\u200bPost',
          slug: 'test',
          url: 'https://example.com/test/',
          excerpt: 'Summary\u00a0here',
        },
      ],
      'Intro\u200b',
    );
    const { text } = cleanAiMarks(html);
    expect(text).not.toContain('\u200b');
    expect(text).not.toContain('\u00a0');
    expect(text).toContain('<h3 id="test">TestPost</h3>');
    expect(text).toContain('<p>Summary here</p>');
  });
});
