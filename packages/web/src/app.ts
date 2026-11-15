/**
 * Composition root: builds the engine, the display mode, the controls, the
 * keyboard, the tab title, storage and tab coordination, usage counts and
 * offline support, and connects them through the event bus. Nothing else
 * wires layers together.
 */

import { BRAND, EventBus, TimerEngine, computeView, currentMode } from '@stopwatch/core';
import type { SecondsDisplay, TimerEvents, TimerView } from '@stopwatch/core';
import { CountClient } from './counts/client.ts';
import type { DisplayContext } from './modes/contract.ts';
import { DEFAULT_MODE_ID } from './modes/manifests.ts';
import { requestedMode } from './modes/mode-param.ts';
import { findMode } from './modes/registry.ts';
import { registerServiceWorker } from './offline/register.ts';
import { Announcer } from './shell/announcer.ts';
import { formatClockTime } from './shell/clock-time.ts';
import { answersCheckIn } from './shell/check-in.ts';
import { Controls } from './shell/controls.ts';
import { MaximumNotice } from './shell/notice.ts';
import { shortcutFor } from './shell/shortcuts.ts';
import { titleFor } from './shell/title.ts';
import { LocalSessionStore, browserLocalStorage, watchLocalStorage } from './storage/session-store.ts';
import { TabSync, openTabChannel } from './sync/tabs.ts';
import { systemClock } from './time/system-clock.ts';

function required<T extends Element>(doc: Document, selector: string, type: new () => T): T {
  const element = doc.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`the page is missing ${selector}`);
  return element;
}

export async function startApp(doc: Document, win: Window): Promise<void> {
  const report = (error: unknown): void => {
    win.reportError(error);
  };
  const screen = required(doc, '.screen', HTMLElement);
  const modeRoot = required(doc, '.mode-root', HTMLElement);
  const controlsRoot = required(doc, '.controls', HTMLElement);

  // Settings arrive in round 6; until then the defaults apply.
  const seconds: SecondsDisplay = 'blur-away';
  const usageCounts = true;
  const context: DisplayContext = {
    seconds,
    reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  const counts = new CountClient(win, () => usageCounts);
  counts.visit();

  const store = new LocalSessionStore(browserLocalStorage(win), report);
  const saved = store.load();
  const savedMode = saved.kind === 'state' ? currentMode(saved.state.session) : null;
  // The temporary ?mode= parameter wins; otherwise a restored session keeps its mode.
  const modeId = requestedMode(win.location.search) ?? savedMode ?? DEFAULT_MODE_ID;
  const registered = findMode(modeId) ?? findMode(DEFAULT_MODE_ID);
  if (registered === undefined) throw new Error('no display modes are registered');
  const mode = (await registered.load())();
  screen.dataset['mode'] = registered.manifest.id;
  mode.mount(modeRoot, context);

  const announcer = new Announcer(screen);
  const bus = new EventBus<TimerEvents>({ onError: report });
  const sync = new TabSync({
    store,
    channel: openTabChannel(),
    onEndedElsewhere: (reason) => {
      if (reason === 'max_duration') showMaximum();
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

  const toggle = (): void => {
    sync.pull();
    if (engine.status === 'running') engine.pause();
    else if (engine.status === 'paused') engine.resume();
    else engine.start(registered.manifest.id);
  };
  const end = (): void => {
    sync.pull();
    engine.end('user');
  };
  const controls = new Controls(controlsRoot, { primary: toggle, end });

  // Round 4: the session maximum notice. "view results" returns to idle until
  // round 5 (owner decision, 2026-11-15).
  const notice = new MaximumNotice(doc, () => {
    hideMaximum();
    controls.primary.focus({ preventScroll: true });
  });
  screen.append(notice.element);
  const showMaximum = (): void => {
    if (notice.shown) return;
    const focusWasHere = doc.activeElement === doc.body || controlsRoot.contains(doc.activeElement);
    modeRoot.hidden = true;
    controlsRoot.hidden = true;
    notice.show(focusWasHere);
    announcer.say(notice.announcement);
  };
  const hideMaximum = (): void => {
    if (!notice.shown) return;
    notice.hide();
    modeRoot.hidden = false;
    controlsRoot.hidden = false;
    render(engine.view);
  };

  // An ended session returns the screen to idle (round 3); round 5 replaces
  // this with the countdown and results.
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
  });
  bus.on('milestone.hour', (payload) => mode.onEvent?.({ type: 'milestone.hour', payload }));
  bus.on('state.changed', ({ state }) => {
    sync.saved(state);
  });
  bus.on('heartbeat', ({ at }) => {
    sync.heartbeat(at);
  });
  bus.on('session.started', () => {
    hideMaximum();
    counts.session();
  });
  bus.on('session.ended', ({ session, reason }) => {
    sync.ended(session.id, reason);
    if (reason === 'max_duration') showMaximum();
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
      if (answersCheckIn(event) === 'consume') {
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
    if (shortcut === null) return;
    event.preventDefault();
    if (shortcut === 'toggle') toggle();
    else end();
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
}
