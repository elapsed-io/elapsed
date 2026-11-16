/**
 * The particles piece (docs/recipes/mode-recipes.md): ambient things that come while the recipe shows them (ocean
 * life and shooting stars, while paused) and leave with a quick fade when it stops (the timer resumes). Never with
 * low power or reduced motion: the recipe mode keeps every particle layer hidden then. Everything moves by CSS
 * animations timed from when it is drawn; nothing runs per frame.
 *
 * - `shape: image`, arriving by drifting in: the "ocean depth, paused" frame's ocean life, the zone's catalog
 *   (its far, middle and near schools and its bubbles, each a slot) drawn as the frame places it, schools crossing
 *   at three distances and bubbles rising, fading in. The frame's arrangement is the placeholder for the plan's
 *   random picks from each zone's catalog (decision 323).
 * - `shape: streak`: the "height, paused" frame's shooting stars, each drawn at random once with its own length,
 *   thickness, colour, slope, travel and period from the layer's ranges, and its rare burst (a meteor shower).
 */

import './drift.css';
import './streaks.css';
import { CONFIG, zoneAt } from '@stopwatch/core';
import type { ParticlesLayer, Range } from '@stopwatch/core';
import { ART } from '../../../art/registry.ts';
import { html } from '../../../dom.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import type { Slots } from '../../recipe/slots.ts';

const LIFE = CONFIG.modes.ocean.life;
const METEORS = CONFIG.modes.height.meteors;

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

/**
 * The drifting images as the ocean frame places them: bubbles rising and schools at three distances, the zone's
 * art from its four slots (far, middle and near schools, a bubble), each moved by CSS animations alone.
 */
export function drawDrift(doc: Document, art: readonly [string, string, string, string]): HTMLElement[] {
  const { frameWidthPx: W, frameHeightPx: H, spanPx, phasePx, wiggleRate, bobRate, bubbleSpanPx, bubbleSwayRate } = LIFE;
  const [far, mid, near, bubbleKey] = art;
  const byDistance = { far, mid, near };
  const fish = LIFE.fish.map(([ox, oy, row, speed, direction, scale, phase]) => {
    const distance = LIFE.distances[row] ?? 'near';
    const drawn = ART.draw(doc, byDistance[distance], `art life__fish${direction > 0 ? ' life__fish--right' : ''}`);
    drawn.setAttribute('width', String(54 * scale));
    drawn.setAttribute('height', String(22 * scale));
    const body = html(doc, 'div', { class: 'life__body' }, [drawn]);
    body.style.setProperty('--fish-x', `${String(ox)}px`);
    body.style.setProperty('--fish-y', `${String(oy - 11 * scale)}px`);
    const bob = html(doc, 'div', { class: 'life__bob' }, [body]);
    bob.style.setProperty('--sine-amp', `${String(LIFE.bobPx)}px`);
    bob.style.setProperty('--sine-period', `${String((2 * Math.PI) / bobRate)}s`);
    bob.style.setProperty('--sine-delay', `${String(-(2 * phase) / bobRate)}s`);
    const wiggle = html(doc, 'div', { class: 'life__wiggle' }, [bob]);
    wiggle.style.setProperty('--sine-amp', `${String(LIFE.wigglePx)}px`);
    wiggle.style.setProperty('--sine-period', `${String((2 * Math.PI) / wiggleRate)}s`);
    wiggle.style.setProperty('--sine-delay', `${String(-phase / wiggleRate)}s`);
    const travel = html(doc, 'div', { class: direction > 0 ? 'life__travel life__travel--right' : 'life__travel life__travel--left' }, [wiggle]);
    travel.style.setProperty('--life-row', String(row / H));
    travel.style.setProperty('--travel-period', `${String(spanPx / speed)}s`);
    travel.style.setProperty('--travel-delay', `${String(-((phase * phasePx) % spanPx) / speed)}s`);
    return travel;
  });
  const bubbles = LIFE.bubbles.map(([x, radius, speed, phase], index) => {
    const drawn = ART.draw(doc, bubbleKey, 'art life__bubble');
    drawn.setAttribute('width', String(2 * radius));
    drawn.setAttribute('height', String(2 * radius));
    const ball = html(doc, 'div', { class: 'life__ball' }, [drawn]);
    ball.style.setProperty('--bubble-r', `${String(radius)}px`);
    const sway = html(doc, 'div', { class: 'life__wiggle' }, [ball]);
    sway.style.setProperty('--sine-amp', `${String(LIFE.bubbleSwayPx)}px`);
    sway.style.setProperty('--sine-period', `${String((2 * Math.PI) / bubbleSwayRate)}s`);
    sway.style.setProperty('--sine-delay', `${String(-index / bubbleSwayRate)}s`);
    const rise = html(doc, 'div', { class: 'life__rise' }, [sway]);
    rise.style.setProperty('--life-x', String(x / W));
    rise.style.setProperty('--rise-period', `${String(bubbleSpanPx / speed)}s`);
    rise.style.setProperty('--rise-delay', `${String(-phase / speed)}s`);
    return rise;
  });
  return [...bubbles, ...fish];
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

export function particlesPiece({ doc, layer, recipe, slots }: PieceSetup<ParticlesLayer>): Piece {
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
        element.replaceChildren(...drawDrift(doc, art));
        element.classList.add('life--in');
      });
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
