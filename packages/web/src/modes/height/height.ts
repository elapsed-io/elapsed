/**
 * Height (plan, Design system > Display modes; the "height, full climb" and "height, paused" frames): the time
 * over a sky whose colour follows the plan's light model, from h + 1,500 m at the top of the screen to
 * h − 1,500 m at the bottom, climbing 140 m a focused minute and stopping at 100 km; the stars fade in between
 * 18 and 42 km. The time, the icons and the buttons take the frames' own colours over the sky (height.css).
 *
 * The sky glides: a strip of gradient drawn once a minute from the minute's start to its end (a stop every
 * 100 m of the light model), which a linear CSS transform moves down the screen over the minute, on its own
 * layer; the stars' opacity glides with it. Script sets them once a minute and never runs a loop. Paused or
 * waiting for a check-in they hold where they reached; with low power (or reduced motion) they step once a
 * minute (plan, Loading and performance > Low power).
 *
 * While paused (and not in low power): a line at the bottom gives the altitude and the layer of the atmosphere,
 * and once stars are visible, shooting stars streak across and, rarely, a meteor shower bursts from one point.
 * Each is drawn at random once, when the pause starts, and moved by CSS animations alone (height.css).
 *
 * Its replay is the climb profile and the lit card (climb-profile.ts), loaded with the results.
 */

import 'virtual:tokens/height.css';
import './height.css';
import { BRAND, CONFIG, atmosphereLayer, heightReached, skyColour, starsOpacity } from '@stopwatch/core';
import type { Session, TimerView } from '@stopwatch/core';
import { ART } from '../../art/registry.ts';
import { html } from '../../dom.ts';
import type { DisplayContext, DisplayMode, ModeOptions, ReplaySurface } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

const HEIGHT = CONFIG.modes.height;
const MINUTE_MS = 60_000;
const DRIFT_MS = 250;
const HALF = HEIGHT.gradientHalfSpanMetres;
const grouped = (metres: number): string => Math.round(metres).toLocaleString('en-US');
const STEP = HEIGHT.gradientStepMetres;

/**
 * The sky from height `bottom` to height `top` as a CSS gradient drawn from the bottom up, a stop every 100 m
 * (so the light model's curve is followed, not a straight line between its ends).
 */
export function skyGradient(bottom: number, top: number): string {
  const span = Math.max(top - bottom, 1e-6);
  const count = Math.max(1, Math.ceil(span / STEP));
  const stops = Array.from({ length: count + 1 }, (_, i) => {
    const height = Math.min(top, bottom + (i * span) / count);
    return `${skyColour(height)} ${String(Math.round(((height - bottom) / span) * 100_000) / 1000)}%`;
  });
  return `linear-gradient(0deg, ${stops.join(', ')})`;
}

type State = 'idle' | 'running' | 'held';

/** A random number between `min` and `max`. */
const between = (random: () => number, { min, max }: { readonly min: number; readonly max: number }): number => min + random() * (max - min);
const pick = <T>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;

/**
 * The pause's shooting stars and meteor shower, drawn at random once: each a streak whose length, thickness,
 * colour, slope, travel, period and phase are its own (the "height, paused" frame), moved by height.css's
 * keyframes. Positions are shares of the screen; sizes and travel are the frame's pixels.
 */
