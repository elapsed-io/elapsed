/**
 * The particles piece (docs/recipes/mode-recipes.md): ambient things that come while the recipe shows them (ocean
 * life and shooting stars, while paused) and leave with a quick fade when it stops (the timer resumes). Never with
 * low power or reduced motion: the recipe mode keeps every particle layer hidden then. Everything moves by CSS
 * animations timed from when it is drawn; nothing runs per frame.
 *
 * - `shape: image`, arriving by drifting in: ocean life (owner, changes 4). Arrivals come at random from the
 *   current zone's catalog (its far, middle and near fish and its bubbles, each a slot): every few seconds as the
 *   layer sets out (`every`), at most `maxAtOnce` at once, each staying its `lifetime`, at three distances (far
 *   ones smaller, higher and slower), schools and single fish drifting and bubbles rising, fading in and out. The
 *   schedule is drawn at random once, when the pause starts, for a few minutes that then repeat; each arrival
 *   is one animation of opacity and transform, so nothing runs per frame. The "ocean depth, paused" frame shows
 *   one such moment.
 * - `shape: streak`: the "height, paused" frame's shooting stars, each drawn at random once with its own length,
 *   thickness, colour, slope, travel and period from the layer's ranges, and its rare burst (a meteor shower).
 */

import './drift.css';
import './streaks.css';
import './comets.css';
import { CONFIG, HEIGHT_METEORS_CONFIG, OCEAN_LIFE_CONFIG, zoneAt } from '@stopwatch/core';
import type { ParticlesLayer, Range } from '@stopwatch/core';
import { ART } from '../../../art/registry.ts';
import { html } from '../../../dom.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import type { Slots } from '../../recipe/slots.ts';
import { drawComets, scheduleComets } from './comets.ts';

const LIFE = OCEAN_LIFE_CONFIG;
const METEORS = HEIGHT_METEORS_CONFIG;

/** A resolved CSS time ("0.18s", "180ms") in milliseconds; 0 when unreadable. */
function timeMs(value: string): number {
  const text = value.trim();
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) return 0;
  return text.endsWith('ms') ? number : number * 1000;
}

/** Leaves with a quick fade, then goes. */
function leave(element: HTMLElement): void {
  const style = getComputedStyle(element);
  const fade = element.animate([{ opacity: style.opacity }, { opacity: 0 }], { duration: timeMs(style.getPropertyValue('--motion-fade')), easing: 'ease-out', fill: 'forwards' });
  void fade.finished.then(
    () => {
      element.remove();
    },
    () => {
      element.remove();
    },
  );
}

/** How long a drawn schedule of arrivals runs before it repeats, in seconds. */
export const ARRIVAL_CYCLE_SECONDS = LIFE.cycleSeconds;

/** One arrival: what comes, where, when (seconds into the pause) and for how long, and how far it drifts. */
export interface Arrival {
  /** Index into the zone's catalog: 0 far, 1 middle and 2 near fish, 3 bubbles. */
  readonly art: 0 | 1 | 2 | 3;
  readonly start: number;
  readonly life: number;
  /** Where it appears, as shares of the screen. */
  readonly x: number;
  readonly y: number;
  /** How far it moves over its stay, in the frame's pixels. */
  readonly dx: number;
  readonly dy: number;
  /** Fish drawn at this scale (the distance's, varied by the layer's size range); facing right or left. */
  readonly scale: number;
  readonly right: boolean;
  /** Each fish's or bubble's offset from the arrival's place, in pixels (and a bubble's radius). */
  readonly members: readonly (readonly [number, number, number])[];
}

/**
 * The pause's arrivals, drawn at random once: the first within the layer's shortest interval, each next one an
 * interval later, never more than `maxAtOnce` at once, all within one cycle. Three distances as the frame draws
 * them (rows, sizes and speeds), schools of three to seven and single fish, and columns of bubbles.
 */
