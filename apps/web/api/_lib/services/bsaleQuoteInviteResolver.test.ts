import { describe, expect, it, vi } from 'vitest';
import { getEnv } from '../config/env.js';
import type { BsaleClientRepository } from '../lib/bsale/clients.js';
import type { BsaleSalesRepository } from '../lib/bsale/documents.js';
import type { BsaleClient } from '../lib/bsale/client.js';
import type { BsaleProductTypeResolver } from '../lib/bsale/products.js';
import { BsaleQuoteInviteResolver } from './bsaleQuoteInviteResolver.js';

const env = getEnv();

function createResolver(overrides?: {
  getDocument?: ReturnType<typeof vi.fn>;
  getDocumentDetails?: ReturnType<typeof vi.fn>;
  getById?: ReturnType<typeof vi.fn>;
  httpGet?: ReturnType<typeof vi.fn>;
  resolveCatalogType?: ReturnType<typeof vi.fn>;
}) {
  const sales = {
    getDocument: overrides?.getDocument ?? vi.fn(),
    getDocumentDetails: overrides?.getDocumentDetails ?? vi.fn()
  } as unknown as BsaleSalesRepository;
  const clients = {
    getById: overrides?.getById ?? vi.fn()
  } as unknown as BsaleClientRepository;
  const bsale = {
    get: overrides?.httpGet ?? vi.fn()
  } as unknown as BsaleClient;
  const productTypes = {
    resolveCatalogType: overrides?.resolveCatalogType ?? vi.fn().mockResolvedValue('lodge')
  } as unknown as BsaleProductTypeResolver;

  return {
    resolver: new BsaleQuoteInviteResolver({
      sales,
      clients,
      bsale,
      productTypes,
      env
    }),
    sales,
    clients,
    bsale,
    productTypes
  };
}

describe('BsaleQuoteInviteResolver', () => {
  it('resolves Customer, Product, and Variant from a Quote', async () => {
    const getDocument = vi.fn().mockResolvedValue({
      id: 6634,
      documentTypeId: env.BSALE_QUOTE_DOCUMENT_TYPE_ID,
      client: { href: '/clients/9.json', id: 9 }
    });
    const getDocumentDetails = vi.fn().mockResolvedValue({
      count: 1,
      limit: 25,
      offset: 0,
      items: [
        {
          id: 27079,
          product: { id: 2018, name: 'Epu Lodge' },
          variant: { id: 7917, code: '78628839550359' }
        }
      ]
    });
    const getById = vi.fn().mockResolvedValue({
      id: 9,
      firstName: 'María',
      lastName: 'González',
      email: 'maria@example.com',
      code: 'maria@example.com'
    });
    const httpGet = vi.fn().mockResolvedValue({
      id: 2018,
      name: 'Epu Lodge',
      description: null,
      classification: 1,
      state: 0,
      product_type: { id: 1 }
    });

    const { resolver } = createResolver({
      getDocument,
      getDocumentDetails,
      getById,
      httpGet
    });

    await expect(resolver.resolve(6634)).resolves.toEqual({
      customer: { email: 'maria@example.com', firstName: 'María', lastName: 'González' },
      catalogType: 'lodge',
      bsaleProductId: 2018,
      productName: 'Epu Lodge',
      productActive: true,
      bsaleVariantId: 7917
    });
  });

  it('rejects non-quote documents and multi-line Quotes', async () => {
    const { resolver: nonQuote } = createResolver({
      getDocument: vi.fn().mockResolvedValue({
        id: 1,
        documentTypeId: 99,
        client: { id: 1, firstName: 'A', lastName: 'B', email: 'a@b.com', code: 'x' }
      })
    });
    await expect(nonQuote.resolve(1)).rejects.toMatchObject({ code: 'NOT_A_QUOTE' });

    const { resolver: multi } = createResolver({
      getDocument: vi.fn().mockResolvedValue({
        id: 2,
        documentTypeId: env.BSALE_QUOTE_DOCUMENT_TYPE_ID,
        client: { id: 1, firstName: 'A', lastName: 'B', email: 'a@b.com', code: 'x' }
      }),
      getDocumentDetails: vi.fn().mockResolvedValue({
        count: 2,
        items: [{ product: { id: 1 }, variant: { id: 1 } }, { product: { id: 2 }, variant: { id: 2 } }]
      })
    });
    await expect(multi.resolve(2)).rejects.toMatchObject({ code: 'QUOTE_LINE_COUNT' });
  });

  it('rejects a Quote Customer without email', async () => {
    const { resolver } = createResolver({
      getDocument: vi.fn().mockResolvedValue({
        id: 3,
        documentTypeId: env.BSALE_QUOTE_DOCUMENT_TYPE_ID,
        client: { id: 1, firstName: 'A', lastName: 'B', email: '', code: 'x' }
      }),
      getDocumentDetails: vi.fn().mockResolvedValue({
        count: 1,
        items: [{ product: { id: 2018, name: 'Epu' }, variant: { id: 7917 } }]
      }),
      httpGet: vi.fn().mockResolvedValue({
        id: 2018,
        name: 'Epu',
        description: null,
        classification: 1,
        state: 0
      })
    });

    await expect(resolver.resolve(3)).rejects.toMatchObject({ code: 'CUSTOMER_EMAIL_MISSING' });
  });
});
