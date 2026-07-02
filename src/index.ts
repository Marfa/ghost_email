import { buildDigestHtml, formatDigestTitle } from './build-html.js';
import { fetchPostsForWindow, createDraftPost } from './ghost.js';
import { readLastRun, writeLastRun } from './state.js';
import { getCollectionWindow } from './window.js';

const DEFAULT_INTRO = 'Приветствую. Ниже — подборка материалов с блога за прошедший период.';

function parseFallbackDays(): number {
  const raw = process.env.FALLBACK_DAYS ?? '7';
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) throw new Error('FALLBACK_DAYS must be a positive integer');
  return n;
}

export async function runDigest(): Promise<void> {
  const runStartedAt = new Date();
  const lastRunAt = await readLastRun();
  const fallbackDays = parseFallbackDays();
  const window = getCollectionWindow(lastRunAt, runStartedAt, fallbackDays);

  console.log(
    `Collecting posts: ${window.from.toISOString()} → ${window.to.toISOString()}` +
      (window.isFirstRun ? ` (first run, last ${fallbackDays} days)` : ' (since last run)'),
  );

  const posts = await fetchPostsForWindow(window.from, window.to);

  if (posts.length === 0) {
    console.log('No posts in window — draft not created.');
    await writeLastRun(runStartedAt);
    return;
  }

  const intro = process.env.DIGEST_INTRO ?? DEFAULT_INTRO;
  const html = buildDigestHtml(posts, intro);
  const title = formatDigestTitle(window.from, window.to);

  const draft = await createDraftPost(title, html);
  await writeLastRun(runStartedAt);

  console.log(`Draft created: ${draft.url} (${posts.length} posts)`);
}

const isMain = process.argv[1]?.endsWith('/index.js') || process.argv[1]?.endsWith('\\index.js');

if (isMain) {
  runDigest().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
