import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['api/**/*.test.ts', 'src/**/*.test.{js,jsx,ts}'],
    setupFiles: ['api/_lib/test/setupEnv.ts'],
    clearMocks: true
  }
});
