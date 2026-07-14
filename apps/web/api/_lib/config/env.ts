import { z } from 'zod';

const envSchema = z.object({
  BSALE_ACCESS_TOKEN: z.string().min(1, 'BSALE_ACCESS_TOKEN is required'),
  BSALE_API_BASE_URL: z.string().url().default('https://api.bsale.io/v1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BSALE_LODGE_PRODUCT_TYPE_NAME: z.string().default('LODGE'),
  BSALE_GUIDE_PRODUCT_TYPE_NAME: z.string().default('GUIDE'),
  BSALE_OFFICE_ID: z.coerce.number().int().positive(),
  BSALE_QUOTE_DOCUMENT_TYPE_ID: z.coerce.number().int().positive(),
  BSALE_PRICE_LIST_ID: z.coerce.number().int().positive(),
  BSALE_WEBHOOK_SECRET: z.string().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional()
});

const envSchemaWithDefaults = envSchema.transform((data) => ({
  ...data,
  LOG_LEVEL: data.LOG_LEVEL ?? (data.NODE_ENV === 'production' ? 'info' : 'debug')
}));

export type Env = z.infer<typeof envSchemaWithDefaults>;

let cached: Env | undefined;

/**
 * Parses environment configuration lazily so that importing modules never
 * crashes a serverless function at load time. Throws a descriptive error
 * (surfaced as a 500 by the error handler) when configuration is invalid.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchemaWithDefaults.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }

  cached = result.data;
  return cached;
}
