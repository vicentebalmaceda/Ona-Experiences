import { describe, expect, it } from 'vitest';
import { getContentEnv } from './env.js';

describe('getContentEnv (build-time prerender)', () => {
  it('needs only the BSale token and POSTGRES_URL; mail and admin secrets are not required', () => {
    const env = getContentEnv({ BSALE_ACCESS_TOKEN: 'token', POSTGRES_URL: 'postgres://x' });
    expect(env).toEqual({
      BSALE_ACCESS_TOKEN: 'token',
      BSALE_API_BASE_URL: 'https://api.bsale.io/v1',
      BSALE_LODGE_PRODUCT_TYPE_NAME: 'LODGE',
      BSALE_GUIDE_PRODUCT_TYPE_NAME: 'GUIDE',
      POSTGRES_URL: 'postgres://x'
    });
  });

  it('fails loudly without BSale or Postgres', () => {
    expect(() => getContentEnv({ POSTGRES_URL: 'postgres://x' })).toThrow(/BSALE_ACCESS_TOKEN/);
    expect(() => getContentEnv({ BSALE_ACCESS_TOKEN: 'token' })).toThrow(/POSTGRES_URL/);
  });
});
