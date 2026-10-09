import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildFallbackIntro,
  ensureGreeting,
  formatTopics,
  generateDigestIntro,
  listLlmProviders,
  topicFromTitle,
} from './generate-intro.js';
import type { DigestPost } from './build-html.js';

const samplePosts: DigestPost[] = [
  {
    title: 'Как добавить управление смартфоном с помощью курсора',
    slug: 'cursor',
    url: 'https://example.com/cursor/',
    excerpt: 'Жесты и курсор',
  },
  {
    title: 'Как не дать экрану выключиться',
    slug: 'screen',
    url: 'https://example.com/screen/',
    excerpt: 'Keep awake',
  },
];

function clearLlmEnv(): void {
  delete process.env.HF_TOKEN;
  delete process.env.HF_TEXT_MODEL;
  delete process.env.HF_BASE_URL;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
  delete process.env.GROQ_BASE_URL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
}

describe('topicFromTitle', () => {
  it('strips leading Как', () => {
    expect(topicFromTitle('Как Foo Bar')).toBe('foo Bar');
  });
});

describe('formatTopics', () => {
  it('joins two topics with и', () => {
    expect(
      formatTopics([
        'Как добавить управление смартфоном с помощью курсора',
        'Как не дать экрану выключиться',
      ]),
    ).toBe('как добавить управление смартфоном с помощью курсора и как не дать экрану выключиться');
  });
});

describe('buildFallbackIntro', () => {
  it('matches digest greeting style', () => {
    expect(buildFallbackIntro(samplePosts)).toBe(
      'Приветствую. На этой неделе я расскажу как добавить управление смартфоном с помощью курсора и как не дать экрану выключиться.',
    );
  });
});

describe('ensureGreeting', () => {
  it('keeps text that already greets', () => {
    expect(ensureGreeting('Приветствую. Тема недели — курсор.')).toBe(
      'Приветствую. Тема недели — курсор.',
    );
  });

  it('prefixes when greeting is missing', () => {
    expect(ensureGreeting('на этой неделе расскажу про курсор')).toBe(
      'Приветствую. На этой неделе расскажу про курсор.',
    );
  });
});

describe('listLlmProviders', () => {
  afterEach(clearLlmEnv);

  it('orders HF then Groq', () => {
    process.env.HF_TOKEN = 'hf_test';
    process.env.GROQ_API_KEY = 'gsk_test';
    process.env.OPENAI_API_KEY = 'sk_test';

    expect(listLlmProviders().map((p) => p.label)).toEqual([
      'Hugging Face',
      'Groq',
      'OpenAI-compatible',
    ]);
  });
});

describe('generateDigestIntro', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearLlmEnv();
  });

  it('uses fallback without API key', async () => {
    clearLlmEnv();
    await expect(generateDigestIntro(samplePosts)).resolves.toBe(buildFallbackIntro(samplePosts));
  });

  it('uses HF model text and enforces greeting', async () => {
    process.env.HF_TOKEN = 'hf_test';
    process.env.HF_TEXT_MODEL = 'Qwen/Qwen3-4B-Instruct-2507';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'На этой неделе расскажу про курсор и экран' } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const intro = await generateDigestIntro(samplePosts);
    expect(intro.startsWith('Приветствую.')).toBe(true);
    expect(intro).toContain('курсор');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://router.huggingface.co/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer hf_test',
        }),
      }),
    );
  });

  it('falls back to Groq when HF fails', async () => {
    process.env.HF_TOKEN = 'hf_test';
    process.env.GROQ_API_KEY = 'gsk_test';
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('huggingface')) {
        return { ok: false, status: 402, text: async () => 'no credits' };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Приветствую. На этой неделе я расскажу про курсор.' } }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const intro = await generateDigestIntro(samplePosts);
    expect(intro).toContain('курсор');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gsk_test',
        }),
      }),
    );
  });

  it('falls back to template when all providers fail', async () => {
    process.env.HF_TOKEN = 'hf_test';
    process.env.GROQ_API_KEY = 'gsk_test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => 'boom',
      })),
    );

    await expect(generateDigestIntro(samplePosts)).resolves.toBe(buildFallbackIntro(samplePosts));
  });
});
