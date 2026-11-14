/**
 * Vite plugins for the site build. Each one is small and does one job:
 *
 * - templateHtml: fills index.html from the brand module and icon registry.
 * - tokensCss: serves the generated design tokens as `virtual:tokens.css`.
 * - preloadFont: adds a preload link for the hashed default font file.
 * - securityHeaders: writes Cloudflare's `_headers` file into the build and
 *   applies the same headers in `vite preview`, so tests run under the CSP.
 */

import type { Plugin } from 'vite';
import { HEADER_RULES, headersForPath, renderHeadersFile } from './headers.ts';
import { renderTemplate } from './html.ts';
import { renderTokensCss } from '../src/styles/tokens.ts';

export function templateHtml(): Plugin {
  return {
    name: 'stopwatch:template-html',
    transformIndexHtml: { order: 'pre', handler: (html) => renderTemplate(html) },
  };
}

const TOKENS_ID = 'virtual:tokens.css';
// Resolved without the usual "\0" prefix so Vite's CSS pipeline handles it.
const RESOLVED_TOKENS_ID = '/@stopwatch/tokens.css';

export function tokensCss(): Plugin {
  return {
    name: 'stopwatch:tokens-css',
    resolveId: (id) => (id === TOKENS_ID ? RESOLVED_TOKENS_ID : undefined),
    load: (id) => (id === RESOLVED_TOKENS_ID ? renderTokensCss() : undefined),
  };
}

export function preloadFont(fileName: string): Plugin {
  return {
    name: 'stopwatch:preload-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, context) => {
        const asset = Object.values(context.bundle ?? {}).find(
          (output) => output.type === 'asset' && output.originalFileNames.some((name) => name.endsWith(fileName)),
        );
        if (asset === undefined) throw new Error(`preloadFont: ${fileName} is not in the bundle`);
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', href: `/${asset.fileName}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export function securityHeaders(): Plugin {
  return {
    name: 'stopwatch:security-headers',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: renderHeadersFile(HEADER_RULES) });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://preview.invalid').pathname;
        for (const [name, value] of Object.entries(headersForPath(path))) response.setHeader(name, value);
        next();
      });
    },
  };
}
