/**
 * Composition root: builds the engine, the display mode, the controls, the
 * keyboard, the tab title, storage and tab coordination, the end screen,
 * usage counts and offline support, and connects them through the event bus.
 * Nothing else wires layers together.
 *
 * The screen shows one of: the timer; the ending countdown; the results
 * (after the tabulating screen); the session maximum notice.
 */

import { BRAND, CONFIG, EventBus, TimerEngine, computeView, currentMode, localDay, rulesFrom, secondsDisplayFor, shownMode, summarise, systemTimeZone, withSetting } from '@stopwatch/core';
import type { ModeChoice, Session, TimerEvents, TimerView } from '@stopwatch/core';
import { CountClient } from './counts/client.ts';
import { CrashReporter } from './crash/reporter.ts';
import type { DisplayMode, ModeOptions } from './modes/contract.ts';
import { DEFAULT_MODE_ID } from './modes/standard-manifests.ts';
import { findMode, registerModes } from './modes/registry.ts';
import type { RegisteredMode } from './modes/registry.ts';
import { registerServiceWorker } from './offline/register.ts';
import type * as ResultsModule from './results/results.ts';
import type { ResultsScreen } from './results/results.ts';
import { SettingsController } from './settings/controller.ts';
import type { SettingsEffects } from './settings/controller.ts';
import type * as PanelModule from './settings/panel.ts';
import type { NotificationAccess, SettingsPanel } from './settings/panel.ts';
import { Announcer } from './shell/announcer.ts';
import { formatClockTime, setClockFormat } from './shell/clock-time.ts';
import { answersCheckIn } from './shell/check-in.ts';
import { Controls } from './shell/controls.ts';
import { EndingCountdown } from './shell/ending.ts';
import { FocusView } from './shell/focus-view.ts';
import { MaximumNotice } from './shell/notice.ts';
import { Pill } from './shell/pill.ts';
import type { Notice } from './shell/pill.ts';
import { ModeStage } from './shell/mode-stage.ts';
import type { ModeContext } from './shell/mode-stage.ts';
import { motionScale } from './shell/motion.ts';
import { Notifier } from './shell/notifier.ts';
import { takeSafeMode } from './shell/safe-mode.ts';
import { ICON_FILES } from './icons/app-icons.ts';
import { shortcutFor } from './shell/shortcuts.ts';
import { titleFor } from './shell/title.ts';
import { FinishedStore, browserSessionStorage } from './storage/finished-store.ts';
import { LocalCustomCssStore, watchCustomCss } from './storage/custom-css-store.ts';
import { LocalNoticeStore } from './storage/notice-store.ts';
import { ScreenWake, browserWakeLock } from './shell/wake-lock.ts';
import { lazyMediaStore } from './storage/lazy-media.ts';
import { hasModeCaches } from './storage/offline-cache.ts';
import type * as ModeCache from './storage/mode-cache.ts';

type ModeCacheModule = typeof ModeCache;
import { LocalSessionStore, browserLocalStorage, watchLocalStorage } from './storage/session-store.ts';
import { LocalSettingsStore, watchSettings } from './storage/settings-store.ts';
import { TabSync, openTabChannel } from './sync/tabs.ts';
import { forgetTestModesSwitch, isFlaggedVisit } from './test-flag.ts';
import { systemClock } from './time/system-clock.ts';

