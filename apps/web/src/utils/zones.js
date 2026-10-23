/** Zone ids from BSale's `Zone` description; labels live under `zones.<id>` in the locale files. */
export const ZONE_IDS = [1, 2, 3, 4, 5];

/** Translated zone name; non-id values (e.g. legacy free text) are shown as-is. */
export function zoneLabel(zone, t) {
  if (zone == null || zone === '') return '';
  const id = Number(zone);
  return ZONE_IDS.includes(id) ? t(`zones.${id}`) : String(zone);
}
