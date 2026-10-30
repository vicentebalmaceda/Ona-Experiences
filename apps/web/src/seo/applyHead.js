/**
 * Writes a `buildHead` result into a live document, idempotently: existing
 * tags are updated in place, a missing canonical is removed, every
 * `link[rel=alternate][hreflang]` is replaced by the current set, Open Graph /
 * Twitter tags are upserted (stale ones removed) and JSON-LD blocks are
 * replaced only when they changed. On a prerendered page the first call finds
 * the head already equal and touches nothing. Browser only; call it from an
 * effect. Preload hints only matter in the initial HTML and are left alone.
 */
import { metaKey } from './buildHead.js';
import { serializeJsonForScript } from './serializeJson.js';

function upsertMeta(doc, name, content) {
  let meta = doc.head.querySelector(`meta[name="${name}"]`);
  if (!content) {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('name', name);
    doc.head.appendChild(meta);
  }
  if (meta.getAttribute('content') !== content) meta.setAttribute('content', content);
}

const SOCIAL_SELECTOR = 'meta[property^="og:"], meta[name^="twitter:"]';

function applySocialMeta(doc, entries) {
  const existing = new Map();
  doc.head.querySelectorAll(SOCIAL_SELECTOR).forEach(meta => {
    const key = meta.hasAttribute('property') ? `property:${meta.getAttribute('property')}` : `name:${meta.getAttribute('name')}`;
    if (existing.has(key)) meta.remove();
    else existing.set(key, meta);
  });
  for (const entry of entries) {
    const [attr, key] = metaKey(entry);
    const id = `${attr}:${key}`;
    let meta = existing.get(id);
    existing.delete(id);
    if (!meta) {
      meta = doc.createElement('meta');
      meta.setAttribute(attr, key);
      doc.head.appendChild(meta);
    }
    if (meta.getAttribute('content') !== entry.content) meta.setAttribute('content', entry.content);
  }
  existing.forEach(meta => meta.remove());
}

function applyJsonLd(doc, blocks) {
  const current = [...doc.head.querySelectorAll('script[type="application/ld+json"]')];
  const next = blocks.map(block => serializeJsonForScript(block));
  if (current.length === next.length && current.every((script, index) => script.textContent === next[index])) return;
  current.forEach(script => script.remove());
  for (const text of next) {
    const script = doc.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = text;
    doc.head.appendChild(script);
  }
}

export function applyHead(head, doc = document) {
  if (doc.title !== head.title) doc.title = head.title;
  if (doc.documentElement.lang !== head.htmlLang) doc.documentElement.lang = head.htmlLang;

  upsertMeta(doc, 'description', head.description);
  upsertMeta(doc, 'robots', head.robots);

  let canonical = doc.head.querySelector('link[rel="canonical"]');
  if (head.canonical) {
    if (!canonical) {
      canonical = doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      doc.head.appendChild(canonical);
    }
    if (canonical.getAttribute('href') !== head.canonical) canonical.setAttribute('href', head.canonical);
  } else {
    canonical?.remove();
  }

  const alternates = [...doc.head.querySelectorAll('link[rel="alternate"][hreflang]')];
  const same =
    alternates.length === head.alternates.length &&
    alternates.every(
      (link, index) =>
        link.getAttribute('hreflang') === head.alternates[index].hreflang &&
        link.getAttribute('href') === head.alternates[index].href
    );
  if (!same) {
    alternates.forEach(link => link.remove());
    for (const alt of head.alternates) {
      const link = doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', alt.hreflang);
      link.setAttribute('href', alt.href);
      doc.head.appendChild(link);
    }
  }

  applySocialMeta(doc, head.meta ?? []);
  applyJsonLd(doc, head.jsonLd ?? []);
}
