import { createApiHandler } from '../_lib/middleware/createApiHandler.js';
import { validateBody } from '../_lib/middleware/validate.js';
import { getServices } from '../_lib/services/container.js';
import { contactRequestSchema } from '../_lib/types/schemas.js';
import { methodNotAllowed } from '../_lib/utils/http.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = validateBody(contactRequestSchema, req);
  await getServices().mailer.sendContactMessage(body);
  res.status(200).json({ ok: true });
});
