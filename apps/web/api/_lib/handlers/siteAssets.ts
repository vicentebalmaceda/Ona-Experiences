import { createApiHandler } from '../middleware/createApiHandler.js';
import { getServices } from '../services/container.js';
import { methodNotAllowed } from '../utils/http.js';

/**
 * Public: what the landing page renders in each Asset Slot. Cached at the CDN
 * for a minute and in the BFF cache, so it is cheap to call on every visit.
 */
export const siteAssetsHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  const published = await getServices().siteAssetService.getPublished();
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).json({ items: published });
});