export function drawMeteors(doc: Document, random: () => number = Math.random): HTMLElement[] {
  const m = HEIGHT.meteors;
  const streak = (left: number, top: number, angle: number, travel: number, className: string): HTMLElement => {
    const element = html(doc, 'div', { class: className });
    const radians = (angle * Math.PI) / 180;
    element.style.setProperty('--meteor-left', String(left / m.frameWidthPx));
    element.style.setProperty('--meteor-top', String(top / m.frameHeightPx));
    element.style.setProperty('--meteor-length', `${between(random, m.lengthPx).toFixed(0)}px`);
    element.style.setProperty('--meteor-thickness', `${between(random, m.thicknessPx).toFixed(1)}px`);
    element.style.setProperty('--meteor-colour', pick(random, m.colours));
    element.style.setProperty('--meteor-angle', `${angle.toFixed(0)}deg`);
    element.style.setProperty('--meteor-dx', `${(travel * Math.cos(radians)).toFixed(0)}px`);
    element.style.setProperty('--meteor-dy', `${(travel * Math.sin(radians)).toFixed(0)}px`);
    return element;
  };
  const area = m.startArea;
  const shooting = Array.from({ length: m.count }, () => {
    const element = streak(between(random, { min: area.leftPx, max: area.rightPx }), between(random, { min: area.topPx, max: area.bottomPx }), between(random, m.angleDegrees), between(random, m.travelPx), 'meteor');
    const period = between(random, m.periodSeconds);
    element.style.setProperty('--meteor-period', `${period.toFixed(2)}s`);
    element.style.setProperty('--meteor-delay', `${(random() * period).toFixed(2)}s`);
    return element;
  });
  // The shower: from one point, within 3 s, once a period; its first comes at random within that period.
  const shower = m.shower;
  const radiant = { x: between(random, { min: shower.radiantArea.leftPx, max: shower.radiantArea.rightPx }), y: between(random, { min: shower.radiantArea.topPx, max: shower.radiantArea.bottomPx }) };
  const showerAt = random() * shower.periodSeconds;
  const count = Math.min(shower.count.max, Math.floor(between(random, { min: shower.count.min, max: shower.count.max + 1 })));
  const burst = Array.from({ length: count }, () => {
    const spread = (): number => (random() * 2 - 1) * shower.spreadPx;
    const element = streak(radiant.x + spread(), radiant.y + spread(), between(random, shower.angleDegrees), between(random, shower.travelPx), 'meteor meteor--shower');
    element.style.setProperty('--meteor-delay', `${(showerAt + random() * shower.withinSeconds).toFixed(2)}s`);
    return element;
  });
  return [...shooting, ...burst];
}

/** A resolved CSS time ("0.18s", "180ms") in milliseconds; 0 when unreadable. */
function timeMs(value: string): number {
  const text = value.trim();
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) return 0;
  return text.endsWith('ms') ? number : number * 1000;
}

