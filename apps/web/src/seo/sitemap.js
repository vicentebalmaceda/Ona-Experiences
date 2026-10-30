/**
 * sitemap.xml from the heads of the prerendered pages: only indexable pages
 * (robots index + canonical), each with the same hreflang alternates its
 * <head> declares, so the sitemap and the pages never disagree.
 */
import { ROBOTS_INDEX } from './buildHead.js';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * @param {Array<{canonical: string|null, robots: string, alternates: {hreflang: string, href: string}[]}>} heads
 * @param {{ lastmod: string }} options  `lastmod` as YYYY-MM-DD (the build date)
 * @returns {string} the sitemap XML
 */
export function buildSitemap(heads, { lastmod }) {
  const seen = new Set();
  const urls = [];
  for (const head of heads) {
    if (!head?.canonical || head.robots !== ROBOTS_INDEX || seen.has(head.canonical)) continue;
    seen.add(head.canonical);
    const lines = [`    <loc>${escapeXml(head.canonical)}</loc>`, `    <lastmod>${escapeXml(lastmod)}</lastmod>`];
    for (const alt of head.alternates ?? []) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`
      );
    }
    urls.push(`  <url>\n${lines.join('\n')}\n  </url>`);
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');
}
