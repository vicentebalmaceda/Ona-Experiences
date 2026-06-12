import { env } from './config/env.js';
import { CreateQuoteSale } from './application/use-cases/CreateQuoteSale.js';
import { GetCatalogVariant } from './application/use-cases/GetCatalogVariant.js';
import { ListCatalogVariants } from './application/use-cases/ListCatalogVariants.js';
import { BsaleHttpClient } from './infrastructure/bsale/BsaleHttpClient.js';
import { BsaleCatalogRepository } from './infrastructure/bsale/BsaleCatalogRepository.js';
import { BsaleClientRepository } from './infrastructure/bsale/BsaleClientRepository.js';
import { BsaleProductTypeResolver } from './infrastructure/bsale/BsaleProductTypeResolver.js';
import { BsaleSalesRepository } from './infrastructure/bsale/BsaleSalesRepository.js';
import { BsaleVariantPricing } from './infrastructure/bsale/BsaleVariantPricing.js';
import { SeedServiceEnricher } from './infrastructure/enrichers/SeedServiceEnricher.js';
import { CatalogController } from './interfaces/http/controllers/CatalogController.js';
import { SalesController } from './interfaces/http/controllers/SalesController.js';

function createBsaleCatalogStack() {
  const client = new BsaleHttpClient(env);
  const productTypeResolver = new BsaleProductTypeResolver(client, env);
  const catalogRepository = new BsaleCatalogRepository(client, productTypeResolver);
  return { client, catalogRepository };
}

export function createCatalogController(): CatalogController {
  const { catalogRepository } = createBsaleCatalogStack();
  const enrichers = [new SeedServiceEnricher()];
  const listCatalogVariants = new ListCatalogVariants(catalogRepository, enrichers);
  const getCatalogVariant = new GetCatalogVariant(catalogRepository, enrichers);
  return new CatalogController(listCatalogVariants, getCatalogVariant);
}

export function createSalesController(): SalesController {
  const { client, catalogRepository } = createBsaleCatalogStack();
  const clientRepository = new BsaleClientRepository(client);
  const variantPricing = new BsaleVariantPricing(client, env);
  const salesRepository = new BsaleSalesRepository(client, env);
  const createQuoteSale = new CreateQuoteSale(
    catalogRepository,
    clientRepository,
    variantPricing,
    salesRepository
  );
  return new SalesController(createQuoteSale);
}