export function createHeightMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let context: DisplayContext | null = null;
  let strip: HTMLDivElement | null = null;
  let stars: HTMLDivElement | null = null;
  let glides: Animation[] = [];
  let glidingMinute: number | null = null;
  let still = '';
  let sky: HTMLDivElement | null = null;
  let meteors: HTMLDivElement | null = null;
  let altitude: HTMLDivElement | null = null;

  const cancelGlides = (): void => {
    for (const glide of glides) glide.cancel();
    glides = [];
  };

  /** Leaves with a quick fade: the pause's effects when the timer resumes. */
  const leave = (element: HTMLElement): void => {
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
  };

  /** While paused (and not in low power): the altitude line, and the meteors once stars are visible. */
  const showPause = (paused: boolean, height: number): void => {
    sky?.classList.toggle('height__sky--paused', paused);
    const effects = paused && context !== null && !context.lowPower && !context.reducedMotion;
    if (altitude !== null) {
      if (effects) altitude.textContent = BRAND.copy.height.altitude.replace('{height}', grouped(height)).replace('{layer}', BRAND.copy.height.layers[atmosphereLayer(height)]);
      altitude.classList.toggle('height__altitude--shown', effects);
    }
    const wanted = effects && starsOpacity(height) > 0;
    if (wanted && meteors === null && sky !== null) {
      meteors = html(sky.ownerDocument, 'div', { class: 'meteors' }, drawMeteors(sky.ownerDocument));
      sky.append(meteors);
    } else if (!wanted && meteors !== null) {
      leave(meteors);
      meteors = null;
    }
  };

  /** Draws the strip from height `bottom` to height `top`, the screen showing 3,000 m of it (2 × the half span). */
  const drawStrip = (bottom: number, top: number): void => {
    if (strip === null) return;
    strip.style.setProperty('height', `${String(((top - bottom) / (2 * HALF)) * 100)}%`);
    strip.style.setProperty('background-image', skyGradient(bottom, top));
  };

  const place = (focusedMs: number, state: State): void => {
    if (strip === null || stars === null) return;
    const stepped = context?.lowPower === true;
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    if (state !== 'running' || stepped) {
      const height = heightReached(stepped || state === 'idle' ? minute * MINUTE_MS : focusedMs);
      const key = `${String(height)}/${state}`;
      if (glidingMinute === null && key === still) return;
      cancelGlides();
      glidingMinute = null;
      still = key;
      // Standing still: exactly the sky at this height, filling the screen.
      strip.classList.add('height__strip--still');
      strip.style.removeProperty('transform');
      drawStrip(height - HALF, height + HALF);
      stars.style.setProperty('opacity', String(starsOpacity(height)));
      return;
    }
    still = '';
    const from = heightReached(minute * MINUTE_MS);
    const to = heightReached((minute + 1) * MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glides.length === 0 || glidingMinute !== minute;
    if (fresh) {
      cancelGlides();
      glidingMinute = minute;
      strip.classList.remove('height__strip--still');
      strip.style.removeProperty('transform');
      // At 100 km nothing moves any more.
      if (to <= from) {
        drawStrip(from - HALF, from + HALF);
        stars.style.setProperty('opacity', String(starsOpacity(from)));
        return;
      }
      const bottom = from - HALF;
      const top = to + HALF;
      drawStrip(bottom, top);
      // Climbing, the sky moves down the screen: the strip's top comes into view.
      const timing = { duration: MINUTE_MS, easing: 'linear', fill: 'forwards' } as const;
      glides = [
        strip.animate([{ transform: 'translateY(0%)' }, { transform: `translateY(${String(((to - from) / (top - bottom)) * 100)}%)` }], timing),
        stars.animate([{ opacity: starsOpacity(from) }, { opacity: starsOpacity(to) }], timing),
      ];
    }
    for (const glide of glides) {
      if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
      if (glide.playState !== 'running') glide.play();
    }
  };

  return {
    id: 'height',
    replayTiming: HEIGHT.replay,
    replayLayout: 'chart',
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      cancelGlides();
      glidingMinute = null;
      still = '';
      const doc = element.ownerDocument;
      strip = html(doc, 'div', { class: 'height__strip height__strip--still' });
      stars = html(doc, 'div', { class: 'height__stars' });
      sky = html(doc, 'div', { class: 'height__sky', attrs: { 'aria-hidden': 'true' } }, [strip, stars]);
      meteors = null;
      // Said aloud by the timer's own status line; shown here for the eye.
      altitude = html(doc, 'div', { class: 'height__altitude', attrs: { 'aria-hidden': 'true' } });
      display = new TimeDisplay(doc, displayContext);
      element.replaceChildren(sky, display.element, altitude);
      const field = stars;
      void import('../../art/height/sky.ts').then(({ HEIGHT_SKY }) => {
        if (stars !== field) return;
        if (!HEIGHT_SKY.entries.every((entry) => ART.has(entry.key))) ART.register(HEIGHT_SKY);
        const art = ART.draw(doc, 'sky/stars', 'art height__stars-art');
        art.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        field.replaceChildren(art);
      });
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      const state: State = view.status === 'idle' || view.status === 'ended' ? 'idle' : view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held';
      place(view.focusedMs, state);
      showPause(view.status === 'paused', heightReached(view.focusedMs));
    },
    async replay(surface: ReplaySurface, session: Session, options?: ModeOptions) {
      // The climb profile loads with the results, not with the timer.
      const { drawClimbProfile } = await import('./climb-profile.ts');
      await drawClimbProfile(surface, session, { landmarks: options?.resultsLandmarks ?? true });
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      cancelGlides();
      root?.replaceChildren();
      root = null;
      display = null;
      context = null;
      strip = null;
      stars = null;
      sky = null;
      meteors = null;
      altitude = null;
      glidingMinute = null;
    },
  };
}
