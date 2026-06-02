import { env } from './config/env.js';
import { ListCatalogVariants } from './application/use-cases/ListCatalogVariants.js';
import { BsaleHttpClient } from './infrastructure/bsale/BsaleHttpClient.js';
import { BsaleCatalogRepository } from './infrastructure/bsale/BsaleCatalogRepository.js';
import { BsaleProductTypeResolver } from './infrastructure/bsale/BsaleProductTypeResolver.js';
import { NoOpServiceEnricher } from './infrastructure/enrichers/NoOpServiceEnricher.js';
import { CatalogController } from './interfaces/http/controllers/CatalogController.js';

export function createCatalogController(): CatalogController {
  const bsaleClient = new BsaleHttpClient(env);
  const productTypeResolver = new BsaleProductTypeResolver(bsaleClient, env);
  const catalogRepository = new BsaleCatalogRepository(bsaleClient, productTypeResolver);
  const enrichers = [new NoOpServiceEnricher()];
  const listCatalogVariants = new ListCatalogVariants(catalogRepository, enrichers);
  return new CatalogController(listCatalogVariants);
}
