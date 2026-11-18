/**
 * Vite plugins for the site build. Each one is small and does one job:
 *
 * - templateHtml: fills index.html from the brand module and icon registry.
 * - tokensCss: serves the generated design tokens as `virtual:tokens.css`.
 * - preloadFont: adds a preload link for the hashed default font file.
 * - securityHeaders: writes Cloudflare's `_headers` file into the build and
 *   applies the same headers in `vite preview`, so tests run under the CSP.
 * - countStub: answers the counting and crash report endpoints in `vite` and `vite preview`
 *   with 204 and keeps nothing; the real endpoint is packages/endpoint.
 * - checkRecipes: refuses to build when a built-in recipe fails the recipe loader's checks, so the site can load
 *   its own recipes without the checker (core, recipes/built-in.ts).
 *
 * web-app.ts and service-worker.ts hold the manifest and offline plugins.
 */

import { readFileSync, readdirSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import type { Connect, Plugin } from 'vite';
import { COUNT_PATH, CRASH_PATH, parseRecipe } from '@stopwatch/core';
import { HEADER_RULES, headersForPath, renderHeadersFile } from './headers.ts';
import { renderTemplate } from './html.ts';
import { isModeTokenId, renderModeTokensCss, renderSettingsTokensCss, renderTokensCss } from '../src/styles/tokens.ts';

export function templateHtml(): Plugin {
  return {
    name: 'stopwatch:template-html',
    transformIndexHtml: { order: 'pre', handler: (html) => renderTemplate(html) },
  };
}

const TOKENS_ID = 'virtual:tokens.css';
const MODE_TOKENS_PREFIX = 'virtual:tokens/';
// Resolved without the usual "\0" prefix so Vite's CSS pipeline handles them.
const RESOLVED_TOKENS_ID = '/@stopwatch/tokens.css';
const RESOLVED_MODE_PREFIX = '/@stopwatch/tokens/';

/** Serves `virtual:tokens.css` (core tier) and `virtual:tokens/<mode>.css` (loaded with each mode). */
export function tokensCss(): Plugin {
  return {
    name: 'stopwatch:tokens-css',
    resolveId(id) {
      if (id === TOKENS_ID) return RESOLVED_TOKENS_ID;
      if (id.startsWith(MODE_TOKENS_PREFIX)) return RESOLVED_MODE_PREFIX + id.slice(MODE_TOKENS_PREFIX.length);
      return undefined;
    },
    load(id) {
      if (id === RESOLVED_TOKENS_ID) return renderTokensCss();
      if (id.startsWith(RESOLVED_MODE_PREFIX)) {
        const mode = id.slice(RESOLVED_MODE_PREFIX.length).replace(/\.css$/, '');
        if (mode === 'settings') return renderSettingsTokensCss();
        if (!isModeTokenId(mode)) throw new Error(`no tokens for display mode ${mode}`);
        return renderModeTokensCss(mode);
      }
      return undefined;
    },
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

function answerCounts(request: Connect.IncomingMessage, response: ServerResponse, next: Connect.NextFunction): void {
  if (request.url !== COUNT_PATH && request.url !== CRASH_PATH) {
    next();
    return;
  }
  // Drain the body; nothing is kept.
  request.resume();
  response.statusCode = request.method === 'POST' ? 204 : 405;
  response.setHeader('Cache-Control', 'no-store');
  response.end();
}

export function countStub(): Plugin {
  return {
    name: 'stopwatch:count-stub',
    configureServer(server) {
      server.middlewares.use(answerCounts);
    },
    configurePreviewServer(server) {
      server.middlewares.use(answerCounts);
    },
  };
}

const RECIPES = fileURLToPath(new URL('../../../docs/recipes/recipes/', import.meta.url));

/** Every built-in recipe as the loader checks a recipe: one it would refuse stops the build, with its problems. */
export function checkRecipes(folder = RECIPES): Plugin {
  return {
    name: 'stopwatch:check-recipes',
    buildStart() {
      for (const name of readdirSync(folder).filter((file) => file.endsWith('.json'))) {
        const result = parseRecipe(readFileSync(`${folder}${name}`, 'utf8'), { builtIn: true });
        if (!result.ok) this.error(`built-in recipe ${name} is refused: ${result.problems.join('; ')}`);
      }
    },
  };
}
