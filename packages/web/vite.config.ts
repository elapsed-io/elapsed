import { defineConfig } from 'vite';
import { checkRecipes, countStub, preloadFont, securityHeaders, templateHtml, tokensCss } from './build/plugins.ts';
import { sitePages } from './build/pages.ts';
import { serviceWorker } from './build/service-worker.ts';
import { skyArt } from './build/sky.ts';
import { webApp } from './build/web-app.ts';

export default defineConfig({
  plugins: [checkRecipes(), templateHtml(), tokensCss(), skyArt(), preloadFont('timer-sans.woff2'), securityHeaders(), webApp(), sitePages(), serviceWorker(), countStub()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Read by scripts/check-size.ts to find what the first visit loads.
    manifest: true,
    // Every supported browser has native modulepreload.
    modulePreload: { polyfill: false },
    // Never inline assets as data: URIs; font-src 'self' would block an inlined font.
    assetsInlineLimit: 0,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
