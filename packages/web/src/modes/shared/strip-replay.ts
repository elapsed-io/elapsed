/**
 * The focus strip, the results replay for digits and timeline (plan, Design
 * system > Display modes: "digits and timeline as a focus strip"; the
 * results frame). Focus is filled, pauses are left blank.
 *
 * Geometry follows the frame: a bar from 1 px after each stretch's start to
 * 1 px before its end; the start and end clock times at the ends, and whole
 * hours between, each starting 16 px before its hour. Hour labels that would
 * crowd another label are left out, so long sessions keep every other hour,
 * every third, and so on.
 *
 * The replay reveals the bars from left to right as the replay's time sweeps
 * the session: a clipping box slides in while its content slides back the
 * same distance, both calculated from --replay-progress (strip-replay.css),
 * so only transforms move and nothing runs ahead of the replay.
 */

import { BRAND, CONFIG, summarise } from '@stopwatch/core';
import type { Session } from '@stopwatch/core';
import { html } from '../../dom.ts';
import { formatClockTime } from '../../shell/clock-time.ts';
import { focusStretches } from './replay-timing.ts';
import './strip-replay.css';

const STRIP = CONFIG.design.results.strip;
const HOUR = 60 * 60 * 1000;

const percent = (fraction: number): string => `${String(Math.round(fraction * 1_000_000) / 10_000)}%`;

interface Label {
  readonly element: HTMLElement;
  readonly hour: boolean;
}

/** Hides hour labels that would come closer than the spacing to a neighbour or to the end label. */
export function placeLabels(lefts: readonly number[], widths: readonly number[], spacing: number): boolean[] {
  const shown = lefts.map(() => false);
  const count = lefts.length;
  if (count === 0) return shown;
  shown[0] = true;
  shown[count - 1] = true;
  const endLeft = lefts[count - 1] ?? 0;
  let previousRight = (lefts[0] ?? 0) + (widths[0] ?? 0);
  for (let i = 1; i < count - 1; i += 1) {
    const left = lefts[i] ?? 0;
    const right = left + (widths[i] ?? 0);
    if (left >= previousRight + spacing && right <= endLeft - spacing) {
      shown[i] = true;
      previousRight = right;
    }
  }
  return shown;
}

export function drawStrip(root: HTMLElement, session: Session): void {
  const doc = root.ownerDocument;
  const summary = summarise(session);
  const total = Math.max(1, summary.elapsedMs);
  const minutes = total / 60_000;

  const bars = focusStretches(session.segments, summary.startedAt).map(({ from, to }) => {
    const bar = html(doc, 'div', { class: 'strip__bar' });
    bar.style.setProperty('left', `calc(${percent(from / minutes)} + var(--strip-bar-inset))`);
    bar.style.setProperty('width', `max(0px, calc(${percent((to - from) / minutes)} - 2 * var(--strip-bar-inset)))`);
    return bar;
  });
  const inner = html(doc, 'div', { class: 'strip__reveal-inner' }, bars);
  const reveal = html(doc, 'div', { class: 'strip__reveal' }, [inner]);

  const labels: Label[] = [{ element: html(doc, 'span', { class: 'strip__label' }, [formatClockTime(summary.startedAt)]), hour: false }];
  labels[0]?.element.style.setProperty('left', '0');
  for (let hour = Math.ceil(summary.startedAt / HOUR) * HOUR; hour < summary.endedAt; hour += HOUR) {
    if (hour <= summary.startedAt) continue;
    const element = html(doc, 'span', { class: 'strip__label' }, [formatClockTime(hour)]);
    element.style.setProperty('left', `calc(${percent((hour - summary.startedAt) / total)} - ${String(STRIP.hourLabelOffsetPx)}px)`);
    labels.push({ element, hour: true });
  }
  labels.push({ element: html(doc, 'span', { class: 'strip__label strip__label--end' }, [formatClockTime(summary.endedAt)]), hour: false });

  const labelRow = html(doc, 'div', { class: 'strip__labels' }, labels.map((label) => label.element));
  const strip = html(doc, 'div', { class: 'strip', attrs: { role: 'img', 'aria-label': BRAND.copy.results.stripLabel } }, [
    html(doc, 'div', { class: 'strip__bars' }, [html(doc, 'div', { class: 'strip__track' }), reveal]),
    labelRow,
  ]);
  root.replaceChildren(strip);

  // Leave out crowded hour labels for the width the strip has now, and again when it changes.
  const arrange = (): void => {
    for (const label of labels) label.element.hidden = false;
    const origin = labelRow.getBoundingClientRect().left;
    const boxes = labels.map((label) => label.element.getBoundingClientRect());
    const shown = placeLabels(
      boxes.map((box) => box.left - origin),
      boxes.map((box) => box.width),
      STRIP.labelSpacingPx,
    );
    labels.forEach((label, index) => {
      if (label.hour) label.element.hidden = shown[index] !== true;
    });
  };
  arrange();
  if (typeof ResizeObserver === 'function') new ResizeObserver(arrange).observe(labelRow);
}
