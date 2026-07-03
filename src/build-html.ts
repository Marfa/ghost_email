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

export function pickExcerpt(
  customExcerpt: string | null | undefined,
  excerpt: string | null | undefined,
  plaintext?: string | null,
  title?: string,
): string {
  const raw = customExcerpt?.trim() || excerpt?.trim() || plaintext?.trim() || title?.trim() || '';
  return stripHtml(raw);
}

export function buildDigestHtml(posts: DigestPost[], intro: string, imageUrl?: string): string {
  const parts: string[] = [];

  if (imageUrl) {
    parts.push(
      `<figure class="kg-card kg-image-card"><img src="${escapeHtml(imageUrl)}" alt="Обложка дайджеста" /></figure>`,
    );
  }

  parts.push(`<p>${escapeHtml(intro)}</p>`);

  for (const post of posts) {
    parts.push(
      `<h3 id="${escapeHtml(post.slug)}">${escapeHtml(post.title)}</h3>`,
      `<p>${escapeHtml(post.excerpt)}</p>`,
      '<!--kg-card-begin: button-->',
      `<div class="kg-card kg-button-card kg-align-left"><a href="${escapeHtml(post.url)}" class="kg-btn kg-btn-accent">Читать дальше</a></div>`,
      '<!--kg-card-end: button-->',
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
