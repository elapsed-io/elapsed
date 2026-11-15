/**
 * Offline use and installing to the home screen (plan, Infrastructure >
 * Offline: "a service worker: core cached on first visit, hashed files
 * cache-first, pages network-first, a version check and a remote kill
 * switch").
 *
 * - Version check: /sw.js carries the build's version and is never served
 *   from the HTTP cache, so every page load checks it; a new version installs
 *   in the background and takes over once no tab uses the old one.
 * - Kill switch: /sw-control.json is read on every load, past every cache.
 *   `{"serviceWorker":"off"}` unregisters the worker and empties its caches;
 *   anything else, or no answer (offline), leaves offline support on.
 *
 * Trusted Types (CSP `require-trusted-types-for 'script'`) refuse a plain
 * string as a worker script URL, so registration goes through one named
 * policy that accepts exactly /sw.js and nothing else.
 */

import { clearOfflineCaches } from '../storage/offline-cache.ts';

export const SERVICE_WORKER_URL = '/sw.js';
export const CONTROL_URL = '/sw-control.json';
export const TRUSTED_TYPES_POLICY = 'service-worker';

export type ControlState = 'on' | 'off';

/** Reads the kill switch file; null when it says nothing usable. */
export function parseControl(text: string): ControlState | null {
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    const keys = Object.keys(value);
    const state = (value as { readonly serviceWorker?: unknown }).serviceWorker;
    return keys.length === 1 && (state === 'on' || state === 'off') ? state : null;
  } catch {
    return null;
  }
}

interface TrustedTypesLike {
  createPolicy(name: string, rules: { createScriptURL(input: string): string }): { createScriptURL(input: string): unknown };
}

/** The worker's URL, through the Trusted Types policy where the browser enforces them. */
function scriptUrl(win: Window): string {
  const factory = (win as Window & { readonly trustedTypes?: TrustedTypesLike }).trustedTypes;
  if (factory === undefined) return SERVICE_WORKER_URL;
  const policy = factory.createPolicy(TRUSTED_TYPES_POLICY, {
    createScriptURL: (input) => {
      if (input !== SERVICE_WORKER_URL) throw new TypeError(`not the service worker: ${input}`);
      return input;
    },
  });
  // A TrustedScriptURL; register() accepts it, though TypeScript's DOM types do not list it yet.
  return policy.createScriptURL(SERVICE_WORKER_URL) as string;
}

async function readControl(win: Window): Promise<ControlState | null> {
  try {
    const response = await win.fetch(CONTROL_URL, { cache: 'no-store', credentials: 'omit' });
    return response.ok ? parseControl(await response.text()) : null;
  } catch {
    return null;
  }
}

export function registerServiceWorker(win: Window, report: (error: unknown) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in win.navigator)) return;
  const container = win.navigator.serviceWorker;
  const run = async (): Promise<void> => {
    if ((await readControl(win)) === 'off') {
      for (const registration of await container.getRegistrations()) await registration.unregister();
      await clearOfflineCaches(win);
      return;
    }
    const url = scriptUrl(win);
    await container.register(url, { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Service workers can be unavailable (private browsing, blocked by policy): the site then works online only.
    });
  };
  run().catch(report);
}
