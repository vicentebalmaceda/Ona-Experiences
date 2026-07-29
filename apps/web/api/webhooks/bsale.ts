import { createApiHandler } from '../_lib/middleware/createApiHandler.js';
import { validateBody } from '../_lib/middleware/validate.js';
import { bsaleWebhookEventSchema, WebhookService } from '../_lib/services/webhookService.js';
import { methodNotAllowed } from '../_lib/utils/http.js';

let webhookService: WebhookService | undefined;

/**
 * Open inbound webhook for BSale notifications. BSale does not sign webhooks;
 * auth is intentionally omitted for now.
 *
 * Example body:
 * {
 *   "cpnId": 2,
 *   "resource": "/documents/14417.json",
 *   "resourceId": "14417",
 *   "topic": "document",
 *   "action": "post",
 *   "officeId": "2"
 * }
 */
export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const event = validateBody(bsaleWebhookEventSchema, req);

  webhookService ??= new WebhookService();
  const result = await webhookService.dispatch(event);

  res.status(200).json({
    received: true,
    topic: event.topic,
    handled: result.handled,
    detail: result.detail
  });
});
