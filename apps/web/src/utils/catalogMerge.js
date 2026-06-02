function isMissing(value) {
  return value === null || value === undefined;
}

export function mergeWithSeed(apiItems, seedItems) {
  const seedByProductId = new Map(
    seedItems.filter((item) => item.productId != null).map((item) => [item.productId, item])
  );

  return apiItems.map((apiItem) => {
    const seed = seedByProductId.get(apiItem.productId);
    if (!seed) return apiItem;

    const enriched = { ...apiItem };
    for (const [key, seedValue] of Object.entries(seed)) {
      if (key === 'productId') continue;
      if (isMissing(enriched[key])) {
        enriched[key] = seedValue;
      }
    }
    return enriched;
  });
}
