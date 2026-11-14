/**
 * Fills index.html from the brand module and the icon registry at build time,
 * so user-facing text exists in one place (plan, Architecture invariant 12)
 * and the page still needs no JavaScript to paint.
 *
 * Placeholders look like {{ copy.timer.start }}, {{ brand.name }} or
 * {{ icon.settings }}. Text is HTML-escaped; icons are serialised from data.
 * An unknown placeholder fails the build.
 */

import { BRAND } from '@stopwatch/core';
import { ICON_SVG_ATTRIBUTES, ICONS } from '../src/icons/icons.ts';
import type { IconName } from '../src/icons/icons.ts';

const PLACEHOLDER = /\{\{\s*([a-z]+(?:\.[a-zA-Z]+)+)\s*\}\}/g;

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attributes(record: Readonly<Record<string, string>>): string {
  return Object.entries(record)
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('');
}

export function iconMarkup(name: IconName): string {
  const children = ICONS[name].map(({ tag, attributes: attrs }) => `<${tag}${attributes(attrs)}></${tag}>`);
  return `<svg${attributes(ICON_SVG_ATTRIBUTES)}>${children.join('')}</svg>`;
}

function lookup(root: unknown, path: readonly string[]): unknown {
  let node = root;
  for (const key of path) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, key)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}

function resolve(placeholder: string): string {
  const [scope = '', ...path] = placeholder.split('.');
  if (scope === 'icon') {
    const name = path.join('.');
    if (path.length === 1 && isIconName(name)) return iconMarkup(name);
  } else if (scope === 'brand' || scope === 'copy') {
    const value = scope === 'brand' ? lookup(BRAND, path) : lookup(BRAND.copy, path);
    if (typeof value === 'string') return escapeHtml(value);
  }
  throw new Error(`index.html: unknown placeholder {{ ${placeholder} }}`);
}

export function renderTemplate(html: string): string {
  const rendered = html.replace(PLACEHOLDER, (_match, placeholder: string) => resolve(placeholder));
  if (rendered.includes('{{')) throw new Error('index.html: malformed placeholder left after rendering');
  return rendered;
}
