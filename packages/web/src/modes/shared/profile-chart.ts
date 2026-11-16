/**
 * The profile chart, the results replay of ocean depth (a dive) and height (a climb) (plan, Display modes >
 * Results replays; the "results: ocean depth (build this one)" and "results: height (build this one)" frames).
 *
 * The card takes the light at the depth or height the replay has reached (the mode's light model, dimmed): it
 * opens in the colour the session ended in and crosses to the starting colour (the surface or the ground) as the
 * replay begins, then follows it. The chart draws the depth or height over the session's time (flat while
 * paused), dashed lines where the zones begin, and the value and zone so far; it zooms out as the journey goes
 * on (its scale stays 15 % past the value so far). Up to six landmarks, one or two from each band and spread
 * along the path, sit exactly on the path where the journey reached them; their labels pop in as it passes and
 * fade a second after the replay, leaving the dots, and come back while the chart is hovered, focused or tapped
 * (one only while its dot is hovered). Things from each zone pass the card as the replay crosses it, and each
 * mode adds its own finale (ocean depth's sonar pings; height's stars and horizon).
 *
 * The one function that draws the path, y(), also places the dots. Everything that moves is derived in
 * profile-chart.css from --replay-progress, through the value reached so far (--pd); only the finale's own
 * animations and the end colour's crossfade are timed from the replay's start (contract, ReplaySurface). A dive
 * measures from the top of the chart and the card; a climb from the bottom (--profile-origin). Shapes are drawn
 * in the chart's own units and shrink with it; text keeps the frame's sizes (plan, Design system).
 */

import { spreadBy, summarise } from '@stopwatch/core';
import type { Session } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import { ART } from '../../art/registry.ts';
import { formatClockTime } from '../../shell/clock-time.ts';
import type { ReplaySurface } from '../contract.ts';
import { focusStretches } from './replay-timing.ts';
import type { FocusStretch } from './replay-timing.ts';
import './profile-chart.css';

/** A landmark the replay may show: where it is, its id, and its label. */
export interface ProfileLandmark {
  readonly at: number;
  readonly id: string;
  readonly label: string;
}

export interface ProfileSpec {
  /** Down: a dive, measured from the top. Up: a climb, measured from the bottom. */
  readonly direction: 'down' | 'up';
  readonly metresPerFocusedMinute: number;
  readonly maxMetres: number;
  readonly chart: {
    readonly widthPx: number;
    readonly heightPx: number;
    readonly minScaleMetres: number;
    readonly scaleHeadroom: number;
    readonly textInsetPx: number;
    readonly valueBaselinePx: number;
    readonly zoneBaselinePx: number;
    readonly lineWidthPx: number;
    /** 0 draws no head (the height frame has none). */
    readonly headRadiusPx: number;
    readonly zoneLines: { readonly at: readonly number[]; readonly names: readonly string[]; readonly opacity: number; readonly dash: string; readonly labelAbovePx: number; readonly labelLeftPx: number; readonly minYPx: number; readonly scaleShare: number };
    readonly landmark: { readonly max: number; readonly flipAfterPx: number; readonly fadeMetres: number };
  };
  /** Every zone, in order, with its name: the one the journey is in shows beside the value. */
  readonly zones: readonly { readonly id: string; readonly name: string; readonly from: number; readonly to: number }[];
  readonly copy: {
    /** The value reached, with `token` where the number goes ("{depth} m"). */
    readonly value: string;
    readonly token: string;
    /** The chart's accessible name. */
    readonly profile: string;
    readonly landmarksPassed: string;
  };
  /** The value's own class beside profile__value (tests and custom CSS name it: profile__depth, profile__height). */
  readonly valueClass: string;
  readonly pickLandmarks: (random: () => number) => readonly ProfileLandmark[];
  readonly lit: {
    /** The card's colour at a value: the light model, dimmed. */
    readonly colour: (at: number) => string;
    /** The card shows from `nearMetres` toward the start (never past it) to `farMetres` beyond the value so far. */
    readonly nearMetres: number;
    readonly farMetres: number;
    /** Past this every colour is black: the strip stops there. */
    readonly blackFromMetres: number;
    readonly crossfadeMs: number;
    /** A stop every this many metres. */
    readonly stepMetres: number;
  };
  readonly passing: {
    readonly cardWidthPx: number;
    readonly things: readonly { readonly key: string; readonly from: number; readonly span: number; readonly peak: number; readonly leftPx: number; readonly sizePx?: readonly [number, number] }[];
    readonly fromPx: number;
    readonly travelPx: number;
    readonly cardHeightPx: number;
    /** Loads the mode's results art (the things that pass, and whatever its finale draws) before it draws. */
    readonly ready: () => Promise<void>;
  };
  /** The mode's finale: layers over the chart and on the card, given the geometry at rest. */
  readonly finale?: (context: FinaleContext) => { readonly chart?: readonly Element[]; readonly backdrop?: readonly Element[] };
}

