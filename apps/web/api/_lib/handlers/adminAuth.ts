import { createApiHandler } from '../middleware/createApiHandler.js';
import {
  clearAdminSessionCookie,
  requireAdminSession,
  setAdminSessionCookie,
  tryAdminLogin,
  adminAuthConfigFromEnv
} from '../middleware/requireAdminSession.js';
import { validateBody } from '../middleware/validate.js';
import { adminLoginSchema } from '../types/schemas.js';
import { DomainError } from '../types/errors.js';
import { methodNotAllowed } from '../utils/http.js';

export const adminLoginHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = validateBody(adminLoginSchema, req);
  const session = tryAdminLogin(body.email, body.password);
  if (!session) {
    throw new DomainError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const { secureCookies } = adminAuthConfigFromEnv();
  setAdminSessionCookie(res, session.token, session.expiresAt, secureCookies);
  res.status(200).json({ email: session.email, expiresAt: session.expiresAt.toISOString() });
});

export const adminLogoutHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const { secureCookies } = adminAuthConfigFromEnv();
  clearAdminSessionCookie(res, secureCookies);
  res.status(200).json({ ok: true });
});

export const adminMeHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const session = requireAdminSession(req);
  res.status(200).json({ email: session.email });
});
