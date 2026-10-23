/** Zone ids from BSale's `Zone` description; labels live under `zones.<id>` in the locale files. */
export const ZONE_IDS = [1, 2, 3, 4, 5];

/**
 * An item's zones as a list of strings. Accepts a single id, an array of ids (a service spanning
 * several zones) or a comma-separated string like "3,4".
 */
export function zoneIds(zone) {
  if (zone == null || zone === '') return [];
  const parts = Array.isArray(zone) ? zone : String(zone).split(',');
  return [...new Set(parts.map(part => String(part).trim()).filter(Boolean))];
}

/** Whether an item's zone value includes the given zone id. */
export function inZone(zone, id) {
  return zoneIds(zone).includes(String(id));
}

/** Translated zone name(s), comma-joined; non-id values (e.g. legacy free text) are shown as-is. */
export function zoneLabel(zone, t) {
  return zoneIds(zone)
    .map(part => {
      const id = Number(part);
      return ZONE_IDS.includes(id) ? t(`zones.${id}`) : part;
    })
    .join(', ');
}
