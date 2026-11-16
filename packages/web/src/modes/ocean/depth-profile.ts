/**
 * The dive profile, ocean depth's results replay (plan, Display modes > Results replays; the "results: ocean
 * depth (build this one)" frame).
 *
 * The card takes the light at the depth the replay has reached (the light model dimmed to 80 %): it opens in
 * the colour the session ended in and crosses to the surface's over 0.35 s as the replay begins, then follows
 * the dive. The chart draws the depth over the session's time (flat while paused), dashed lines where the
 * zones begin, the head, and the depth and zone so far at the top right; it zooms out as the dive deepens
 * (its scale stays 15 % past the depth so far, at least 200 m). Up to six landmarks, one or two from each
 * 1,000 m band and spread along the path, sit exactly on the path where the dive reached them; their labels
 * pop in as the dive passes and fade a second after the replay, leaving the dots, and come back while the
 * chart is hovered, focused or tapped (one only while its dot is hovered). Things from each zone rise past
 * the card as the replay crosses it, and two sonar pings sound from the deepest point as it ends.
 *
 * Everything that moves is derived in depth-profile.css from --replay-progress, through the depth reached so
 * far (--pd), with one exception: the pings and the end colour's crossfade are animations timed from the
 * replay's start (contract, ReplaySurface). Shapes are drawn in the chart's own units and shrink with it;
 * text keeps the frame's sizes (plan, Design system).
 */

import { BRAND, CONFIG, oceanLitColour, oceanZone, pickLandmarks, spreadLandmarks, summarise } from '@stopwatch/core';
import type { Landmark, OceanZone, Session } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import { ART } from '../../art/registry.ts';
import { formatClockTime } from '../../shell/clock-time.ts';
import type { ReplaySurface } from '../contract.ts';
import { focusStretches } from '../shared/replay-timing.ts';
import type { FocusStretch } from '../shared/replay-timing.ts';
import './depth-profile.css';

const OCEAN = CONFIG.modes.ocean;
const CHART = OCEAN.results;
const W = CHART.widthPx;
const H = CHART.heightPx;
const ZONES: readonly OceanZone[] = ['sunlight', 'twilight', 'midnight', 'abyssal', 'hadal'];

/** To one decimal, as the frame writes its numbers. */
const fixed = (value: number): string => value.toFixed(1);
const tenth = (value: number): number => Number(fixed(value));
const grouped = (metres: number): string => Math.round(metres).toLocaleString('en-US');
const percent = (share: number): string => `${String(share * 100)}%`;

/** Metres reached `minute` minutes into the session. */
export function depthAt(stretches: readonly FocusStretch[], minute: number): number {
  let focused = 0;
  for (const { from, to } of stretches) focused += Math.max(0, Math.min(minute, to) - from);
  return Math.min(OCEAN.maxDepthMetres, focused * OCEAN.metresPerFocusedMinute);
}

/** The minute the dive first reached `depth`, or null if it never did: the inverse of depthAt. */
export function minuteAt(stretches: readonly FocusStretch[], depth: number): number | null {
  let reached = 0;
  for (const { from, to } of stretches) {
    const span = (to - from) * OCEAN.metresPerFocusedMinute;
    if (reached + span >= depth) return from + (depth - reached) / OCEAN.metresPerFocusedMinute;
    reached += span;
  }
  return null;
}

