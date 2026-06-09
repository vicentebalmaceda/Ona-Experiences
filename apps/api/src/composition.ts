import { env } from './config/env.js';
import { GetCatalogVariant } from './application/use-cases/GetCatalogVariant.js';
import { ListCatalogVariants } from './application/use-cases/ListCatalogVariants.js';
import { BsaleHttpClient } from './infrastructure/bsale/BsaleHttpClient.js';
import { BsaleCatalogRepository } from './infrastructure/bsale/BsaleCatalogRepository.js';
import { BsaleProductTypeResolver } from './infrastructure/bsale/BsaleProductTypeResolver.js';
import { SeedServiceEnricher } from './infrastructure/enrichers/SeedServiceEnricher.js';
import { CatalogController } from './interfaces/http/controllers/CatalogController.js';

export function createCatalogController(): CatalogController {
  const bsaleClient = new BsaleHttpClient(env);
  const productTypeResolver = new BsaleProductTypeResolver(bsaleClient, env);
  const catalogRepository = new BsaleCatalogRepository(bsaleClient, productTypeResolver);
  const enrichers = [new SeedServiceEnricher()];
  const listCatalogVariants = new ListCatalogVariants(catalogRepository, enrichers);
  const getCatalogVariant = new GetCatalogVariant(catalogRepository, enrichers);
  return new CatalogController(listCatalogVariants, getCatalogVariant);
}
