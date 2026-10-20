import { validateMailRecipients } from '../../../shared/siteSettings.js';
import { createApiHandler } from '../middleware/createApiHandler.js';
import { requireAdminSession } from '../middleware/requireAdminSession.js';
import { validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { DomainError } from '../types/errors.js';
import { mailSettingKeyParamSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

/** All routes live inside the single /api/v1 function; no new Vercel functions. */

export const adminMailSettingsHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  requireAdminSession(req);
  const { items, storeAvailable } = await getServices().settingsService.listMailSettingsForAdmin();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ items, storeAvailable });
});

export const adminMailSettingByKeyHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    methodNotAllowed(res, ['PUT', 'DELETE']);
    return;
  }
  const { email } = requireAdminSession(req);
  const { key } = validateParams(mailSettingKeyParamSchema, req);
  const service = getServices().settingsService;

  if (req.method === 'DELETE') {
    await service.resetMailRecipients(key);
    res.status(200).json({ ok: true, key });
    return;
  }

  // The service validates the body (422 with a Spanish reason on failure).
  const item = await service.saveMailRecipients(key, req.body, email);
  res.status(200).json({ item });
});

export const adminMailSettingTestHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  requireAdminSession(req);
  const { key } = validateParams(mailSettingKeyParamSchema, req);

  const check = validateMailRecipients(req.body);
  if (!check.ok || !check.value) {
    throw new DomainError(check.reason ?? 'Invalid recipients', 422, 'INVALID_SETTING');
  }

  const { settingsService, testMailer } = getServices();
  await settingsService.claimTestSendSlot(key);
  try {
    await testMailer.sendTestEmail(key, check.value);
  } catch (error) {
    await settingsService.releaseTestSendSlot(key);
    throw error;
  }
  res.status(200).json({ ok: true, key, sentTo: check.value });
});
