/**
 * Ocean depth (plan, Design system > Display modes; the "ocean depth, running" and "0 to 20 m" frames): the
 * time over water whose colour follows the plan's light model, from depth − 6 m at the top of the screen to
 * depth + 6 m at the bottom, going down 15 m a focused minute and stopping at 10,935 m. The time, the icons
 * and the buttons take the frames' own colours over the water (ocean.css).
 *
 * The screen shows the water from 6 m above the depth to 6 m below, never above the surface: in the first
 * 6 m, from the surface to 6 m below (the "0 to 20 m" frame). The water glides: it is a strip of gradient
 * drawn once a minute from the minute's start to its end (every metre an exact colour of the light model),
 * which a linear CSS transform moves up the screen over the minute, on its own layer; in the first minute it
 * is also stretched from the surface, through keyframes fine enough to follow the growing window. Script
 * sets it once a minute and never runs a loop. Paused or waiting for a check-in it holds where it reached;
 * with low power (or reduced motion) it steps once a minute (plan, Product principles and Loading and
 * performance > Low power).
 *
 * Its replay is the dive profile and the lit card (depth-profile.ts), loaded with the results.
 */

import 'virtual:tokens/ocean.css';
import './ocean.css';
import { CONFIG, oceanColour, oceanDepth, oceanZone } from '@stopwatch/core';
import type { OceanZone, Session, TimerView } from '@stopwatch/core';
import { ART } from '../../art/registry.ts';
import type { ArtCatalog } from '../../art/registry.ts';
import { html } from '../../dom.ts';
import type { DisplayContext, DisplayMode, ModeOptions, ReplaySurface } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

const OCEAN = CONFIG.modes.ocean;
const MINUTE_MS = 60_000;
const DRIFT_MS = 250;
const HALF = OCEAN.gradientHalfSpanMetres;

/**
 * The water from depth `top` to depth `bottom` as a CSS gradient, a stop every metre (so the light model's
 * curve is followed, not a straight line between its ends).
 */
export function waterGradient(top: number, bottom: number): string {
  const span = Math.max(bottom - top, 1e-6);
  const stops: string[] = [];
  const count = Math.max(1, Math.ceil(span));
  for (let i = 0; i <= count; i += 1) {
    const depth = Math.min(bottom, top + (i * span) / count);
    stops.push(`${oceanColour(depth)} ${String(Math.round(((depth - top) / span) * 100_000) / 1000)}%`);
  }
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

type State = 'idle' | 'running' | 'held';

/** The water the screen shows at `depth`: 6 m above to 6 m below, never above the surface (the frames). */
export function waterWindow(depth: number): { readonly top: number; readonly bottom: number } {
  return { top: Math.max(0, depth - HALF), bottom: depth + HALF };
}

/** How finely the first metres' zoom is keyframed (the window grows from 6 m to 12 m tall). */
const ZOOM_STEP_METRES = 0.125;

/**
 * One minute's glide of a strip of water drawn from `top` to `bottom`, as keyframes: from `from` to `to`
 * metres, the window of waterWindow() at every moment. Past the first 6 m the window only moves, a translation;
 * nearer the surface it also grows, from 0–6 m to 0–12 m, a scale keyframed finely enough to follow it.
 */
export function glideKeyframes(from: number, to: number, top: number, bottom: number): Keyframe[] {
  const span = bottom - top;
  const frame = (depth: number): string => {
    const window = waterWindow(depth);
    const scale = (2 * HALF) / (window.bottom - window.top);
    return `translateY(${String((-(window.top - top) / span) * 100)}%) scaleY(${String(scale)})`;
  };
  const depths = [from];
  for (let depth = Math.ceil(from / ZOOM_STEP_METRES) * ZOOM_STEP_METRES; depth < Math.min(HALF, to); depth += ZOOM_STEP_METRES) if (depth > from) depths.push(depth);
  if (from < HALF && to > HALF) depths.push(HALF);
  depths.push(to);
  return depths.map((depth) => ({ offset: (depth - from) / (to - from), transform: frame(depth) }));
}

/** Each zone's life catalog, loaded only when a pause there shows it (art/ocean/life-<zone>.ts). */
const LIFE_CATALOGS: Readonly<Record<OceanZone, () => Promise<{ LIFE: ArtCatalog }>>> = {
  sunlight: () => import('../../art/ocean/life-sunlight.ts'),
  twilight: () => import('../../art/ocean/life-twilight.ts'),
  midnight: () => import('../../art/ocean/life-midnight.ts'),
  abyssal: () => import('../../art/ocean/life-abyssal.ts'),
  hadal: () => import('../../art/ocean/life-hadal.ts'),
};

const LIFE = OCEAN.life;

/** A resolved CSS time ("0.18s", "180ms") in milliseconds; 0 when unreadable. */
function timeMs(value: string): number {
  const text = value.trim();
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) return 0;
  return text.endsWith('ms') ? number : number * 1000;
}

/**
 * Ocean life (the "ocean depth, paused" frame), as the frame places it: bubbles rising and three schools at
 * three distances, each moved by CSS animations alone (ocean.css), timed from now, so nothing runs per frame.
 */
