/**
 * The site's plain pages, as one set (plan, Design system; rounds 2.11, 2.14 and 2.16): the credits page at
 * /credits/, listing every third-party work the site uses and its licence (core, copy/credits.ts), and, since round
 * 2.16, the privacy page and terms at /privacy and /terms, served by the app from the same sources as the soon
 * page's (docs/legal, in the app's edition: packages/soon/scripts/legal.ts). Each follows the person's chosen theme
 * and the site's typeface, laid out like the soon page's legal pages (packages/soon/public/legal.css): the name at
 * the top, one readable column, a 44 px light title, and the footer's links.
 *
 * The build writes them as plain HTML, one stylesheet in the default theme's colours, and one small module script
 * of the site's own (src/pages/theme.ts) that applies the chosen theme from the settings this browser keeps; so the
 * site's Content Security Policy (script-src 'self', style-src 'self', no inline style) and Trusted Types hold
 * unchanged. Every string is escaped; the legal pages' markup comes only from the legal renderer.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { BRAND, CREDITS_COPY, SETTINGS_COPY } from '@stopwatch/core';
import type { CreditedWork } from '@stopwatch/core';
import { LEGAL_PAGES, renderBody, sourcePath } from '../../soon/scripts/legal.ts';
import type { LegalPage } from '../../soon/scripts/legal.ts';
import { deriveTheme, themeCustomProperties } from '../src/theme/derive.ts';
import { DEFAULT_PRESET_ID, getPreset } from '../src/theme/presets.ts';
import { ICON_FILES } from '../src/icons/app-icons.ts';

/** Where each page is written in the build (Cloudflare serves /privacy from privacy.html, as the preview does). */
export const PAGE_FILES = { credits: 'credits/index.html', privacy: 'privacy.html', terms: 'terms.html' } as const;
export type PageName = keyof typeof PAGE_FILES;

/** The script that applies the chosen theme, built with the site (a chunk of its own, loaded by these pages only). */
export const PAGES_SCRIPT = fileURLToPath(new URL('../src/pages/theme.ts', import.meta.url));

/**
 * The soon page's legal measures (packages/soon/public/legal.css), so the pages read as one set: the name, a 560 px
 * column, a 44 px light title, 18 and 15 px headings, 15 px text, a muted 13 px date, and the small links at the foot.
 */
const LEGAL = {
  header: { paddingTopPx: 48, paddingXPx: 24, namePx: 13, nameTrackingEm: 0.16 },
  column: { widthPx: 560, paddingTopPx: 40, paddingXPx: 24, paddingBottomPx: 24, textPx: 15, lineHeight: 1.6 },
  title: { px: 44, weight: 300, letterSpacingEm: -0.01, gapPx: 12 },
  date: { px: 13 },
  heading: { px: 18, weight: 500, lineHeight: 1.3, topPx: 40, gapPx: 8 },
  subheading: { px: 15, weight: 500, lineHeight: 1.3, topPx: 28, gapPx: 6 },
  paragraphGapPx: 12,
  list: { indentPx: 20, itemGapPx: 8 },
  strongWeight: 500,
  line: { labelPx: 88, gapPx: 4, narrowPx: 480 },
  links: { px: 11, gapPx: 16, paddingTopPx: 32, paddingXPx: 24, paddingBottomPx: 18, tapPx: 44 },
  focus: { ringPx: 2, offsetPx: 2, radiusPx: 2 },
} as const;
const STYLESHEET = 'pages.css';

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The pages' own address for each, as the settings footer links them. */
const PAGE_HREF: Readonly<Record<PageName, string>> = { credits: '/credits/', privacy: '/privacy', terms: '/terms' };

/** The footer's links, as the settings footer shows them (privacy, terms, credits; not feedback), this page marked current. */
function footerLinks(current: PageName): string {
  const links = SETTINGS_COPY.links.flatMap((link) =>
    link.shown && link.href.startsWith('/') ? [`<a href="${escape(link.href)}"${link.href === PAGE_HREF[current] ? ' aria-current="page"' : ''}>${escape(link.label)}</a>`] : [],
  );
  return `<nav class="links" aria-label="${escape(SETTINGS_COPY.linksLabel.replace('{name}', BRAND.name))}">${links.join('')}</nav>`;
}

interface PageShell {
  readonly name: PageName;
  readonly title: string;
  readonly description: string | null;
  readonly main: string;
  readonly mainClass: string;
  readonly script: string | null;
  readonly stylesheet: string;
}

