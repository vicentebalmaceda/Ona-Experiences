import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { optimizeImages } from './scripts/optimize-images.mjs';

// Generates the WebP variants in public/assets/_img before bundling. The
// `prebuild` npm script does the same; this covers a plain `vite build`
// (e.g. a Vercel build command override). Incremental, so a second run is a no-op.
const responsiveImages = () => ({
  name: 'ona:responsive-images',
  apply: 'build',
  async buildStart() {
    await optimizeImages();
  }
});

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:3003';

  return {
    root: '.',
    publicDir: 'public',
    plugins: [react(), responsiveImages()],
    // The SSR bundle (dist-server/, used only by scripts/prerender.ts) needs no public/ copy.
    build: { copyPublicDir: !isSsrBuild },
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
