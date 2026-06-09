function isMissing(value) {
  return value === null || value === undefined;
}

function mergeItemWithSeed(apiItem, seed) {
  if (!seed) return apiItem;

  const enriched = { ...apiItem };
  for (const [key, seedValue] of Object.entries(seed)) {
    if (key === 'productId') continue;
    if (isMissing(enriched[key])) {
      enriched[key] = seedValue;
    }
  }
  return enriched;
}

export function mergeWithSeed(apiItems, seedItems) {
  const seedByProductId = new Map(
    seedItems.filter((item) => item.productId != null).map((item) => [item.productId, item])
  );

  return apiItems.map((apiItem) => mergeItemWithSeed(apiItem, seedByProductId.get(apiItem.productId)));
}

export function mergeSingleWithSeed(apiItem, seedItems) {
  const seed = seedItems.find((item) => item.productId === apiItem.productId);
  return mergeItemWithSeed(apiItem, seed);
}
