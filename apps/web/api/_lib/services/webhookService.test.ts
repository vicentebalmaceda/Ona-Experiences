import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cache } from '../cache/cache.js';
import type { BsaleDocument } from '../types/bsale.js';
import { DomainError } from '../types/errors.js';
import {
  mapDocumentToQuoteNotification,
  WebhookService
} from './webhookService.js';

function createMemoryCache(): Cache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value as never;
    },
    async set(key, value, ttlSeconds) {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async delete(key) {
      store.delete(key);
    },
    async deleteByPrefix(prefix) {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
      }
    }
  };
}

const quoteNote = `\nCotización para Alto Bío Bío (Bío-Bío Lodge)\n Reserva: 2026-07-29 al 2026-08-04.\n Detalles:muchisima gente`;

const quoteDoc: BsaleDocument = {
  id: 6599,
  number: 1,
  totalAmount: 0,
  netAmount: 0,
  taxAmount: 0,
  document_type: { id: '37' },
  salesId: 'ONA-LODGE-500c88be-c5f1-4deb-b779-77d86e78d263',
  emissionDate: 1785283200,
  urlPdf: 'https://app2.bsale.cl/view/24214/fc6003c9d48c.pdf?sfd=99',
  urlPublicView: 'https://app2.bsale.cl/view/24214/fc6003c9d48c?sfd=99',
  client: {
    href: 'https://api.bsale.io/v1/clients/2343.json',
    id: '2343'
  },
  details: {
    href: 'https://api.bsale.io/v1/documents/6599/details.json',
    count: 1,
    items: [
      {
        id: 26959,
        quantity: 1,
        netUnitValue: 0,
        totalAmount: 0,
        note: quoteNote,
        variant: {
          id: 1551,
          description: '',
          code: '1553868309125'
        }
      }
    ]
  }
};

const sampleEvent = {
  cpnId: 2,
  resource: '/documents/6599.json',
  resourceId: '6599',
  topic: 'document',
  action: 'post',
  officeId: '2'
};

describe('mapDocumentToQuoteNotification', () => {
  it('maps detail note and derives description from it', () => {
    const mapped = mapDocumentToQuoteNotification(quoteDoc);
    expect(mapped.documentId).toBe(6599);
    expect(mapped.items?.[0]?.note).toContain('Alto Bío Bío');
    expect(mapped.items?.[0]?.note).toContain('Reserva: 2026-07-29 al 2026-08-04');
    expect(mapped.items?.[0]?.description).toBe('Alto Bío Bío (Bío-Bío Lodge)');
    expect(mapped.customer?.id).toBe('2343');
  });
});

describe('WebhookService document handling', () => {
  let cache: Cache;
  let mailer: {
    sendQuoteNotification: ReturnType<typeof vi.fn>;
    sendContactMessage: ReturnType<typeof vi.fn>;
  };
  let salesRepository: {
    getDocumentByResource: ReturnType<typeof vi.fn>;
  };
  let clientRepository: {
    getById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cache = createMemoryCache();
    mailer = {
      sendQuoteNotification: vi.fn().mockResolvedValue(undefined),
      sendContactMessage: vi.fn().mockResolvedValue(undefined)
    };
    salesRepository = {
      getDocumentByResource: vi.fn().mockResolvedValue({
        ...quoteDoc,
        documentTypeId: 37
      })
    };
    clientRepository = {
      getById: vi.fn().mockResolvedValue({
        id: 2343,
        firstName: 'Juan',
        lastName: 'Soto',
        code: '1-9',
        email: 'juan@example.com',
        phone: '+56911111111'
      })
    };
  });

  function service(quoteDocumentTypeId = 37) {
    return new WebhookService({
      cache,
      mailer: mailer as never,
      salesRepository: salesRepository as never,
      clientRepository: clientRepository as never,
      quoteDocumentTypeId
    });
  }

  it('fetches via resource, enriches client, and includes note in email payload', async () => {
    const result = await service().dispatch(sampleEvent);

    expect(result).toEqual({ handled: true, detail: 'quote notification sent' });
    expect(salesRepository.getDocumentByResource).toHaveBeenCalledWith('/documents/6599.json');
    expect(clientRepository.getById).toHaveBeenCalledWith('2343');
    expect(mailer.sendQuoteNotification).toHaveBeenCalledTimes(1);

    const payload = mailer.sendQuoteNotification.mock.calls[0][0];
    expect(payload.items[0].note).toContain('Detalles:muchisima gente');
    expect(payload.items[0].description).toBe('Alto Bío Bío (Bío-Bío Lodge)');
    expect(payload.customer.email).toBe('juan@example.com');
  });

  it('skips non-quote document types', async () => {
    salesRepository.getDocumentByResource.mockResolvedValue({
      ...quoteDoc,
      document_type: { id: '99' }
    });

    const result = await service().dispatch(sampleEvent);

    expect(result.detail).toContain('skipped non-quote');
    expect(mailer.sendQuoteNotification).not.toHaveBeenCalled();
  });

  it('skips non-POST actions without fetching', async () => {
    const result = await service().dispatch({
      ...sampleEvent,
      action: 'PUT'
    });

    expect(result.detail).toContain('skipped document action');
    expect(salesRepository.getDocumentByResource).not.toHaveBeenCalled();
  });

  it('is idempotent for duplicate document events', async () => {
    const svc = service();
    await svc.dispatch(sampleEvent);
    const second = await svc.dispatch(sampleEvent);

    expect(second.detail).toBe('quote notification already sent');
    expect(mailer.sendQuoteNotification).toHaveBeenCalledTimes(1);
  });

  it('propagates mailer failures', async () => {
    mailer.sendQuoteNotification.mockRejectedValue(
      new DomainError('Failed to send quote notification', 500, 'MAILER_ERROR')
    );

    await expect(service().dispatch(sampleEvent)).rejects.toMatchObject({
      code: 'MAILER_ERROR'
    });
  });
});
