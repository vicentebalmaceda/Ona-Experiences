import { createApiHandler } from '../_lib/middleware/createApiHandler.js';
import { validateBody } from '../_lib/middleware/validate.js';
import { bsaleWebhookEventSchema, WebhookService } from '../_lib/services/webhookService.js';
import { methodNotAllowed } from '../_lib/utils/http.js';
import { triggerCoalescedRebuild } from '../_lib/utils/deployHook.js';

/**
 * Topics whose changes show up in the prerendered HTML (names, descriptions,
 * photos, zones), so the static site is rebuilt after them. BSale only sends
 * the topics this account subscribed to in its webhook settings, so a topic
 * missing there never reaches us (see docs.bsale.dev/webhooks).
 */
export const REBUILD_TOPICS = new Set(['product', 'product_type', 'variant', 'price', 'price_list']);

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

  const topic = event.topic.toLowerCase();
  if (result.handled && REBUILD_TOPICS.has(topic)) {
    // Awaited (the function may freeze once it answers) but never throws.
    // Bursts (a bulk edit in BSale) coalesce into one rebuild.
    await triggerCoalescedRebuild(`bsale webhook: ${topic} ${event.action}`);
  }

  res.status(200).json({
    received: true,
    topic: event.topic,
    handled: result.handled,
    detail: result.detail
  });
});
