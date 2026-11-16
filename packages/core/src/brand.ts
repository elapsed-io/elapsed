/**
 * The brand module (plan, Architecture invariant 12): the product name, its
 * domain and every piece of user-facing copy live here, so a rename touches
 * this file only.
 *
 * The product is "elapsed", always lowercase, at elapsed.io (owner decision,
 * 2026-11-16). Nothing else in the codebase spells the name out; it is read
 * from here (tooling/repository-text.test.ts checks the old placeholder is gone).
 *
 * Interface text is lowercase throughout (plan, Product summary); the tests
 * check every copy string.
 */

/** The public source repository (owner changes, 2026-11-16). */
const REPOSITORY = 'https://github.com/elapsed-io/elapsed';
/** The site's public address, and its public support address (owner, 2026-11-16). */
const SITE = 'https://elapsed.io';
const SUPPORT = 'support@elapsed.io';

export const BRAND = {
  /** The product name, always lowercase. */
  name: 'elapsed',
  /** The product's domain. Not attached to the Worker until launch. */
  domain: 'elapsed.io',
  owner: {
    name: 'humanbn',
    url: 'https://humanbn.com',
  },
  repository: REPOSITORY,
  copy: {
    meta: {
      description: 'a stopwatch for focused work',
    },
    timer: {
      start: 'start',
      pause: 'pause',
      resume: 'resume',
      end: 'end',
      pausedFor: 'paused for',
      /** The check-in frame. */
      checkIn: 'press any key if you’re still here',
      /** The "paused after a missed check-in" frame; {time} is the clock time the check-in appeared ("2:00 pm"). */
      missedCheckIn: 'a check-in went unanswered at {time}',
      /**
       * The time as a screen reader reads it on request (Tab to it, or read
       * the page): words, not digits. Never announced on its own.
       */
      spoken: {
        focused: '{time} focused',
        pausedFor: 'paused for {time}',
        hour: '1 hour',
        hours: '{n} hours',
        minute: '1 minute',
        minutes: '{n} minutes',
        second: '1 second',
        seconds: '{n} seconds',
      },
    },
    /** The session maximum frame; {hours} is the maximum in hours. */
    maximum: {
      heading: '{hours}-hour session max reached',
      /** For guests (owner decision, 2026-11-15); accounts (Release 3) get "has ended and been saved". */
      body: 'a single session can hold up to {hours} hours of focus. this one has ended; start a new one whenever you’re ready.',
      action: 'view results',
    },
    /** The ending countdown and results frames. */
    ending: {
      tabulating: 'tabulating results',
      cancel: 'cancel',
      endNow: 'end now',
    },
    results: {
      focused: 'focused',
      elapsed: 'elapsed',
      paused: 'paused',
      pauses: 'pauses',
      longestStretch: 'longest stretch',
      started: 'started',
      ended: 'ended',
      retry: 'back to the timer',
      share: 'share',
      copied: 'copied',
      /** When the browser refuses to copy: the icon shows a small cross for 2 seconds. */
      copyFailed: 'couldn’t copy',
      legendFocus: 'focus',
      legendPause: 'pause',
      ringLabel: 'clock replay: each ring is one hour, outside in, filled where you focused',
      stripLabel: 'focus strip: filled where you focused, blank where you paused',
      /** Hidden until accounts exist in Release 3 (owner decision, 2026-11-15). */
      invite: 'this session isn’t saved.',
      inviteLink: 'create an account',
      inviteAfter: 'to keep it.',
      /** The shared line (plan, Decisions > Results); {duration} reads like "2h 47m". */
      shareText: 'i studied for {duration} on {name}',
    },
    /** Tab titles. {time} is hh:mm; {name} is the product name (owner decision, 2026-11-15). */
    title: {
      idle: '{name}',
      running: '{time} · {name}',
      paused: 'paused for {time} · {name}',
      checkIn: 'check in · {time} · {name}',
    },
    modes: {
      digits: 'digits',
      ring: 'ring',
      timeline: 'timeline',
      analog: 'analog',
      ocean: 'ocean depth',
      height: 'height',
      tree: 'tree',
    },
    analog: {
      /** Under the hours subdial (the analog frame). */
      hours: 'hours',
    },
    ocean: {
      depth: '{depth} m',
      zones: { sunlight: 'sunlight zone', twilight: 'twilight zone', midnight: 'midnight zone', abyssal: 'abyssal zone', hadal: 'hadal zone' },
      landmarks: {
        scuba: 'recreational scuba limit',
        scubaRecord: 'deepest scuba dive on record',
        emperorPenguin: 'deepest emperor penguin dive',
        burjKhalifa: 'height of the burj khalifa',
        leatherback: 'leatherback turtle dive',
        baikal: 'bottom of lake baikal',
        grandCanyon: 'depth of the grand canyon',
        spermWhale: 'sperm whale hunting depth',
        elephantSeal: 'elephant seal record dive',
        beakedWhale: 'cuvier’s beaked whale record dive',
        averageOcean: 'average ocean depth',
        titanic: 'resting place of the titanic',
        bismarck: 'wreck of the bismarck',
        maunaLoa: 'base of mauna loa',
        hadal: 'hadal zone begins',
        deepestWreck: 'deepest shipwreck ever found',
        deepestFish: 'deepest fish ever filmed',
        puertoRico: 'bottom of the puerto rico trench',
        everest: 'everest would fit above you',
        challengerDeep: 'challenger deep, the bottom',
      },
      /** A landmark on the dive profile: its name and depth. */
      landmark: '{name} · {depth} m',
      /** The dive profile, read on request. */
      profile: 'dive profile: depth over the session, flat during pauses',
      /** The landmarks the dive passed, listed for screen readers. */
      landmarksPassed: 'landmarks passed',
    },
    height: {
      height: '{height} m',
      layers: { troposphere: 'troposphere', stratosphere: 'stratosphere', mesosphere: 'mesosphere', thermosphere: 'thermosphere' },
      landmarks: {
        burjKhalifa: 'height of the burj khalifa',
        highestTown: 'highest town on earth',
        everest: 'summit of everest',
        airliner: 'airliner cruising altitude',
        highestBird: 'highest bird ever recorded',
        concorde: 'concorde cruising altitude',
        armstrongLimit: 'armstrong limit: blood would boil',
        ozoneLayer: 'heart of the ozone layer',
        baumgartner: 'felix baumgartner’s jump',
        eustace: 'alan eustace’s jump',
        stratopause: 'top of the stratosphere',
        highestBalloon: 'highest uncrewed balloon',
        astronautWings: 'us astronaut wings',
        noctilucent: 'noctilucent clouds',
        meteors: 'where most meteors burn up',
        karman: 'kármán line: where space begins',
      },
      /** A landmark on the climb profile: its name and height. */
      landmark: '{name} · {height} m',
      /** The climb profile, read on request (the frame's own words). */
      profile: 'climb profile: altitude over the session',
      /** The landmarks the climb passed, listed for screen readers. */
      landmarksPassed: 'landmarks passed',
      /** While paused, at the bottom: the altitude and the layer of the atmosphere ("31,240 m · stratosphere"). */
      altitude: '{height} m · {layer}',
    },
    tree: {
      /** The drawings' names, read on request (the frames' own words; the isometric tree stands on a grassy field). */
      side: 'a tree cycling through the seasons',
      isometric: 'an isometric tree on a grassy field, cycling through the seasons',
      replay: 'tree replay: the tree grows and cycles through the seasons of the session',
    },
    themes: {
      graphite: 'graphite',
      paper: 'paper',
      'deep-sea': 'deep sea',
      forest: 'forest',
      oxblood: 'oxblood',
      plum: 'plum',
      lilac: 'lilac',
      sky: 'sky',
      sand: 'sand',
      mint: 'mint',
    },
    icons: {
      settings: 'settings',
      account: 'account',
    },
    /** The built-in fonts' names in the settings font grid, each written in its own font. */
    fonts: {
      archivo: 'archivo',
      'barlow-semi-condensed': 'barlow semi condensed',
      saira: 'saira',
      inter: 'inter',
      'space-grotesk': 'space grotesk',
      sora: 'sora',
      manrope: 'manrope',
      outfit: 'outfit',
      'ibm-plex-sans': 'ibm plex sans',
      'jetbrains-mono': 'jetbrains mono',
      'ibm-plex-mono': 'ibm plex mono',
      'roboto-mono': 'roboto mono',
      'dm-mono': 'dm mono',
    },
    /** The settings panel (the five Release 1 settings frames). */
    settings: {
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
      seconds: { label: 'seconds', options: { 'blur-away': 'blur away', always: 'always', never: 'never' } },
      checkIn: { label: 'check-in every', help: 'a quiet prompt to confirm you’re still here' },
      pauseLimit: { label: 'pause limit', help: 'a longer pause ends the session' },
      shortcuts: { label: 'shortcuts', items: ['space · start or pause', 'e · end', ', · settings'] },
      mode: { label: 'display mode' },
      /** Each mode's options, under the tiles while that mode is chosen (the Release 2 display frame). */
      modeOptions: { ocean: 'ocean depth options', height: 'height options', tree: 'tree options' },
      oceanLife: { label: 'ocean life', help: 'sea life drifts in while you’re paused' },
      resultsLandmarks: { label: 'results landmarks', help: { ocean: 'up to two per 1,000 m on the results', height: 'up to two per 10 km on the results' } },
      treeView: { label: 'tree view', options: { side: 'side', isometric: 'isometric' } },
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
      clockFormat: { label: 'clock format', options: { '12h': '12-hour', '24h': '24-hour', region: 'follow region' } },
      animationSpeed: {
        label: 'animation speed',
        options: { slower: 'slower', normal: 'normal', faster: 'faster' },
        help: 'every animation, including the results replay',
      },
      lowPower: { label: 'low power', help: 'stops ambient animation and shows only the time. on when your system asks for reduced motion.' },
      downloadedModes: {
        label: 'downloaded modes',
        help: 'modes download when you pick them and work offline. ones unused for 30 days are removed.',
        remove: 'remove',
        removeName: 'remove {mode}',
      },
      notifyCheckIns: { label: 'check-ins', name: 'check-in notifications', help: 'a system notification when a check-in appears' },
      notifyPauseLimit: {
        label: 'pause limit',
        name: 'pause limit notifications',
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
       * draw them (owner, 2026-11-16). Privacy and terms are published at elapsed.io with the soon page
       * (they move into the app at launch); feedback is an email to support. Source code stays hidden
       * until the owner says the repository is public.
       */
      links: [
        { label: 'about', href: null, shown: false },
        { label: 'privacy', href: `${SITE}/privacy`, shown: true },
        { label: 'terms', href: `${SITE}/terms`, shown: true },
        { label: 'feedback', href: `mailto:${SUPPORT}`, shown: true },
        { label: 'source code', href: REPOSITORY, shown: false },
        { label: 'donate', href: null, shown: false },
      ],
    },
    /** System notifications, when switched on. */
    notify: {
      checkIn: { title: 'check in', body: 'a check-in is waiting. answer it within the hour to keep this time.' },
      /** {time} is the clock time the pause would end the session. */
      pauseLimit: { title: 'pause limit', body: 'this session ends at {time} unless you resume.' },
    },
  },

} as const;

export type Brand = typeof BRAND;
