/**
 * Build-time prerender: turns the client build in dist/ into one static HTML
 * file per public page, plus 404.html, spa.html and sitemap.xml.
 *
 * Runs after `vite build` (client → dist/) and `vite build --ssr` (server
 * entry → dist-server/); `npm run build` does all three.
 *
 * File layout: one directory per page with an index.html (dist/lodges/<slug>/index.html,
 * dist/en/index.html, …), served by Vercel at the extensionless URL with
 * `trailingSlash: false` and no `cleanUrls` (see vercel.json): no `.html`
 * URL aliases to redirect, and `/en` (en/index.html) never collides with the
 * `/en/*` pages that live in the same directory.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { loadSiteData, type DetailData, type SiteData } from './prerenderData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const SERVER_ENTRY = join(ROOT, 'dist-server', 'entry-server.js');

interface Head {
  title: string;
  canonical: string | null;
  robots: string;
  htmlLang: string;
  alternates: { hreflang: string; href: string }[];
}

/** What dist-server/entry-server.js exports (src/entry-server.jsx). */
interface ServerEntry {
  render(url: string, data: unknown): { html: string; head: Head; status: number };
  renderHeadTags(head: Head): string;
  serializeJsonForScript(value: unknown): string;
  buildSitemap(heads: Head[], options: { lastmod: string }): string;
  sanitizeMarketDescription(purify: unknown, html: unknown): string;
  localizePath(pageId: string, lang: string, params?: Record<string, string>): string | null;
  productSlug(item: { name?: string | null; productId?: number | string | null }): string | null;
  SUPPORTED_LANGS: string[];
  ROBOTS_INDEX: string;
  SITE_URL: string;
}

interface PageJob {
  path: string;
  data: Record<string, unknown>;
  expectStatus: number;
  /** Output file relative to dist/; defaults to <path>/index.html. */
  file?: string;
}

const DETAIL_PAGE: Record<DetailData['catalogType'], string> = { lodges: 'lodge', guides: 'guide' };

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** dist-relative file for a URL path: '/' → index.html, '/en/about' → en/about/index.html. */
function fileForPath(path: string): string {
  const segments = path.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.includes('/'))) {
    throw new Error(`Refusing to write an unsafe path: ${path}`);
  }
  return join(...segments, 'index.html');
}

/** Removes the head tags the prerender writes itself (the dev-time defaults in index.html). */
function stripManagedHead(template: string): string {
  return template
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name="description"[^>]*>/i, '')
    .replace(/\s*<meta\s+name="robots"[^>]*>/i, '');
}

function injectAfterViewport(template: string, tags: string): string {
  const viewport = /<meta\s+name="viewport"[^>]*>/i;
  if (!viewport.test(template)) throw new Error('index.html template has no viewport meta to anchor the head tags.');
  return template.replace(viewport, (match) => `${match}\n    ${tags.split('\n').join('\n    ')}`);
}

