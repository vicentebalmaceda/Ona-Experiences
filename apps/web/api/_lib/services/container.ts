import { getEnv } from '../config/env.js';
import { getSql } from '../db/postgres.js';
import { BsaleClient } from '../lib/bsale/client.js';
import { BsaleClientRepository } from '../lib/bsale/clients.js';
import { BsaleSalesRepository } from '../lib/bsale/documents.js';
import { BsaleMarketInfoRepository } from '../lib/bsale/marketInfo.js';
import { BsaleCatalogRepository, BsaleProductTypeResolver } from '../lib/bsale/products.js';
import { BsaleVariantPricing } from '../lib/bsale/pricing.js';
import { PostgresQuoteStore } from '../lib/quotes/postgresQuoteStore.js';
import { PostgresReviewStore } from '../lib/reviews/postgresReviewStore.js';
import { MarketInfoEnricher } from '../lib/enrichment/marketInfoEnricher.js';
import { SeedServiceEnricher } from '../lib/enrichment/seedEnricher.js';
import { ResendMailer } from '../mailer/resendMailer.js';
import type { Mailer } from '../mailer/types.js';
import { BsaleQuoteCapture, type QuoteCapture } from './bsaleQuoteCapture.js';
import { BsaleQuoteInviteResolver } from './bsaleQuoteInviteResolver.js';
import { CatalogService } from './catalogService.js';
import { LocalFirstQuoteInviteResolver } from './localFirstQuoteInviteResolver.js';
import { ReviewService } from './reviewService.js';
import { SalesService } from './salesService.js';

export interface Services {
  catalogService: CatalogService;
  salesService: SalesService;
  reviewService: ReviewService;
  mailer: Mailer;
  salesRepository: BsaleSalesRepository;
  clientRepository: BsaleClientRepository;
  quoteCapture: QuoteCapture;
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
  const salesRepository = new BsaleSalesRepository(client, env);
  const clientRepository = new BsaleClientRepository(client);
  const sql = getSql(env.POSTGRES_URL);
  const reviewStore = new PostgresReviewStore(sql);
  const quoteStore = new PostgresQuoteStore(sql);
  // BSale market_info first (wins); seed fills remaining presentation gaps.
  const enrichers = [
    new MarketInfoEnricher(marketInfoRepository),
    new SeedServiceEnricher()
  ];

  const mailer = new ResendMailer(env);
  const catalogService = new CatalogService(catalogRepository, enrichers);
  const bsaleQuoteResolver = new BsaleQuoteInviteResolver({
    sales: salesRepository,
    clients: clientRepository,
    bsale: client,
    productTypes: productTypeResolver,
    env
  });
  const quoteCapture = new BsaleQuoteCapture({
    resolver: bsaleQuoteResolver,
    reviewStore,
    quoteStore
  });
  const quoteResolver = new LocalFirstQuoteInviteResolver({
    quoteStore,
    reviewStore,
    fallback: bsaleQuoteResolver
  });

  services = {
    catalogService,
    salesService: new SalesService(
      catalogRepository,
      clientRepository,
      new BsaleVariantPricing(client, env),
      salesRepository
    ),
    reviewService: new ReviewService({
      store: reviewStore,
      quoteResolver,
      mailer,
      publicAppUrl: env.PUBLIC_APP_URL
    }),
    mailer,
    salesRepository,
    clientRepository,
    quoteCapture
  };

  return services;
}

/** Test helper to clear the lazy singleton between cases. */
export function resetServicesForTests(): void {
  services = undefined;
}
