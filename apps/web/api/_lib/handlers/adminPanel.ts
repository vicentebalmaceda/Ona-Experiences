import { createApiHandler } from '../middleware/createApiHandler.js';
import { requireAdminSession } from '../middleware/requireAdminSession.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import {
  adminDocumentIdParamSchema,
  adminInviteNoteSchema,
  hideReviewSchema,
  reviewIdParamSchema
} from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

function optionalInviteNote(req: { body?: unknown }): string | undefined {
  const parsed = adminInviteNoteSchema.parse(req.body ?? {});
  return parsed.adminNote;
}

export const adminQuotesHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  requireAdminSession(req);
  const quotes = await getServices().adminService.listQuotes();
  res.status(200).json({ items: quotes });
});

export const adminQuoteSendInviteHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  requireAdminSession(req);
  const { bsaleDocumentId } = validateParams(adminDocumentIdParamSchema, req);
  const result = await getServices().adminService.sendInvite(
    bsaleDocumentId,
    optionalInviteNote(req)
  );
  res.status(201).json(result);
});

export const adminQuoteResendInviteHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  requireAdminSession(req);
  const { bsaleDocumentId } = validateParams(adminDocumentIdParamSchema, req);
  const result = await getServices().adminService.resendInvite(
    bsaleDocumentId,
    optionalInviteNote(req)
  );
  res.status(201).json(result);
});

export const adminReviewInvitesHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  requireAdminSession(req);
  const invites = await getServices().adminService.listInvites();
  res.status(200).json({ items: invites });
});

export const adminReviewsHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  requireAdminSession(req);
  const reviews = await getServices().adminService.listReviews();
  res.status(200).json({ items: reviews });
});

export const adminProductSyncHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  requireAdminSession(req);
  const result = await getServices().productSyncService.syncFromBsale();
  res.status(200).json(result);
});

export const adminReviewByIdHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'PATCH') {
    methodNotAllowed(res, ['PATCH']);
    return;
  }
  requireAdminSession(req);
  const { reviewId } = validateParams(reviewIdParamSchema, req);
  const { hidden } = validateBody(hideReviewSchema, req);
  await getServices().adminService.setReviewHidden(reviewId, hidden);
  res.status(200).json({ ok: true, reviewId, hidden });
});