function buildDocument(
  entry: ServerEntry,
  template: string,
  page: { html: string; head: Head; data: unknown; logoUrl: string | null }
): string {
  let doc = stripManagedHead(template).replace(/<html lang="[^"]*"/i, `<html lang="${escapeHtml(page.head.htmlLang)}"`);
  doc = injectAfterViewport(doc, entry.renderHeadTags(page.head));
  if (page.logoUrl) {
    doc = doc.replace(/(<link rel="icon"[^>]*href=")[^"]*(")/i, `$1${escapeHtml(page.logoUrl)}$2`);
  }
  const root = '<div id="root"></div>';
  if (!doc.includes(root)) throw new Error('index.html template has no empty <div id="root"></div>.');
  const dataScript = `<script>window.__ONA_DATA__=${entry.serializeJsonForScript(page.data)}</script>`;
  // A function replacement: `$` sequences in the page HTML must stay literal.
  return doc.replace(root, () => `<div id="root">${page.html}</div>\n    ${dataScript}`);
}

/** Old `/lodges/{productId}` URLs: canonical + instant redirect to the slug URL, noindex. */
function legacyRedirectDocument(target: string, absoluteTarget: string, lang: string): string {
  const href = escapeHtml(target);
  const js = JSON.stringify(target).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="UTF-8" />
    <title>ONA Experiences</title>
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${escapeHtml(absoluteTarget)}" />
    <meta http-equiv="refresh" content="0;url=${href}" />
    <script>location.replace(${js} + location.search + location.hash)</script>
  </head>
  <body>
    <p><a href="${href}">${lang === 'en' ? 'This page has moved' : 'Esta página cambió de dirección'}: ${escapeHtml(absoluteTarget)}</a></p>
  </body>
</html>
`;
}

/** The client-only shell for routes without a prerendered file (admin, review, new products). */
function spaDocument(template: string): string {
  const withoutRobots = template.replace(/\s*<meta\s+name="robots"[^>]*>/i, '');
  return injectAfterViewport(withoutRobots, '<meta name="robots" content="noindex" />');
}

function write(file: string, content: string): void {
  const target = join(DIST, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function detailJobs(entry: ServerEntry, data: SiteData, siteAssets: unknown, purify: unknown) {
  const pages: PageJob[] = [];
  const legacy: { file: string; target: string; lang: string }[] = [];
  for (const detail of data.details) {
    const pageId = DETAIL_PAGE[detail.catalogType];
    const slug = entry.productSlug(detail.item);
    if (!slug) continue;
    const descriptionHtml = entry.sanitizeMarketDescription(purify, detail.item.description);
    for (const lang of entry.SUPPORTED_LANGS) {
      const path = entry.localizePath(pageId, lang, { slug });
      if (!path) continue;
      pages.push({
        path,
        expectStatus: 200,
        data: { v: 1, path, pageId, lang, siteAssets, detail: { ...detail, descriptionHtml } }
      });
      const legacyPath = entry.localizePath(pageId, lang, { slug: String(detail.item.productId) });
      if (legacyPath && legacyPath !== path) legacy.push({ file: fileForPath(legacyPath), target: path, lang });
    }
  }
  return { pages, legacy };
}

async function main(): Promise<void> {
  const started = Date.now();
  const entry = (await import(pathToFileURL(SERVER_ENTRY).href)) as ServerEntry;

  const templatePath = join(DIST, 'index.html');
  const template = readFileSync(templatePath, 'utf8');
  if (template.includes('window.__ONA_DATA__')) {
    throw new Error('dist/index.html is already prerendered; run `vite build` first (npm run build does).');
  }

  const data = await loadSiteData();
  const siteAssets = data.siteAssets;
  const purify = createDOMPurify(new JSDOM('').window as unknown as Parameters<typeof createDOMPurify>[0]);
  const logo = (siteAssets.items as Record<string, { url?: string } | null>).logo;
  const logoUrl = logo?.url ?? null;

  const jobs: PageJob[] = [];
  for (const lang of entry.SUPPORTED_LANGS) {
    const home = entry.localizePath('home', lang)!;
    jobs.push({ path: home, expectStatus: 200, data: { v: 1, path: home, pageId: 'home', lang, siteAssets, catalog: data.catalog } });
    const about = entry.localizePath('about', lang);
    if (about) jobs.push({ path: about, expectStatus: 200, data: { v: 1, path: about, pageId: 'about', lang, siteAssets } });
  }
  const details = detailJobs(entry, data, siteAssets, purify);
  jobs.push(...details.pages);
  // Vercel serves dist/404.html with status 404 for every unmatched path.
  jobs.push({
    path: '/404',
    file: '404.html',
    expectStatus: 404,
    data: { v: 1, path: '/404', pageId: 'notFound', lang: 'es', siteAssets }
  });

  const heads: Head[] = [];
  const written = new Set<string>();
  for (const job of jobs) {
    const { html, head, status } = entry.render(job.path, job.data);
    if (status !== job.expectStatus) {
      throw new Error(`Prerender of ${job.path} answered ${status}, expected ${job.expectStatus}.`);
    }
    const file = job.file ?? fileForPath(job.path);
    if (written.has(file)) throw new Error(`Two pages map to the same file: ${file} (${job.path}).`);
    written.add(file);
    write(file, buildDocument(entry, template, { html, head, data: job.data, logoUrl }));
    heads.push(head);
  }

  for (const page of details.legacy) {
    // A slug that is the bare id (unnamed product) already has its real page there.
    if (written.has(page.file)) continue;
    written.add(page.file);
    write(page.file, legacyRedirectDocument(page.target, `${entry.SITE_URL}${page.target}`, page.lang));
  }

  write('spa.html', spaDocument(template));

  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemap = entry.buildSitemap(heads, { lastmod });
  write('sitemap.xml', sitemap);

  const indexable = heads.filter((head) => head.robots === entry.ROBOTS_INDEX).length;
  console.log(
    `[prerender] ${data.source} data: ${jobs.length} pages (${indexable} indexable), ` +
      `${details.legacy.length} legacy redirects, spa.html, sitemap.xml ` +
      `(${(sitemap.match(/<url>/g) || []).length} URLs) in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
}

main().catch((error) => {
  console.error(`\n[prerender] FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
