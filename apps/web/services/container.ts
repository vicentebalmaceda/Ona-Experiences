import { getEnv } from '../config/env';
import { BsaleClient } from '../lib/bsale/client';
import { BsaleClientRepository } from '../lib/bsale/clients';
import { BsaleSalesRepository } from '../lib/bsale/documents';
import { BsaleCatalogRepository, BsaleProductTypeResolver } from '../lib/bsale/products';
import { BsaleVariantPricing } from '../lib/bsale/pricing';
import { SeedServiceEnricher } from '../lib/enrichment/seedEnricher';
import { CatalogService } from './catalogService';
import { SalesService } from './salesService';

export interface Services {
  catalogService: CatalogService;
  salesService: SalesService;
}

let services: Services | undefined;

/**
 * Composition root. Unlike the old Express composition (which built two
 * independent BSale stacks), everything shares a single BsaleClient and
 * repository set, created lazily once per serverless instance.
 */
export function getServices(): Services {
  if (services) return services;

  const env = getEnv();
  const client = new BsaleClient(env);
  const productTypeResolver = new BsaleProductTypeResolver(client, env);
  const catalogRepository = new BsaleCatalogRepository(client, productTypeResolver);
  const enrichers = [new SeedServiceEnricher()];

  services = {
    catalogService: new CatalogService(catalogRepository, enrichers),
    salesService: new SalesService(
      catalogRepository,
      new BsaleClientRepository(client),
      new BsaleVariantPricing(client, env),
      new BsaleSalesRepository(client, env)
    )
  };

  return services;
}
