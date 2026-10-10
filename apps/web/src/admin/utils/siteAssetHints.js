/**
 * Pure helpers for the "Sitio" admin page: soft warnings about a candidate
 * file (they never block publishing, the hard rules live in siteAssetSlots.ts)
 * and small formatting for the card footer.
 */

export const HERO_IMAGE_MIN_WIDTH = 1600;
export const LOGO_MIN_WIDTH = 240;
export const HERO_VIDEO_MAX_SECONDS = 30;

/**
 * @param {'hero'|'hero_poster'|'logo'} slot
 * @param {{ kind: 'image'|'video'|null, width?: number|null, height?: number|null, durationSeconds?: number|null }} media
 * @returns {string[]} Spanish warnings, empty when the file looks fine.
 */
export function warningsForMedia(slot, media) {
  const warnings = [];
  if (!media || !media.kind) return warnings;
  const { kind, width, height, durationSeconds } = media;

  if (kind === 'image' && width != null) {
    if (slot === 'hero' && width < HERO_IMAGE_MIN_WIDTH) {
      warnings.push(
        `La imagen tiene ${width} px de ancho; se recomienda al menos ${HERO_IMAGE_MIN_WIDTH} px para que no se vea pixelada en pantallas grandes.`
      );
    }
    if (slot === 'logo') {
      if (width < LOGO_MIN_WIDTH) {
        warnings.push(
          `El logo tiene ${width} px de ancho; se recomienda al menos ${LOGO_MIN_WIDTH} px.`
        );
      }
      if (height != null && height > 0 && width !== height) {
        warnings.push('El logo no es cuadrado; se mostrará recortado en un círculo.');
      }
    }
  }

  if (kind === 'video' && durationSeconds != null && durationSeconds > HERO_VIDEO_MAX_SECONDS) {
    warnings.push(
      `El video dura ${formatDuration(durationSeconds)}; se recomienda un máximo de ${HERO_VIDEO_MAX_SECONDS} s para que cargue rápido.`
    );
  }

  return warnings;
}

/** "dd-mm-yyyy" from an ISO string; empty string when the value is not a date. */
export function formatPublishedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

/** "1920 × 1080" or empty string when either side is missing. */
export function formatDimensions(width, height) {
  if (width == null || height == null) return '';
  return `${width} × ${height}`;
}

/** "12 s" or "1 min 05 s". */
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes} min ${rest} s`;
}

/** The hero card suggests a poster when the hero is a video and none is published. */
export function needsPosterHint(items) {
  return Boolean(items?.hero && items.hero.kind === 'video' && !items.hero_poster);
}
