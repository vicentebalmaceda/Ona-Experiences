import { getEnv } from '../config/env.js';
import { BsaleClient } from '../lib/bsale/client.js';
import { BsaleClientRepository } from '../lib/bsale/clients.js';
import { BsaleSalesRepository } from '../lib/bsale/documents.js';
import { BsaleMarketInfoRepository } from '../lib/bsale/marketInfo.js';
import { BsaleCatalogRepository, BsaleProductTypeResolver } from '../lib/bsale/products.js';
import { BsaleVariantPricing } from '../lib/bsale/pricing.js';
import { MarketInfoEnricher } from '../lib/enrichment/marketInfoEnricher.js';
import { SeedServiceEnricher } from '../lib/enrichment/seedEnricher.js';
import { CatalogService } from './catalogService.js';
import { SalesService } from './salesService.js';

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
  const marketInfoRepository = new BsaleMarketInfoRepository(client);
  // BSale market_info first (wins); seed fills remaining presentation gaps.
  const enrichers = [
    new MarketInfoEnricher(marketInfoRepository),
    new SeedServiceEnricher()
  ];

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
