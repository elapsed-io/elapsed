/**
 * Plan conformance audit, run with the unit tests and between rounds.
 * Each check is a rule from docs/plan.md that can be verified from source.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MODE_TOKEN_IDS, renderModeTokensCss, renderSettingsTokensCss, renderTokensCss } from '../packages/web/src/styles/tokens.ts';

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
const ALL_CSS = [...STYLESHEETS.map((path) => readFileSync(path, 'utf8')), renderTokensCss(), ...MODE_TOKEN_IDS.map((mode) => renderModeTokensCss(mode)), renderSettingsTokensCss()];

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

  it('keeps no timer in the endpoint: the rate limiter forgets on arrival (Cloudflare also refuses one at startup)', () => {
    const endpoint = files(join(root, 'packages/endpoint/src'), /\.ts$/).filter((path) => !path.endsWith('.test.ts'));
    expect(endpoint.length).toBeGreaterThan(0);
    expect(endpoint.filter((path) => /\bset(?:Timeout|Interval)\s*\(/.test(withoutComments(readFileSync(path, 'utf8')))).map(rel)).toEqual([]);
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
          // visibility switches after a fade with zero duration; it is not animated. "none" turns transitions off.
          if (property === 'visibility' && /\b0s\b/.test(part)) continue;
          if (property === 'none') continue;
          expect(ANIMATABLE, `transition of ${property}`).toContain(property);
        }
      }
    }
  });

  it('animates a blur only in the seconds blur-away', () => {
    // Performance requirements: "the seconds blur-away is the only animated blur".
    for (const css of ALL_CSS) {
      for (const block of css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) ?? []) {
        if (/\bfilter\s*:/.test(block)) expect(block).toMatch(/^@keyframes time-blur-away-blur\b/);
      }
      for (const [, value = ''] of css.matchAll(/transition\s*:\s*([^;]+);/g)) {
        for (const part of value.split(',')) {
          const property = part.trim().split(/\s+/)[0] ?? '';
          if (property === 'all' || /filter$/.test(property)) expect.fail(`a transition of ${property}: ${part.trim()}`);
        }
      }
    }
  });

  it('animates from script only with transform and opacity, apart from the one replay exception', () => {
    // Plan, Principles: "There is exactly one exception: a results replay is driven by a single animated
    // custom property holding its progress, from which its SVG stroke offsets, the clock hand's rotation
    // and the headline count are all derived."
    const EXCEPTIONS: Readonly<Record<string, RegExp>> = {
      '--replay-progress': /packages\/web\/src\/results\/results\.ts$/,
    };
    // Keyframes built away from the call are checked in these files as a whole.
    const BUILT_ELSEWHERE = ['packages/web/src/results/results.ts', 'packages/web/src/modes/pieces/light/light.ts', 'packages/web/src/modes/pieces/tree/tree.ts', 'packages/web/src/modes/recipe/camera.ts'];
    // A keyframe's `offset` and `easing` time it; they are not properties that move.
    const allowed = (property: string, path: string): boolean =>
      property === 'transform' || property === 'opacity' || property === 'offset' || property === 'easing' || (EXCEPTIONS[property]?.test(path) ?? false);
    for (const path of SITE_SOURCE) {
      const text = withoutComments(readFileSync(path, 'utf8'));
      for (const [, first = ''] of text.matchAll(/\.animate\(\s*(\S)/g)) {
        if (first !== '[') expect(BUILT_ELSEWHERE, `keyframes built away from .animate() in ${rel(path)}`).toContain(rel(path));
      }
      for (const [, keyframes = ''] of text.matchAll(/\.animate\(\s*\[([\s\S]*?)\]\s*,/g)) {
        for (const [, property = ''] of keyframes.matchAll(/[{,]\s*'?(--[a-z-]+|[a-zA-Z]+)'?\s*:/g)) {
          expect(allowed(property, path), `${property} in ${rel(path)}`).toBe(true);
        }
      }
      if (BUILT_ELSEWHERE.includes(rel(path))) {
        for (const [, property = ''] of text.matchAll(/\{\s*'?(--[a-z-]+|strokeDash\w+|transform|opacity|filter|clipPath)'?\s*:/g)) {
          expect(allowed(property, path), `${property} in ${rel(path)}`).toBe(true);
        }
      }
    }
  });
});

describe('plan audit: results replays', () => {
  it('drive each replay from exactly one animated progress property, and nothing else moves them', () => {
    const animating = SITE_SOURCE.filter((path) => /'--replay-progress'\s*:/.test(withoutComments(readFileSync(path, 'utf8'))));
    expect(animating.map(rel)).toEqual(['packages/web/src/results/results.ts']);
    for (const path of SITE_SOURCE.filter((p) => /replay\.ts$/.test(p))) {
      expect(withoutComments(readFileSync(path, 'utf8')), rel(path)).not.toMatch(/\.animate\(/);
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
      // Not copy: a media query, error messages for developers, and the link relation for pages opened in a new tab.
      const allowed = ['prefers-reduced-motion: reduce', 'no display modes are registered', 'the page is missing', 'noopener noreferrer'];
      expect(
        phrases.filter((phrase) => !allowed.some((ok) => phrase.startsWith(ok)) && !/^(not|no|the|a|an) /.test(phrase)),
        rel(path),
      ).toEqual([]);
    }
  });
});

describe('plan audit: internals (round 2.10)', () => {
  it('keeps the session state machine independent of display modes: it knows a mode only as an id', () => {
    const machine = CORE_SOURCE.filter((path) => /\/core\/src\/(session|engine)\//.test(path));
    expect(machine.length).toBeGreaterThan(0);
    for (const path of machine) {
      const imports = [...readFileSync(path, 'utf8').matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '');
      // Its own modules, the event bus, time, the config and the test clock: never modes, recipes, settings or the brand.
      expect(imports.filter((source) => !/^\.\.?\/(?:(?:\.\.\/)?(?:session|engine|events|time|testing)\/[\w-]+|[\w-]+|\.\.\/config)\.ts$/.test(source)), rel(path)).toEqual([]);
      expect(imports.filter((source) => /modes|recipes|settings|brand/.test(source)), rel(path)).toEqual([]);
    }
  });

  it('mounts a mode only through the stage, which the session never waits on', () => {
    const app = readFileSync(join(root, 'packages/web/src/app.ts'), 'utf8');
    // The first mount is the one direct mount; every switch goes through the stage's one pipeline.
    expect(app.match(/\.mount\(/g)?.length).toBe(1);
    expect(withoutComments(app)).not.toMatch(/await\s+stage\b|await\s+[\w.]*\.ready\(/);
  });
});