export function scheduleArrivals(layer: ParticlesLayer, random: () => number = Math.random, cycle = ARRIVAL_CYCLE_SECONDS): Arrival[] {
  const { frameHeightPx: H, bubbleFromPx } = LIFE;
  const { rowsPx: rows, scales, speedsPxPerSecond: speeds, bubbles } = LIFE;
  const every = layer.every;
  const lifetime = layer.lifetime ?? LIFE.lifetimeSeconds;
  const sizes = layer.size?.scale ?? [1, 1];
  const ends: number[] = [];
  const arrivals: Arrival[] = [];
  let at = between(random, [Math.min(1, every[0]), every[0]]);
  for (;;) {
    const life = between(random, lifetime);
    // At most `maxAtOnce` at once: a newcomer waits for the first to leave.
    const active = ends.filter((end) => end > at).sort((a, b) => a - b);
    if (active.length >= layer.maxAtOnce) at = active[active.length - layer.maxAtOnce] ?? at;
    if (at + life > cycle) break;
    const art = Math.min(3, Math.floor(random() * 4)) as Arrival['art'];
    if (art === 3) {
      // A column of bubbles rising from below the screen.
      const count = 3 + Math.floor(random() * 4);
      const speed = between(random, bubbles.speedPxPerSecond);
      const members = Array.from({ length: count }, (_, k) => [(random() * 2 - 1) * bubbles.spreadPx, k * between(random, bubbles.spacingPx), between(random, bubbles.radiusPx)] as const);
      arrivals.push({ art, start: at, life, x: between(random, [0.1, 0.9]), y: bubbleFromPx / H, dx: 0, dy: -speed * life, scale: 1, right: true, members });
    } else {
      const row = rows[art];
      const right = random() < 0.5;
      const school = random() < 0.6;
      const count = school ? 3 + Math.floor(random() * 5) : 1;
      const members = Array.from({ length: count }, (_, k) => (k === 0 ? ([0, 0, 0] as const) : ([(random() * 2 - 1) * 70, (random() * 2 - 1) * 26, 0] as const)));
      arrivals.push({
        art,
        start: at,
        life,
        x: between(random, [0.12, 0.88]),
        y: (row + (random() * 2 - 1) * 30) / H,
        dx: (right ? 1 : -1) * speeds[art] * life,
        dy: 0,
        scale: scales[art] * between(random, sizes),
        right,
        members,
      });
    }
    ends.push(at + life);
    at += between(random, every);
  }
  return arrivals;
}

/** The arrivals drawn: each an element moved by one animation of opacity and transform, repeating each cycle. */
export function drawArrivals(doc: Document, arrivals: readonly Arrival[], art: readonly [string, string, string, string], cycle = ARRIVAL_CYCLE_SECONDS): HTMLElement[] {
  const { wiggleRate, bobRate, bubbleSwayRate } = LIFE;
  return arrivals.map((arrival, index) => {
    const key = art[arrival.art];
    const members = arrival.members.map(([ox, oy, radius]) => {
      if (arrival.art === 3) {
        const drawn = ART.draw(doc, key, 'art life__bubble');
        drawn.setAttribute('width', String(2 * radius));
        drawn.setAttribute('height', String(2 * radius));
        const ball = html(doc, 'div', { class: 'life__ball life__member' }, [drawn]);
        ball.style.setProperty('--bubble-r', `${String(radius)}px`);
        ball.style.setProperty('--member-x', `${ox.toFixed(1)}px`);
        ball.style.setProperty('--member-y', `${oy.toFixed(1)}px`);
        return ball;
      }
      const drawn = ART.draw(doc, key, `art life__fish${arrival.right ? ' life__fish--right' : ''}`);
      drawn.setAttribute('width', (54 * arrival.scale).toFixed(1));
      drawn.setAttribute('height', (22 * arrival.scale).toFixed(1));
      const body = html(doc, 'div', { class: 'life__member' }, [drawn]);
      body.style.setProperty('--member-x', `${(ox - 27 * arrival.scale).toFixed(1)}px`);
      body.style.setProperty('--member-y', `${(oy - 11 * arrival.scale).toFixed(1)}px`);
      return body;
    });
    // Fish bob and wiggle a little; bubbles sway (the frame's own motions).
    const sway = html(doc, 'div', { class: 'life__wiggle' }, members);
    sway.style.setProperty('--sine-amp', `${String(arrival.art === 3 ? LIFE.bubbleSwayPx : LIFE.wigglePx)}px`);
    sway.style.setProperty('--sine-period', `${String((2 * Math.PI) / (arrival.art === 3 ? bubbleSwayRate : wiggleRate))}s`);
    sway.style.setProperty('--sine-delay', `${String(-index / wiggleRate)}s`);
    const bob = html(doc, 'div', { class: 'life__bob' }, [sway]);
    bob.style.setProperty('--sine-amp', `${String(arrival.art === 3 ? 0 : LIFE.bobPx)}px`);
    bob.style.setProperty('--sine-period', `${String((2 * Math.PI) / bobRate)}s`);
    bob.style.setProperty('--sine-delay', `${String(-index / bobRate)}s`);
    const element = html(doc, 'div', { class: 'life__arrival', attrs: { 'data-distance': ['far', 'mid', 'near', 'bubbles'][arrival.art] ?? '' } }, [bob]);
    element.style.setProperty('--arrival-x', String(arrival.x));
    element.style.setProperty('--arrival-y', String(arrival.y));
    // Each arrival fades in and out over LIFE.fadeSeconds, at most a quarter of its stay.
    const fade = Math.min(LIFE.fadeSeconds, arrival.life / 4);
    const share = (seconds: number): number => seconds / cycle;
    const moved = `translate(${arrival.dx.toFixed(1)}px, ${arrival.dy.toFixed(1)}px)`;
    element.animate(
      [
        { offset: 0, opacity: 0, transform: 'translate(0px, 0px)' },
        { offset: share(fade), opacity: 1 },
        { offset: share(arrival.life - fade), opacity: 1 },
        { offset: share(arrival.life), opacity: 0, transform: moved },
        { offset: 1, opacity: 0, transform: moved },
      ],
      { duration: cycle * 1000, delay: arrival.start * 1000, iterations: Infinity, easing: 'linear', fill: 'backwards' },
    );
    return element;
  });
}

