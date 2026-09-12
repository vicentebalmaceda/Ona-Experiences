import { createApiHandler } from '../middleware/createApiHandler.js';
import { validateBody } from '../middleware/validate.js';
import { getServices } from '../services/container.js';
import { contactRequestSchema } from '../types/schemas.js';
import { methodNotAllowed } from '../utils/http.js';

export const contactHandler = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = validateBody(contactRequestSchema, req);
  await getServices().mailer.sendContactMessage(body);
  res.status(200).json({ ok: true });
});
