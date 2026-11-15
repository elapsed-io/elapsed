/**
 * Composition root: builds the engine, the display mode, the controls, the
 * keyboard, the tab title, storage and tab coordination, the end screen,
 * usage counts and offline support, and connects them through the event bus.
 * Nothing else wires layers together.
 *
 * The screen shows one of: the timer; the ending countdown; the results
 * (after the tabulating screen); the session maximum notice.
 */

import { BRAND, CONFIG, EventBus, TimerEngine, computeView, currentMode, summarise } from '@stopwatch/core';
import type { SecondsDisplay, Session, TimerEvents, TimerView } from '@stopwatch/core';
import { CountClient } from './counts/client.ts';
import type { DisplayContext, DisplayMode } from './modes/contract.ts';
import { DEFAULT_MODE_ID } from './modes/manifests.ts';
import { requestedMode } from './modes/mode-param.ts';
import { findMode } from './modes/registry.ts';
import { registerServiceWorker } from './offline/register.ts';
import type * as ResultsModule from './results/results.ts';
import type { ResultsScreen } from './results/results.ts';
import { Announcer } from './shell/announcer.ts';
import { formatClockTime } from './shell/clock-time.ts';
import { answersCheckIn } from './shell/check-in.ts';
import { Controls } from './shell/controls.ts';
import { EndingCountdown } from './shell/ending.ts';
import { MaximumNotice } from './shell/notice.ts';
import { shortcutFor } from './shell/shortcuts.ts';
import { titleFor } from './shell/title.ts';
import { FinishedStore, browserSessionStorage } from './storage/finished-store.ts';
import { LocalSessionStore, browserLocalStorage, watchLocalStorage } from './storage/session-store.ts';
import { TabSync, openTabChannel } from './sync/tabs.ts';
import { systemClock } from './time/system-clock.ts';

type Screen = 'timer' | 'ending' | 'results' | 'maximum';

function required<T extends Element>(doc: Document, selector: string, type: new () => T): T {
  const element = doc.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`the page is missing ${selector}`);
  return element;
}

