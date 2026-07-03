import GhostAdminAPI from '@tryghost/admin-api';
import { DIGEST_DRAFT_TAG, DIGEST_TITLE } from './constants.js';
import { toGhostFilterDate } from './window.js';
import { pickExcerpt, type DigestPost } from './build-html.js';

export interface GhostPostRow {
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt?: string;
  custom_excerpt?: string;
  plaintext?: string;
  status: string;
  published_at: string;
  updated_at: string;
  tags?: Array<{ name: string }>;
}

interface GhostImageUploadResult {
  url: string;
}

/** Корень сайта без /ghost — админка на {url}/ghost, API на {url}/ghost/api/admin/. */
export function normalizeGhostUrl(raw: string): string {
  return raw.replace(/\/+$/, '').replace(/\/ghost\/?$/, '');
}

/** Scheduled в Admin API отдают preview /p/{id}/ — нужен канонический /{slug}/. */
export function resolvePostUrl(
  post: Pick<GhostPostRow, 'slug' | 'url' | 'status'>,
  fallbackSiteUrl: string,
): string {
  let origin = normalizeGhostUrl(fallbackSiteUrl);
  try {
    if (post.url?.startsWith('http')) {
      origin = new URL(post.url).origin;
    }
  } catch {
    // ponytail: keep fallback origin
  }

  const isPreviewUrl = /\/p\/[a-f0-9-]+\/?$/i.test(post.url);
  if (post.status === 'scheduled' || isPreviewUrl) {
    return `${origin}/${post.slug}/`;
  }

  if (post.url?.startsWith('http')) return post.url;
  return `${origin}/${post.slug}/`;
}

export function buildPublishedFilter(from: Date, to: Date): string {
  const fromIso = toGhostFilterDate(from);
  const toIso = toGhostFilterDate(to);
  return `(status:published)+published_at:>'${fromIso}'+published_at:<='${toIso}'`;
}

/** Scheduled: published_at в будущем, окно — по updated_at. */
export function buildScheduledFilter(from: Date, to: Date): string {
  const fromIso = toGhostFilterDate(from);
  const toIso = toGhostFilterDate(to);
  return `(status:scheduled)+updated_at:>'${fromIso}'+updated_at:<='${toIso}'`;
}

function createApi() {
  const url = process.env.GHOST_URL;
  const key = process.env.GHOST_ADMIN_API_KEY;
  if (!url || !key) {
    throw new Error('GHOST_URL and GHOST_ADMIN_API_KEY are required');
  }

  return new GhostAdminAPI({
    url: normalizeGhostUrl(url),
    key,
    version: process.env.GHOST_API_VERSION ?? 'v6.0',
  });
}

function hasExcludeTag(post: GhostPostRow, excludeTag: string): boolean {
  const normalized = excludeTag.replace(/^#/, '').toLowerCase();
  return (post.tags ?? []).some((t) => t.name.replace(/^#/, '').toLowerCase() === normalized);
}

export function dedupePosts(rows: GhostPostRow[]): GhostPostRow[] {
  const byKey = new Map<string, GhostPostRow>();
  for (const row of rows) {
    const key = row.id || row.slug;
    if (!key) continue;
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

export function getExcludeReason(post: GhostPostRow, excludeTag?: string): string | null {
  if (post.title === DIGEST_TITLE) return 'digest title';
  if (excludeTag && hasExcludeTag(post, excludeTag)) return `tag ${excludeTag}`;
  return null;
}

function mapPost(post: GhostPostRow, siteUrl: string): DigestPost {
  return {
    title: post.title,
    slug: post.slug,
    url: resolvePostUrl(post, siteUrl),
    excerpt: pickExcerpt(post.custom_excerpt, post.excerpt, post.plaintext, post.title),
  };
}

async function browsePosts(api: ReturnType<typeof createApi>, filter: string): Promise<GhostPostRow[]> {
  return (await api.posts.browse({
    filter,
    include: 'tags',
    fields: 'id,title,slug,url,excerpt,custom_excerpt,plaintext,status,published_at,updated_at',
    order: 'published_at asc',
    limit: 'all',
  })) as GhostPostRow[];
}

export async function fetchPostsForWindow(from: Date, to: Date): Promise<DigestPost[]> {
  const api = createApi();
  const excludeTag = process.env.DIGEST_EXCLUDE_TAG?.trim() || undefined;

  const [publishedRows, scheduledRows] = await Promise.all([
    browsePosts(api, buildPublishedFilter(from, to)),
    browsePosts(api, buildScheduledFilter(from, to)),
  ]);

  console.log(`API: ${publishedRows.length} published, ${scheduledRows.length} scheduled`);

  const merged = dedupePosts([...publishedRows, ...scheduledRows]);
  console.log(`Unique posts: ${merged.length}`);

  const siteUrl = normalizeGhostUrl(process.env.GHOST_URL!);
  const posts: DigestPost[] = [];
  for (const post of merged) {
    if (post.status !== 'published' && post.status !== 'scheduled') continue;

    const reason = getExcludeReason(post, excludeTag);
    if (reason) {
      console.log(`Skip ${post.slug}: ${reason}`);
      continue;
    }

    posts.push(mapPost(post, siteUrl));
  }

  console.log(`After filters: ${posts.length} posts (${posts.map((p) => p.slug).join(', ')})`);
  return posts;
}

export async function createDraftPost(title: string, html: string): Promise<{ id: string; url: string }> {
  const api = createApi();
  const tag = (process.env.DIGEST_DRAFT_TAG ?? DIGEST_DRAFT_TAG).replace(/^#/, '');

  const created = (await api.posts.add(
    {
      title,
      html,
      status: 'draft',
      tags: [{ name: `#${tag}` }],
    },
    { source: 'html' },
  )) as { id: string; url: string };

  return { id: created.id, url: created.url };
}

export async function resolveDigestImageUrl(): Promise<string | null> {
  const directUrl = process.env.DIGEST_IMAGE_URL?.trim();
  if (directUrl) return directUrl;

  const imagePath = process.env.DIGEST_IMAGE_PATH?.trim() || 'assets/digest-cover.png';
  if (!imagePath) return null;

  const api = createApi();
  const uploaded = (await api.images.upload({
    file: imagePath,
    purpose: 'image',
  })) as unknown as GhostImageUploadResult;

  if (!uploaded.url) {
    throw new Error('Ghost image upload did not return url');
  }

  return uploaded.url;
}
