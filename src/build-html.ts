export interface DigestPost {
  title: string;
  slug: string;
  url: string;
  excerpt: string;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function pickExcerpt(customExcerpt: string | null | undefined, excerpt: string | null | undefined): string {
  const raw = customExcerpt?.trim() || excerpt?.trim() || '';
  return stripHtml(raw);
}

export function buildDigestHtml(posts: DigestPost[], intro: string): string {
  const parts = [`<p>${escapeHtml(intro)}</p>`];

  for (const post of posts) {
    parts.push(
      `<h3 id="${escapeHtml(post.slug)}">${escapeHtml(post.title)}</h3>`,
      `<p>${escapeHtml(post.excerpt)}</p>`,
      `<p><a href="${escapeHtml(post.url)}" class="kg-btn kg-btn-accent">Читать дальше</a></p>`,
    );
  }

  return parts.join('\n');
}

export function formatDigestTitle(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const fromStr = fmt.format(from);
  const toStr = fmt.format(to);
  if (fromStr === toStr) return `Дайджест за ${fromStr}`;
  return `Дайджест за ${fromStr} — ${toStr}`;
}
