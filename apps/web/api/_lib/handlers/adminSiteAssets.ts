import type { HandleUploadBody } from '@vercel/blob/client';
import { createApiHandler } from '../middleware/createApiHandler.js';
import { requireAdminSession } from '../middleware/requireAdminSession.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { DomainError } from '../types/errors.js';
import { publishSiteAssetSchema, siteAssetSlotParamSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';
import { triggerRebuild } from '../utils/deployHook.js';

export const adminSiteAssetsHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  requireAdminSession(req);
  const service = getServices().siteAssetService;
  const items = await service.listForAdmin();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ blobConfigured: service.blobConfigured, items });
});

/**
 * Token exchange endpoint used by `upload()` from @vercel/blob/client. The
 * browser POSTs a `blob.generate-client-token` event; Vercel later POSTs a
 * `blob.upload-completed` event to the same URL (production only).
 */
export const adminSiteAssetUploadTokenHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  const body = req.body as HandleUploadBody | undefined;
  if (!body || typeof body !== 'object' || typeof body.type !== 'string') {
    throw new DomainError('Invalid upload request', 400, 'VALIDATION_ERROR');
  }
  // The completion webhook comes from Vercel without our cookie; token minting
  // is the step that must be authenticated.
  if (body.type === 'blob.generate-client-token') {
    requireAdminSession(req);
  }
  const result = await getServices().siteAssetService.handleClientUpload(req, body);
  res.status(200).json(result);
});

export const adminSiteAssetBySlotHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    methodNotAllowed(res, ['PUT', 'DELETE']);
    return;
  }
  const { email } = requireAdminSession(req);
  const { slot } = validateParams(siteAssetSlotParamSchema, req);
  const service = getServices().siteAssetService;

  if (req.method === 'DELETE') {
    await service.restoreDefault(slot);
    // The prerendered pages embed the site assets (hero poster preload, og:image).
    await triggerRebuild(`site asset restored: ${slot}`);
    res.status(200).json({ ok: true, slot });
    return;
  }

  const body = validateBody(publishSiteAssetSchema, req);
  const asset = await service.publish({
    slot,
    pathname: body.pathname,
    alt: body.alt,
    width: body.width,
    height: body.height,
    publishedBy: email
  });
  await triggerRebuild(`site asset published: ${slot}`);
  res.status(200).json({ asset });
});

/**
 * Admin "Republicar sitio": rebuilds the static site now instead of waiting
 * for the next content change or the daily scheduled rebuild.
 */
export const adminSiteRebuildHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  requireAdminSession(req);
  const result = await triggerRebuild('admin request (Republicar sitio)');
  res.setHeader('Cache-Control', 'no-store');
  res.status(result.error ? 502 : 200).json(result);
});
