/**
 * Plan conformance audit, run with the unit tests and between rounds.
 * Each check is a rule from docs/plan.md that can be verified from source.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderModeTokensCss, renderTokensCss } from '../packages/web/src/styles/tokens.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

function files(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'dist' ? [] : files(path, pattern);
    return pattern.test(name) ? [path] : [];
  });
}

const rel = (path: string): string => relative(root, path).split('\\').join('/');
const withoutComments = (code: string): string => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SITE_SOURCE = files(join(root, 'packages/web/src'), /\.ts$/).filter((path) => !path.endsWith('.test.ts'));
const CORE_SOURCE = files(join(root, 'packages/core/src'), /\.ts$/).filter((path) => !path.endsWith('.test.ts') && !path.includes('/testing/'));
const STYLESHEETS = files(join(root, 'packages/web/src'), /\.css$/);
const ALL_CSS = [...STYLESHEETS.map((path) => readFileSync(path, 'utf8')), renderTokensCss(), renderModeTokensCss('ring'), renderModeTokensCss('timeline')];

/** Principles > Appealing and fast: animations use only transform, opacity and filter. */
const ANIMATABLE = new Set(['transform', 'translate', 'rotate', 'scale', 'opacity', 'filter']);

describe('plan audit: performance', () => {
  it('never runs an animation loop or a polling interval', () => {
    for (const path of [...SITE_SOURCE, ...CORE_SOURCE]) {
      const text = readFileSync(path, 'utf8');
      expect(text, rel(path)).not.toMatch(/\brequestAnimationFrame\s*\(/);
      expect(text, rel(path)).not.toMatch(/\bsetInterval\s*\(/);
    }
  });

  it('sets timers only through the one scheduler', () => {
    const timers = [...SITE_SOURCE, ...CORE_SOURCE].filter((path) => /\bsetTimeout\s*\(/.test(readFileSync(path, 'utf8')));
    expect(timers.map(rel)).toEqual(['packages/web/src/time/system-clock.ts']);
  });

  it('animates and transitions only transform, opacity and filter', () => {
    for (const css of ALL_CSS) {
      for (const block of css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) ?? []) {
        for (const [, property = ''] of block.matchAll(/([a-z-]+)\s*:/g)) {
          if (property === 'animation-timing-function') continue;
          expect(ANIMATABLE, `${property} in ${block.slice(0, 40)}`).toContain(property);
        }
      }
      for (const [, value = ''] of css.matchAll(/transition\s*:\s*([^;]+);/g)) {
        for (const part of value.split(',')) {
          const property = part.trim().split(/\s+/)[0] ?? '';
          // visibility switches after a fade with zero duration; it is not animated.
          if (property === 'visibility' && /\b0s\b/.test(part)) continue;
          expect(ANIMATABLE, `transition of ${property}`).toContain(property);
        }
      }
    }
  });

  it('animates from script only with transform and opacity', () => {
    for (const path of SITE_SOURCE) {
      const text = readFileSync(path, 'utf8');
      for (const [, keyframes = ''] of text.matchAll(/\.animate\(\s*\[([\s\S]*?)\]\s*,/g)) {
        for (const [, property = ''] of keyframes.matchAll(/\{\s*([a-zA-Z]+)\s*:/g)) {
          expect(['transform', 'opacity'], `${property} in ${rel(path)}`).toContain(property);
        }
      }
    }
  });
});

describe('plan audit: security', () => {
  it('reaches browser storage only through storage adapters (the service worker keeps the offline cache)', () => {
    for (const path of SITE_SOURCE.filter((p) => !p.includes('/storage/') && !p.includes('/sw/'))) {
      const text = withoutComments(readFileSync(path, 'utf8'));
      expect(text, rel(path)).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|caches|document\.cookie)\b/);
    }
  });

  it('loads nothing from another origin', () => {
    for (const path of [...SITE_SOURCE, ...STYLESHEETS, join(root, 'packages/web/index.html')]) {
      const text = readFileSync(path, 'utf8');
      const urls = [...text.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s'"`)]*/gi)].map((match) => match[0]);
      // Namespace and documentation URLs are not requests.
      const requests = urls.filter((url) => !url.startsWith('http://www.w3.org/') && !url.includes('humanbn.com'));
      expect(requests, rel(path)).toEqual([]);
    }
  });

  it('builds no markup from strings', () => {
    for (const path of SITE_SOURCE) {
      const text = readFileSync(path, 'utf8');
      expect(text, rel(path)).not.toMatch(/\b(innerHTML|outerHTML|insertAdjacentHTML|createContextualFragment|document\.write)\b/);
    }
  });
});

describe('plan audit: design', () => {
  it('keeps every number in the config module: no stray pixel or millisecond literals in stylesheets', () => {
    for (const path of STYLESHEETS) {
      const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      // Only 0, 1px multipliers in calc() and percentages for centring may appear literally.
      const literals = [...text.matchAll(/(?<![\w-])(\d*\.?\d+)(px|ms|s|em|rem)\b/g)].map((match) => match[0]).filter((value) => value !== '1px' && value !== '0s');
      expect(literals, rel(path)).toEqual([]);
    }
  });

  it('puts user-facing text only in the brand module', () => {
    // theme/contrast.ts names colour pairs for the CI contrast report, which only developers read.
    for (const path of SITE_SOURCE.filter((p) => !p.endsWith('theme/contrast.ts'))) {
      const text = withoutComments(readFileSync(path, 'utf8'));
      // Strings handed to the DOM come from BRAND; a quoted lowercase phrase with a space is copy,
      // unless it is a list of class names.
      const phrases = [...text.matchAll(/(class: )?['"`]([a-z]+(?: [a-z]+){1,})['"`]/g)]
        .filter((match) => match[1] === undefined)
        .map((match) => match[2] ?? '');
      const allowed = ['prefers-reduced-motion: reduce', 'no display modes are registered', 'the page is missing'];
      expect(
        phrases.filter((phrase) => !allowed.some((ok) => phrase.startsWith(ok)) && !/^(not|no|the|a|an) /.test(phrase)),
        rel(path),
      ).toEqual([]);
    }
  });
});
