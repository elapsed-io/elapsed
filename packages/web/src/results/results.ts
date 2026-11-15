/**
 * The results screen (plan, Decisions > Results; Design system > Motion; the
 * results frames). Loaded the first time a session ends ("on first use").
 *
 * Focused time is the headline, with all session data beneath and the
 * replay drawn by the mode the session was shown in longest. Retry starts a
 * new session; share shares or copies a line of text. The guest invite is
 * hidden until accounts exist (owner decision, 2026-11-15).
 *
 * Timing, from the moment the tabulating screen is complete: results fade in
 * over 1.0 s from 1.0 s, rising 10 px; the replay starts at 2.0 s and runs
 * 4.5 s, and the headline counts up with it. With reduced motion there is no
 * replay and the final state crossfades in. A reloaded results screen shows
 * the final state at once.
 */

import './results.css';
import { BRAND, CONFIG, durationParts, focusedMs, summarise } from '@stopwatch/core';
import type { Session, SessionSummary } from '@stopwatch/core';
import { html } from '../dom.ts';
import { iconElement } from '../icons/icon-element.ts';
import type { DisplayMode } from '../modes/contract.ts';
import { formatClockTime } from '../shell/clock-time.ts';
import { shareResult } from './share.ts';

const pad = (value: number): string => String(value).padStart(2, '0');
const RING_LAYOUT = new Set(['ring', 'analog']);