export async function startApp(doc: Document, win: Window): Promise<void> {
  const report = (error: unknown): void => {
    win.reportError(error);
  };
  const screenElement = required(doc, '.screen', HTMLElement);
  const corner = required(doc, '.corner', HTMLElement);
  const modeRoot = required(doc, '.mode-root', HTMLElement);
  const controlsRoot = required(doc, '.controls', HTMLElement);

  // Settings arrive in round 6; until then the defaults apply.
  const seconds: SecondsDisplay = 'blur-away';
  const usageCounts = true;
  const reducedMotion = (): boolean => win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const context: DisplayContext = { seconds, reducedMotion: reducedMotion() };

  const counts = new CountClient(win, () => usageCounts);
  counts.visit();

  const store = new LocalSessionStore(browserLocalStorage(win), report);
  const finished = new FinishedStore(browserSessionStorage(win), report);
  const saved = store.load();
  const savedMode = saved.kind === 'state' ? currentMode(saved.state.session) : null;
  // The temporary ?mode= parameter wins; otherwise a restored session keeps its mode.
  const modeId = requestedMode(win.location.search) ?? savedMode ?? DEFAULT_MODE_ID;
  const registered = findMode(modeId) ?? findMode(DEFAULT_MODE_ID);
  if (registered === undefined) throw new Error('no display modes are registered');
  const mode = (await registered.load())();
  screenElement.dataset['mode'] = registered.manifest.id;
  mode.mount(modeRoot, context);

  const announcer = new Announcer(screenElement);
  const bus = new EventBus<TimerEvents>({ onError: report });
  const sync = new TabSync({
    store,
    channel: openTabChannel(),
    onEndedElsewhere: (reason, session) => {
      // Another tab applied a rule first; show what that tab shows. A session
      // the user ended there shows its results there only.
      if (reason === 'user') return;
      finished.save(session);
      if (reason === 'max_duration') showMaximum(session);
      else void showResults(session, 'animate');
    },
  });
  const engine = new TimerEngine({
    clock: systemClock(),
    events: bus,
    newId: () => win.crypto.randomUUID(),
    onError: report,
    seconds,
    beforeWake: () => {
      sync.pull();
    },
  });

  // ---- Screens -----------------------------------------------------------

  let current: Screen = 'timer';
  // Read through a function: callbacks change the screen where TypeScript cannot see it.
  const screenNow = (): Screen => current;
  let endPressedAt: number | null = null;
  let lastFinished: Session | null = null;
  const focusIsOn = (...elements: HTMLElement[]): boolean =>
    doc.activeElement === null || doc.activeElement === doc.body || elements.some((element) => element.contains(doc.activeElement));

  const setScreen = (next: Screen): void => {
    current = next;
    const timer = next === 'timer';
    modeRoot.hidden = !timer;
    controlsRoot.hidden = !timer;
    screenElement.classList.toggle('screen--bare', next === 'ending');
    if (timer) render(engine.view);
  };

  const notice = new MaximumNotice(doc, () => {
    if (lastFinished === null) leaveToTimer();
    else void showResults(lastFinished, 'animate');
  });
  screenElement.append(notice.element);

  const ending = new EndingCountdown(doc, {
    cancel: () => {
      endPressedAt = null;
      setScreen('timer');
      controls.primary.focus({ preventScroll: true });
    },
    complete: () => {
      const at = endPressedAt;
      endPressedAt = null;
      sync.pull();
      // The session ends where end was pressed (owner decision, 2026-11-15).
      if (!engine.end('user', at === null ? {} : { at })) leaveToTimer();
    },
  });
  screenElement.append(ending.element);

  let results: ResultsScreen | null = null;
  let resultsModule: Promise<typeof ResultsModule> | null = null;
  const loadResults = (): Promise<typeof ResultsModule> => {
    resultsModule ??= import('./results/results.ts');
    return resultsModule;
  };
  const retry = (): void => {
    sync.pull();
    if (engine.status === 'running' || engine.status === 'paused') {
      leaveToTimer();
      return;
    }
    engine.start(registered.manifest.id);
    controls.primary.focus({ preventScroll: true });
  };

  /** The mode instance that draws a session's replay: the mode shown longest. */
  const replayMode = async (session: Session): Promise<DisplayMode> => {
    const id = summarise(session).replayMode;
    if (id === registered.manifest.id) return mode;
    const entry = findMode(id) ?? registered;
    return (await entry.load())();
  };

  let showing: Session | null = null;
  const showResults = async (session: Session, how: 'animate' | 'final'): Promise<void> => {
    if (showing?.id === session.id && current === 'results') return;
    showing = session;
    lastFinished = session;
    const takeFocus = focusIsOn(controlsRoot, ending.element, notice.element);
    notice.hide();
    const animate = how === 'animate';
    let start: number | null = null;
    if (animate) {
      if (!ending.shown) ending.showComplete();
      setScreen('ending');
      start = currentTime();
      // The tabulating screen holds, then fades out (plan, Motion).
      const { tabulatingHold, tabulatingFadeOut, startMorph } = CONFIG.motion;
      const fade = ending.element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reducedMotion() ? startMorph : tabulatingFadeOut,
        easing: smoothstep(),
        fill: 'forwards',
      });
      fade.startTime = start + tabulatingHold;
      void fade.finished.then(
        () => {
          fade.cancel();
          if (showing === session) ending.hide();
        },
        () => undefined,
      );
    } else {
      ending.hide();
    }
    const [module, drawing] = await Promise.all([loadResults(), replayMode(session)]);
    if (showing !== session) return;
    results ??= new module.ResultsScreen(doc, {
      retry,
      announce: (text) => {
        announcer.say(text);
      },
      companions: [corner],
    });
    if (!screenElement.contains(results.element)) screenElement.append(results.element);
    current = 'results';
    modeRoot.hidden = true;
    controlsRoot.hidden = true;
    screenElement.classList.remove('screen--bare');
    await results.show(session, drawing, { start, reducedMotion: reducedMotion() });
    if (takeFocus) results.focusRetry();
    render(engine.view);
  };

  const showMaximum = (session: Session): void => {
    lastFinished = session;
    ending.hide();
    results?.hide();
    showing = null;
    const takeFocus = focusIsOn(controlsRoot, ending.element);
    setScreen('maximum');
    notice.show(takeFocus);
    announcer.say(notice.announcement);
  };

  /** Back to the timer: a new session started, or the screen has nothing else to show. */
  const leaveToTimer = (): void => {
    notice.hide();
    ending.hide();
    results?.hide();
    showing = null;
    endPressedAt = null;
    setScreen('timer');
  };

  const beginEnding = (): void => {
    sync.pull();
    if (engine.status !== 'running' && engine.status !== 'paused') return;
    endPressedAt = engine.now();
    const takeFocus = focusIsOn(controlsRoot);
    setScreen('ending');
    ending.start(takeFocus);
    // The results load while the countdown runs.
    void loadResults();
  };

  // ---- Timer -------------------------------------------------------------

  const toggle = (): void => {
    sync.pull();
    if (engine.status === 'running') engine.pause();
    else if (engine.status === 'paused') engine.resume();
    else engine.start(registered.manifest.id);
  };
  const controls = new Controls(controlsRoot, { primary: toggle, end: beginEnding });

  // An ended session shows the idle screen behind the results.
  const shown = (view: TimerView): TimerView => (view.status === 'ended' ? computeView(null, view.at, seconds) : view);
  const render = (view: TimerView): void => {
    const visible = shown(view);
    mode.render(visible);
    controls.update(visible.status === 'running' || visible.status === 'paused' ? visible.status : 'idle');
    const title = titleFor(visible);
    if (doc.title !== title) doc.title = title;
  };

  bus.on('view.changed', ({ view }) => {
    render(view);
    const open = view.status === 'running' || view.status === 'paused';
    // A session started in another tab replaces whatever this tab was showing.
    if (open && (current === 'results' || current === 'maximum')) {
      finished.clear();
      lastFinished = null;
      leaveToTimer();
    }
    // The session ended elsewhere while this tab counted down.
    if (!open && current === 'ending' && ending.running) leaveToTimer();
  });
  bus.on('milestone.hour', (payload) => mode.onEvent?.({ type: 'milestone.hour', payload }));
  bus.on('state.changed', ({ state }) => {
    sync.saved(state);
  });
  bus.on('heartbeat', ({ at }) => {
    sync.heartbeat(at);
  });
  bus.on('session.started', () => {
    // A finished session is deleted when a new one starts (plan, Guest storage).
    finished.clear();
    lastFinished = null;
    leaveToTimer();
    counts.session();
  });
  bus.on('session.ended', ({ session, reason }) => {
    sync.ended(session);
    finished.save(session);
    lastFinished = session;
    if (reason === 'max_duration') showMaximum(session);
    // Ended through the countdown, or on its own: sessions that end automatically skip the countdown.
    else void showResults(session, 'animate');
  });
  bus.on('checkin.due', () => {
    announcer.say(BRAND.copy.timer.checkIn);
  });
  bus.on('session.paused', ({ reason, at }) => {
    if (reason === 'checkin_missed') announcer.say(BRAND.copy.timer.missedCheckIn.replace('{time}', formatClockTime(at)));
  });

  // Restore the session saved on this device (a refresh or reopened tab), replaying the rules up to now.
  sync.attach(engine, saved);
  if (engine.state !== null && currentMode(engine.state.session) !== registered.manifest.id) engine.switchMode(registered.manifest.id);
  render(engine.view);
  if (engine.state === null && screenNow() === 'timer') {
    // A reload while results were showing shows them again, without the replay (owner decision, 2026-11-15).
    const kept = finished.load();
    if (kept !== null) void showResults(kept, 'final');
  } else if (engine.state !== null) {
    finished.clear();
  }

  // ---- Input -------------------------------------------------------------

  // A check-in is answered by any key, click or tap (plan, Session lifecycle).
  // The answering key does nothing else; a click or tap still acts on what it hits.
  const checkInWaiting = (): boolean => engine.view.status === 'running' && engine.view.checkInDueAt !== null;
  let consumedKey: string | null = null;
  doc.addEventListener(
    'keydown',
    (event) => {
      if (!checkInWaiting()) return;
      sync.pull();
      engine.answerCheckIn();
      if (answersCheckIn(event, event.target instanceof HTMLElement ? event.target : null) === 'consume') {
        consumedKey = event.code;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  // Its release too, so a focused button is not pressed by the key that answered.
  doc.addEventListener(
    'keyup',
    (event) => {
      if (consumedKey === null || event.code !== consumedKey) return;
      consumedKey = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true },
  );
  doc.addEventListener(
    'pointerdown',
    () => {
      if (!checkInWaiting()) return;
      sync.pull();
      engine.answerCheckIn();
    },
    { capture: true },
  );

  doc.addEventListener('keydown', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const shortcut = shortcutFor(event, target);
    if (current === 'ending') {
      // During the countdown: Space or Escape cancels, E ends now.
      if (!ending.running) return;
      if (event.key === 'Escape' || shortcut === 'toggle') {
        event.preventDefault();
        ending.cancel();
      } else if (shortcut === 'end') {
        event.preventDefault();
        ending.endNow();
      }
      return;
    }
    if (shortcut === null) return;
    event.preventDefault();
    if (current === 'results') {
      if (shortcut === 'toggle') retry();
    } else if (shortcut === 'toggle') toggle();
    else if (current === 'timer') beginEnding();
  });

  // A woken device or a returning tab shows the right time at once, rather
  // than at the engine's next scheduled wake, after taking up other tabs' changes.
  const refresh = (): void => {
    sync.pull();
    engine.sync();
  };
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') refresh();
  });
  win.addEventListener('pageshow', refresh);
  win.addEventListener('focus', refresh);
  watchLocalStorage(win, store, refresh);

  registerServiceWorker(win, report);

  function currentTime(): number {
    const time = doc.timeline.currentTime;
    return typeof time === 'number' ? time : 0;
  }

  function smoothstep(): string {
    return win.getComputedStyle(doc.documentElement).getPropertyValue('--ease-smoothstep').trim() || 'ease-in-out';
  }
}