/** A random number between the ends of `range`. */
const between = (random: () => number, [min, max]: Range): number => min + random() * (max - min);
const pick = <T>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
const span = (range: { readonly min: number; readonly max: number }): Range => [range.min, range.max];

/**
 * Streaks drawn at random once: each its own length, thickness, colour, slope, travel, period and phase from the
 * layer's ranges (the "height, paused" frame's own when the layer leaves one out), and a burst of a shower from one
 * point within a few seconds, once a burst period at a random moment of it. Positions are shares of the screen.
 */
export function drawStreaks(doc: Document, layer: ParticlesLayer, random: () => number = Math.random): HTMLElement[] {
  const m = METEORS;
  const length = layer.size?.length ?? span(m.lengthPx);
  const thickness = layer.size?.thickness ?? span(m.thicknessPx);
  const colours = layer.colors ?? m.colours;
  const streak = (left: number, top: number, angle: number, travel: number, className: string): HTMLElement => {
    const element = html(doc, 'div', { class: className });
    const radians = (angle * Math.PI) / 180;
    element.style.setProperty('--meteor-left', String(left / m.frameWidthPx));
    element.style.setProperty('--meteor-top', String(top / m.frameHeightPx));
    element.style.setProperty('--meteor-length', `${between(random, length).toFixed(0)}px`);
    element.style.setProperty('--meteor-thickness', `${between(random, thickness).toFixed(1)}px`);
    element.style.setProperty('--meteor-colour', pick(random, colours));
    element.style.setProperty('--meteor-angle', `${angle.toFixed(0)}deg`);
    element.style.setProperty('--meteor-dx', `${(travel * Math.cos(radians)).toFixed(0)}px`);
    element.style.setProperty('--meteor-dy', `${(travel * Math.sin(radians)).toFixed(0)}px`);
    return element;
  };
  const area = m.startArea;
  const shooting = Array.from({ length: m.count }, () => {
    const element = streak(between(random, [area.leftPx, area.rightPx]), between(random, [area.topPx, area.bottomPx]), between(random, layer.angle ?? span(m.angleDegrees)), between(random, layer.distance ?? span(m.travelPx)), 'meteor');
    const period = between(random, layer.every);
    element.style.setProperty('--meteor-period', `${period.toFixed(2)}s`);
    element.style.setProperty('--meteor-delay', `${(random() * period).toFixed(2)}s`);
    return element;
  });
  const bursts = layer.bursts;
  if (bursts === undefined) return shooting;
  const shower = m.shower;
  const radiant = { x: between(random, [shower.radiantArea.leftPx, shower.radiantArea.rightPx]), y: between(random, [shower.radiantArea.topPx, shower.radiantArea.bottomPx]) };
  const [soonest, latest] = bursts.every ?? [shower.periodSeconds, shower.periodSeconds];
  const showerAt = random() * (soonest === latest ? soonest : between(random, [soonest, latest]));
  const [fewest, most] = bursts.count ?? span(shower.count);
  const count = Math.min(most, Math.floor(between(random, [fewest, most + 1])));
  const burst = Array.from({ length: count }, () => {
    const spread = (): number => (random() * 2 - 1) * shower.spreadPx;
    const element = streak(radiant.x + spread(), radiant.y + spread(), between(random, span(shower.angleDegrees)), between(random, span(shower.travelPx)), 'meteor meteor--shower');
    element.style.setProperty('--meteor-delay', `${(showerAt + random() * (bursts.within ?? shower.withinSeconds)).toFixed(2)}s`);
    return element;
  });
  return [...shooting, ...burst];
}

