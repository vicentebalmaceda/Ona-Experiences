/**
 * Product slugs: the URL segment of a lodge or guide detail page,
 * `{slugified-name}-{productId}` (e.g. `bio-bio-river-lodge-2007`).
 *
 * Only the trailing numeric BSale `productId` identifies the item; the name
 * part is cosmetic and may go stale when an item is renamed, so the detail
 * page redirects (replace) to the current slug once the item loads. Bare ids
 * (`/lodges/2007`, the old URLs) parse too, so old links keep working.
 *
 * Dependency-free so the SPA, the prerender and the sitemap scripts share it.
 */

export interface SluggableProduct {
  name?: string | null;
  productId?: string | number | null;
}

/**
 * Lowercase ASCII slug: strips accents and diacritics (so `ñ` → `n`), turns
 * every run of non-alphanumerics into a single `-` and trims dashes at both ends.
 */
export function slugify(name: unknown): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The detail-page slug for an item, or `null` when it has no productId.
 * An item without a usable name gets its bare id.
 */
export function productSlug(item: SluggableProduct | null | undefined): string | null {
  const id = String(item?.productId ?? '').trim();
  if (!id) return null;
  const name = slugify(item?.name);
  return name ? `${name}-${id}` : id;
}

/**
 * The productId inside a slug: the trailing `-(digits)`, or the whole slug
 * when it is all digits. `null` when the slug carries no id.
 */
export function parseProductSlug(slug: unknown): string | null {
  const value = String(slug ?? '').trim();
  if (/^\d+$/.test(value)) return value;
  const match = /-(\d+)$/.exec(value);
  return match ? match[1] : null;
}
