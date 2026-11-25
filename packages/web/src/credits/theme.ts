/**
 * The credits page's one script (round 2.14; plan, Design system: "the credits page follows the person's chosen
 * theme and the site's typeface"): reads the settings this browser keeps for the site and gives the page the chosen
 * theme's colours, exactly as the timer derives them (settings/appearance.ts). One constructed stylesheet adopted by
 * the document, never an inline style or markup, so the site's Content Security Policy and Trusted Types hold
 * unchanged. Without stored settings, or where storage refuses, the page keeps its stylesheet's default theme.
 */

import { themeTokens } from '../settings/appearance.ts';
import { browserLocalStorage } from '../storage/session-store.ts';
import { LocalSettingsStore } from '../storage/settings-store.ts';
import { deriveTheme, themeCustomProperties } from '../theme/derive.ts';

// Storage that refuses, or nothing stored, reads as the defaults (the page's own default theme).
const settings = new LocalSettingsStore(browserLocalStorage(window), () => undefined).load();
const theme = deriveTheme(themeTokens(settings));
const properties = Object.entries(themeCustomProperties(theme)).map(([name, value]) => `${name}: ${value};`);
const sheet = new CSSStyleSheet();
sheet.replaceSync(`:root { ${properties.join(' ')} color-scheme: ${theme.scheme}; }`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
document.documentElement.dataset['scheme'] = theme.scheme;