/** The zone's four drift images (far, middle and near schools, a bubble), as registry keys. */
function driftArt(layer: ParticlesLayer, slots: Slots, zone: string): readonly [string, string, string, string] | null {
  const ids = layer.catalogByZone?.[zone] ?? (layer.slot === undefined ? [] : [layer.slot]);
  const keys = ids.map((id) => slots.key(id));
  const [far, mid = far, near = mid, bubble = near] = keys;
  return far === undefined || mid === undefined || near === undefined || bubble === undefined ? null : [far, mid, near, bubble];
}

export function particlesPiece({ doc, layer, recipe, slots, stage }: PieceSetup<ParticlesLayer>): Piece {
  const container = html(doc, 'div', { class: 'particles' });
  let shown: HTMLElement | null = null;

  /** Whether the layer's own condition holds at `value` (shooting stars only once stars show). */
  const visible = (value: number): boolean => {
    const when = layer.visibleWhen;
    if (when === undefined) return true;
    if (when.min !== undefined && !(value > when.min)) return false;
    return !(when.max !== undefined && value > when.max);
  };

  const enter = (value: number): void => {
    if (layer.shape === 'image') {
      const zone = zoneAt(recipe.zones ?? [], value)?.[0] ?? '';
      const element = html(doc, 'div', { class: 'life', attrs: { 'data-zone': zone } });
      shown = element;
      container.append(element);
      const art = driftArt(layer, slots, zone);
      if (art === null) return;
      void slots.images(layer.catalogByZone?.[zone] ?? []).then(() => {
        if (shown !== element) return;
        element.replaceChildren(...drawArrivals(doc, scheduleArrivals(layer), art));
        element.classList.add('life--in');
      });
      return;
    }
    if (layer.shape === 'comet') {
      // In the scene's reference pixels, the tails away from the camera's anchor (the Sun).
      const view = doc.defaultView;
      const reference = CONFIG.design.reference.timer;
      const layout = stage?.layout;
      const scale = layout?.scale ?? Math.min((view?.innerWidth ?? reference.width) / reference.width, (view?.innerHeight ?? reference.height) / reference.height);
      const width = layout?.width ?? reference.width;
      const height = layout?.height ?? reference.height;
      const anchor = layout?.sun ?? [width / 2, height / 2];
      const box = html(doc, 'div', { class: 'comets__box' }, drawComets(doc, scheduleComets(layer, width, height, anchor)));
      box.style.setProperty('width', `${String(width)}px`);
      box.style.setProperty('height', `${String(height)}px`);
      box.style.setProperty('transform', `scale(${String(scale)})`);
      shown = html(doc, 'div', { class: 'comets' }, [box]);
      container.append(shown);
      return;
    }
    shown = html(doc, 'div', { class: 'meteors' }, drawStreaks(doc, layer));
    container.append(shown);
  };

  return {
    backdrop: [container],
    render({ active, value }) {
      const wanted = active && visible(value);
      if (wanted && shown === null) enter(value);
      else if (!wanted && shown !== null) {
        // It leaves when the timer resumes.
        leave(shown);
        shown = null;
      }
    },
    unmount() {
      shown = null;
    },
  };
}
