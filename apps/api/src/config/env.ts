import { config } from 'dotenv';
import { z } from 'zod';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  BSALE_ACCESS_TOKEN: z.string().min(1, 'BSALE_ACCESS_TOKEN is required'),
  BSALE_API_BASE_URL: z.string().url().default('https://api.bsale.io/v1'),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BSALE_LODGE_PRODUCT_TYPE_NAME: z.string().default('LODGE'),
  BSALE_GUIDE_PRODUCT_TYPE_NAME: z.string().default('GUIDE')
});

const envSchemaWithDefaults = envSchema.transform((data) => ({
  ...data,
  LOG_LEVEL: data.LOG_LEVEL ?? (data.NODE_ENV === 'production' ? 'info' : 'debug')
}));

export type Env = z.infer<typeof envSchemaWithDefaults>;

function parseEnv(): Env {
  const result = envSchemaWithDefaults.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Invalid environment configuration:\n${formatted}`);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
