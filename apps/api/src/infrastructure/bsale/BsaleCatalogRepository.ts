import type {
  CatalogVariant,
  ListVariantsParams,
  ListVariantsResult,
  ServiceType
} from '../../domain/entities/CatalogVariant.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { CatalogRepository } from '../../domain/ports/CatalogRepository.js';
import { createLogger } from '../../shared/logger.js';
import { BsaleApiError } from './BsaleApiError.js';
import { BsaleHttpClient, type BsaleListResponse } from './BsaleHttpClient.js';
import type { BsaleProductTypeResolver } from './BsaleProductTypeResolver.js';
import type { BsaleProduct, BsaleVariant } from './types.js';

const log = createLogger('catalog');

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

export class BsaleCatalogRepository implements CatalogRepository {
  constructor(
    private readonly client: BsaleHttpClient,
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
      log.warn('Product has no active variant; skipping', { productId: product.id, productName: product.name });
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
