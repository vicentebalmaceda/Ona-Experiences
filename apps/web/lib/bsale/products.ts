import { getCache, withCache } from '../../cache/cache';
import { cacheKeys, CACHE_TTL_SECONDS } from '../../cache/keys';
import type { Env } from '../../config/env';
import type {
  CatalogType,
  CatalogVariant,
  ListVariantsParams,
  ListVariantsResult,
  ServiceType
} from '../../types/catalog';
import type {
  BsaleListResponse,
  BsaleProduct,
  BsaleProductType,
  BsaleVariant
} from '../../types/bsale';
import { DomainError } from '../../types/errors';
import { createLogger } from '../../utils/logger';
import { BsaleApiError } from '../../types/errors';
import type { BsaleClient } from './client';

const log = createLogger('bsale-catalog');

const SERVICE_CLASSIFICATION = 1;

function resolveProductTypeId(product: BsaleProduct): number | null {
  const relation = product.product_type ?? product.productType;
  if (!relation) return null;

  if (relation.id != null) {
    const parsed = Number(relation.id);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (relation.href) {
    const match = relation.href.match(/\/product_types\/(\d+)\.json/);
    if (match) return Number(match[1]);
  }

  return null;
}

export class BsaleProductTypeResolver {
  constructor(
    private readonly client: BsaleClient,
    private readonly env: Env
  ) {}

  async resolveIdByName(name: string): Promise<number> {
    return withCache(getCache(), cacheKeys.productType(name), CACHE_TTL_SECONDS.productType, () =>
      this.fetchIdByName(name)
    );
  }

  private async fetchIdByName(name: string): Promise<number> {
    const response = await this.client.get<BsaleListResponse<BsaleProductType>>(
      '/product_types.json',
      { name, state: 0 }
    );

    const matches = response.items.filter((item) => item.state === 0);
    if (matches.length === 0) {
      throw new DomainError(`Product type not found: ${name}`, 404, 'PRODUCT_TYPE_NOT_FOUND');
    }

    if (matches.length > 1) {
      log.warn('Multiple product types matched name; using first active match', {
        name,
        matchCount: matches.length,
        ids: matches.map((item) => item.id)
      });
    }

    log.debug('Product type resolved', { name, id: matches[0].id });
    return matches[0].id;
  }

  getProductTypeName(type: CatalogType): string {
    return type === 'lodge'
      ? this.env.BSALE_LODGE_PRODUCT_TYPE_NAME
      : this.env.BSALE_GUIDE_PRODUCT_TYPE_NAME;
  }
}

export class BsaleCatalogRepository {
  constructor(
    private readonly client: BsaleClient,
    private readonly productTypeResolver: BsaleProductTypeResolver
  ) {}

  async listVariants(params: ListVariantsParams): Promise<ListVariantsResult> {
    const typeName = this.productTypeResolver.getProductTypeName(params.type);

    log.debug('Listing catalog by product type', {
      type: params.type,
      productTypeName: typeName,
      limit: params.limit,
      offset: params.offset
    });

    const productTypeId = await this.productTypeResolver.resolveIdByName(typeName);

    const productsPage = await this.client.get<BsaleListResponse<BsaleProduct>>(
      `/product_types/${productTypeId}/products.json`,
      {
        limit: params.limit,
        offset: params.offset,
        state: 0
      }
    );

    const serviceProducts = productsPage.items.filter(
      (product) => product.classification === SERVICE_CLASSIFICATION && product.state === 0
    );

    log.debug('Products page loaded', {
      bsaleReturned: productsPage.items.length,
      serviceProducts: serviceProducts.length
    });

    const variantResults = await Promise.all(
      serviceProducts.map((product) => this.loadProductWithVariant(product, params.type))
    );

    const items = variantResults.filter((item): item is CatalogVariant => item !== null);

    log.info('Catalog variants listed', {
      type: params.type,
      productTypeId,
      returned: items.length,
      skipped: serviceProducts.length - items.length
    });

    return {
      items,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        count: productsPage.count
      }
    };
  }

  async getVariantByProductId(productId: number, type: ServiceType): Promise<CatalogVariant> {
    if (type !== 'lodge' && type !== 'guide') {
      throw new DomainError('Invalid service type', 400, 'INVALID_SERVICE_TYPE');
    }

    const typeName = this.productTypeResolver.getProductTypeName(type);
    const expectedProductTypeId = await this.productTypeResolver.resolveIdByName(typeName);
    const notFoundCode = type === 'lodge' ? 'LODGE_NOT_FOUND' : 'GUIDE_NOT_FOUND';
    const notFoundMessage = type === 'lodge' ? 'Lodge not found' : 'Guide not found';

    log.debug('Fetching catalog variant by product id', {
      productId,
      type,
      productTypeName: typeName
    });

    let product: BsaleProduct;
    try {
      product = await this.client.get<BsaleProduct>(`/products/${productId}.json`);
    } catch (error) {
      if (error instanceof BsaleApiError && error.statusCode === 404) {
        throw new DomainError(notFoundMessage, 404, notFoundCode);
      }
      throw error;
    }

    const productTypeId = resolveProductTypeId(product);
    if (productTypeId !== expectedProductTypeId) {
      log.debug('Product type mismatch', {
        productId,
        productTypeId,
        expectedProductTypeId
      });
      throw new DomainError(notFoundMessage, 404, notFoundCode);
    }

    if (product.classification !== SERVICE_CLASSIFICATION || product.state !== 0) {
      throw new DomainError(notFoundMessage, 404, notFoundCode);
    }

    const variant = await this.loadProductWithVariant(product, type);
    if (!variant) {
      throw new DomainError(notFoundMessage, 404, notFoundCode);
    }

    log.info('Catalog variant fetched by product id', { productId, type, variantId: variant.id });
    return variant;
  }

  private async loadProductWithVariant(
    product: BsaleProduct,
    serviceType: ServiceType
  ): Promise<CatalogVariant | null> {
    const response = await this.client.get<BsaleListResponse<BsaleVariant>>(
      `/products/${product.id}/variants.json`,
      { limit: 1, state: 0 }
    );

    const variant = response.items[0];
    if (!variant) {
      log.warn('Product has no active variant; skipping', {
        productId: product.id,
        productName: product.name
      });
      return null;
    }

    log.debug('Variant loaded for product', { productId: product.id, variantId: variant.id });

    return {
      id: variant.id,
      code: variant.code ?? '',
      description: variant.description ?? product.name,
      serviceType,
      productId: product.id,
      productName: product.name,
      state: variant.state
    };
  }
}
