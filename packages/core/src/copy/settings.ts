/**
 * The settings panel's copy (plan, Architecture invariant 12; round 2.10): in a module of its own, so only the
 * download that shows it carries it. The brand module's rules apply (brand.ts): every user-facing string lives in
 * the brand module and these copy modules, lowercase.
 */

import { REPOSITORY, REPOSITORY_PUBLIC, SUPPORT } from '../brand.ts';

export const SETTINGS_COPY = {
  title: 'settings',
  search: 'search settings',
  saved: 'saved',
  close: 'close',
  /** Phones: each category is its own page; this returns to the list. */
  back: 'back to settings',
  autosaved: 'changes are autosaved',
  /** The footer links' name for screen readers. */
  linksLabel: 'about {name}',
  /** Release 3, accounts only. */
  synced: 'synced to your account',
  noMatches: 'no settings match',
  categories: {
    timer: { name: 'timer', reset: 'reset timer settings' },
    display: { name: 'display', reset: 'reset display settings' },
    appearance: { name: 'appearance', reset: 'reset appearance settings' },
    notifications: { name: 'notifications', reset: 'reset notification settings' },
    privacy: { name: 'privacy and data', reset: 'reset privacy settings' },
    /** No reset of its own: "reset all settings" covers it (owner changes, item 13). */
    advanced: { name: 'advanced', reset: null },
  },
  /** The check-ins switch (Release 2) and its description, as the launch timer frame draws it. */
  checkIns: { label: 'check-ins', help: 'check-ins remind you that your session is still running. sessions without them still count toward your history, but not toward competitions.' },
  /** Under check-ins, in its darkened box (it belongs to the switch above it); no description of its own. */
  checkIn: { label: 'check-in every' },
  /** "Pause limit" before plan version 14; no description in the launch timer frame. */
  pauseLimit: { label: 'pause before ending' },
  /** Keep screen awake (Release 2): a screen wake lock while a session is open in the visible tab. */
  keepAwake: { label: 'keep screen awake', help: 'while {name} is the active tab' },
  /** Clock times (in timer since plan version 14): system settings, the default and leftmost. */
  clockFormat: { label: 'clock format', options: { system: 'system settings', '12h': '12-hour', '24h': '24-hour' } },
  shortcuts: { label: 'shortcuts', items: ['space · start or pause', 'e · end', ', · settings'] },
  mode: { label: 'mode' },
  /** The focus mode group (plan version 14), a plain group under the modes, in the launch display frame's words. */
  focusView: {
    title: 'focus mode',
    hide: {
      label: 'hide buttons after starting',
      help: 'any mouse movement or keypress summons them back',
      options: { '3s': 'after 3 s', '10s': 'after 10 s', never: 'never' },
    },
    seconds: { label: 'hide seconds after starting', options: { never: 'never', 'blur-away': 'blur away', 'right-away': 'right away' } },
    fullscreen: { label: 'fullscreen after starting' },
    leave: { label: 'leave fullscreen', options: { never: 'never', 'pause-or-end': 'on pause or end', end: 'on end' } },
  },
  theme: { label: 'theme' },
  colors: { label: 'theme colors', background: 'background', foreground: 'foreground', accent: 'accent', hex: '{name} hex code' },
  font: {
    label: 'font',
    loadOwn: 'load your own',
    own: 'your font',
    note: 'your own file: woff2, woff, ttf or otf, up to {size}. it stays on this device.',
    tooLarge: 'that file is over {size}. it was not loaded.',
    notFont: 'that file isn’t a woff2, woff, ttf or otf font. it was not loaded.',
    unusable: 'this browser couldn’t read that font. it was not loaded.',
  },
  timeSize: { label: 'time size' },
  animationSpeed: {
    label: 'animation speed',
    options: { slower: 'slower', normal: 'normal', faster: 'faster' },
    help: 'affects all animations, including results replay',
  },
  downloadedModes: {
    label: 'downloaded modes',
    help: 'modes download when you pick them and work offline. ones unused for 30 days are removed.',
    remove: 'remove',
    removeName: 'remove {mode}',
  },
  notifyCheckIns: { label: 'check-ins', name: 'check-in notifications', help: 'a system notification when a check-in appears' },
  notifyPauseLimit: {
    label: 'pause before ending',
    name: 'pause before ending notifications',
    help: '{minutes} minutes before a pause would end the session',
  },
  notificationsNote: 'your device plays its own sound. on iPhone, notifications work only after adding {name} to the home screen.',
  notificationsBlocked: 'notifications are blocked for this site in the browser’s settings',
  usageCounts: { label: 'anonymous usage counts', help: 'tells us daily visits and sessions started. nothing that identifies you or this device' },
  crashReports: { label: 'crash reports', help: 'tells us error and browser version only. deleted after 14 days' },
  storage: { label: 'storage on this device', font: 'your font · {size}', none: 'nothing stored' },
  clear: {
    label: 'clear device data',
    action: 'clear',
    help: 'removes every setting, theme and file stored in this browser',
    question: 'remove everything stored in this browser, including your custom css, fonts and images?',
  },
  customCss: {
    label: 'custom css',
    save: 'save',
    help: 'cleaned when saved: @import, @font-face and outside links are removed. stays on this device.',
    removed: 'cleaned when saved: what isn’t allowed was removed, and the rest is kept. stays on this device.',
    tooLarge: 'that is over {size}. it was not saved.',
  },
  safeMode: {
    label: 'safe mode',
    action: 'restart in safe mode',
    help: 'loads once without custom css or layouts. adding ?safe to the address does the same.',
  },
  settingsFile: {
    label: 'settings file',
    export: 'export',
    import: 'import',
    help: 'your choices and custom css in one file. fonts and images stay on this device.',
    tooLarge: 'that file is over {size}. nothing was changed.',
    notSettings: 'that isn’t an {name} settings file. nothing was changed.',
    /** Asked first when the file's custom css would replace the custom css on this device. */
    replace: 'replace',
    replaceQuestion: 'replace your custom css with the file’s? your other choices are replaced too.',
  },
  resetAll: {
    label: 'reset all settings',
    action: 'reset all',
    question: 'put every setting back to its default? your custom css, fonts and images are kept.',
  },
  /** The inline confirm step drawn in the advanced frame. */
  cancel: 'cancel',
  /**
   * Footer links appear only once their page exists and is ready (`shown`), as the settings frames
   * draw them (owner, 2026-11-16). Privacy and terms are the app's own pages since round 2.16 (written by
   * its build from docs/legal), so every copy of the site links its own; feedback is an email to
   * support. Source code shows only once the owner confirms the repository is public (REPOSITORY_PUBLIC).
   */
  links: [
    { label: 'about', href: null, shown: false },
    { label: 'privacy', href: '/privacy', shown: true },
    { label: 'terms', href: '/terms', shown: true },
    { label: 'feedback', href: `mailto:${SUPPORT}`, shown: true },
    /** Every third-party work the site uses and its licence (round 2.11): the site's own page. */
    { label: 'credits', href: '/credits/', shown: true },
    { label: 'source code', href: REPOSITORY, shown: REPOSITORY_PUBLIC },
    { label: 'donate', href: null, shown: false },
  ],
} as const;
