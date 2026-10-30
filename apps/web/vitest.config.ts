import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Same JSX runtime as the Vite build (@vitejs/plugin-react), for the server-render tests.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['api/**/*.test.ts', 'shared/**/*.test.ts', 'src/**/*.test.{js,jsx,ts}'],
    setupFiles: ['api/_lib/test/setupEnv.ts'],
    clearMocks: true
  }
});
