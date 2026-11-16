/**
 * The results screen (plan, Decisions > Results; Design system > Motion; the
 * results frames). Loaded the first time a session ends ("on first use").
 *
 * Focused time is the headline, with all session data beneath and the
 * replay drawn by the mode the session was shown in longest. The retry icon
 * ("back to the timer") returns to the idle timer, where the next session
 * starts; share shares or copies a line of text. The guest invite is
 * hidden until accounts exist (owner decision, 2026-11-15).
 *
 * Timing, from the moment the tabulating screen is complete: results fade in
 * over 0.5 s from 0.5 s, rising 8 px; the replay starts at 0.8 s and runs
 * 2.4 s, starting quickly and settling gently. Every duration is scaled by
 * --motion-scale (Release 2's animation speed).
 *
 * The replay is one animation of one registered custom property,
 * --replay-progress, from 0 to 1 (plan, Principles: the one exception). The
 * replay graphic and the headline count are calculated from it in CSS, so
 * every part moves in step. With reduced motion, or where the browser cannot
 * animate a registered property, there is no replay and the final state shows;
 * a reloaded results screen shows the final state at once.
 */

import './results.css';
import { BRAND, CONFIG, durationParts, summarise } from '@stopwatch/core';
import type { Session, SessionSummary } from '@stopwatch/core';
import { html } from '../dom.ts';
import { iconElement } from '../icons/icon-element.ts';
import type { DisplayMode } from '../modes/contract.ts';
import { formatClockTime } from '../shell/clock-time.ts';
import { motionScale } from '../shell/motion.ts';
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

/** Whether the browser can animate the registered progress property (the replay). */
function canReplay(): boolean {
  return typeof CSS.registerProperty === 'function';
}

/** Whether it can also count the headline up in CSS (round() and mod()). */
function canCount(): boolean {
  return canReplay() && CSS.supports('width', 'calc(mod(7px, 3px) + round(down, 7px, 2px))');
}

export interface CountTerm {
  /** Seconds from the session's start to the stretch of focus. */
  readonly from: number;
  readonly length: number;
}

/** The session's stretches of focus, in seconds from its start. */
export function countTerms(session: Session, summary: SessionSummary): CountTerm[] {
  return session.segments.map(({ start, end }) => ({ from: (start - summary.startedAt) / 1000, length: ((end ?? start) - start) / 1000 }));
}

/**
 * The headline's focused seconds at replay progress p, as CSS: the sum over
 * stretches of clamp(0, p × session seconds − start, length), rounded down. It
 * rises only while the replay passes focus and lands on the total.
 */
export function countExpression(terms: readonly CountTerm[], sessionSeconds: number): string {
  const total = String(sessionSeconds);
  const sum = terms.map(({ from, length }) => `clamp(0, var(--replay-progress) * ${total} - ${String(from)}, ${String(length)})`).join(' + ');
  return `round(down, ${sum === '' ? '0' : sum}, 1)`;
}

/** The same count in script, for tests: focused seconds at progress p. */
export function countAt(terms: readonly CountTerm[], sessionSeconds: number, progress: number): number {
  return Math.floor(terms.reduce((sum, { from, length }) => sum + Math.min(length, Math.max(0, progress * sessionSeconds - from)), 0));
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
    const cross = iconElement(doc, 'close', 'action__cross');
    const share = html(doc, 'button', { class: 'action', attrs: { type: 'button', 'aria-label': copy.share } }, [shareIcon, check, cross]);
    retry.addEventListener('click', this.#options.retry);
    share.addEventListener('click', () => {
      void shareResult(doc.defaultView ?? window, summary.focusedMs).then((outcome) => {
        // Copied: a check mark for 2 seconds. Refused by the browser: a small cross for as long (plan,
        // Decisions > Controls). A share sheet answers for itself, and a cancelled one needs nothing.
        if (outcome !== 'copied' && outcome !== 'failed') return;
        this.#options.announce(outcome === 'copied' ? copy.copied : copy.copyFailed);
        const mark = outcome === 'copied' ? check : cross;
        const duration = CONFIG.motion.copiedConfirmation;
        const hold = { duration, fill: 'none' as const };
        mark.animate([{ opacity: 1 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], hold);
        shareIcon.animate([{ opacity: 0 }, { opacity: 0, offset: 0.999 }, { opacity: 1 }], hold);
      });
    });
    this.#retry = retry;
    const actions = html(doc, 'div', { class: 'results__actions' }, [html(doc, 'div', { class: 'results__buttons' }, [retry, share])]);

    const graphic = html(doc, 'div', { class: 'results__graphic' });
    delete this.element.dataset['ready'];
    delete this.element.dataset['replayed'];
    // Laid out but unseen until its timing is set: the replay's drawing code may still be loading.
    this.element.className = `results results--preparing ${ring ? 'results--ring' : 'results--strip'}`;
    this.element.replaceChildren(
      focused,
      ...(ring ? [html(doc, 'div', { class: 'results__row' }, [graphic, stats])] : [graphic, stats]),
      actions,
    );
    this.element.hidden = false;

    await mode.replay(graphic, session);
    this.#time(time, session, summary, timing);
    this.element.classList.remove('results--preparing');
    // Everything is drawn and timed (tests and custom CSS can rely on it).
    this.element.dataset['ready'] = '';
  }

  /** Moves focus to retry, when focus was on something the results replaced. */
  focusRetry(): void {
    this.#retry?.focus({ preventScroll: true });
  }

  hide(): void {
    for (const animation of this.element.getAnimations({ subtree: true })) animation.cancel();
    delete this.element.dataset['ready'];
    delete this.element.dataset['replayed'];
    this.element.hidden = true;
    this.element.replaceChildren();
    this.#retry = null;
  }

  #time(time: HTMLElement, session: Session, summary: SessionSummary, timing: ResultsTiming): void {
    const replayed = (): void => {
      this.element.dataset['replayed'] = '';
    };
    const { start, reducedMotion } = timing;
    const { motion } = CONFIG;
    if (start === null) {
      replayed();
      return;
    }
    const scale = motionScale(this.#doc);
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
      const animation = element.animate(appear.keyframes, { duration: appear.duration * scale, easing: smoothstep, fill: 'backwards' });
      animation.startTime = start + appear.delay * scale;
    }
    if (reducedMotion || !canReplay()) {
      replayed();
      return;
    }
    const counting = canCount();
    if (counting) {
      time.classList.add('results__time--counting');
      time.style.setProperty('--results-focused', countExpression(countTerms(session, summary), Math.max(1, summary.elapsedMs) / 1000));
    }
    // The replay: one property, from 0 to 1. Everything that moves is calculated from it.
    const replay = this.element.animate([{ '--replay-progress': 0 }, { '--replay-progress': 1 }], {
      duration: motion.replayDuration * scale,
      easing: `cubic-bezier(${motion.replayEasing.join(', ')})`,
      fill: 'both',
    });
    replay.startTime = start + motion.replayDelay * scale;
    void replay.finished.then(
      () => {
        // Landed: the final drawing and plain text from here on, with no animation left.
        replayed();
        replay.cancel();
        if (counting) {
          time.classList.remove('results__time--counting');
          time.style.removeProperty('--results-focused');
        }
      },
      () => undefined,
    );
  }
}
