/**
 * The credits page (owner, round 2.11): a small static page at /credits/, linked from the settings footer, listing
 * every third-party work the site uses and its licence (core, copy/credits.ts). Written by the build as plain HTML
 * and one stylesheet beside it, in the default theme's colours (graphite) and the site's typeface; no script, so
 * the site's Content Security Policy (style-src 'self', no inline style) holds unchanged. Every string is escaped.
 */

import type { Plugin } from 'vite';
import { BRAND, CONFIG, CREDITS_COPY } from '@stopwatch/core';
import type { CreditedWork } from '@stopwatch/core';
import { deriveTheme, themeCustomProperties } from '../src/theme/derive.ts';
import { DEFAULT_PRESET_ID, getPreset } from '../src/theme/presets.ts';
import { ICON_FILES } from '../src/icons/app-icons.ts';

export const CREDITS_PATH = 'credits/index.html';

/**
 * The page's measures: the site's label size and focus ring (the design tokens), and a single readable column. The
 * page has no frame of its own; it reads as the settings panel's footer pages would (a question for the owner if it
 * should look otherwise).
 */
const MEASURES = {
  textPx: CONFIG.design.type.labelPx.max,
  titlePx: 2 * CONFIG.design.type.labelPx.min - 2,
  lineHeight: 1.5,
  widthPx: 560,
  paddingYPx: 48,
  paddingXPx: 24,
  gapPx: 20,
  lineGapPx: 4,
  labelPx: 88,
  narrowPx: 480,
  focusRingPx: CONFIG.design.controls.focusRingPx,
  focusOffsetPx: CONFIG.design.controls.focusOffsetPx,
} as const;
const STYLESHEET = 'credits/credits.css';

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The page's markup. */
export function creditsHtml(stylesheet = `/${STYLESHEET}`): string {
  const copy = CREDITS_COPY;
  const line = (label: string, value: string): string => `<div class="credit__line"><dt>${escape(label)}</dt><dd>${value}</dd></div>`;
  const work = (item: CreditedWork): string =>
    [
      '<li class="credit">',
      `<h2>${escape(item.name)}</h2>`,
      '<dl>',
      line(copy.labels.use, escape(item.use)),
      line(copy.labels.by, escape(item.by)),
      line(copy.labels.licence, `<a href="${escape(item.licenceUrl)}" rel="noopener noreferrer">${escape(item.licence)}</a>`),
      ...(item.changed === undefined ? [] : [line(copy.labels.changed, escape(item.changed))]),
      '</dl>',
      '</li>',
    ].join('');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escape(`${copy.title} · ${BRAND.name}`)}</title>`,
    `<link rel="icon" href="/${escape(ICON_FILES.svg)}" type="image/svg+xml">`,
    `<link rel="stylesheet" href="${escape(stylesheet)}">`,
    '</head>',
    '<body>',
    '<main class="credits">',
    `<h1>${escape(copy.title)}</h1>`,
    `<p class="credits__intro">${escape(copy.intro)}</p>`,
    `<ul class="credits__list">${copy.works.map(work).join('')}</ul>`,
    `<p><a href="/">${escape(copy.back)}</a></p>`,
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** The page's stylesheet: the default theme's colours, the site's typeface from its own hashed file. */
export function creditsCss(fontUrl: string | null): string {
  const theme = themeCustomProperties(deriveTheme(getPreset(DEFAULT_PRESET_ID)));
  const credits = MEASURES;
  const px = (value: number): string => `${String(value)}px`;
  const face = fontUrl === null ? '' : `@font-face { font-family: "Timer Sans"; src: url("${fontUrl}") format("woff2"); font-weight: 300 500; font-stretch: 92%; font-display: swap; }\n`;
  const variables = Object.entries(theme)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
  return `${face}:root { ${variables} color-scheme: dark; }
body { margin: 0; background: var(--color-background); color: var(--color-foreground); font-family: "Timer Sans", system-ui, sans-serif; font-stretch: 92%; font-size: ${px(credits.textPx)}; line-height: ${String(credits.lineHeight)}; }
.credits { box-sizing: border-box; max-width: ${px(credits.widthPx)}; margin: 0 auto; padding: ${px(credits.paddingYPx)} ${px(credits.paddingXPx)}; }
h1 { font-size: ${px(credits.titlePx)}; font-weight: 400; margin: 0 0 ${px(credits.gapPx)}; }
h2 { font-size: ${px(credits.textPx)}; font-weight: 500; margin: 0 0 ${px(credits.lineGapPx)}; }
.credits__intro { color: var(--color-muted); margin: 0 0 ${px(credits.gapPx)}; }
.credits__list { list-style: none; margin: 0 0 ${px(credits.gapPx)}; padding: 0; display: grid; gap: ${px(credits.gapPx)}; }
dl { margin: 0; display: grid; gap: ${px(credits.lineGapPx)}; }
.credit__line { display: grid; grid-template-columns: ${px(credits.labelPx)} 1fr; gap: ${px(credits.lineGapPx * 2)}; }
dt { color: var(--color-muted); }
dd { margin: 0; }
a { color: var(--color-foreground); }
a:focus-visible { outline: ${px(credits.focusRingPx)} solid var(--color-foreground); outline-offset: ${px(credits.focusOffsetPx)}; }
@media (max-width: ${px(credits.narrowPx)}) { .credit__line { grid-template-columns: 1fr; gap: 0; } }
`;
}

export function creditsPage(): Plugin {
  return {
    name: 'stopwatch:credits',
    apply: 'build',
    generateBundle(_options, bundle) {
      const font = Object.values(bundle).find((file) => file.type === 'asset' && (file.names.includes('timer-sans.woff2') || file.fileName.includes('timer-sans')));
      this.emitFile({ type: 'asset', fileName: STYLESHEET, source: creditsCss(font === undefined ? null : `/${font.fileName}`) });
      this.emitFile({ type: 'asset', fileName: CREDITS_PATH, source: creditsHtml() });
    },
  };
}
