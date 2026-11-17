/**
 * Comets (docs/recipes/mode-recipes.md, `particles` with `shape: comet`; plan, Display modes > Interstellar): while
 * paused, and during the results, random comets drift slowly across the scene, arriving every few seconds (the
 * layer's `every`, about one every 5 s on average) and at most `maxAtOnce` at a time, each with its tail pointing
 * away from the Sun as real comet tails do. Each varies within the layer's limits: its head (4 to 8 px across),
 * its tail (50 to 110 px long), its colour (blue-white or golden) and its path (`distance`, 280 to 400 px, from a
 * point well inside the scene, heading roughly across it). Drawn as the paused frame draws them: a white head with a
 * glow of its colour and a tail fading from its colour, 0.6 of the head across; each fades in over the first 16 %
 * of its stay and out over the last 16 %, moving evenly. The schedule is drawn at random once, for three minutes
 * that then repeat; each comet is one animation of opacity and transform, so nothing runs per frame.
 */

import { CONFIG } from '@stopwatch/core';
import type { ParticlesLayer, Range } from '@stopwatch/core';
import { html } from '../../../dom.ts';

const COMETS = CONFIG.modes.interstellar.comets;

export interface Comet {
  /** Seconds into the cycle it arrives, and how long it stays. */
  readonly start: number;
  readonly life: number;
  /** Where it starts and how far it travels, in the scene's pixels. */
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly head: number;
  readonly length: number;
  readonly colour: string;
  /** The tail's direction in degrees: away from the anchor, from the middle of its path. */
  readonly angle: number;
}

const between = (random: () => number, [min, max]: Range): number => min + random() * (max - min);

/** The tail's direction for a comet whose path runs from (x, y) by (dx, dy): away from `anchor` at its middle. */
export function tailAngle(x: number, y: number, dx: number, dy: number, anchor: readonly [number, number]): number {
  return (Math.atan2(y + dy / 2 - anchor[1], x + dx / 2 - anchor[0]) * 180) / Math.PI;
}

/** The comets of one cycle in a scene `width` × `height`, drawn at random once. */
export function scheduleComets(layer: ParticlesLayer, width: number, height: number, anchor: readonly [number, number], random: () => number = Math.random, cycle: number = COMETS.cycleSeconds): Comet[] {
  const every = layer.every;
  const lifetime = layer.lifetime ?? [8, 11];
  const heads = layer.size?.head ?? [4, 8];
  const lengths = layer.size?.length ?? [50, 110];
  const distances = layer.distance ?? [280, 400];
  const colours = layer.colors ?? ['#D2F0FF'];
  const comets: Comet[] = [];
  const ends: number[] = [];
  let at = between(random, [0.5, 1]);
  for (;;) {
    const life = between(random, lifetime);
    // At most `maxAtOnce` at once: a newcomer waits for the first to leave.
    const active = ends.filter((end) => end > at).sort((a, b) => a - b);
    if (active.length >= layer.maxAtOnce) at = active[active.length - layer.maxAtOnce] ?? at;
    if (at + life > cycle) break;
    const x = between(random, [0.1, 0.9]) * width;
    const y = between(random, [0.05, 0.75]) * height;
    // Roughly across the scene: towards its middle, give or take 70°.
    const heading = Math.atan2(height / 2 - y, width / 2 - x) + ((random() * 2 - 1) * 70 * Math.PI) / 180;
    const distance = between(random, distances);
    const dx = distance * Math.cos(heading);
    const dy = distance * Math.sin(heading);
    const colour = colours[Math.floor(random() * colours.length)] ?? '#D2F0FF';
    comets.push({ start: at, life, x, y, dx, dy, head: between(random, heads), length: between(random, lengths), colour, angle: tailAngle(x, y, dx, dy, anchor) });
    ends.push(at + life);
    at += between(random, every);
  }
  return comets;
}

/** An #rrggbb colour at `alpha`, as rgba(). */
function rgba(colour: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

const px = (value: number): string => `${value.toFixed(1)}px`;

/** The comets drawn: each an element moved by one animation of opacity and transform, repeating each cycle. */
export function drawComets(doc: Document, comets: readonly Comet[], cycle: number = COMETS.cycleSeconds): HTMLElement[] {
  return comets.map((comet) => {
    const thickness = comet.head * COMETS.tailShare;
    const tail = html(doc, 'div', { class: 'comet__tail' });
    tail.style.setProperty('top', px(-thickness / 2));
    tail.style.setProperty('width', px(comet.length));
    tail.style.setProperty('height', px(thickness));
    tail.style.setProperty('transform', `rotate(${comet.angle.toFixed(1)}deg)`);
    tail.style.setProperty('background', `linear-gradient(90deg, ${rgba(comet.colour, COMETS.tailAlpha)}, ${rgba(comet.colour, 0)})`);
    const head = html(doc, 'div', { class: 'comet__head' });
    head.style.setProperty('left', px(-comet.head / 2));
    head.style.setProperty('top', px(-comet.head / 2));
    head.style.setProperty('width', px(comet.head));
    head.style.setProperty('height', px(comet.head));
    head.style.setProperty('background', COMETS.head);
    // The frames' glow: about the head's size, spreading a third of it.
    head.style.setProperty('box-shadow', `0 0 ${String(Math.floor(comet.head + 0.4))}px ${String(Math.round(comet.head / 3))}px ${rgba(comet.colour, COMETS.glowAlpha)}`);
    const element = html(doc, 'div', { class: 'comet', attrs: { 'aria-hidden': 'true' } }, [tail, head]);
    element.style.setProperty('left', px(comet.x));
    element.style.setProperty('top', px(comet.y));
    const share = (seconds: number): number => seconds / cycle;
    const fade = comet.life * COMETS.fadeShare;
    const moved = `translate(${px(comet.dx)}, ${px(comet.dy)})`;
    element.animate(
      [
        { offset: 0, opacity: 0, transform: 'translate(0px, 0px)' },
        { offset: share(fade), opacity: 1 },
        { offset: share(comet.life - fade), opacity: 1 },
        { offset: share(comet.life), opacity: 0, transform: moved },
        { offset: 1, opacity: 0, transform: moved },
      ],
      { duration: cycle * 1000, delay: comet.start * 1000, iterations: Infinity, easing: 'linear', fill: 'backwards' },
    );
    return element;
  });
}
