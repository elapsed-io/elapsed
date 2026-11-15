/**
 * Small DOM builders. Elements are created with createElement and text is set
 * with textContent, never parsed from strings (plan, Principles > Safe; the CSP
 * enforces Trusted Types). Attribute values are strings set with setAttribute.
 */

type Child = Node | string | null | false;

export interface Props {
  readonly class?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

function append(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === false) continue;
    parent.appendChild(typeof child === 'string' ? (parent.ownerDocument ?? document).createTextNode(child) : child);
  }
}

export function html<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  props: Props = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = doc.createElement(tag);
  if (props.class !== undefined) element.className = props.class;
  for (const [name, value] of Object.entries(props.attrs ?? {})) element.setAttribute(name, value);
  append(element, children);
  return element;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Readonly<Record<string, string | number>> = {},
  children: readonly Child[] = [],
): SVGElementTagNameMap[K] {
  const element = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
  append(element, children);
  return element;
}

/** Every animation running on an element and its descendants. */
export function animationsOf(element: Element): Animation[] {
  return element.getAnimations({ subtree: true });
}

/**
 * Puts CSS animations at a moment of focused time and plays or holds them.
 * CSS does the motion; this only says where it should be (plan, Principles:
 * JavaScript changes state when something happens and never runs a loop).
 */
export function syncAnimations(element: Element, atMs: number, playing: boolean): void {
  for (const animation of animationsOf(element)) {
    animation.currentTime = atMs;
    if (playing) animation.play();
    else animation.pause();
  }
}
