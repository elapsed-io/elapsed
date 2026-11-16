/**
 * Safe mode (plan, Custom CSS safety, defence 6): `?safe` in the address, or
 * the "restart in safe mode" button, loads the site once without custom CSS
 * (and, once they exist, custom layouts), so CSS that hides the controls can
 * always be undone. The parameter is taken out of the address as the page
 * starts, so the next load is a normal one again.
 */

export const SAFE_PARAMETER = 'safe';

/** Whether this load is in safe mode. Removes the parameter from the address without reloading. */
export function takeSafeMode(win: Window): boolean {
  const url = new URL(win.location.href);
  if (!url.searchParams.has(SAFE_PARAMETER)) return false;
  url.searchParams.delete(SAFE_PARAMETER);
  win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

/** The current address with `?safe` added, written exactly so. */
export function safeModeAddress(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(SAFE_PARAMETER);
  const rest = url.searchParams.toString();
  url.search = rest === '' ? SAFE_PARAMETER : `${rest}&${SAFE_PARAMETER}`;
  return url.href;
}

/** Reloads the site in safe mode. A running session is kept, as on any reload. */
export function restartInSafeMode(win: Window): void {
  win.location.assign(safeModeAddress(win.location.href));
}
