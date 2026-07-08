import { createApiHandler } from '../middleware/createApiHandler';
import { methodNotAllowed } from '../utils/http';

export default createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }
  res.status(200).json({ status: 'ok' });
});
