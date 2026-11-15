/**
 * The config module (plan, Architecture invariant 11): every tunable number
 * lives here, once. Values come from docs/plan.md; the section each one comes
 * from is noted beside it. Code never repeats one of these numbers inline.
 *
 * Durations are in milliseconds unless the name says otherwise. Sizes in the
 * `design` section are CSS pixels at the design canvas's reference frame size;
 * the site turns them into CSS custom properties at build time.
 *
 * Values for features that later rounds and releases build are recorded now so
 * the file is complete, but nothing reads them until their round.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const KB = 1024;

/** A user-adjustable value: its default and the inclusive range users may choose from. */
export interface Adjustable {
  readonly default: number;
  readonly min: number;
  readonly max: number;
}

export const CONFIG = {
  /** Session lifecycle and abandonment (Release 1, round 4). */
  session: {
    /** Check-in interval: 2 h by default, adjustable from 30 min to 3 h. */
    checkInInterval: { default: 2 * HOUR, min: 30 * MINUTE, max: 3 * HOUR },
    /** Pause limit: a longer pause ends the session. 30 min, adjustable 5 to 60 min. */
    pauseLimit: { default: 30 * MINUTE, min: 5 * MINUTE, max: 60 * MINUTE },
    /** Session maximum: 16 h of focus in one session. */
    maxFocus: 16 * HOUR,
    /** Sessions under 1 minute are not saved. */
    minSaved: 1 * MINUTE,
    /** The engine writes a heartbeat timestamp this often. */
    heartbeatInterval: 30 * SECOND,
    /** A heartbeat older than this records a gap. */
    gapThreshold: 5 * MINUTE,
    /** The local day ends at 04:00, so late-night sessions count toward the previous day. */
    dayBoundaryHour: 4,
    /** The "tabulating results" countdown before results appear. */
    endingCountdown: 5 * SECOND,
    /** End now ignores input this long, so a double-click on end cannot skip the countdown. */
    endNowGuard: 300,
    /** Controls must respond within this time (Principles: appealing and fast). */
    controlResponseTarget: 100,
    /** Upper bounds that keep a stored or synced session small enough to validate cheaply. */
    limits: {
      maxSegments: 10_000,
      maxGaps: 10_000,
      maxModeSpans: 1000,
      modeIdMaxLength: 32,
    },
  },

  /** The timer engine (Release 1, round 2). */
  engine: {
    /**
     * While the page is open the engine compares the device clock with the
     * monotonic clock. When the device clock falls behind by more than this,
     * the open session is shifted back by the difference (owner decision,
     * 2026-11-15). Smaller steps are absorbed without a shift.
     */
    clockJumpTolerance: 250,
    /** A timer that fires this close before its deadline counts as on time. */
    timerEarlyTolerance: 2,
    /** The "paused for" time shows seconds, so the paused view changes every second. */
    pausedPrecision: 1 * SECOND,
  },

  /** History, streaks and retention (Release 3). */
  history: {
    /** A day counts toward a streak at 15 focused minutes. */
    streakDayMinFocus: 15 * MINUTE,
    /** A streak breaks when this long passes after the last qualifying session. */
    streakBreakAfter: 48 * HOUR,
    /** Free accounts keep this many months of sessions. */
    freeRetentionMonths: 12,
    /** Accounts unused this long are deleted after an email warning. */
    inactiveAccountYears: 3,
  },

  /** Motion (Design system > Motion). */
  motion: {
    /** Start morphs into pause and end fades in. */
    startMorph: 200,
    /** Seconds blur-away: the ones digit clears over 0 to 10 s, the tens digit and colon over 10 to 60 s. */
    onesBlurWindow: { start: 0, end: 10 * SECOND },
    tensBlurWindow: { start: 10 * SECOND, end: 60 * SECOND },
    /** Blur reaches 14·s(p) px. */
    blurAwayMaxPx: 14,
    /** Opacity is 1 − s((p − 0.3) / 0.7). */
    blurAwayOpacityStart: 0.3,
    /** Width is 1 − s((p − 0.55) / 0.45). */
    blurAwayWidthStart: 0.55,
    /** Check-in and pause: time blurred 10 px at 40 % opacity. */
    heldBlurPx: 10,
    heldOpacity: 0.4,
    /** Results: tabulating holds 0.9 s then fades out over 0.8 s. */
    tabulatingHold: 900,
    tabulatingFadeOut: 800,
    /** Results fade in over 1.0 s from 1.0 s, rising 10 px. */
    resultsFadeInDelay: 1000,
    resultsFadeIn: 1000,
    resultsRisePx: 10,
    /** The replay starts at 2.0 s and runs 4.5 s. */
    replayDelay: 2000,
    replayDuration: 4500,
  },

  /** Sizes at the design canvas's reference frames (Design system > Type, Controls and icons, Screens). */
  design: {
    /** Timer screens are drawn at 720 × 450, results at 720 × 520, settings and dashboard 1280 wide. */
    reference: {
      timer: { width: 720, height: 450 },
      results: { width: 720, height: 520 },
      wideWidth: 1280,
    },
    type: {
      /** Archivo at width 92 on its width axis. */
      fontWidth: 92,
      timeWeight: 300,
      interfaceWeight: { min: 400, max: 500 },
      buttonWeight: 500,
      timeLetterSpacingEm: -0.01,
      /** Colons are tightened by 0.05 em on each side and raised 0.06 em. */
      colonTightenEm: 0.05,
      colonRaiseEm: 0.06,
      /** Time sizes at reference. */
      timePx: 104,
      resultsHeadlinePx: 60,
      timelineTimePx: 56,
      ringTimePx: 52,
      pausedForPx: 44,
      treeTimePx: 30,
      labelPx: { min: 11, max: 13 },
      buttonPx: 12,
    },
    controls: {
      buttonHeightPx: 24,
      buttonPaddingXPx: 13,
      buttonRadiusPx: 6,
      buttonGapPx: 14,
      /** Small buttons keep an invisible 44 px tap area. */
      tapTargetPx: 44,
      /** Buttons sit 26 px below the time. */
      timeToButtonsPx: 26,
      endingBar: { width: 380, height: 3 },
    },
    icons: {
      strokeWidth: 1.6,
      /** Settings and account: 16 px icons in 28 px boxes, 14 px from the top-right corner, 4 px apart. */
      cornerIconPx: 16,
      cornerBoxPx: 28,
      cornerInsetPx: 14,
      cornerGapPx: 4,
      /** Results retry and share: 18 px icons in 32 px boxes. */
      resultsIconPx: 18,
      resultsBoxPx: 32,
    },
    screens: {
      settingsPanelWidthPx: 440,
      dashboardCardRadiusPx: 12,
      dashboardCardPaddingPx: { min: 18, max: 20 },
      dashboardGapPx: 16,
      heatmapCellPx: 15,
      heatmapGapPx: 3,
      widgetCardRadiusPx: 10,
    },
  },

  /** Theme derivation (Design system > Color). */
  theme: {
    /** Derived colours: the foreground mixed this far toward the background. */
    mix: { muted: 0.45, faint: 0.84, track: 0.91, pause: 0.8 },
    /** A background with relative luminance at or above this is a light theme. */
    lightBackgroundLuminance: 0.4,
    /** Minimum contrast ratios every preset must pass. */
    minContrast: { text: 4.5, accentGraphic: 2.5 },
  },

  /** Display modes (Design system > Display modes; Decisions already made). */
  modes: {
    ring: { revolution: 1 * HOUR, trackPx: 8, tailDegrees: 55, tailSteps: 22, tailFadeExponent: 1.8 },
    analog: { revolution: 1 * HOUR, labelEveryMinutes: 5 },
    timeline: { minutesPer100Px: 10, tickEveryMinutes: 5, labelEveryMinutes: 10 },
    ocean: {
      metresPerFocusedMinute: 15,
      maxDepthMetres: 10_935,
      surfaceLinearRgb: [0.0232, 0.212, 0.392],
      attenuationPerMetre: [0.3, 0.06, 0.023],
      gradientHalfSpanMetres: 6,
      landmarksPerBand: 2,
      landmarkBandMetres: 1000,
    },
    height: {
      metresPerFocusedMinute: 140,
      maxHeightMetres: 100_000,
      groundLinearRgb: [0.078, 0.275, 0.597],
      attenuation: [1.25, 1.1, 0.95],
      scaleHeightMetres: 8500,
      gradientHalfSpanMetres: 1500,
      starsFadeMetres: { start: 18_000, end: 42_000 },
      landmarksPerBand: 2,
      landmarkBandMetres: 10_000,
    },
    tree: {
      yearPerFocused: 1 * HOUR,
      season: 15 * MINUTE,
      /** Each leaf cluster is offset by up to a quarter season. */
      clusterOffsetSeasons: 0.25,
      /** The results tree reaches full size at 60 focused minutes. */
      fullSizeFocus: 60 * MINUTE,
    },
    interstellar: {
      /** Map radius at reference: 26 + 30·log10(AU / 0.3) px. */
      mapRadiusBasePx: 26,
      mapRadiusPerDecadePx: 30,
      mapRadiusOriginAu: 0.3,
      kuiperEdgeAu: 50,
      heliopauseAu: 120,
      oortCloudAu: { min: 2000, max: 100_000 },
      proximaCentauriAu: 268_000,
      travelHeadingDegrees: -32,
      projection: { rightAscensionHours: 5.5, declinationDegrees: 6, pxPerDegree: 8 },
      /** Star radius: max(0.7, 2.7 − 0.42 × magnitude) px. */
      starRadius: { minPx: 0.7, basePx: 2.7, perMagnitudePx: 0.42 },
      speedOfLightMetresPerSecond: 299_792_458,
      metresPerAu: 149_597_870_700,
    },
  },

  /** On-device data (Loading and performance; Custom CSS safety). */
  device: {
    /** A downloaded display mode is removed after this many days unused. */
    unusedModeEvictionDays: 30,
    /** Custom CSS over this size is rejected. */
    customCssMaxBytes: 50 * KB,
  },

  /** Size budgets, compressed (Loading and performance > Budgets). */
  budgets: {
    core: { javascriptBytes: 50 * KB, totalBytes: 150 * KB },
    displayMode: { codeBytes: 30 * KB, artBytes: 150 * KB },
    widgetBytes: 40 * KB,
    dashboardBytes: 60 * KB,
    /** CI warns above a budget and fails only above this multiple of it. */
    failFactor: 2,
  },
} as const;

export type Config = typeof CONFIG;