/** The depth reached so far as a CSS expression of --replay-progress (metres), capped at the deepest point. */
export function depthExpression(stretches: readonly FocusStretch[], minutes: number): string {
  const terms = stretches.map(({ from, to }) => `clamp(0, var(--replay-progress) * ${String(minutes)} - ${String(from)}, ${String(to - from)})`);
  return `min(${String(OCEAN.maxDepthMetres)}, ${String(OCEAN.metresPerFocusedMinute)} * (${terms.length === 0 ? '0' : terms.join(' + ')}))`;
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

export interface ProfileOptions {
  /** Show random landmarks (the "results landmarks" mode option). */
  readonly landmarks: boolean;
  /** Where the landmarks' randomness comes from (tests pass a fixed one). */
  readonly random?: () => number;
}

/** The chart's geometry for a session at the end of its replay, in the frame's pixels at reference size. */
export interface ProfileGeometry {
  readonly minutes: number;
  readonly reached: number;
  /** The depth at the bottom of the chart once the replay has landed. */
  readonly scale: number;
  readonly stretches: readonly FocusStretch[];
  /** x, in pixels, `minute` minutes into the session. */
  readonly x: (minute: number) => number;
  /** y, in pixels, of `depth` at the final scale: the one function the path and the dots are drawn with. */
  readonly y: (depth: number) => number;
  readonly points: string;
  readonly head: { readonly x: number; readonly y: number };
}

export function profileGeometry(session: Session): ProfileGeometry {
  const summary = summarise(session);
  const minutes = Math.max(summary.elapsedMs / 60_000, 1 / 60);
  const stretches = focusStretches(session.segments, summary.startedAt);
  const reached = depthAt(stretches, minutes);
  const scale = Math.max(CHART.minScaleMetres, reached * CHART.scaleHeadroom);
  const y = (depth: number): number => Math.min(H, (depth / scale) * H);
  const x = (minute: number): number => (minute / minutes) * W;
  // The line: from the surface, down while focused, flat while paused.
  const points: string[] = [];
  const point = (minute: number): void => {
    const written = `${fixed(x(minute))},${fixed(y(depthAt(stretches, minute)))}`;
    if (points.at(-1) !== written) points.push(written);
  };
  point(0);
  for (const { from, to } of stretches) {
    point(from);
    point(to);
  }
  point(minutes);
  return { minutes, reached, scale, stretches, x, y, points: points.join(' '), head: { x: tenth(x(minutes)), y: tenth(y(reached)) } };
}

/** Where a landmark sits: its dot on the path, and its label beside it. */
export interface PlacedLandmark {
  readonly landmark: Landmark;
  /** The dot, exactly on the path where the dive reached it (never offset or clamped). */
  readonly x: number;
  readonly y: number;
  /** The label sits left of the dot once the dot is past the flip point. */
  readonly left: boolean;
  /** The dot's final opacity: it fades in over the metres after the dive passes it. */
  readonly opacity: number;
}

/** The landmarks the dive passed (at most six, spread along the path), placed as the frame places them. */
export function placeLandmarks(picked: readonly Landmark[], geometry: ProfileGeometry, random: () => number): PlacedLandmark[] {
  const mark = CHART.landmark;
  const passed = picked.filter((landmark) => landmark.depth <= geometry.reached && minuteAt(geometry.stretches, landmark.depth) !== null);
  return spreadLandmarks(passed, mark.max, random).map((landmark) => {
    const x = tenth(geometry.x(minuteAt(geometry.stretches, landmark.depth) ?? 0));
    return {
      landmark,
      x,
      y: tenth(geometry.y(landmark.depth)),
      left: x > mark.flipAfterPx,
      opacity: Number(smoothstep((geometry.reached - landmark.depth) / mark.fadeMetres).toFixed(2)),
    };
  });
}

/** Whether the depth can count up in CSS (round() and mod() in counters, as the headline's count). */
function canCount(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('width', 'calc(mod(7px, 3px) + round(down, 7px, 2px))');
}

/** The dimmed light from `top` to `bottom` metres as a gradient, a stop every metre (as the running water). */
function litGradient(top: number, bottom: number): string {
  const span = Math.max(bottom - top, 1e-6);
  const count = Math.max(1, Math.ceil(span));
  const stops = Array.from({ length: count + 1 }, (_, i) => {
    const depth = Math.min(bottom, top + (i * span) / count);
    return `${oceanLitColour(depth)} ${String(Math.round(((depth - top) / span) * 100_000) / 1000)}%`;
  });
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

/** The card's light window at `depth`: from 20 m above (never above the surface) to 60 m below. */
function litWindow(depth: number): { readonly top: number; readonly bottom: number } {
  const { aboveMetres, belowMetres } = CHART.lit;
  return { top: Math.max(0, depth - aboveMetres), bottom: depth + belowMetres };
}

/** Where each zone starts, and where the next begins (the hadal zone past the bottom). */
function zoneRange(name: OceanZone): { readonly from: number; readonly to: number } {
  const { sunlight, twilight, midnight, abyssal } = OCEAN.zones;
  const starts = [0, sunlight, twilight, midnight, abyssal, OCEAN.maxDepthMetres + 1];
  const index = ZONES.indexOf(name);
  return { from: starts[index] ?? 0, to: starts[index + 1] ?? 0 };
}

export async function drawDepthProfile(surface: ReplaySurface, session: Session, options: ProfileOptions = { landmarks: true }): Promise<void> {
  const doc = surface.graphic.ownerDocument;
  const summary = summarise(session);
  const geometry = profileGeometry(session);
  const { minutes, reached, scale, stretches } = geometry;
  const copy = BRAND.copy.ocean;
  const viewBox = `0 0 ${String(W)} ${String(H)}`;
  const random = options.random ?? Math.random;

  // ---- The chart ----------------------------------------------------------------------------------------
  // Dashed lines where the twilight, midnight and abyssal zones begin, shown once the scale has room for them.
  const lines = CHART.zoneLines;
  const zoned = (['twilight', 'midnight', 'abyssal'] as const).map((name, index) => {
    const start = lines.depths[index] ?? zoneRange(name).from;
    const y = (start / scale) * H;
    return { name, start, y, opacity: start < scale * lines.scaleShare && y > lines.minYPx ? lines.opacity : 0 };
  });
  const zoneLines = svg(doc, 'svg', { class: 'profile__svg', viewBox, 'aria-hidden': 'true' }, [
    svg(
      doc,
      'g',
      { class: 'profile__zoom' },
      zoned.map(({ start, y, opacity }) => {
        const zoneLine = svg(doc, 'line', { class: 'profile__zone-line', x1: 0, y1: fixed(y), x2: W, y2: fixed(y), 'stroke-width': 1, 'stroke-dasharray': lines.dash, 'vector-effect': 'non-scaling-stroke' });
        zoneLine.style.setProperty('--zone-start', String(start));
        zoneLine.style.setProperty('--zone-final', String(opacity));
        return zoneLine;
      }),
    ),
  ]);
  const path = svg(doc, 'svg', { class: 'profile__svg', viewBox, 'aria-hidden': 'true' }, [
    svg(doc, 'g', { class: 'profile__zoom' }, [
      svg(doc, 'polyline', { class: 'profile__line', points: geometry.points, 'stroke-width': CHART.lineWidthPx, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
    ]),
  ]);
  // The line is revealed from the left as the replay's time sweeps the session (the strip replay's clip).
  const reveal = html(doc, 'div', { class: 'profile__reveal' }, [html(doc, 'div', { class: 'profile__reveal-inner' }, [path])]);
  const head = svg(doc, 'svg', { class: 'profile__svg profile__head-layer', viewBox, 'aria-hidden': 'true' }, [
    svg(doc, 'circle', { class: 'profile__head', cx: fixed(geometry.head.x), cy: fixed(geometry.head.y), r: CHART.headRadiusPx }),
  ]);
  head.style.setProperty('--head-share', String(geometry.head.y / H));

  // The text, in pixels: the zone lines' names, the depth reached and its zone (while the replay runs, each
  // zone's name shows while the dive is in it).
  const zone = oceanZone(reached);
  const depthText = copy.depth.replace('{depth}', grouped(reached));
  const text = svg(doc, 'svg', { class: 'profile__text', 'aria-hidden': 'true' }, [
    ...zoned.map(({ name, start, y, opacity }) => {
      const label = svg(doc, 'text', { class: 'profile__zone-label', x: lines.labelLeftPx, y: percent(tenth(y) / H), dy: -lines.labelAbovePx }, [copy.zones[name]]);
      label.style.setProperty('--zone-start', String(start));
      label.style.setProperty('--zone-share', String(tenth(y) / H));
      label.style.setProperty('--zone-final', String(opacity));
      return label;
    }),
    svg(doc, 'text', { class: 'profile__depth', x: '100%', dx: -CHART.textInsetPx, y: CHART.depthBaselinePx, 'text-anchor': 'end' }, [depthText]),
    ...ZONES.map((name) => {
      const element = svg(doc, 'text', { class: name === zone ? 'profile__zone profile__zone--final' : 'profile__zone', 'data-zone': name, x: '100%', dx: -CHART.textInsetPx, y: CHART.zoneBaselinePx, 'text-anchor': 'end' }, [copy.zones[name]]);
      const range = zoneRange(name);
      element.style.setProperty('--zone-from', String(range.from));
      element.style.setProperty('--zone-to', String(range.to));
      return element;
    }),
  ]);

  const placed = options.landmarks ? placeLandmarks(pickLandmarks(random), geometry, random) : [];
  const marks = placed.map((landmark) => mark(doc, landmark));

  // Two soft sonar pings from the deepest point as the replay ends.
  const { fromRadiusPx, toRadiusPx, strokePx, durationMs, lagMs, opacity: pingOpacity, count: pingCount } = CHART.pings;
  const pings = Array.from({ length: pingCount }, (_, index) => {
    const size = 2 * toRadiusPx;
    const ping = html(doc, 'div', { class: 'profile__ping', attrs: { 'aria-hidden': 'true' } }, [
      svg(doc, 'svg', { class: 'profile__ping-ring', viewBox: `0 0 ${String(size)} ${String(size)}` }, [
        svg(doc, 'circle', { cx: toRadiusPx, cy: toRadiusPx, r: toRadiusPx - strokePx / 2, 'stroke-width': strokePx }),
      ]),
    ]);
    ping.style.setProperty('--ping-x', percent(geometry.head.x / W));
    ping.style.setProperty('--ping-y', percent(geometry.head.y / H));
    ping.animate(
      [
        { transform: `translate(-50%, -50%) scale(${String(fromRadiusPx / toRadiusPx)})`, opacity: pingOpacity },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ],
      { duration: durationMs * surface.scale, delay: surface.lengthMs + index * lagMs * surface.scale, easing: 'linear', fill: 'none' },
    );
    return ping;
  });

  // The depth counting up while the replay runs, in place of the final depth (depth-profile.css).
  const [before = '', after = ''] = copy.depth.split('{depth}');
  const count = html(doc, 'div', { class: 'profile__count', attrs: { 'aria-hidden': 'true' } }, [
    before,
    html(doc, 'span', { class: 'profile__digits' }, [html(doc, 'span', { class: 'profile__digits-small' }), html(doc, 'span', { class: 'profile__digits-large' })]),
    after,
    // An empty inline block sits on the line's baseline: where the count's baseline is, in any font.
    html(doc, 'span', { class: 'profile__baseline' }),
  ]);

  const chart = html(doc, 'div', { class: 'profile__chart', attrs: { role: 'img', tabindex: '0', 'aria-label': `${copy.profile}. ${depthText}, ${copy.zones[zone]}` } }, [
    zoneLines,
    reveal,
    head,
    text,
    ...marks,
    ...pings,
    count,
  ]);
  // A tap on a touch screen brings the labels back, or puts them away again.
  chart.addEventListener('click', () => {
    if (chart.closest('.results')?.hasAttribute('data-replayed') === true) chart.classList.toggle('profile__chart--labels');
  });
  // Once the labels have faded after the replay (or the chart is first used), they come and go promptly.
  const rest = (): void => {
    if (chart.closest('.results')?.hasAttribute('data-replayed') === true) chart.classList.add('profile__chart--rested');
  };
  for (const type of ['transitionend', 'pointerenter', 'focusin', 'click']) chart.addEventListener(type, rest);
  const times = html(doc, 'div', { class: 'profile__times' }, [html(doc, 'div', {}, [formatClockTime(summary.startedAt)]), html(doc, 'div', {}, [formatClockTime(summary.endedAt)])]);
  const list = html(doc, 'ul', { class: 'visually-hidden', attrs: { 'aria-label': copy.landmarksPassed } }, placed.map((landmark) => html(doc, 'li', {}, [landmarkLabel(landmark.landmark)])));
  const counting = canCount();
  const profile = html(doc, 'div', { class: counting ? 'profile profile--counting' : 'profile' }, [chart, times, ...(placed.length > 0 ? [list] : [])]);

  // ---- The card's light, and the things that pass -------------------------------------------------------
  const { blackFromMetres, aboveMetres, belowMetres, crossfadeMs } = CHART.lit;
  const windowMetres = aboveMetres + belowMetres;
  const stripBottom = blackFromMetres + windowMetres;
  const strip = html(doc, 'div', { class: 'lit__strip' });
  strip.style.setProperty('height', percent(stripBottom / windowMetres));
  strip.style.setProperty('background-image', litGradient(0, stripBottom));
  const final = litWindow(reached);
  const finalTop = Math.min(final.top, blackFromMetres);
  const finalK = windowMetres / (final.bottom - final.top);
  strip.style.setProperty('--lit-shift-final', String((finalK * finalTop) / stripBottom));
  strip.style.setProperty('--lit-k-final', String(finalK));
  strip.style.setProperty('--lit-bottom', String(stripBottom));
  // The colour the session ended in, crossing to the surface's as the replay begins.
  const end = html(doc, 'div', { class: 'lit__end' });
  end.style.setProperty('background-image', litGradient(final.top, final.bottom));
  end.animate([{ opacity: 1 }, { opacity: 0 }], { duration: crossfadeMs * surface.scale, easing: smoothstepEasing(doc), fill: 'backwards' });
  const { passing } = CHART;
  const { OCEAN_PASSING } = await import('../../art/ocean/passing.ts');
  if (!OCEAN_PASSING.entries.every((entry) => ART.has(entry.key))) ART.register(OCEAN_PASSING);
  const things = passing.things.map((thing) => {
    const art = ART.draw(doc, thing.key, 'art lit__art');
    const box = ART.resolve(thing.key).viewBox;
    art.setAttribute('width', String(box[2]));
    art.setAttribute('height', String(box[3]));
    const element = html(doc, 'div', { class: 'lit__thing', attrs: { 'data-thing': thing.key } }, [art]);
    element.style.setProperty('--thing-left', `${String(thing.leftPx - passing.cardWidthPx / 2)}px`);
    element.style.setProperty('--thing-from', String(thing.from));
    element.style.setProperty('--thing-span', String(thing.span));
    element.style.setProperty('--thing-peak', String(thing.peak));
    // At rest, where the dive ended: rounded as the frame rounds them.
    const p = (reached - thing.from) / thing.span;
    const shown = p > 0 && p < 1;
    element.style.setProperty('--thing-y-final', String(Number((passing.fromPx - p * passing.travelPx).toFixed(1)) / passing.cardHeightPx));
    element.style.setProperty('--thing-opacity-final', shown ? (thing.peak * Math.sin(Math.PI * p)).toFixed(2) : '0');
    return element;
  });
  const lit = html(doc, 'div', { class: 'lit' }, [strip, end, ...things]);

  // With --replay-progress, all depth-profile.css needs: the depth reached so far, the final depth and scale.
  // Set through the CSSOM, never as style attributes (the CSP forbids them).
  const depth = depthExpression(stretches, minutes);
  for (const element of [chart, lit]) {
    element.style.setProperty('--pd', depth);
    element.style.setProperty('--pd-final', String(reached));
    element.style.setProperty('--pd-scale-final', String(scale));
  }
  surface.graphic.replaceChildren(profile);
  surface.backdrop.replaceChildren(lit);
  if (!counting) return;

  // The count stands on the final depth's baseline (CHART.depthBaselinePx below the chart's top): measured
  // once, in this font, and never again.
  await doc.fonts.ready;
  const baseline = count.querySelector('.profile__baseline')?.getBoundingClientRect().top;
  if (baseline === undefined || !profile.isConnected) return;
  const shift = text.getBoundingClientRect().top + CHART.depthBaselinePx - baseline;
  count.style.setProperty('--profile-count-shift', `${String(shift)}px`);
}

/** The interface's smoothstep curve, from the site's tokens. */
function smoothstepEasing(doc: Document): string {
  const view = doc.defaultView;
  return (view === null ? '' : view.getComputedStyle(doc.documentElement).getPropertyValue('--ease-smoothstep').trim()) || 'ease-in-out';
}

function landmarkLabel(landmark: Landmark): string {
  const copy = BRAND.copy.ocean;
  return copy.landmark.replace('{name}', copy.landmarks[landmark.id]).replace('{depth}', grouped(landmark.depth));
}

function mark(doc: Document, placed: PlacedLandmark): HTMLElement {
  const dot = html(doc, 'div', { class: 'profile__landmark-dot' });
  const tag = html(doc, 'div', { class: placed.left ? 'profile__landmark-tag profile__landmark-tag--left' : 'profile__landmark-tag' }, [html(doc, 'div', { class: 'profile__landmark-label' }, [landmarkLabel(placed.landmark)])]);
  const element = html(doc, 'div', { class: 'profile__landmark', attrs: { 'data-landmark': placed.landmark.id, 'data-depth': String(placed.landmark.depth) } }, [dot, tag]);
  element.style.setProperty('--landmark-x', percent(placed.x / W));
  element.style.setProperty('--landmark-share', String(placed.y / H));
  element.style.setProperty('--landmark-depth', String(placed.landmark.depth));
  element.style.setProperty('--landmark-final', String(placed.opacity));
  return element;
}
