import { z } from 'zod';
import { getCache, type Cache } from '../cache/cache';
import { CACHE_PREFIX } from '../cache/keys';
import { createLogger } from '../utils/logger';

const log = createLogger('webhook');

/**
 * BSale webhook payload (see https://docs.bsale.dev/webhooks): a small
 * notification with resource pointers; the full object must be re-fetched
 * from the API if needed. We keep processing light: cache invalidation only.
 */
export const bsaleWebhookEventSchema = z
  .object({
    topic: z.string().min(1),
    action: z.string().min(1),
    resource: z.string().optional(),
    resourceId: z.union([z.string(), z.number()]).optional(),
    cpnId: z.union([z.string(), z.number()]).optional(),
    officeId: z.union([z.string(), z.number()]).optional()
  })
  .passthrough();

export type BsaleWebhookEvent = z.infer<typeof bsaleWebhookEventSchema>;

export interface WebhookResult {
  handled: boolean;
  detail?: string;
}

type WebhookHandler = (event: BsaleWebhookEvent, cache: Cache) => Promise<WebhookResult>;

async function invalidateCatalog(cache: Cache): Promise<WebhookResult> {
  await cache.deleteByPrefix(CACHE_PREFIX.catalog);
  return { handled: true, detail: 'catalog cache invalidated' };
}

async function invalidateCatalogAndPricing(cache: Cache): Promise<WebhookResult> {
  await cache.deleteByPrefix(CACHE_PREFIX.catalog);
  await cache.deleteByPrefix(CACHE_PREFIX.pricing);
  return { handled: true, detail: 'catalog and pricing caches invalidated' };
}

async function logOnly(): Promise<WebhookResult> {
  return { handled: true, detail: 'logged' };
}

/** Add new topics here as BSale webhook coverage grows. */
const handlers: Record<string, WebhookHandler> = {
  product: (_event, cache) => invalidateCatalog(cache),
  product_type: (_event, cache) => invalidateCatalog(cache),
  variant: (_event, cache) => invalidateCatalogAndPricing(cache),
  price: (_event, cache) => invalidateCatalogAndPricing(cache),
  price_list: (_event, cache) => invalidateCatalogAndPricing(cache),
  document: () => logOnly(),
  client: () => logOnly(),
  stock: () => logOnly()
};

export class WebhookService {
  constructor(private readonly cache: Cache = getCache()) {}

  async dispatch(event: BsaleWebhookEvent): Promise<WebhookResult> {
    log.info('BSale webhook received', {
      topic: event.topic,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId
    });

    const handler = handlers[event.topic];
    if (!handler) {
      log.warn('No handler for webhook topic; ignoring', { topic: event.topic });
      return { handled: false, detail: `unhandled topic: ${event.topic}` };
    }

    const result = await handler(event, this.cache);
    log.info('BSale webhook processed', { topic: event.topic, ...result });
    return result;
  }
}
