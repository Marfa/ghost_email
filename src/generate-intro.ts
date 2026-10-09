import type { DigestPost } from './build-html.js';

const GREETING_PREFIX = 'Приветствую.';
const HF_BASE_URL = 'https://router.huggingface.co/v1';
const HF_DEFAULT_MODEL = 'Qwen/Qwen3-4B-Instruct-2507';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-20b';

/** Нормализует тему из заголовка: «Как Foo» → «foo». */
export function topicFromTitle(title: string): string {
  const cleaned = title.replace(/^Как\s+/i, '').replace(/\.+$/, '').trim();
  if (!cleaned) return title.trim().toLowerCase();
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

export function formatTopics(titles: string[]): string {
  const parts = titles.map((t) => `как ${topicFromTitle(t)}`);
  if (parts.length === 0) return 'как …';
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} и ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} и ${parts[parts.length - 1]}`;
}

/** Шаблон без ИИ — по заголовкам постов. */
export function buildFallbackIntro(posts: DigestPost[]): string {
  return `${GREETING_PREFIX} На этой неделе я расскажу ${formatTopics(posts.map((p) => p.title))}.`;
}

const GREETING_START =
  /^(приветствую|здравствуйте|добрый\s+день|добрый\s+вечер|доброе\s+утро|привет)[.!]?\s/i;

/** Гарантирует, что текст начинается со слова приветствия. */
export function ensureGreeting(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return buildFallbackIntro([]);
  if (GREETING_START.test(trimmed)) {
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }
  const body = trimmed.replace(/^[.!\s]+/, '');
  const withGreeting = `${GREETING_PREFIX} ${body.charAt(0).toUpperCase()}${body.slice(1)}`;
  const normalized = withGreeting.replace(/\.\.+$/, '.');
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function postsBrief(posts: DigestPost[]): string {
  return posts
    .map((p, i) => {
      const excerpt = p.excerpt ? ` — ${p.excerpt.slice(0, 200)}` : '';
      return `${i + 1}. ${p.title}${excerpt}`;
    })
    .join('\n');
}

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  label: string;
};

/** Провайдеры по порядку: HF → Groq → OPENAI_*. */
export function listLlmProviders(): LlmConfig[] {
  const providers: LlmConfig[] = [];

  const hfToken = process.env.HF_TOKEN?.trim();
  if (hfToken) {
    providers.push({
      apiKey: hfToken,
      baseUrl: (process.env.HF_BASE_URL?.trim() || HF_BASE_URL).replace(/\/+$/, ''),
      model: process.env.HF_TEXT_MODEL?.trim() || HF_DEFAULT_MODEL,
      label: 'Hugging Face',
    });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    providers.push({
      apiKey: groqKey,
      baseUrl: (process.env.GROQ_BASE_URL?.trim() || GROQ_BASE_URL).replace(/\/+$/, ''),
      model: process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL,
      label: 'Groq',
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    providers.push({
      apiKey: openaiKey,
      baseUrl: (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, ''),
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
      label: 'OpenAI-compatible',
    });
  }

  return providers;
}

/** Первый доступный провайдер (HF, иначе Groq, иначе OPENAI_*). */
export function resolveLlmConfig(): LlmConfig | null {
  return listLlmProviders()[0] ?? null;
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

async function callChatCompletion(
  config: LlmConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      // gpt-oss на Groq тратит budget на reasoning — 180 часто даёт пустой content
      max_tokens: 512,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${config.label} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${config.label} returned empty intro`);
  return content;
}

const SYSTEM_PROMPT = [
  'Ты пишешь короткий вступительный абзац для еженедельного email-дайджеста на русском.',
  'Ровно один абзац, 1–2 предложения, без списков и кавычек вокруг всего текста.',
  'Обязательно начни со слова приветствия (например «Приветствую.»).',
  'Дальше кратко анонсируй темы недели по смыслу постов, в духе: «На этой неделе я расскажу как … и как …».',
  'Не выдумывай темы, которых нет в списке. Не используй markdown.',
].join(' ');

/**
 * Intro для дайджеста: HF → Groq → шаблон.
 * Всегда начинается со слова приветствия.
 */
export async function generateDigestIntro(posts: DigestPost[]): Promise<string> {
  const fallback = buildFallbackIntro(posts);
  const providers = listLlmProviders();

  if (providers.length === 0) {
    console.log('Intro: fallback (no HF_TOKEN / GROQ_API_KEY / OPENAI_API_KEY)');
    return fallback;
  }

  const userPrompt = `Посты дайджеста:\n${postsBrief(posts)}\n\nНапиши вступительный абзац.`;
  const errors: string[] = [];

  for (const config of providers) {
    try {
      const raw = await callChatCompletion(config, SYSTEM_PROMPT, userPrompt);
      const intro = ensureGreeting(raw);
      console.log(`Intro: generated via ${config.label} (${config.model})`);
      return intro;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.warn(`Intro: ${config.label} failed — ${msg}`);
    }
  }

  console.warn(`Intro: all providers failed, using template — ${errors.join(' | ')}`);
  return fallback;
}