export interface FinaleContext {
  readonly doc: Document;
  readonly surface: ReplaySurface;
  readonly geometry: ProfileGeometry;
}

/** To one decimal, as the frames write their numbers. */
const fixed = (value: number): string => value.toFixed(1);
const tenth = (value: number): number => Number(fixed(value));
export const grouped = (metres: number): string => Math.round(metres).toLocaleString('en-US');
export const percent = (share: number): string => `${String(share * 100)}%`;

export function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** Metres reached `minute` minutes into the session. */
export function valueAt(spec: ProfileSpec, stretches: readonly FocusStretch[], minute: number): number {
  let focused = 0;
  for (const { from, to } of stretches) focused += Math.max(0, Math.min(minute, to) - from);
  return Math.min(spec.maxMetres, focused * spec.metresPerFocusedMinute);
}

/** The minute the journey first reached `metres`, or null if it never did: the inverse of valueAt. */
export function minuteAt(spec: ProfileSpec, stretches: readonly FocusStretch[], metres: number): number | null {
  let reached = 0;
  for (const { from, to } of stretches) {
    const span = (to - from) * spec.metresPerFocusedMinute;
    if (reached + span >= metres) return from + (metres - reached) / spec.metresPerFocusedMinute;
    reached += span;
  }
  return null;
}

/** The value reached so far as a CSS expression of --replay-progress (metres), capped where the mode stops. */
export function valueExpression(spec: ProfileSpec, stretches: readonly FocusStretch[], minutes: number): string {
  const terms = stretches.map(({ from, to }) => `clamp(0, var(--replay-progress) * ${String(minutes)} - ${String(from)}, ${String(to - from)})`);
  return `min(${String(spec.maxMetres)}, ${String(spec.metresPerFocusedMinute)} * (${terms.length === 0 ? '0' : terms.join(' + ')}))`;
}

/** The chart's geometry for a session at the end of its replay, in the frame's pixels at reference size. */
export interface ProfileGeometry {
  readonly minutes: number;
  readonly reached: number;
  /** The value at the far edge of the chart once the replay has landed. */
  readonly scale: number;
  readonly stretches: readonly FocusStretch[];
  /** x, in pixels, `minute` minutes into the session. */
  readonly x: (minute: number) => number;
  /** y, in pixels, of `metres` at the final scale: the one function the path and the dots are drawn with. */
  readonly y: (metres: number) => number;
  readonly points: string;
  readonly head: { readonly x: number; readonly y: number };
}