function clockDuration(ms: number): string {
  const { hours, minutes, seconds } = durationParts(ms);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export interface ResultsTiming {
  /** When the tabulating screen completed (document timeline ms), or null to show the final state at once. */
  readonly start: number | null;
  readonly reducedMotion: boolean;
}

export interface ResultsOptions {
  readonly retry: () => void;
  readonly announce: (text: string) => void;
  /** Elements outside the results that fade in with them (the corner icons). */
  readonly companions: readonly HTMLElement[];
}

/** Whether the browser can count the headline up in CSS (registered properties, round() and mod()). */
function canCount(): boolean {
  return typeof CSS.registerProperty === 'function' && CSS.supports('width', 'calc(mod(7px, 3px) + round(down, 7px, 2px))');
}

/** The headline's keyframes: focused seconds as the replay's time sweeps the session. */
export function countKeyframes(session: Session, summary: SessionSummary): Keyframe[] {
  const total = Math.max(1, summary.elapsedMs);
  const frames: Keyframe[] = [{ '--results-focused': '0', offset: 0 }];
  for (const { start, end } of session.segments) {
    for (const at of [start, end ?? start]) {
      const offset = Math.min(1, (at - summary.startedAt) / total);
      const value = String(Math.floor(focusedMs(session, at) / 1000));
      const last = frames.at(-1);
      if (last !== undefined && last.offset === offset) last['--results-focused'] = value;
      else frames.push({ '--results-focused': value, offset });
    }
  }
  if (frames.at(-1)?.offset !== 1) frames.push({ '--results-focused': String(Math.floor(summary.focusedMs / 1000)), offset: 1 });
  return frames;
}

export class ResultsScreen {
  readonly element: HTMLElement;
  readonly #doc: Document;
  readonly #options: ResultsOptions;
  #retry: HTMLButtonElement | null = null;

  constructor(doc: Document, options: ResultsOptions) {
    this.#doc = doc;
    this.#options = options;
    this.element = html(doc, 'section', { class: 'results', attrs: { 'aria-labelledby': 'results-focused' } });
    this.element.hidden = true;
  }

  get shown(): boolean {
    return !this.element.hidden;
  }

  async show(session: Session, mode: DisplayMode, timing: ResultsTiming): Promise<void> {
    const doc = this.#doc;
    const summary = summarise(session);
    const copy = BRAND.copy.results;
    const ring = RING_LAYOUT.has(mode.id);

    const final = clockDuration(summary.focusedMs);
    const [h = '00', m = '00', s = '00'] = final.split(':');
    const count = (unit: string, text: string): HTMLSpanElement =>
      html(doc, 'span', { class: `count count--${unit}` }, [html(doc, 'span', { class: 'count__text' }, [text])]);
    const colon = (): HTMLSpanElement => html(doc, 'span', { class: 'time__colon' }, [':']);
    const time = html(doc, 'div', { class: 'results__time', attrs: { 'aria-hidden': 'true' } }, [count('h', h), colon(), count('m', m), colon(), count('s', s)]);
    const focused = html(doc, 'div', { class: 'results__focused' }, [
      html(doc, 'p', { class: 'results__label', attrs: { id: 'results-focused' } }, [copy.focused]),
      time,
      html(doc, 'p', { class: 'visually-hidden' }, [final]),
    ]);

    const stat = (label: string, value: string): HTMLDivElement =>
      html(doc, 'div', { class: 'stat' }, [html(doc, 'dt', { class: 'stat__label' }, [label]), html(doc, 'dd', { class: 'stat__value' }, [value])]);
    const stats = html(doc, 'dl', { class: 'stats' }, [
      stat(copy.elapsed, clockDuration(summary.elapsedMs)),
      stat(copy.paused, clockDuration(summary.pausedMs)),
      stat(copy.pauses, String(summary.pauses)),
      stat(copy.longestStretch, clockDuration(summary.longestStretchMs)),
      stat(copy.started, formatClockTime(summary.startedAt)),
      stat(copy.ended, formatClockTime(summary.endedAt)),
    ]);

    const retry = html(doc, 'button', { class: 'action', attrs: { type: 'button', 'aria-label': copy.retry } }, [iconElement(doc, 'retry')]);
    const shareIcon = iconElement(doc, 'share', 'action__icon');
    const check = iconElement(doc, 'check', 'action__check');
    const share = html(doc, 'button', { class: 'action', attrs: { type: 'button', 'aria-label': copy.share } }, [shareIcon, check]);
    retry.addEventListener('click', this.#options.retry);
    share.addEventListener('click', () => {
      void shareResult(doc.defaultView ?? window, summary.focusedMs).then((outcome) => {
        if (outcome !== 'copied') return;
        this.#options.announce(copy.copied);
        const duration = CONFIG.motion.copiedConfirmation;
        const hold = { duration, fill: 'none' as const };
        check.animate([{ opacity: 1 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], hold);
        shareIcon.animate([{ opacity: 0 }, { opacity: 0, offset: 0.999 }, { opacity: 1 }], hold);
      });
    });
    this.#retry = retry;
    const actions = html(doc, 'div', { class: 'results__actions' }, [html(doc, 'div', { class: 'results__buttons' }, [retry, share])]);

    const graphic = html(doc, 'div', { class: 'results__graphic' });
    this.element.className = `results ${ring ? 'results--ring' : 'results--strip'}`;
    this.element.replaceChildren(
      focused,
      ...(ring ? [html(doc, 'div', { class: 'results__row' }, [graphic, stats])] : [graphic, stats]),
      actions,
    );
    this.element.hidden = false;

    await mode.replay(graphic, session);
    this.#time(time, graphic, session, summary, timing);
  }

  /** Moves focus to retry, when focus was on something the results replaced. */
  focusRetry(): void {
    this.#retry?.focus({ preventScroll: true });
  }

  hide(): void {
    for (const animation of this.element.getAnimations({ subtree: true })) animation.cancel();
    this.element.hidden = true;
    this.element.replaceChildren();
    this.#retry = null;
  }

  #time(time: HTMLElement, graphic: HTMLElement, session: Session, summary: SessionSummary, timing: ResultsTiming): void {
    const replays = graphic.getAnimations({ subtree: true });
    // A finished replay leaves the drawing as it is without animations, so nothing stays on a separate layer.
    for (const animation of replays) {
      void animation.finished.then(
        () => {
          animation.cancel();
        },
        () => undefined,
      );
    }
    const { start, reducedMotion } = timing;
    const { motion } = CONFIG;
    if (start === null) {
      for (const animation of replays) animation.finish();
      return;
    }
    const view = this.#doc.defaultView ?? window;
    const smoothstep = view.getComputedStyle(this.#doc.documentElement).getPropertyValue('--ease-smoothstep').trim() || 'ease-in-out';
    const appear = reducedMotion
      ? { delay: motion.tabulatingHold, duration: motion.startMorph, keyframes: [{ opacity: 0 }, { opacity: 1 }] }
      : {
          delay: motion.resultsFadeInDelay,
          duration: motion.resultsFadeIn,
          keyframes: [
            { opacity: 0, transform: `translateY(${String(motion.resultsRisePx)}px)` },
            { opacity: 1, transform: 'translateY(0)' },
          ],
        };
    for (const element of [this.element, ...this.#options.companions]) {
      const animation = element.animate(appear.keyframes, { duration: appear.duration, easing: smoothstep, fill: 'backwards' });
      animation.startTime = start + appear.delay;
    }
    if (reducedMotion) {
      for (const animation of replays) animation.finish();
      return;
    }
    for (const animation of replays) animation.startTime = start + motion.replayDelay;
    if (canCount()) {
      time.classList.add('results__time--counting');
      const counting = time.animate(countKeyframes(session, summary), { duration: motion.replayDuration, easing: replays[0]?.effect?.getTiming().easing ?? 'linear', fill: 'both' });
      counting.startTime = start + motion.replayDelay;
      void counting.finished.then(
        () => {
          // The count has landed on the total: plain text from here on.
          counting.cancel();
          time.classList.remove('results__time--counting');
        },
        () => undefined,
      );
    }
  }
}
