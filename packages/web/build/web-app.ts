/**
 * Installing to the home screen (plan, Decisions > Survival: "installs to a
 * home screen as a web app"): the web app manifest, built from the brand
 * module and the default theme, and the head tags that point to it and to
 * the placeholder icons in public/icons/ (scripts/icons/).
 */

import { BRAND } from '@stopwatch/core';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { deriveTheme } from '../src/theme/derive.ts';
import { DEFAULT_PRESET_ID, getPreset } from '../src/theme/presets.ts';
import { ICON_FILES } from '../src/icons/app-icons.ts';

export const MANIFEST_FILE = 'manifest.webmanifest';
export { ICON_FILES };

export function webAppManifest(): string {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  const manifest = {
    id: '/',
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.copy.meta.description,
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: theme.background,
    theme_color: theme.background,
    icons: [
      { src: `/${ICON_FILES.svg}`, type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: `/${ICON_FILES.png192}`, type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: `/${ICON_FILES.png512}`, type: 'image/png', sizes: '512x512', purpose: 'any' },
      // The drawing stays inside the maskable safe zone, so the same file serves.
      { src: `/${ICON_FILES.png512}`, type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function webAppTags(): HtmlTagDescriptor[] {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  return [
    { tag: 'meta', attrs: { name: 'theme-color', content: theme.background }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'icon', href: `/${ICON_FILES.svg}`, type: 'image/svg+xml' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `/${ICON_FILES.appleTouch}` }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'manifest', href: `/${MANIFEST_FILE}` }, injectTo: 'head' },
  ];
}

export function webApp(): Plugin {
  return {
    name: 'stopwatch:web-app',
    transformIndexHtml: () => webAppTags(),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: MANIFEST_FILE, source: webAppManifest() });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== `/${MANIFEST_FILE}`) {
          next();
          return;
        }
        response.setHeader('Content-Type', 'application/manifest+json');
        response.end(webAppManifest());
      });
    },
  };
}
