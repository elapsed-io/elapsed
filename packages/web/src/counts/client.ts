/**
 * Anonymous usage counts (plan, Principles > Private; owner decision,
 * 2026-11-15): daily visits and sessions started, on by default; the switch
 * arrives with the settings panel in round 6.
 *
 * - A visit is a page load that is not a reload or a back-and-forward
 *   navigation, read from the navigation's type. A page the browser
 *   prerenders counts only once it is shown.
 * - A session counts once when it starts here; a session restored after a
 *   refresh or shown from another tab does not count again.
 *
 * Nothing is stored on the device to count, and a request carries only the
 * event's name: no cookies, no referrer, no time, no identifier. A count that
 * cannot be sent (offline) is simply lost.
 */

import { COUNT_PATH, countBody } from '@stopwatch/core';
import type { CountEvent } from '@stopwatch/core';

export function isCountedNavigation(type: string | undefined): boolean {
  return type !== 'reload' && type !== 'back_forward';
}

export class CountClient {
  readonly #win: Window;
  readonly #enabled: () => boolean;

  constructor(win: Window, enabled: () => boolean) {
    this.#win = win;
    this.#enabled = enabled;
  }

  visit(): void {
    const [entry] = this.#win.performance.getEntriesByType('navigation');
    const type = entry instanceof PerformanceNavigationTiming ? entry.type : undefined;
    if (!isCountedNavigation(type)) return;
    const doc = this.#win.document;
    // Not yet in TypeScript's DOM types.
    if ((doc as Document & { readonly prerendering?: boolean }).prerendering === true) {
      doc.addEventListener('prerenderingchange', () => {
        this.#send('visit');
      }, { once: true });
    } else {
      this.#send('visit');
    }
  }

  session(): void {
    this.#send('session');
  }

  #send(event: CountEvent): void {
    if (!this.#enabled()) return;
    this.#win
      .fetch(COUNT_PATH, {
        method: 'POST',
        body: countBody(event),
        headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        keepalive: true,
      })
      .catch(() => {
        // Offline or blocked: the count is lost, by design.
      });
  }
}
