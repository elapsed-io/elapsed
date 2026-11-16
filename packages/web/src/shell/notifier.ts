/**
 * System notifications for check-ins and the pause limit (plan, Settings
 * catalog > Notifications), when the user has switched them on and the
 * browser allows them. The device plays its own sound; the site has none.
 *
 * - Shown only when the user is not looking at this page, since the page
 *   itself shows the check-in and the pause.
 * - Shown through the service worker where there is one (phones require it),
 *   otherwise directly.
 * - Each carries a tag naming the session and moment, so several open tabs
 *   (each with its own engine) show one notification, not several.
 * - A notification never carries more than the product's own copy and a
 *   clock time.
 */

import { BRAND } from '@stopwatch/core';
import { formatClockTime } from './clock-time.ts';

export interface NotifierOptions {
  readonly win: Window;
  /** The placeholder app icon. */
  readonly icon: string;
  readonly onError: (error: unknown) => void;
}

export class Notifier {
  readonly #win: Window;
  readonly #icon: string;
  readonly #onError: (error: unknown) => void;

  constructor(options: NotifierOptions) {
    this.#win = options.win;
    this.#icon = options.icon;
    this.#onError = options.onError;
  }

  checkIn(sessionId: string, dueAt: number): void {
    const copy = BRAND.copy.notify.checkIn;
    this.#show(`checkin-${sessionId}-${String(dueAt)}`, copy.title, copy.body);
  }

  pauseEnding(sessionId: string, endsAt: number): void {
    const copy = BRAND.copy.notify.pauseLimit;
    this.#show(`pause-${sessionId}-${String(endsAt)}`, copy.title, copy.body.replace('{time}', formatClockTime(endsAt)));
  }

  #show(tag: string, title: string, body: string): void {
    const doc = this.#win.document;
    if (doc.visibilityState === 'visible' && doc.hasFocus()) return;
    const api = (this.#win as Window & { readonly Notification?: typeof Notification }).Notification;
    if (api === undefined || api.permission !== 'granted') return;
    const options: NotificationOptions = { body, tag, icon: this.#icon, lang: 'en' };
    const container = this.#win.navigator.serviceWorker as ServiceWorkerContainer | undefined;
    const viaWorker = container === undefined ? Promise.resolve(undefined) : container.getRegistration();
    viaWorker
      .then((registration) => {
        if (registration !== undefined) return registration.showNotification(title, options);
        new api(title, options);
        return undefined;
      })
      .catch(this.#onError);
  }
}
