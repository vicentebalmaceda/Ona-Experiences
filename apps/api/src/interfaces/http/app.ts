import express from 'express';
import cors from 'cors';
import { env } from '../../config/env.js';
import { createCatalogController, createSalesController } from '../../composition.js';
import { createCatalogRoutes } from './routes/catalogRoutes.js';
import { createSalesRoutes } from './routes/salesRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const catalogController = createCatalogController();
  app.use('/api/v1', createCatalogRoutes(catalogController));

  const salesController = createSalesController();
  app.use('/api/v1', createSalesRoutes(salesController));

  app.use(errorHandler);

  return app;
}
