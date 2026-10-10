/**
 * Asset Slots: the fixed places on the public site an Admin can fill with an
 * uploaded file. Slots are code, not data; adding one is a new entry here plus
 * a card in the admin page.
 *
 * This module is dependency-free on purpose: the BFF uses it to mint upload
 * tokens and verify publishes, and the admin SPA imports it for early
 * client-side validation, so both sides enforce the same rules. It lives in
 * `shared/` (not `api/`) because the Vite dev server proxies every `/api/*`
 * URL to the BFF, which would 404 the module in development.
 */

export const SITE_ASSET_SLOTS = ['hero', 'hero_poster', 'logo'] as const;
export type SiteAssetSlot = (typeof SITE_ASSET_SLOTS)[number];

export type SiteAssetKind = 'image' | 'video';

export interface SlotRules {
  /** Spanish label for the admin UI. */
  label: string;
  /** Short Spanish description of where the asset shows up. */
  description: string;
  allowedContentTypes: readonly string[];
  maxSizeBytes: number;
  /** Spanish hint shown next to the picker. */
  recommended: string;
  /** Default file bundled with the SPA, served from /assets when nothing is published. */
  defaultUrl: string;
  defaultKind: SiteAssetKind;
}

const MB = 1024 * 1024;

export const SLOT_RULES: Record<SiteAssetSlot, SlotRules> = {
  hero: {
    label: 'Hero de portada',
    description: 'Imagen o video de fondo de la portada.',
    allowedContentTypes: ['image/jpeg', 'image/webp', 'video/mp4', 'video/webm'],
    maxSizeBytes: 25 * MB,
    recommended:
      'Imagen JPG/WebP de 1920×1080 o mayor (máx. 6 MB), o video MP4/WebM 1080p de 10 a 20 s, sin audio (máx. 25 MB).',
    defaultUrl: '/assets/hero-default.jpg',
    defaultKind: 'image'
  },
  hero_poster: {
    label: 'Poster del video',
    description: 'Imagen que se muestra mientras carga el video del hero.',
    allowedContentTypes: ['image/jpeg', 'image/webp'],
    maxSizeBytes: 2 * MB,
    recommended: 'JPG/WebP con el mismo encuadre que el primer cuadro del video (máx. 2 MB).',
    defaultUrl: '/assets/hero-default.jpg',
    defaultKind: 'image'
  },
  logo: {
    label: 'Logo',
    description: 'Logo redondo del encabezado y favicon.',
    allowedContentTypes: ['image/png', 'image/webp', 'image/svg+xml'],
    maxSizeBytes: 1 * MB,
    recommended: 'PNG/WebP/SVG cuadrado, mínimo 240×240, fondo transparente (máx. 1 MB).',
    defaultUrl: '/assets/logo-ona.png',
    defaultKind: 'image'
  }
};

/** Hero images get a tighter cap than hero videos even though they share the slot. */
export const HERO_IMAGE_MAX_BYTES = 6 * MB;

export function isSiteAssetSlot(value: unknown): value is SiteAssetSlot {
  return typeof value === 'string' && (SITE_ASSET_SLOTS as readonly string[]).includes(value);
}

export function kindForContentType(contentType: string): SiteAssetKind | null {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  return null;
}

/** Blob pathname prefix every upload for a slot must live under. */
export function blobPrefixForSlot(slot: SiteAssetSlot): string {
  return `site/${slot}/`;
}

export function buildBlobPathname(slot: SiteAssetSlot, originalName: string, now = new Date()): string {
  const safeName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'asset';
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${blobPrefixForSlot(slot)}${stamp}-${safeName}`;
}

export interface SlotCheckResult {
  ok: boolean;
  /** Spanish, safe to show to the admin. */
  reason?: string;
}

/**
 * The one rule set both the browser and the BFF apply to a candidate file.
 * `sizeBytes` may be omitted when only the type is known (token request).
 */
export function checkFileForSlot(
  slot: SiteAssetSlot,
  contentType: string,
  sizeBytes?: number
): SlotCheckResult {
  const rules = SLOT_RULES[slot];
  if (!rules.allowedContentTypes.includes(contentType)) {
    return { ok: false, reason: `Formato no permitido para ${rules.label}: ${contentType || 'desconocido'}.` };
  }
  if (sizeBytes != null) {
    const limit =
      slot === 'hero' && kindForContentType(contentType) === 'image'
        ? HERO_IMAGE_MAX_BYTES
        : rules.maxSizeBytes;
    if (sizeBytes > limit) {
      return {
        ok: false,
        reason: `El archivo pesa ${formatMegabytes(sizeBytes)} y el máximo para ${rules.label} es ${formatMegabytes(limit)}.`
      };
    }
  }
  return { ok: true };
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / MB;
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}