function drawLife(doc: Document, zone: OceanZone): HTMLElement[] {
  const { frameWidthPx: W, frameHeightPx: H, spanPx, phasePx, wiggleRate, bobRate, bubbleSpanPx, bubbleSwayRate } = LIFE;
  const fish = LIFE.fish.map(([ox, oy, row, speed, direction, scale, phase]) => {
    const distance = LIFE.distances[row] ?? 'near';
    const art = ART.draw(doc, `${zone}/fish-${distance}`, `art life__fish${direction > 0 ? ' life__fish--right' : ''}`);
    art.setAttribute('width', String(54 * scale));
    art.setAttribute('height', String(22 * scale));
    const body = html(doc, 'div', { class: 'life__body' }, [art]);
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
    const art = ART.draw(doc, `${zone}/bubble`, 'art life__bubble');
    art.setAttribute('width', String(2 * radius));
    art.setAttribute('height', String(2 * radius));
    const ball = html(doc, 'div', { class: 'life__ball' }, [art]);
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

export function createOceanMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let context: DisplayContext | null = null;
  let strip: HTMLDivElement | null = null;
  let glide: Animation | null = null;
  let glidingMinute: number | null = null;
  let still = '';
  let water: HTMLDivElement | null = null;
  let life: HTMLDivElement | null = null;

  /** While paused, life drifts in, unless the option is off or low power (or reduced motion) is on. */
  const showLife = (paused: boolean, depth: number): void => {
    const wanted = paused && context !== null && context.options.oceanLife && !context.lowPower;
    if (wanted && life === null && water !== null) {
      const doc = water.ownerDocument;
      const layer = html(doc, 'div', { class: 'life', attrs: { 'data-zone': oceanZone(depth) } });
      life = layer;
      water.append(layer);
      const zone = oceanZone(depth);
      void LIFE_CATALOGS[zone]().then(({ LIFE: catalog }) => {
        if (life !== layer) return;
        if (!catalog.entries.every((entry) => ART.has(entry.key))) ART.register(catalog);
        layer.replaceChildren(...drawLife(doc, zone));
        layer.classList.add('life--in');
      });
    } else if (!wanted && life !== null) {
      // It leaves when the timer resumes.
      const leaving = life;
      life = null;
      const fade = leaving.animate([{ opacity: getComputedStyle(leaving).opacity }, { opacity: 0 }], { duration: timeMs(getComputedStyle(leaving).getPropertyValue('--motion-fade')), easing: 'ease-out', fill: 'forwards' });
      void fade.finished.then(
        () => {
          leaving.remove();
        },
        () => {
          leaving.remove();
        },
      );
    }
  };

  /** Draws the strip from depth `top` to depth `bottom`, the screen showing 12 m of it (2 × the half span). */
  const drawStrip = (top: number, bottom: number): void => {
    if (strip === null) return;
    strip.style.setProperty('height', `${String(((bottom - top) / (2 * HALF)) * 100)}%`);
    strip.style.setProperty('background-image', waterGradient(top, bottom));
  };

  const place = (focusedMs: number, state: State): void => {
    if (strip === null) return;
    const stepped = context?.lowPower === true;
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    if (state !== 'running' || stepped) {
      const depth = oceanDepth(stepped || state === 'idle' ? minute * MINUTE_MS : focusedMs);
      const key = `${String(depth)}/${state}`;
      if (glidingMinute === null && key === still) return;
      glide?.cancel();
      glide = null;
      glidingMinute = null;
      still = key;
      // Standing still: exactly the window at this depth, filling the screen.
      const window = waterWindow(depth);
      strip.classList.add('ocean__strip--still');
      strip.style.removeProperty('transform');
      strip.style.setProperty('height', '100%');
      strip.style.setProperty('background-image', waterGradient(window.top, window.bottom));
      return;
    }
    still = '';
    const from = oceanDepth(minute * MINUTE_MS);
    const to = oceanDepth((minute + 1) * MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glide === null || glidingMinute !== minute;
    if (fresh) {
      glide?.cancel();
      glide = null;
      glidingMinute = minute;
      strip.classList.remove('ocean__strip--still');
      strip.style.removeProperty('transform');
      // At the deepest point nothing moves any more.
      if (to <= from) {
        const window = waterWindow(from);
        strip.style.setProperty('height', '100%');
        strip.style.setProperty('background-image', waterGradient(window.top, window.bottom));
        return;
      }
      const top = waterWindow(from).top;
      const bottom = waterWindow(to).bottom;
      drawStrip(top, bottom);
      glide = strip.animate(glideKeyframes(from, to, top, bottom), { duration: MINUTE_MS, easing: 'linear', fill: 'forwards' });
    }
    if (glide === null) return;
    if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
    if (glide.playState !== 'running') glide.play();
  };

  return {
    id: 'ocean',
    replayTiming: OCEAN.replay,
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      glide = null;
      glidingMinute = null;
      still = '';
      const doc = element.ownerDocument;
      strip = html(doc, 'div', { class: 'ocean__strip ocean__strip--still' });
      water = html(doc, 'div', { class: 'ocean__water', attrs: { 'aria-hidden': 'true' } }, [strip]);
      life = null;
      display = new TimeDisplay(doc, displayContext);
      element.replaceChildren(water, display.element);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      const state: State = view.status === 'idle' || view.status === 'ended' ? 'idle' : view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held';
      place(view.focusedMs, state);
      showLife(view.status === 'paused', oceanDepth(view.focusedMs));
    },
    async replay(surface: ReplaySurface, session: Session, options?: ModeOptions) {
      // The dive profile loads with the results, not with the timer.
      const { drawDepthProfile } = await import('./depth-profile.ts');
      await drawDepthProfile(surface, session, { landmarks: options?.resultsLandmarks ?? true });
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      glide?.cancel();
      root?.replaceChildren();
      root = null;
      display = null;
      context = null;
      strip = null;
      water = null;
      life = null;
      glide = null;
      glidingMinute = null;
    },
  };
}
