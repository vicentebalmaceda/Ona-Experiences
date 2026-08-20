/** Returns trimmed BSale reference price text, or null when missing/empty. */
export function getReferencePrice(item) {
  const value = typeof item?.referencePrice === 'string' ? item.referencePrice.trim() : '';
  return value || null;
}