function pageHtml(page: PageShell): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escape(`${page.title} · ${BRAND.name}`)}</title>`,
    ...(page.description === null ? [] : [`<meta name="description" content="${escape(page.description)}">`]),
    `<link rel="icon" href="/${escape(ICON_FILES.svg)}" type="image/svg+xml">`,
    `<link rel="stylesheet" href="${escape(page.stylesheet)}">`,
    ...(page.script === null ? [] : [`<script type="module" src="${escape(page.script)}"></script>`]),
    '</head>',
    '<body>',
    `<header class="legal__header"><a class="legal__name" href="/">${escape(BRAND.name)}</a></header>`,
    `<main class="${page.mainClass}">`,
    page.main,
    '</main>',
    footerLinks(page.name),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** The credits page's markup. */
export function creditsHtml(script: string | null, stylesheet = `/${STYLESHEET}`): string {
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
  const main = [`<h1>${escape(copy.title)}</h1>`, `<p>${escape(copy.intro)}</p>`, `<ul class="credits__list">${copy.works.map(work).join('')}</ul>`, `<p><a href="/">${escape(copy.back)}</a></p>`].join('\n');
  return pageHtml({ name: 'credits', title: copy.title, description: null, main, mainClass: 'legal credits', script, stylesheet });
}

/** The privacy page or terms, in the app's edition of their source (docs/legal). */
export function legalHtml(page: LegalPage, markdown: string, script: string | null, stylesheet = `/${STYLESHEET}`): string {
  const entry = LEGAL_PAGES.find((candidate) => candidate.name === page);
  return pageHtml({ name: page, title: page, description: entry?.description ?? null, main: renderBody(markdown, 'app'), mainClass: 'legal', script, stylesheet });
}

/** The pages' stylesheet: the default theme's colours (the script then applies the chosen theme), the site's typeface. */
export function pagesCss(fontUrl: string | null): string {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  const { header, column, title, date, heading, subheading, list, line, links, focus } = LEGAL;
  const px = (value: number): string => `${String(value)}px`;
  const face = fontUrl === null ? '' : `@font-face { font-family: "Timer Sans"; src: url("${fontUrl}") format("woff2"); font-weight: 300 500; font-stretch: 92%; font-style: normal; font-display: swap; }\n`;
  const variables = Object.entries(themeCustomProperties(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
  return `${face}:root { ${variables} color-scheme: ${theme.scheme}; }
html, body { margin: 0; }
body { background: var(--color-background); color: var(--color-foreground); font-family: "Timer Sans", system-ui, sans-serif; font-stretch: 92%; overflow-wrap: break-word; }
.legal__header { display: flex; justify-content: center; padding: ${px(header.paddingTopPx)} ${px(header.paddingXPx)} 0; }
.legal__name { font-size: ${px(header.namePx)}; color: var(--color-muted); letter-spacing: ${String(header.nameTrackingEm)}em; text-decoration: none; }
.legal { max-width: ${px(column.widthPx)}; margin: 0 auto; padding: ${px(column.paddingTopPx)} ${px(column.paddingXPx)} ${px(column.paddingBottomPx)}; font-size: ${px(column.textPx)}; line-height: ${String(column.lineHeight)}; }
.legal h1 { margin: 0 0 ${px(title.gapPx)}; font-size: ${px(title.px)}; font-weight: ${String(title.weight)}; line-height: 1; letter-spacing: ${String(title.letterSpacingEm)}em; }
.legal__date { color: var(--color-muted); font-size: ${px(date.px)}; }
.legal h2 { margin: ${px(heading.topPx)} 0 ${px(heading.gapPx)}; font-size: ${px(heading.px)}; font-weight: ${String(heading.weight)}; line-height: ${String(heading.lineHeight)}; }
.legal h3 { margin: ${px(subheading.topPx)} 0 ${px(subheading.gapPx)}; font-size: ${px(subheading.px)}; font-weight: ${String(subheading.weight)}; line-height: ${String(subheading.lineHeight)}; }
.legal p, .legal ul { margin: 0 0 ${px(LEGAL.paragraphGapPx)}; }
.legal ul { padding-left: ${px(list.indentPx)}; }
.legal li { margin-bottom: ${px(list.itemGapPx)}; }
.legal strong { font-weight: ${String(LEGAL.strongWeight)}; }
.legal a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.credits__list { list-style: none; margin: 0 0 ${px(LEGAL.paragraphGapPx)}; padding: 0; }
.credits .credit { margin: 0; }
.credits dl { margin: 0; display: grid; gap: ${px(line.gapPx)}; }
.credit__line { display: grid; grid-template-columns: ${px(line.labelPx)} 1fr; gap: ${px(line.gapPx * 2)}; }
.credits dt { color: var(--color-muted); }
.credits dd { margin: 0; }
.links { display: flex; justify-content: center; gap: ${px(links.gapPx)}; padding: ${px(links.paddingTopPx)} ${px(links.paddingXPx)} ${px(links.paddingBottomPx)}; font-size: ${px(links.px)}; }
.links a { position: relative; color: var(--color-muted); text-decoration: none; }
.links a[aria-current="page"] { color: var(--color-foreground); }
.links a::before { content: ""; position: absolute; left: 50%; top: 50%; width: ${px(links.tapPx)}; height: ${px(links.tapPx)}; transform: translate(-50%, -50%); }
a:focus-visible { outline: ${px(focus.ringPx)} solid var(--color-foreground); outline-offset: ${px(focus.offsetPx)}; border-radius: ${px(focus.radiusPx)}; }
@media (max-width: ${px(line.narrowPx)}) { .credit__line { grid-template-columns: 1fr; gap: 0; } }
`;
}

/** Vite: writes the three pages, their stylesheet and their theme script into the build. */
export function sitePages(): Plugin {
  let script = '';
  return {
    name: 'stopwatch:site-pages',
    apply: 'build',
    buildStart() {
      script = this.emitFile({ type: 'chunk', id: PAGES_SCRIPT, name: 'page-theme' });
    },
    generateBundle(_options, bundle) {
      const font = Object.values(bundle).find((file) => file.type === 'asset' && (file.names.includes('timer-sans.woff2') || file.fileName.includes('timer-sans')));
      const scriptUrl = `/${this.getFileName(script)}`;
      this.emitFile({ type: 'asset', fileName: STYLESHEET, source: pagesCss(font === undefined ? null : `/${font.fileName}`) });
      this.emitFile({ type: 'asset', fileName: PAGE_FILES.credits, source: creditsHtml(scriptUrl) });
      for (const { name } of LEGAL_PAGES) {
        this.emitFile({ type: 'asset', fileName: PAGE_FILES[name], source: legalHtml(name, readFileSync(sourcePath(name), 'utf8'), scriptUrl) });
      }
    },
  };
}
