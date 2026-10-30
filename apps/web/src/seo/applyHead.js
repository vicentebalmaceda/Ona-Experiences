/**
 * Writes a `buildHead` result into a live document, idempotently: existing
 * tags are updated in place, a missing canonical is removed, and every
 * `link[rel=alternate][hreflang]` is replaced by the current set. Browser only;
 * call it from an effect.
 */
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

  doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());
  for (const alt of head.alternates) {
    const link = doc.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', alt.hreflang);
    link.setAttribute('href', alt.href);
    doc.head.appendChild(link);
  }
}
