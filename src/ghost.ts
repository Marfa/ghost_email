import GhostAdminAPI from '@tryghost/admin-api';
import { toGhostFilterDate } from './window.js';
import { pickExcerpt, type DigestPost } from './build-html.js';

export interface GhostPostRow {
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt?: string;
  custom_excerpt?: string;
  status: string;
  published_at: string;
  tags?: Array<{ name: string }>;
}

function createApi() {
  const url = process.env.GHOST_URL;
  const key = process.env.GHOST_ADMIN_API_KEY;
  if (!url || !key) {
    throw new Error('GHOST_URL and GHOST_ADMIN_API_KEY are required');
  }

  return new GhostAdminAPI({
    url: url.replace(/\/$/, ''),
    key,
    version: 'v5.0',
  });
}

function hasExcludeTag(post: GhostPostRow, excludeTag: string): boolean {
  const normalized = excludeTag.replace(/^#/, '').toLowerCase();
  return (post.tags ?? []).some((t) => t.name.replace(/^#/, '').toLowerCase() === normalized);
}

export async function fetchPostsForWindow(from: Date, to: Date): Promise<DigestPost[]> {
  const api = createApi();
  const excludeTag = process.env.DIGEST_EXCLUDE_TAG ?? '#weekly-email';

  const fromIso = toGhostFilterDate(from);
  const toIso = toGhostFilterDate(to);
  const filter = `status:['published','scheduled']+published_at:>'${fromIso}'+published_at:<='${toIso}'`;

  const rows = (await api.posts.browse({
    filter,
    fields: 'title,slug,url,excerpt,custom_excerpt,status,published_at,tags',
    order: 'published_at asc',
    limit: 'all',
  })) as GhostPostRow[];

  return rows
    .filter((post) => !hasExcludeTag(post, excludeTag))
    .map((post) => ({
      title: post.title,
      slug: post.slug,
      url: post.url,
      excerpt: pickExcerpt(post.custom_excerpt, post.excerpt),
    }))
    .filter((post) => post.excerpt.length > 0);
}

export async function createDraftPost(title: string, html: string): Promise<{ id: string; url: string }> {
  const api = createApi();
  const tag = (process.env.DIGEST_EXCLUDE_TAG ?? '#weekly-email').replace(/^#/, '');

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
