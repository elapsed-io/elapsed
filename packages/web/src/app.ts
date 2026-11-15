/**
 * Composition root: builds the engine, the chosen display mode, the controls,
 * keyboard shortcuts and the tab title, and connects them through the event
 * bus. Nothing else wires layers together.
 */

import { EventBus, TimerEngine, computeView } from '@stopwatch/core';
import type { SecondsDisplay, TimerEvents, TimerView } from '@stopwatch/core';
import type { DisplayContext } from './modes/contract.ts';
import { DEFAULT_MODE_ID } from './modes/manifests.ts';
import { modeFromSearch } from './modes/mode-param.ts';
import { findMode } from './modes/registry.ts';
import { Controls } from './shell/controls.ts';
import { shortcutFor } from './shell/shortcuts.ts';
import { titleFor } from './shell/title.ts';
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
  const context: DisplayContext = {
    seconds,
    reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  const modeId = modeFromSearch(win.location.search);
  const registered = findMode(modeId) ?? findMode(DEFAULT_MODE_ID);
  if (registered === undefined) throw new Error('no display modes are registered');
  const mode = (await registered.load())();
  screen.dataset['mode'] = registered.manifest.id;
  mode.mount(modeRoot, context);

  const bus = new EventBus<TimerEvents>({ onError: report });
  const engine = new TimerEngine({
    clock: systemClock(),
    events: bus,
    newId: () => win.crypto.randomUUID(),
    onError: report,
    seconds,
  });

  const toggle = (): void => {
    if (engine.status === 'running') engine.pause();
    else if (engine.status === 'paused') engine.resume();
    else engine.start(registered.manifest.id);
  };
  const end = (): void => {
    engine.end('user');
  };
  const controls = new Controls(controlsRoot, { primary: toggle, end });

  // Round 3: an ended session returns the screen to idle (owner decision,
  // 2026-11-15). Round 5 replaces this with the countdown and results.
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
  render(engine.view);

  doc.addEventListener('keydown', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const shortcut = shortcutFor(event, target);
    if (shortcut === null) return;
    event.preventDefault();
    if (shortcut === 'toggle') toggle();
    else end();
  });

  // A woken device or a returning tab shows the right time at once, rather
  // than at the engine's next scheduled wake.
  const sync = (): void => {
    engine.sync();
  };
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') sync();
  });
  win.addEventListener('pageshow', sync);
  win.addEventListener('focus', sync);
}
