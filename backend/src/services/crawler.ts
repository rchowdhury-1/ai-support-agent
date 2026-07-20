/**
 * Site crawler for the operator onboarding wizard: fetch a start URL, walk
 * same-origin links breadth-first, and extract readable text per page.
 * Operator-only surface (trusted input); limits keep it bounded.
 */
import * as cheerio from 'cheerio';

export const MAX_PAGES = 30;
const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

export interface CrawledPage {
  url: string;
  path: string;
  title: string;
  text: string;
}

export function extractText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe, nav, footer, header form').remove();
  const title = $('title').first().text().trim() || $('h1').first().text().trim() || '';
  const root = $('main').length ? $('main') : $('body');
  const text = root
    .text()
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { title, text };
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const u = new URL(href, base);
      if (u.origin !== base.origin) return;
      if (!/^https?:$/.test(u.protocol)) return;
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3|css|js|ico|xml)$/i.test(u.pathname)) return;
      u.hash = '';
      u.search = '';
      links.add(u.toString());
    } catch {
      /* ignore malformed hrefs */
    }
  });
  return [...links];
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'SupportAI-Ingest/2.0 (+https://supportai)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) return null;
    const text = await res.text();
    return text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
  } catch {
    return null;
  }
}

/** Breadth-first crawl from startUrl, same origin, up to maxPages pages. */
export async function crawlSite(startUrl: string, maxPages: number = MAX_PAGES): Promise<CrawledPage[]> {
  const start = new URL(startUrl);
  const queue: string[] = [start.toString()];
  const seen = new Set<string>(queue);
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;
    const html = await fetchHtml(url);
    if (!html) continue;

    const { title, text } = extractText(html);
    if (text.length > 100) {
      pages.push({ url, path: new URL(url).pathname || '/', title: title || url, text });
    }
    for (const link of extractLinks(html, url)) {
      if (!seen.has(link) && seen.size < maxPages * 5) {
        seen.add(link);
        queue.push(link);
      }
    }
  }
  return pages;
}
