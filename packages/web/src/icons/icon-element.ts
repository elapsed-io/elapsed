/** Builds an outline icon from its data (icons.ts) with createElementNS; size and stroke come from CSS. */

import { svg } from '../dom.ts';
import { ICON_SVG_ATTRIBUTES, ICONS } from './icons.ts';
import type { IconName } from './icons.ts';

export function iconElement(doc: Document, name: IconName, className?: string): SVGSVGElement {
  const attributes = className === undefined ? ICON_SVG_ATTRIBUTES : { ...ICON_SVG_ATTRIBUTES, class: `icon ${className}` };
  return svg(doc, 'svg', attributes, ICONS[name].map(({ tag, attributes: own }) => svg(doc, tag, own)));
}
