import { createApiHandler } from './_lib/middleware/createApiHandler.js';
import { methodNotAllowed } from './_lib/utils/http.js';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  res.status(200).json({ status: 'ok' });
});
