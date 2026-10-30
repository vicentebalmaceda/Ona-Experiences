import { zoneLabel } from './zones.js';

/**
 * Descriptive alt text for a lodge or guide photo, e.g.
 * "Río Puelo Lodge – pesca con mosca en Patagonia norte". Falls back to
 * "… en Chile" when the item has no zone.
 */
export function itemImageAlt(item, t) {
  const name = item?.name ?? '';
  const zone = zoneLabel(item?.zone, t);
  return zone
    ? t('common.item_image_alt', { name, zone })
    : t('common.item_image_alt_no_zone', { name });
}
