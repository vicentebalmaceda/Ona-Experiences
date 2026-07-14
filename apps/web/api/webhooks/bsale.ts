import { getEnv } from '../../config/env';
import { createApiHandler } from '../../middleware/createApiHandler';
import { validateBody } from '../../middleware/validate';
import { bsaleWebhookEventSchema, WebhookService } from '../../services/webhookService';
import { methodNotAllowed } from '../../utils/http';

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
