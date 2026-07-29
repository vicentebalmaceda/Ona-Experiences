import { z } from 'zod';
import { getCache, type Cache } from '../cache/cache.js';
import { CACHE_PREFIX, CACHE_TTL_SECONDS, cacheKeys } from '../cache/keys.js';
import { getEnv } from '../config/env.js';
import type { BsaleClientRepository } from '../lib/bsale/clients.js';
import type { BsaleSalesRepository } from '../lib/bsale/documents.js';
import type { Mailer, QuoteCustomer, QuoteLineItem, QuoteNotification } from '../mailer/types.js';
import type { BsaleClient, BsaleDocument, BsaleDocumentDetail } from '../types/bsale.js';
import { DomainError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';
import { getServices } from './container.js';

const log = createLogger('webhook');

/**
 * BSale webhook payload (see https://docs.bsale.dev/webhooks).
 * Example document create:
 * {
 *   "cpnId": 2,
 *   "resource": "/documents/14417.json",
 *   "resourceId": "14417",
 *   "topic": "document",
 *   "action": "post",
 *   "officeId": "2"
 * }
 * `cpnId` identifies the shop instance and is ignored for processing.
 * Document type and quote fields come from a follow-up GET on `resource`.
 */
export const bsaleWebhookEventSchema = z
  .object({
    topic: z.string().min(1),
    action: z.string().min(1),
    resource: z.string().min(1).optional(),
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

function resolveDocumentTypeId(document: BsaleDocument): number | undefined {
  const raw = document.documentTypeId ?? document.document_type?.id;
  if (raw == null) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractDetails(document: BsaleDocument): BsaleDocumentDetail[] {
  const details = document.details;
  if (!details) return [];
  if (Array.isArray(details)) return details;
  if (Array.isArray(details.items)) return details.items;
  return [];
}

function isExpandedClient(client: BsaleDocument['client']): client is BsaleClient {
  return Boolean(client && 'firstName' in client);
}

function lineNote(detail: BsaleDocumentDetail): string | undefined {
  const raw = detail.note ?? detail.comment;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

/** Prefer variant description; otherwise derive a label from the line note. */
function lineDescription(detail: BsaleDocumentDetail, note?: string): string | undefined {
  const variantDescription = detail.variant?.description?.trim();
  if (variantDescription) return variantDescription;

  if (note) {
    const firstLine = note
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);
    if (firstLine) {
      const match = firstLine.match(/^Cotización para\s+(.+)$/i);
      return match?.[1]?.trim() || firstLine;
    }
  }

  return detail.variant?.code?.trim() || undefined;
}

function toQuoteCustomer(client: BsaleClient): QuoteCustomer {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    code: client.code
  };
}

export function mapDocumentToQuoteNotification(
  document: BsaleDocument,
  customer?: QuoteCustomer
): QuoteNotification {
  const details = extractDetails(document);
  const items: QuoteLineItem[] = details.map((detail) => {
    const note = lineNote(detail);
    return {
      description: lineDescription(detail, note),
      quantity: detail.quantity,
      netUnitValue: detail.netUnitValue,
      totalAmount: detail.totalAmount,
      note
    };
  });

  const expanded = isExpandedClient(document.client) ? toQuoteCustomer(document.client) : undefined;
  const stubId = document.client && 'id' in document.client ? document.client.id : undefined;

  return {
    documentId: document.id,
    documentNumber: document.number,
    salesId: document.salesId,
    emissionDate: document.emissionDate,
    totalAmount: document.totalAmount,
    netAmount: document.netAmount,
    taxAmount: document.taxAmount,
    urlPdf: document.urlPdf ?? null,
    urlPublicView: document.urlPublicView ?? null,
    customer: customer ?? expanded ?? (stubId != null ? { id: stubId } : undefined),
    items
  };
}

export interface WebhookServiceDeps {
  cache?: Cache;
  mailer?: Mailer;
  salesRepository?: BsaleSalesRepository;
  clientRepository?: BsaleClientRepository;
  quoteDocumentTypeId?: number;
}

export class WebhookService {
  private readonly cache: Cache;
  private readonly mailer: Mailer;
  private readonly salesRepository: BsaleSalesRepository;
  private readonly clientRepository: BsaleClientRepository;
  private readonly quoteDocumentTypeId: number;

  constructor(deps: WebhookServiceDeps = {}) {
    this.cache = deps.cache ?? getCache();

    if (
      deps.mailer &&
      deps.salesRepository &&
      deps.clientRepository &&
      deps.quoteDocumentTypeId != null
    ) {
      this.mailer = deps.mailer;
      this.salesRepository = deps.salesRepository;
      this.clientRepository = deps.clientRepository;
      this.quoteDocumentTypeId = deps.quoteDocumentTypeId;
    } else {
      const services = getServices();
      this.mailer = deps.mailer ?? services.mailer;
      this.salesRepository = deps.salesRepository ?? services.salesRepository;
      this.clientRepository = deps.clientRepository ?? services.clientRepository;
      this.quoteDocumentTypeId =
        deps.quoteDocumentTypeId ?? getEnv().BSALE_QUOTE_DOCUMENT_TYPE_ID;
    }
  }

  private handlers(): Record<string, WebhookHandler> {
    return {
      product: (_event, cache) => invalidateCatalog(cache),
      product_type: (_event, cache) => invalidateCatalog(cache),
      variant: (_event, cache) => invalidateCatalogAndPricing(cache),
      price: (_event, cache) => invalidateCatalogAndPricing(cache),
      price_list: (_event, cache) => invalidateCatalogAndPricing(cache),
      document: (event, cache) => this.handleDocument(event, cache),
      client: () => logOnly(),
      stock: () => logOnly()
    };
  }

  async dispatch(event: BsaleWebhookEvent): Promise<WebhookResult> {
    const topic = event.topic.toLowerCase();
    const action = event.action.toLowerCase();
    const normalized = { ...event, topic, action };

    log.info('BSale webhook received', {
      topic: normalized.topic,
      action: normalized.action,
      resource: normalized.resource,
      resourceId: normalized.resourceId
    });

    const handler = this.handlers()[topic];
    if (!handler) {
      log.warn('No handler for webhook topic; ignoring', { topic });
      return { handled: false, detail: `unhandled topic: ${topic}` };
    }

    const result = await handler(normalized, this.cache);
    log.info('BSale webhook processed', { topic, ...result });
    return result;
  }

  private async resolveCustomer(document: BsaleDocument): Promise<QuoteCustomer | undefined> {
    if (isExpandedClient(document.client)) {
      return toQuoteCustomer(document.client);
    }

    const clientId = document.client && 'id' in document.client ? document.client.id : undefined;
    if (clientId == null || clientId === '') return undefined;

    try {
      const client = await this.clientRepository.getById(clientId);
      return toQuoteCustomer(client);
    } catch (error) {
      log.warn('Could not fetch BSale client for quote email', {
        clientId,
        message: error instanceof Error ? error.message : String(error)
      });
      return { id: clientId };
    }
  }

  private async handleDocument(
    event: BsaleWebhookEvent,
    cache: Cache
  ): Promise<WebhookResult> {
    if (event.action.toLowerCase() !== 'post') {
      return { handled: true, detail: `skipped document action: ${event.action}` };
    }

    const resourcePath = resolveDocumentResourcePath(event);
    if (!resourcePath) {
      throw new DomainError(
        'Missing resource (or resourceId) for document webhook',
        400,
        'INVALID_WEBHOOK'
      );
    }

    const documentId = event.resourceId ?? extractDocumentIdFromResource(resourcePath);
    const idempotencyKey = cacheKeys.quoteNotification(documentId ?? resourcePath);
    const alreadySent = await cache.get<{ sent: true }>(idempotencyKey);
    if (alreadySent) {
      return { handled: true, detail: 'quote notification already sent' };
    }

    // Fetch via webhook `resource` so we can read document type + quote fields.
    const document = await this.salesRepository.getDocumentByResource(resourcePath);
    const documentTypeId = resolveDocumentTypeId(document);

    if (documentTypeId !== this.quoteDocumentTypeId) {
      return {
        handled: true,
        detail: `skipped non-quote document type: ${documentTypeId ?? 'unknown'}`
      };
    }

    const customer = await this.resolveCustomer(document);
    const notification = mapDocumentToQuoteNotification(document, customer);
    await this.mailer.sendQuoteNotification(notification);
    await cache.set(idempotencyKey, { sent: true }, CACHE_TTL_SECONDS.quoteNotification);

    return { handled: true, detail: 'quote notification sent' };
  }
}

function resolveDocumentResourcePath(event: BsaleWebhookEvent): string | undefined {
  if (event.resource && event.resource.trim()) {
    const resource = event.resource.trim();
    return resource.startsWith('/') ? resource : `/${resource}`;
  }
  if (event.resourceId != null && event.resourceId !== '') {
    return `/documents/${event.resourceId}.json`;
  }
  return undefined;
}

function extractDocumentIdFromResource(resource: string): string | undefined {
  const match = resource.match(/\/documents\/([^/.]+)/i);
  return match?.[1];
}