type Screen = 'timer' | 'ending' | 'results' | 'maximum';
/** A staged mode's contrast switch, held until it shows. */
interface HeldChrome {
  readonly share: number;
  readonly dark: string;
}

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
  let modeRoot = required(doc, '.mode-root', HTMLElement);
  const controlsRoot = required(doc, '.controls', HTMLElement);
  const settingsButton = required(doc, '.icon-button--settings', HTMLButtonElement);

  // Settings come first: the theme, the font and the time size apply before anything else is drawn.
  // The site reacts to a change through these effects, bound once everything they touch exists.
  const effects: SettingsEffects = {
    seconds: () => undefined,
    rules: () => undefined,
    mode: () => undefined,
    clockFormat: () => undefined,
    font: () => undefined,
    modeOptions: () => undefined,
  };
  const settingsStore = new LocalSettingsStore(browserLocalStorage(win), report);
  const customCssStore = new LocalCustomCssStore(browserLocalStorage(win), report);
  const noticeStore = new LocalNoticeStore(browserLocalStorage(win), report);
  // The test flag (test-flag.ts): read from the address on every load and kept in memory for this visit only. Round
  // 2.9's switch is gone; whatever it stored is removed. Only a flagged visit loads the test modes' manifests.
  const local = browserLocalStorage(win);
  forgetTestModesSwitch(local, report);
  const flagged = isFlaggedVisit(win.location.search);
  if (flagged) {
    const { TEST_MODE_MANIFESTS, TEST_MODE_SOURCES } = await import('./modes/test-modes.ts');
    registerModes(TEST_MODE_MANIFESTS, TEST_MODE_SOURCES);
  }
  // Picture-in-picture, moved to a later release (owner, answer 38): its code only on a flagged visit, and only where
  // the browser offers a window for a page (pip/pip.ts). Elsewhere neither its row nor its button exists.
  const offersPip = (win as unknown as { readonly documentPictureInPicture?: unknown }).documentPictureInPicture !== undefined;
  const pipModule = flagged && offersPip ? await import('./pip/pip.ts') : null;
  /** The mode shown for a chosen one: digits for a test mode on a visit without the flag, the choice kept. */
  const shownFor = (chosen: ModeChoice): ModeChoice => shownMode(chosen, flagged);
  const settings = new SettingsController({
    doc,
    store: settingsStore,
    media: lazyMediaStore(win),
    customCss: customCssStore,
    safe: takeSafeMode(win),
    effects: {
      seconds: (display) => {
        effects.seconds(display);
      },
      rules: (rules) => {
        effects.rules(rules);
      },
      mode: (id) => {
        effects.mode(shownFor(id));
      },
      clockFormat: (format) => {
        setClockFormat(format);
        effects.clockFormat(format);
      },
      font: () => {
        effects.font();
      },
      modeOptions: () => {
        effects.modeOptions();
      },
    },
    onError: report,
    alsoClears: [noticeStore],
  });
  setClockFormat(settings.current.clockFormat);
  const fontReady = settings.start();

  const motionQuery = win.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = (): boolean => motionQuery.matches;
  // Low power is in the backlog (plan version 14): wherever the plan says "reduced motion or low power", only the
  // system's reduced-motion preference applies, so the modes' still drawing follows it alone.
  const lowPower = (): boolean => reducedMotion();
  // The site owns this object; a changed setting updates it and redraws (modes/contract.ts).
  /** A mode's options (its recipe's), as the settings that hold them say (modes/manifests.ts). */
  const modeOptions = (id: string = registered.manifest.id): ModeOptions => {
    const manifest = findMode(id)?.manifest;
    return Object.fromEntries(Object.entries(manifest?.options ?? {}).map(([option, key]) => [option, settings.current[key]]));
  };
  // The contrast switch: the time, the icons and the labels crossfade to the mode's dark colour, or back. Each
  // corner icon gets a dark copy the first time, stacked over it (modes/recipe/recipe.css).
  const chrome = (share: number, dark: string): void => {
    for (const icon of corner.querySelectorAll<SVGElement>('.icon-button > svg:not(.icon-shade)')) {
      if (icon.parentElement?.querySelector('.icon-shade') !== null) continue;
      const copy = icon.cloneNode(true) as SVGElement;
      copy.classList.add('icon-shade');
      icon.classList.add('icon-lit');
      icon.after(copy);
    }
    if (share <= 0) delete screenElement.dataset['contrast'];
    else screenElement.dataset['contrast'] = 'dark';
    screenElement.style.setProperty('--contrast-dark', dark);
  };
  // The live mode's context (each mode gets its own, with its options: shell/mode-stage.ts).
  let context: ModeContext = {
    seconds: secondsDisplayFor(settings.current.hideSeconds),
    reducedMotion: reducedMotion(),
    lowPower: lowPower(),
    options: modeOptions(shownFor(settings.current.mode)),
    chrome,
  };
  const showLowPower = (): void => {
    doc.documentElement.toggleAttribute('data-low-power', context.lowPower);
  };
  showLowPower();

  const counts = new CountClient(win, () => settings.current.usageCounts);
  counts.visit();
  new CrashReporter(win, () => settings.current.crashReports).attach();

  const store = new LocalSessionStore(browserLocalStorage(win), report);
  const finished = new FinishedStore(browserSessionStorage(win), report);
  const saved = store.load();
  // The display mode is a setting; a restored session switches to it if another tab left it elsewhere.
  /** Settings' list of downloaded modes follows a mode's caching; set once the panel can exist. */
  let downloadsChanged = (): void => undefined;
  // A test mode chosen shows digits on a visit without the flag; the choice stays in the settings for the next
  // flagged visit.
  let registered: RegisteredMode = findMode(shownFor(settings.current.mode)) ?? fallbackMode();
  // Downloaded modes unused for 30 days go when the page loads, never on a timer (plan, Loading and performance).
  // Fetched when the page has loaded, so the first visit's download carries none of it.
  const modeCache = (): Promise<ModeCacheModule> => import('./storage/mode-cache.ts');
  const shownAtStart = registered.manifest.id;
  const sweep = (): void => {
    // Only where a mode was ever downloaded: a first visit fetches nothing for it.
    void hasModeCaches(win)
      .then(async (any) => {
        if (any) await (await modeCache()).removeUnusedModes(win, Date.now(), shownAtStart);
      })
      .catch(report);
  };
  if (doc.readyState === 'complete') sweep();
  else win.addEventListener('load', sweep, { once: true });
  let mode: DisplayMode = (await registered.load())();
  usedMode(registered);
  screenElement.dataset['mode'] = registered.manifest.id;
  context.options = modeOptions();
  mode.mount(modeRoot, context);
  /** Runs `task` as a background task of its own: after input and drawing, so it never holds a frame (plan, Performance). */
  const backgroundTask = (task: () => void): (() => void) => {
    const controller = new AbortController();
    // Absent in Safari, whatever the types say.
    if ('scheduler' in win) {
      win.scheduler.postTask(task, { priority: 'background', signal: controller.signal }).catch(() => undefined);
      return () => {
        controller.abort();
      };
    }
    // Without one (Safari): a task of its own, queued behind what is waiting.
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      if (!controller.signal.aborted) task();
    };
    channel.port2.postMessage(null);
    return () => {
      controller.abort();
      channel.port1.close();
    };
  };
  const stage = new ModeStage(
    { registered, mode, root: modeRoot, context },
    {
      contextFor: (next) => {
        // Until it shows, the staged mode's contrast switch is held, and applied as it takes the screen.
        let held: HeldChrome | null = null;
        const staged: ModeContext = {
          ...context,
          options: modeOptions(next.manifest.id),
          chrome: (share, dark) => {
            held = { share, dark };
          },
        };
        stagedChrome.set(staged, () => held);
        return staged;
      },
      draw: (staged) => {
        staged.render(shown(engine.view));
      },
      loaded: (next) => {
        usedMode(next);
      },
      swapped: (live) => {
        const held = stagedChrome.get(live.context)?.() ?? null;
        stagedChrome.delete(live.context);
        // The live context takes the site's values as they are now, then the screen follows the new mode.
        live.context.seconds = context.seconds;
        live.context.reducedMotion = context.reducedMotion;
        live.context.lowPower = context.lowPower;
        live.context.chrome = chrome;
        context = live.context;
        registered = live.registered;
        mode = live.mode;
        modeRoot = live.root;
        screenElement.dataset['mode'] = registered.manifest.id;
        if (held !== null) chrome(held.share, held.dark);
        mode.relayout?.();
        render(engine.view);
      },
      idle: backgroundTask,
      fadeMs: () => (context.reducedMotion ? 0 : CONFIG.motion.modeSwitch.fadeMs * motionScale(doc)),
      report,
    },
  );
  const stagedChrome = new WeakMap<ModeContext, () => HeldChrome | null>();

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
    seconds: secondsDisplayFor(settings.current.hideSeconds),
    rules: rulesFrom(settings.current),
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
    if (timer) {
      render(engine.view);
      showChosenMode();
    } else focusView.update();
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
  // Back to the timer (the results' retry icon, or Space): the results close and the idle timer shows,
  // ready for the next session, which starts only from there. The finished session leaves tab storage, so
  // a reload shows the timer, not the old results. A session another tab started is shown as it is.
  const backToTimer = (): void => {
    sync.pull();
    if (engine.status !== 'running' && engine.status !== 'paused') {
      finished.clear();
      lastFinished = null;
    }
    leaveToTimer();
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
      const { tabulatingHold, tabulatingFadeOut, fade: fadeDuration } = CONFIG.motion;
      const scale = motionScale(doc);
      const fade = ending.element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: (reducedMotion() ? fadeDuration : tabulatingFadeOut) * scale,
        easing: standardEasing(),
        fill: 'forwards',
      });
      fade.startTime = start + tabulatingHold * scale;
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
      retry: backToTimer,
      announce: (text) => {
        announcer.say(text);
      },
      companions: [corner],
    });
    if (!screenElement.contains(results.element)) screenElement.append(results.element);
    current = 'results';
    modeRoot.hidden = true;
    controlsRoot.hidden = true;
    await results.show(session, drawing, { start, reducedMotion: reducedMotion() }, modeOptions(drawing.id));
    if (showing !== session) return;
    // The corner icons return with the results: their fade-in is set, so they stay unseen until it starts.
    screenElement.classList.remove('screen--bare');
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

  // The display hears end the moment it is pressed (the analog crown dips): on the button's press, before its
  // click, and on E. A display already answering the press ignores the second call.
  const endPressed = (): void => {
    if (current === 'timer' && (engine.status === 'running' || engine.status === 'paused')) mode.onEvent?.({ type: 'end.pressed' });
  };
  controlsRoot.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Element && event.target.closest('.button--end') !== null) endPressed();
  });
  const beginEnding = (): void => {
    sync.pull();
    if (engine.status !== 'running' && engine.status !== 'paused') return;
    // Session controls always win: a mode still loading stops (it shows again once back on the timer).
    stage.cancel();
    endPressed();
    endPressedAt = engine.now();
    const takeFocus = focusIsOn(controlsRoot);
    setScreen('ending');
    ending.start(takeFocus);
    // The results load while the countdown runs.
    void loadResults();
  };

  // ---- Timer -------------------------------------------------------------

  // Fullscreen (plan, Interface: the focus view settings): entered as a session starts, if asked, within the
  // start's own press; left on pause or end as the setting says. Esc always leaves it (the browser's own). Where
  // the page has no fullscreen (iPhones), nothing here runs and settings hide both choices.
  const fullscreenAvailable = (): boolean => doc.fullscreenEnabled && typeof doc.documentElement.requestFullscreen === 'function';
  const enterFullscreen = (): void => {
    if (!settings.current.fullscreenOnStart || !fullscreenAvailable() || doc.fullscreenElement !== null) return;
    void doc.documentElement.requestFullscreen().catch(() => undefined);
  };
  const leaveFullscreen = (on: 'pause' | 'end'): void => {
    const leave = settings.current.leaveFullscreen;
    if (doc.fullscreenElement === null || leave === 'never' || (on === 'pause' && leave !== 'pause-or-end')) return;
    void doc.exitFullscreen().catch(() => undefined);
  };

  const toggle = (): void => {
    sync.pull();
    // Session controls always win: a mode still loading stops, the control applies at once, and the chosen mode
    // loads again in a background task after it.
    const wasLoading = stage.cancel();
    if (engine.status === 'running') {
      engine.pause();
      leaveFullscreen('pause');
    } else if (engine.status === 'paused') engine.resume();
    else {
      // The session starts in the chosen mode, whether or not its drawing is ready.
      engine.start(chosenMode().manifest.id);
      enterFullscreen();
    }
    if (wasLoading !== null) backgroundTask(showChosenMode);
  };
  const controls = new Controls(controlsRoot, { primary: toggle, end: beginEnding });
  let settingsShown = false;
  const focusView = new FocusView(win, screenElement, {
    quietMs: () => {
      const hide = settings.current.focusHide;
      return hide === 'never' ? null : CONFIG.motion.focus.quietMs[hide];
    },
    active: () =>
      current === 'timer' && !settingsShown && doc.visibilityState === 'visible' && engine.view.status === 'running' && engine.view.checkInDueAt === null,
    now: () => win.performance.now(),
    wakeAfter: (delayMs, run) => {
      engine.wakeAfter('focus-view', delayMs, run);
    },
    cancelWake: () => {
      engine.cancelWake('focus-view');
    },
  });

  const pipApi = pipModule?.browserPip(win) ?? null;
  const pip =
    pipModule === null || pipApi === null
      ? null
      : new pipModule.PictureInPicture(doc, pipApi, {
          corner,
          settingsButton,
          view: () => engine.view,
          onView: (listener) =>
            bus.on('view.changed', ({ view }) => {
              listener(view);
            }),
          primary: toggle,
          end: beginEnding,
          onError: report,
        });
  pip?.set(settings.current.pictureInPicture);
  settings.subscribe((next) => {
    pip?.set(next.pictureInPicture);
  });

  // Keep screen awake (Release 2): a screen wake lock while the setting is on, a session is running or paused, and the
  // tab is seen (plan version 14, answer 40); render() tells it whether a session is open.
  const screenWake = new ScreenWake(doc, browserWakeLock(win), report);
  screenWake.set(settings.current.keepAwake);
  settings.subscribe((next) => {
    screenWake.set(next.keepAwake);
  });

  // An ended session shows the idle screen behind the results.
  const shown = (view: TimerView): TimerView => (view.status === 'ended' ? computeView(null, view.at, context.seconds) : view);
  // In a hidden tab nothing is drawn (plan, Loading and performance > Rendering): only the tab title, which is
  // what a background tab shows, keeps up. The display catches up the moment the tab is seen again.
  let behind = false;
  const render = (view: TimerView): void => {
    const visible = shown(view);
    const title = titleFor(visible);
    if (doc.title !== title) doc.title = title;
    // Running or paused, a check-in waiting included; let go on the idle screen and on the results.
    screenWake.session(visible.status === 'running' || visible.status === 'paused');
    if (doc.visibilityState === 'hidden') {
      behind = true;
      return;
    }
    behind = false;
    mode.render(visible);
    controls.update(visible.status === 'running' || visible.status === 'paused' ? visible.status : 'idle');
    focusView.update();
    showNotice();
  };

  // Notices (plan, Interface): one pill above the time on the idle screen, one at a time, each at its moment (plan
  // versions 13 and 14). Before the first completed session, the fullscreen tip, as it is about setting up: shown
  // where the page can go fullscreen and while the setting is off. After it, once the person has watched the seconds
  // tick, the seconds tip, while "hide seconds after starting" is still "never". "change" makes the tip's change and
  // opens settings on it; a tip dismissed or acted on has done its job and never returns.
  const fullscreenTip: Notice = { id: 'fullscreen', text: BRAND.copy.notices.fullscreen, change: { key: 'fullscreenOnStart', value: true } };
  const secondsTip: Notice = { id: 'seconds', text: BRAND.copy.notices.seconds, change: { key: 'hideSeconds', value: 'blur-away' } };
  const noticeNow = (): Notice | null => {
    if (current !== 'timer' || shown(engine.view).status !== 'idle') return null;
    if (!noticeStore.firstSession) {
      if (!fullscreenAvailable() || settings.current.fullscreenOnStart || noticeStore.dismissed(fullscreenTip.id)) return null;
      return fullscreenTip;
    }
    if (settings.current.hideSeconds !== 'never' || noticeStore.dismissed(secondsTip.id)) return null;
    return secondsTip;
  };
  const pill = new Pill(doc, {
    dismiss: (notice) => {
      noticeStore.dismiss(notice.id);
      showNotice();
    },
    change: (notice, change) => {
      noticeStore.dismiss(notice.id);
      settings.change(withSetting(settings.current, change.key, change.value));
      void openSettings()
        .then(() => panel?.openOn(change.key, true))
        .catch(report);
    },
  });
  function showNotice(): void {
    // The mode may have rebuilt its time (a mode switch, an option); the pill follows it.
    const time = modeRoot.querySelector<HTMLElement>(':scope > .contrast, :scope > .time-stack');
    const next = noticeNow();
    // A pill that goes while one of its buttons has focus hands focus on to the next control, start.
    if (next === null && pill.element.contains(doc.activeElement)) controlsRoot.querySelector('button')?.focus();
    pill.show(next, time);
  }
  settings.subscribe(() => {
    showNotice();
  });

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
    // The first completed session: from now on the idle screen's tip is the seconds tip's (noticeNow).
    noticeStore.completeSession();
    leaveFullscreen('end');
    sync.ended(session);
    finished.save(session);
    lastFinished = session;
    if (reason === 'max_duration') showMaximum(session);
    // Ended through the countdown, or on its own: sessions that end automatically skip the countdown.
    else void showResults(session, 'animate');
  });
  const notifier = new Notifier({ win, icon: `/${ICON_FILES.png192}`, onError: report });
  bus.on('checkin.due', ({ at, session }) => {
    announcer.say(BRAND.copy.timer.checkIn);
    if (settings.current.notifyCheckIns) notifier.checkIn(session.id, at);
  });
  bus.on('pause.ending', ({ endsAt, session }) => {
    if (settings.current.notifyPauseLimit) notifier.pauseEnding(session.id, endsAt);
  });
  bus.on('session.paused', ({ reason, at }) => {
    if (reason === 'checkin_missed') announcer.say(BRAND.copy.timer.missedCheckIn.replace('{time}', formatClockTime(at)));
  });

  // ---- Settings ----------------------------------------------------------

  effects.seconds = (display) => {
    context.seconds = display;
    sync.pull();
    engine.setSecondsDisplay(display);
    render(engine.view);
  };
  effects.rules = (rules) => {
    // Both apply from the next sign of presence or pause (core: TimerEngine.setRules).
    engine.setRules(rules);
  };
  effects.clockFormat = () => {
    render(engine.view);
  };
  const motionChanged = (): void => {
    context.reducedMotion = reducedMotion();
    context.lowPower = lowPower();
    showLowPower();
    render(engine.view);
  };
  motionQuery.addEventListener('change', motionChanged);
  effects.font = () => {
    mode.relayout?.();
  };
  effects.modeOptions = () => {
    context.options = modeOptions();
    render(engine.view);
  };
  effects.mode = (id) => {
    const next = findMode(id) ?? fallbackMode();
    sync.pull();
    // The session records the switch when it is chosen; the drawing follows once it is whole (shell/mode-stage.ts).
    if (engine.state !== null) engine.switchMode(next.manifest.id);
    stage.show(next);
  };
  /** The chosen mode as shown (digits for a test mode on a visit without the flag). */
  function chosenMode(): RegisteredMode {
    return findMode(shownFor(settings.current.mode)) ?? fallbackMode();
  }
  /** Shows the chosen mode if neither the screen nor a load already has it (after a control stopped its load). */
  function showChosenMode(): void {
    const chosen = chosenMode();
    if (current !== 'timer' || chosen.manifest.id === registered.manifest.id || stage.loading?.manifest.id === chosen.manifest.id) return;
    stage.show(chosen);
  }
  // Another tab's change applies here too, without being saved again.
  watchSettings(win, settingsStore, (next) => {
    settings.external(next);
  });
  watchCustomCss(win, customCssStore, (css) => {
    settings.externalCustomCss(css);
  });
  // The chosen font may arrive after the first drawing; the blur-away widths follow it.
  void fontReady.then(() => mode.relayout?.());

  let panel: SettingsPanel | null = null;
  let panelModule: Promise<typeof PanelModule> | null = null;
  downloadsChanged = () => {
    void panel?.refreshDownloads();
  };
  const closeSettings = (): void => {
    if (panel === null || !panel.shown) return;
    panel.hide();
    settingsShown = false;
    focusView.update();
    // Settings may have changed what the idle screen tells (clear device data brings dismissed notices back).
    showNotice();
    settingsButton.focus({ preventScroll: true });
  };
  const openSettings = async (): Promise<void> => {
    panelModule ??= import('./settings/panel.ts');
    const module = await panelModule;
    panel ??= new module.SettingsPanel(doc, {
      controller: settings,
      close: closeSettings,
      requestNotifications,
      // A flagged visit's test-mode tiles and options, fetched with the panel; none on a visit without the flag.
      testModes: flagged ? await import('./settings/test-modes.ts') : null,
      pictureInPicture: pip === null || pipModule === null ? null : { label: pipModule.PIP_COPY.label, help: pipModule.PIP_COPY.help },
    });
    if (!doc.body.contains(panel.element)) doc.body.append(panel.element);
    panel.open();
    settingsShown = true;
    focusView.update();
  };
  const toggleSettings = (): void => {
    if (panel?.shown === true) closeSettings();
    else void openSettings().catch(report);
  };
  settingsButton.addEventListener('click', toggleSettings);

  async function requestNotifications(): Promise<NotificationAccess> {
    // Absent on iPhones until the site is added to the home screen.
    const api = (win as Window & { readonly Notification?: typeof Notification }).Notification;
    if (api === undefined) return 'unsupported';
    if (api.permission !== 'default') return api.permission;
    try {
      return await api.requestPermission();
    } catch {
      return 'unsupported';
    }
  }

  // Restore the session saved on this device (a refresh or reopened tab), replaying the rules up to now.
  sync.attach(engine, saved);
  engine.setBackground(doc.visibilityState === 'hidden');
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
    if (event.key === 'Escape' && panel?.shown === true) {
      event.preventDefault();
      closeSettings();
      return;
    }
    if (shortcut === null) return;
    event.preventDefault();
    if (shortcut === 'settings') toggleSettings();
    else if (current === 'results') {
      if (shortcut === 'toggle') backToTimer();
    } else if (shortcut === 'toggle') toggle();
    else if (current === 'timer') beginEnding();
  });

  // A woken device or a returning tab shows the right time at once, rather
  // than at the engine's next scheduled wake, after taking up other tabs' changes.
  const refresh = (): void => {
    sync.pull();
    engine.sync();
  };
  // Hidden, the engine wakes only for the heartbeat, and the tab title follows in that wake; seen again,
  // it catches up at once (plan, Performance requirements > One scheduler).
  doc.addEventListener('visibilitychange', () => {
    const hidden = doc.visibilityState === 'hidden';
    engine.setBackground(hidden);
    // The focus view waits only while the tab is seen; the wake lock is let go while hidden and asked for again.
    focusView.update();
    screenWake.update();
    if (hidden) return;
    refresh();
    if (behind) render(engine.view);
  });
  win.addEventListener('pageshow', refresh);
  win.addEventListener('focus', refresh);
  watchLocalStorage(win, store, refresh);

  registerServiceWorker(win, report);
  // Every control and shortcut answers from here on (the end-to-end tests wait for it).
  doc.documentElement.toggleAttribute('data-ready', true);

  // A session's start reads its local day, and the first time zone lookup loads the browser's time zone
  // data: about 10 ms, several times that on a slow phone. Done once the page has loaded, the first tap
  // on start does not wait for it (plan: controls respond within 100 ms).
  const readTimeZone = (): void => {
    localDay(Date.now(), systemTimeZone());
  };
  if (doc.readyState === 'complete') readTimeZone();
  else win.addEventListener('load', readTimeZone, { once: true });

  /** A downloaded mode was shown: the service worker keeps it for offline use, and settings list it. */
  function usedMode(shown: RegisteredMode): void {
    if (shown.manifest.tier !== 'on-choice') return;
    void modeCache()
      .then(({ recordModeUse }) => recordModeUse(win, shown.manifest.id, Date.now()))
      .then(() => {
        downloadsChanged();
      }, report);
  }

  function fallbackMode(): RegisteredMode {
    const found = findMode(DEFAULT_MODE_ID);
    if (found === undefined) throw new Error('no display modes are registered');
    return found;
  }

  function currentTime(): number {
    const time = doc.timeline.currentTime;
    return typeof time === 'number' ? time : 0;
  }

  function standardEasing(): string {
    return win.getComputedStyle(doc.documentElement).getPropertyValue('--ease-standard').trim() || 'ease-out';
  }
}