export function profileGeometry(spec: ProfileSpec, session: Session): ProfileGeometry {
  const { widthPx: W, heightPx: H } = spec.chart;
  const summary = summarise(session);
  const minutes = Math.max(summary.elapsedMs / 60_000, 1 / 60);
  const stretches = focusStretches(session.segments, summary.startedAt);
  const reached = valueAt(spec, stretches, minutes);
  const scale = Math.max(spec.chart.minScaleMetres, reached * spec.chart.scaleHeadroom);
  // A dive goes down from the top; a climb up from the bottom (the frames' own Y()).
  const y = spec.direction === 'down' ? (metres: number): number => Math.min(H, (metres / scale) * H) : (metres: number): number => Math.max(0, H - (metres / scale) * H);
  const x = (minute: number): number => (minute / minutes) * W;
  // The line: from the start, moving while focused, flat while paused.
  const points: string[] = [];
  const point = (minute: number): void => {
    const written = `${fixed(x(minute))},${fixed(y(valueAt(spec, stretches, minute)))}`;
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
  readonly landmark: ProfileLandmark;
  /** The dot, exactly on the path where the journey reached it (never offset or clamped). */
  readonly x: number;
  readonly y: number;
  /** The label sits left of the dot once the dot is past the flip point. */
  readonly left: boolean;
  /** The dot's final opacity: it fades in over the metres after the journey passes it. */
  readonly opacity: number;
}

/** The landmarks the journey passed (at most six, spread along the path), placed as the frames place them. */
export function placeLandmarks(spec: ProfileSpec, picked: readonly ProfileLandmark[], geometry: ProfileGeometry, random: () => number): PlacedLandmark[] {
  const mark = spec.chart.landmark;
  const passed = picked.filter((landmark) => landmark.at <= geometry.reached && minuteAt(spec, geometry.stretches, landmark.at) !== null);
  return spreadBy(passed, (landmark) => landmark.at, mark.max, random).map((landmark) => {
    const x = tenth(geometry.x(minuteAt(spec, geometry.stretches, landmark.at) ?? 0));
    return {
      landmark,
      x,
      y: tenth(geometry.y(landmark.at)),
      left: x > mark.flipAfterPx,
      opacity: Number(smoothstep((geometry.reached - landmark.at) / mark.fadeMetres).toFixed(2)),
    };
  });
}

/** Whether the value can count up in CSS (round() and mod() in counters, as the headline's count). */
function canCount(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('width', 'calc(mod(7px, 3px) + round(down, 7px, 2px))');
}

/**
 * The dimmed light from `near` to `far` metres as a gradient, a stop every `stepMetres`: from the top down on a
 * dive, from the bottom up on a climb.
 */
function litGradient(spec: ProfileSpec, near: number, far: number): string {
  const span = Math.max(far - near, 1e-6);
  const count = Math.max(1, Math.ceil(span / spec.lit.stepMetres));
  const stops = Array.from({ length: count + 1 }, (_, i) => {
    const at = Math.min(far, near + (i * span) / count);
    return `${spec.lit.colour(at)} ${String(Math.round(((at - near) / span) * 100_000) / 1000)}%`;
  });
  return `linear-gradient(${spec.direction === 'down' ? '180deg' : '0deg'}, ${stops.join(', ')})`;
}

/** The card's light window at `at`: `nearMetres` toward the start (never past it) to `farMetres` beyond. */
function litWindow(spec: ProfileSpec, at: number): { readonly near: number; readonly far: number } {
  return { near: Math.max(0, at - spec.lit.nearMetres), far: at + spec.lit.farMetres };
}

export interface ProfileOptions {
  /** Show random landmarks (the "results landmarks" mode option). */
  readonly landmarks: boolean;
  /** Where the landmarks' randomness comes from (tests pass a fixed one). */
  readonly random?: () => number;
}

export async function drawProfile(spec: ProfileSpec, surface: ReplaySurface, session: Session, options: ProfileOptions = { landmarks: true }): Promise<void> {
  const doc = surface.graphic.ownerDocument;
  const summary = summarise(session);
  const geometry = profileGeometry(spec, session);
  const { minutes, reached, scale, stretches } = geometry;
  const { widthPx: W, heightPx: H } = spec.chart;
  const up = spec.direction === 'up';
  const viewBox = `0 0 ${String(W)} ${String(H)}`;
  const random = options.random ?? Math.random;
  const copy = spec.copy;
  // The mode's results art (the things that pass, and whatever its finale draws) loads with its results.
  await spec.passing.ready();

  // ---- The chart ----------------------------------------------------------------------------------------
  // Dashed lines where the zones begin, shown once the scale has room for them.
  const lines = spec.chart.zoneLines;
  const zoned = lines.at.map((start, index) => {
    const y = geometry.y(start);
    return { name: lines.names[index] ?? '', start, y, opacity: start < scale * lines.scaleShare && y > lines.minYPx ? lines.opacity : 0 };
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
      svg(doc, 'polyline', { class: 'profile__line', points: geometry.points, 'stroke-width': spec.chart.lineWidthPx, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
    ]),
  ]);
  // The line is revealed from the left as the replay's time sweeps the session (the strip replay's clip).
  const reveal = html(doc, 'div', { class: 'profile__reveal' }, [html(doc, 'div', { class: 'profile__reveal-inner' }, [path])]);
  const head =
    spec.chart.headRadiusPx > 0
      ? [svg(doc, 'svg', { class: 'profile__svg profile__head-layer', viewBox, 'aria-hidden': 'true' }, [svg(doc, 'circle', { class: 'profile__head', cx: fixed(geometry.head.x), cy: fixed(geometry.head.y), r: spec.chart.headRadiusPx })])]
      : [];
  head[0]?.style.setProperty('--head-share', String(geometry.head.y / H));

  // The text, in pixels: the zone lines' names, the value reached and its zone (while the replay runs, each
  // zone's name shows while the journey is in it).
  const zone = spec.zones.find((candidate) => reached >= candidate.from && reached < candidate.to) ?? spec.zones.at(-1);
  const valueText = copy.value.replace(copy.token, grouped(reached));
  const text = svg(doc, 'svg', { class: 'profile__text', 'aria-hidden': 'true' }, [
    ...zoned.map(({ name, start, y, opacity }) => {
      const label = svg(doc, 'text', { class: 'profile__zone-label', x: lines.labelLeftPx, y: percent(tenth(y) / H), dy: -lines.labelAbovePx }, [name]);
      label.style.setProperty('--zone-start', String(start));
      label.style.setProperty('--zone-share', String(tenth(y) / H));
      label.style.setProperty('--zone-final', String(opacity));
      return label;
    }),
    svg(doc, 'text', { class: `profile__value ${spec.valueClass}`, x: '100%', dx: -spec.chart.textInsetPx, y: spec.chart.valueBaselinePx, 'text-anchor': 'end' }, [valueText]),
    ...spec.zones.map((candidate) => {
      const element = svg(doc, 'text', { class: candidate === zone ? 'profile__zone profile__zone--final' : 'profile__zone', 'data-zone': candidate.id, x: '100%', dx: -spec.chart.textInsetPx, y: spec.chart.zoneBaselinePx, 'text-anchor': 'end' }, [candidate.name]);
      element.style.setProperty('--zone-from', String(candidate.from));
      element.style.setProperty('--zone-to', String(candidate.to));
      return element;
    }),
  ]);

  const placed = options.landmarks ? placeLandmarks(spec, spec.pickLandmarks(random), geometry, random) : [];
  const marks = placed.map((landmark) => mark(doc, spec, landmark));
  const finale = spec.finale?.({ doc, surface, geometry }) ?? {};

  // The value counting up while the replay runs, in place of the final value (profile-chart.css).
  const [before = '', after = ''] = copy.value.split(copy.token);
  const count = html(doc, 'div', { class: 'profile__count', attrs: { 'aria-hidden': 'true' } }, [
    before,
    html(doc, 'span', { class: 'profile__digits' }, [html(doc, 'span', { class: 'profile__digits-small' }), html(doc, 'span', { class: 'profile__digits-large' })]),
    after,
    // An empty inline block sits on the line's baseline: where the count's baseline is, in any font.
    html(doc, 'span', { class: 'profile__baseline' }),
  ]);

  const chart = html(doc, 'div', { class: 'profile__chart', attrs: { role: 'img', tabindex: '0', 'aria-label': `${copy.profile}. ${valueText}, ${zone?.name ?? ''}` } }, [
    zoneLines,
    reveal,
    ...head,
    text,
    ...marks,
    ...(finale.chart ?? []),
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
  const list = html(doc, 'ul', { class: 'visually-hidden', attrs: { 'aria-label': copy.landmarksPassed } }, placed.map((landmark) => html(doc, 'li', {}, [landmark.landmark.label])));
  const counting = canCount();
  const profile = html(doc, 'div', { class: `profile${up ? ' profile--up' : ''}${counting ? ' profile--counting' : ''}` }, [chart, times, ...(placed.length > 0 ? [list] : [])]);

  // ---- The card's light, and the things that pass -------------------------------------------------------
  const { nearMetres, farMetres, blackFromMetres, crossfadeMs } = spec.lit;
  const windowMetres = nearMetres + farMetres;
  // The strip runs from the start to where the window ends at the journey's end (or where every colour is black).
  const litEnd = Math.min(Math.max(0, reached - nearMetres), blackFromMetres);
  const stripLength = litEnd + windowMetres;
  const strip = html(doc, 'div', { class: 'lit__strip' });
  strip.style.setProperty('height', percent(stripLength / windowMetres));
  strip.style.setProperty('background-image', litGradient(spec, 0, stripLength));
  const final = litWindow(spec, reached);
  const finalK = windowMetres / (final.far - final.near);
  strip.style.setProperty('--lit-shift-final', String((finalK * Math.min(final.near, litEnd)) / stripLength));
  strip.style.setProperty('--lit-k-final', String(finalK));
  strip.style.setProperty('--lit-bottom', String(stripLength));
  // The colour the session ended in, crossing to the starting colour as the replay begins.
  const end = html(doc, 'div', { class: 'lit__end' });
  end.style.setProperty('background-image', litGradient(spec, final.near, final.far));
  end.animate([{ opacity: 1 }, { opacity: 0 }], { duration: crossfadeMs * surface.scale, easing: smoothstepEasing(doc), fill: 'backwards' });
  const { passing } = spec;
  const things = passing.things.map((thing) => {
    const art = ART.draw(doc, thing.key, 'art lit__art');
    const box = ART.resolve(thing.key).viewBox;
    art.setAttribute('width', String(thing.sizePx?.[0] ?? box[2]));
    art.setAttribute('height', String(thing.sizePx?.[1] ?? box[3]));
    const element = html(doc, 'div', { class: 'lit__thing', attrs: { 'data-thing': thing.key } }, [art]);
    element.style.setProperty('--thing-left', `${String(thing.leftPx - passing.cardWidthPx / 2)}px`);
    element.style.setProperty('--thing-from', String(thing.from));
    element.style.setProperty('--thing-span', String(thing.span));
    element.style.setProperty('--thing-peak', String(thing.peak));
    // At rest, where the journey ended: rounded as the frames round them.
    const p = (reached - thing.from) / thing.span;
    const shown = p > 0 && p < 1;
    element.style.setProperty('--thing-y-final', String(Number((passing.fromPx - p * passing.travelPx).toFixed(1)) / passing.cardHeightPx));
    element.style.setProperty('--thing-opacity-final', shown ? (thing.peak * Math.sin(Math.PI * p)).toFixed(2) : '0');
    return element;
  });
  // As the frames stack them: the light, the finale's layers, the things, and the end colour over them all.
  const lit = html(doc, 'div', { class: up ? 'lit lit--up' : 'lit' }, [strip, ...(finale.backdrop ?? []), ...things, end]);

  // With --replay-progress, all profile-chart.css needs: the value reached so far, the final value and scale.
  // Set through the CSSOM, never as style attributes (the CSP forbids them).
  const value = valueExpression(spec, stretches, minutes);
  for (const element of [chart, lit]) {
    element.style.setProperty('--pd', value);
    element.style.setProperty('--pd-final', String(reached));
    element.style.setProperty('--pd-scale-final', String(scale));
    element.style.setProperty('--lit-end', String(litEnd));
  }
  surface.graphic.replaceChildren(profile);
  surface.backdrop.replaceChildren(lit);
  if (!counting) return;

  // The count stands on the final value's baseline (valueBaselinePx below the chart's top): measured once, in
  // this font, and never again.
  await doc.fonts.ready;
  const baseline = count.querySelector('.profile__baseline')?.getBoundingClientRect().top;
  if (baseline === undefined || !profile.isConnected) return;
  const shift = text.getBoundingClientRect().top + spec.chart.valueBaselinePx - baseline;
  count.style.setProperty('--profile-count-shift', `${String(shift)}px`);
}

/** The interface's smoothstep curve, from the site's tokens. */
export function smoothstepEasing(doc: Document): string {
  const view = doc.defaultView;
  return (view === null ? '' : view.getComputedStyle(doc.documentElement).getPropertyValue('--ease-smoothstep').trim()) || 'ease-in-out';
}

function mark(doc: Document, spec: ProfileSpec, placed: PlacedLandmark): HTMLElement {
  const { widthPx: W, heightPx: H } = spec.chart;
  const dot = html(doc, 'div', { class: 'profile__landmark-dot' });
  const tag = html(doc, 'div', { class: placed.left ? 'profile__landmark-tag profile__landmark-tag--left' : 'profile__landmark-tag' }, [html(doc, 'div', { class: 'profile__landmark-label' }, [placed.landmark.label])]);
  const element = html(doc, 'div', { class: 'profile__landmark', attrs: { 'data-landmark': placed.landmark.id, 'data-metres': String(placed.landmark.at) } }, [dot, tag]);
  element.style.setProperty('--landmark-x', percent(placed.x / W));
  element.style.setProperty('--landmark-share', String(placed.y / H));
  element.style.setProperty('--landmark-at', String(placed.landmark.at));
  element.style.setProperty('--landmark-final', String(placed.opacity));
  return element;
}
