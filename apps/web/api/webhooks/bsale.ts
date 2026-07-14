import { getEnv } from '../_lib/config/env.js';
import { createApiHandler } from '../_lib/middleware/createApiHandler.js';
import { validateBody } from '../_lib/middleware/validate.js';
import { bsaleWebhookEventSchema, WebhookService } from '../_lib/services/webhookService.js';
import { methodNotAllowed } from '../_lib/utils/http.js';

let webhookService: WebhookService | undefined;

export default createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  // BSale does not sign webhooks; a shared secret (query param or header)
  // gates the endpoint when configured.
  const secret = getEnv().BSALE_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.query.secret ?? req.headers['x-webhook-secret'];
    if (provided !== secret) {
      res.status(401).json({ error: 'Invalid webhook secret' });
      return;
    }
  }

  const event = validateBody(bsaleWebhookEventSchema, req);

  webhookService ??= new WebhookService();
  const result = await webhookService.dispatch(event);

  res.status(200).json({ received: true, topic: event.topic, handled: result.handled });
});
