import { buildDigestHtml } from './build-html.js';
import { DIGEST_INTRO, DIGEST_TITLE } from './constants.js';
import { fetchPostsForWindow, createDraftPost, resolveDigestImageUrl } from './ghost.js';
import { readLastRun, writeLastRun } from './state.js';
import { getCollectionWindow } from './window.js';

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

  const featureImage = await resolveDigestImageUrl();
  const html = buildDigestHtml(posts, DIGEST_INTRO);
  const title = DIGEST_TITLE;

  const draft = await createDraftPost(title, html, featureImage ?? undefined);
  await writeLastRun(runStartedAt);

  console.log(`Draft created: ${draft.url} (${posts.length} posts)`);
}

const isMain = process.argv[1]?.endsWith('/index.js') || process.argv[1]?.endsWith('\\index.js');

function logError(err: unknown): void {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: unknown } }).response;
    if (res?.data) {
      console.error('Ghost API:', JSON.stringify(res.data, null, 2));
    }
    if (res?.status) console.error(`HTTP ${res.status}`);
  }
  console.error(err instanceof Error ? err.message : err);
}

if (isMain) {
  runDigest().catch((err) => {
    logError(err);
    process.exit(1);
  });
}
