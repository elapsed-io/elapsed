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
    /**
     * Check-in interval: running time since the last sign of presence (start,
     * pause, resume or an answered check-in). 2 h by default, 30 min to 3 h.
     */
    checkInInterval: { default: 2 * HOUR, min: 30 * MINUTE, max: 3 * HOUR },
    /** A check-in unanswered this long is missed: the session pauses, backdated to when it appeared. */
    checkInResponseWindow: 1 * HOUR,
    /** A pause caused by a missed check-in ignores the pause limit and waits this long, then the session ends. */
    missedCheckInHold: 12 * HOUR,
    /** Pause limit: a longer pause ends the session. 30 min, adjustable 5 to 60 min. */
    pauseLimit: { default: 30 * MINUTE, min: 5 * MINUTE, max: 60 * MINUTE },
    /** Session maximum: 16 h of focus in one session. */
    maxFocus: 16 * HOUR,
    /** Sessions under 1 minute are not saved. */
    minSaved: 1 * MINUTE,
    /** The engine writes a heartbeat timestamp this often. */
    heartbeatInterval: 30 * SECOND,
    /** A heartbeat may wait this much longer, to share a wake that happens anyway (a background tab wakes less). */
    heartbeatSlack: 5 * SECOND,
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

  /** Device storage (Release 1, round 4). */
  storage: {
    /**
     * A stored active session longer than this many characters is not read.
     * The session limits keep a real one under about 1 MB of JSON.
     */
    maxActiveStateChars: 1_048_576,
  },

  /** Anonymous usage counts (Release 1, round 4; Privacy). */
  counts: {
    /** The counting endpoint reads at most this many bytes of a request body. */
    maxBodyBytes: 256,
  },

  /** Opt-in crash reports (Release 1, round 6; Privacy). */
  crashReports: {
    /** Each report is at most 8 KB. */
    maxBodyBytes: 8 * KB,
    /** One address can send at most 5 a minute; the endpoint holds the address in memory only that long. */
    perAddress: 5,
    rateWindow: 1 * MINUTE,
    /** Reports are deleted after 14 days. */
    retentionDays: 14,
    /** Lengths that keep a report under its size limit. */
    maxMessageChars: 500,
    maxStackChars: 6000,
    maxVersionChars: 40,
    /** A page sends at most this many reports, so a broken loop cannot flood the endpoint. */
    maxPerPage: 5,
  },

  /** The settings panel and stored settings (Release 1, round 6; Settings catalog). */
  settings: {
    /** The check-in interval and pause limit move in these steps on their sliders. */
    checkInStep: 15 * MINUTE,
    pauseLimitStep: 5 * MINUTE,
    /** Time size: one slider from 50 % to 150 %. */
    timeSizePercent: { default: 100, min: 50, max: 150, step: 5 },
    /** The "saved" check shows this long after each change. */
    savedShown: 2000,
    /** Stored settings longer than this many characters are not read. */
    maxStoredChars: 16_384,
    /** At first run, a chosen font may hold the screen back this long while it loads, so the time does not jump. */
    fontBlockMax: 1000,
  },

  /** System notifications (Release 1, round 6; Settings catalog > Notifications). */
  notifications: {
    /** The pause-limit notification comes this long before a pause would end the session, or at once for shorter limits. */
    pauseLimitWarning: 5 * MINUTE,
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
    /**
     * Interface motion is fast, snappy and fluid (plan, Product principles): every transition lasts 120 to
     * 220 ms with one fast ease-out. Start morphs into pause and end fades in over 160 ms, with a slight
     * spring; fades (the end button leaving, the paused and check-in text, the pause blur, notices) take
     * 180 ms; small controls (the switch's knob) 120 ms.
     */
    startMorph: 160,
    fade: 180,
    /**
     * A glide a minute long (the ring's, the timeline's, the dials', the light's, the sky's, the camera's) is
     * started again only when it is this far from where the time puts it, in milliseconds.
     */
    glideDriftMs: 250,
    control: 120,
    /** The contrast switch crossfades its two stacked copies over this long (owner, changes 4: about 220 ms). */
    contrastFade: 220,
    /**
     * Focus view (plan, Interface; the "the motion, on a loop" frame): after this long untouched while a session
     * runs, pause and end drop 10 px while fading out over 180 ms (the corner icons fade with them), and the time
     * grows to 1.32 times its size and settles 25 px lower over 220 ms; any touch reverses it just as fast.
     */
    focus: {
      quietMs: { '3s': 3000, '10s': 10_000 },
      controlsMs: 180,
      controlsDropPx: 10,
      timeMs: 220,
      timeScale: 1.32,
      timeDropPx: 25,
      /** The frame's curves: hiding eases in (quadratic), the time and every return ease out (quartic). */
      easeIn: [0.11, 0, 0.5, 0] as const,
      easeOut: [0.25, 1, 0.5, 1] as const,
    },
    /** A notice's "change" outlines the setting it opened for this long, then the outline fades. */
    highlightMs: 2000,
    /** A change of environment (a mode's water or sky coming or going) crossfades over this long. */
    environmentFade: 2000,
    /**
     * A change of display mode (round 2.10, owner: switches start on the frame of the choice, and any crossfade
     * lasts 120 ms or less): the leaving mode's environment crossfades over `fadeMs`.
     */
    modeSwitch: { fadeMs: 120 },
    /** The slight spring of the start morph: a damped spring drawn through CSS linear() at this many points. */
    spring: { dampingRatio: 0.75, settle: 5, points: 24 },
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
    /**
     * Held, the frost under the dialog (round 2.11) is whole to this share of the way from its centre to its edge
     * (the display and three blur radii round it), then fades out, so it has no edge of its own.
     */
    frostSolidShare: 0.55,
    /** The seconds blur-away's last fade, as the running frame draws it (not an interface transition). */
    blurAwayFade: 200,
    /** Results: tabulating holds 0.3 s then fades out over 0.25 s. */
    tabulatingHold: 300,
    tabulatingFadeOut: 250,
    /** Results fade in over 0.3 s from 0.3 s, rising 6 px. */
    resultsFadeInDelay: 300,
    resultsFadeIn: 300,
    resultsRisePx: 6,
    /**
     * The replay starts at 0.5 s; its length and curve are each mode's own (its recipe's results.replay). Sessions
     * over 2 hours replay longer: 0.5 s more for each doubling past 2 hours, at most 1.5 s more.
     */
    replayDelay: 500,
    /**
     * The replay curves a recipe chooses from (results.replay.easing): fast, the fast exponential ease-out of digits,
     * ring, timeline, analog and interstellar; gentle, the gentler ease-out of ocean depth, height and tree.
     */
    replayEasing: { fast: [0.16, 1, 0.3, 1] as const, gentle: [0.33, 1, 0.68, 1] as const },
    replayLongSession: { fromHours: 2, perDoubling: 500, max: 1500 },
    /**
     * Every interface animation's duration is multiplied by this ("normal"
     * timing). Release 2's animation speed setting changes it, through the
     * --motion-scale custom property.
     */
    durationScale: 1,
    /**
     * The animation speed setting's multipliers for --motion-scale (Settings catalog > Appearance; owner,
     * 2026-11-16: "normal" is the Design system's timing). Slower is half as long again; faster is the
     * reciprocal, so the two are equally far from normal.
     */
    speeds: { slower: 1.5, normal: 1, faster: 2 / 3 },
    /** After copying the share text, the share icon shows a check for this long (owner decision, 2026-11-15). */
    copiedConfirmation: 2000,
    /** The fast ease-out of every interface transition: cubic-bezier control points. */
    standardEasing: [0.16, 1, 0.3, 1],
  },

  /** Sizes at the design canvas's reference frames (Design system > Type, Controls and icons, Screens). */
  design: {
    /**
     * One layer order for every mode and screen (plan v11, Design system; round 2.11), bottom to top: the mode's
     * background and art; the time, its figure and the buttons (and the screens that take the timer's place:
     * the ending countdown, the results, the session maximum); pause, check-in and other dialogs; notices; the
     * corner icons, over every screen; settings. Stylesheets stack by these alone (tokens `--layer-*`).
     */
    layers: { art: 0, display: 1, dialog: 2, notice: 3, chrome: 4, settings: 5 },
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
      /** Keyboard focus: a ring in the foreground colour, which has text contrast in every theme. */
      focusRingPx: 2,
      focusOffsetPx: 2,
      /** Buttons sit 26 px below the time. */
      timeToButtonsPx: 26,
      endingBar: { width: 380, height: 3 },
    },
    /** The paused frame: "paused for" sits 10 px above the pause length, in 12 px muted text tracked 0.14 em. */
    paused: {
      labelPx: 12,
      labelGapPx: 10,
      labelTrackingEm: 0.14,
      /** The "paused after a missed check-in" frame: the check-in's time 12 px below the pause length, 13 px muted. */
      missedPx: 13,
      missedGapPx: 12,
      /** A recipe's paused caption (height's altitude and layer, the "height, paused" frame): 11 px, 16 px above the bottom. */
      captionPx: 11,
      captionBottomPx: 16,
    },
    /** The check-in frame: "press any key if you're still here" in 15 px foreground text over the held time. */
    checkIn: {
      textPx: 15,
    },
    /** The ending countdown frame: "tabulating results" 13 px muted, tracked 0.06 em; the 380 × 3 px bar; 14 px apart. */
    ending: {
      textPx: 13,
      textTrackingEm: 0.06,
      gapPx: 14,
      barRadiusPx: 2,
      /** Between the bar and the buttons. */
      spacerPx: 14,
    },
    /** The results frames (720 × 520). */
    results: {
      paddingYPx: 24,
      paddingXPx: 60,
      /** Below this window width the content keeps a 16 px side margin and the six stats wrap into two rows of three. */
      narrowPaddingXPx: 16,
      narrowBelowPx: 720,
      gapPx: 22,
      ringGapPx: 16,
      /** A drawing over the stats (the "results: tree" frame): 10 px apart, 20 px from the top and bottom. */
      figureGapPx: 10,
      figurePaddingYPx: 20,
      labelPx: 11,
      labelTrackingEm: 0.16,
      labelGapPx: 6,
      strip: {
        widthPx: 600,
        barHeightPx: 12,
        barRadiusPx: 3,
        /** Each bar starts 1 px after its start and ends 1 px before its end. */
        barInsetPx: 1,
        trackHeightPx: 2,
        trackTopPx: 5,
        labelRowPx: 14,
        gapPx: 6,
        /** An hour label starts this far before its hour, as in the frame. */
        hourLabelOffsetPx: 16,
        /** Hour labels keep at least this much space from each other and from the start and end labels. */
        labelSpacingPx: 8,
      },
      stats: {
        columns: 6,
        narrowColumns: 3,
        gapPx: 10,
        labelPx: 11,
        valuePx: 14,
        innerGapPx: 3,
        ringColumns: 2,
        ringWidthPx: 250,
      },
      actions: {
        gapPx: 14,
        blockGapPx: 6,
      },
      ring: {
        /** Drawn 230 px wide from a 250-unit view box. */
        sizePx: 230,
        viewBox: 250,
        outerRadius: 92,
        spacing: 13,
        strokeWidth: 8,
        /** Up to this many hours draw as the frame; more rings get closer and thinner to fit (owner decision, 2026-11-15). */
        exactHours: 6,
        tickRadius: 104.5,
        tickWidth: 5,
        tickLength: 1.5,
        tickRotateDegrees: -90.4,
        labelRadius: 115,
        labelPx: 11,
        hourHand: { length: 41, width: 4 },
        minuteHand: { length: 99, tail: 11, width: 2 },
        centreRadius: 4,
        rowGapPx: 44,
        columnGapPx: 8,
        legend: { gapPx: 14, itemGapPx: 6, focusPx: 10, pausePx: 8, radiusPx: 2 },
      },
    },
    /** The session maximum frame: icon, heading, time, explanation and button, 16 px apart. */
    notice: {
      gapPx: 16,
      iconPx: 40,
      iconStrokeWidth: 1.3,
      headingPx: 20,
      timePx: 56,
      bodyPx: 13,
      bodyLineHeight: 1.6,
      bodyMaxWidthPx: 400,
    },
    /** The notice pill (plan, Interface; the "notice: fullscreen tip" frame): 20 px tall, 11 px text, 20 px above the time. */
    pill: {
      heightPx: 20,
      textPx: 11,
      gapPx: 7,
      paddingStartPx: 9,
      paddingEndPx: 2,
      radiusPx: 10,
      aboveTimePx: 20,
      underlineOffsetPx: 2,
      dismissPx: 16,
      crossPx: 9,
      crossStrokeWidth: 2.4,
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
    /** The settings panel, from the five Release 1 settings frames (1280 × 800). */
    settings: {
      /** The outline "change" draws around a setting (the "change opens settings on it" frame). */
      highlight: { insetYPx: 6, insetXPx: 8, radiusPx: 6, linePx: 1 },
      paddingYPx: 22,
      paddingXPx: 26,
      gapPx: 14,
      titlePx: 18,
      headerGapPx: 6,
      savedPx: 11,
      savedIconPx: 12,
      savedIconStroke: 2,
      savedGapPx: 4,
      closeBoxPx: 28,
      closeIconPx: 16,
      search: { heightPx: 34, paddingXPx: 12, radiusPx: 8, textPx: 13, iconPx: 14, gapPx: 8 },
      row: { heightPx: 40, textPx: 14, paddingXPx: 4, chevronPx: 14 },
      body: { gapPx: 16, paddingTopPx: 14, paddingXPx: 4, paddingBottomPx: 18 },
      labelPx: 13,
      helpPx: 11,
      itemGapPx: 6,
      groupGapPx: 8,
      controlGapPx: 12,
      segmented: { radiusPx: 7, paddingPx: 2, heightPx: 22, paddingXPx: 10, buttonRadiusPx: 5, textPx: 12 },
      slider: { widthPx: 150, heightPx: 4, radiusPx: 2, thumbPx: 16, endPx: 11, valuePx: 13, valueWidthPx: 40, gapPx: 10 },
      toggle: { widthPx: 32, heightPx: 18, knobPx: 14, insetPx: 2 },
      shortcuts: { textPx: 12, gapPx: 4 },
      /** A mode's options (the Release 2 display frame's "ocean depth options"): a box on the page colour. */
      modeOptions: { paddingPx: 12, gapPx: 12, radiusPx: 8, titlePx: 12 },
      tiles: { columns: 4, gapPx: 8, paddingTopPx: 10, paddingBottomPx: 8, radiusPx: 8, innerGapPx: 6, textPx: 12, previewWidthPx: 56, previewHeightPx: 32, previewDigitsPx: 15 },
      themes: { columns: 5, gapPx: 8, swatchHeightPx: 42, radiusPx: 6, samplePx: 11, barWidthPx: 26, barHeightPx: 3, barRadiusPx: 2, namePx: 10, innerGapPx: 4, outlinePx: 2, outlineOffsetPx: 2 },
      colors: { labelWidthPx: 74, swatchPx: 18, swatchRadiusPx: 4, textPx: 12, gapPx: 8 },
      fonts: { columns: 3, gapPx: 6, heightPx: 32, radiusPx: 6, paddingXPx: 6, textPx: 12 },
      selectedBorderPx: 2,
      /** Keyboard focus rings in the panel. */
      focusRingPx: 2,
      focusOffsetPx: 2,
      resetPx: 12,
      /** The panel's small buttons: clear, safe mode, export, import, and the confirm step's. */
      actionButton: { heightPx: 22, paddingXPx: 10, radiusPx: 5, textPx: 12 },
      /** Between buttons side by side: export and import (8), cancel and confirm (14). */
      actionGapPx: 8,
      /** The custom CSS editor (advanced frame): IBM Plex Mono with line numbers. */
      editor: { radiusPx: 8, paddingYPx: 10, paddingXPx: 10, textPx: 12, lineHeight: 1.6, minLines: 7, maxLines: 24 },
      /** The inline confirm step for destructive actions (advanced frame). */
      confirm: { gapPx: 10, paddingPx: 12, radiusPx: 8, textPx: 12, buttonGapPx: 14 },
      footer: { gapPx: 8, paddingTopPx: 10, textPx: 11, linkGapPx: 16 },
      /** Below this window width the panel fills the screen and each category is its own page. */
      phoneBelowPx: 720,
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
    /**
     * Muted text starts at mix.muted and steps back toward the foreground by
     * this much until it has text contrast against both the background and the
     * panel (track), as the design canvas computes it.
     */
    mutedStep: 0.005,
    /** A background with relative luminance at or above this is a light theme. */
    lightBackgroundLuminance: 0.4,
    /** Minimum contrast ratios every preset must pass. */
    minContrast: { text: 4.5, accentGraphic: 2.5, large: 3 },
    /**
     * The analog seconds dial's face: the track over the background at this share (its fill-opacity, the
     * "analog" frame's); the theme's dial red is chosen against it (theme/derive.ts).
     */
    dialFaceFill: 0.35,
  },


  /** On-device data (Loading and performance; Custom CSS safety). */
  device: {
    /** A downloaded display mode is removed after this many days unused. */
    unusedModeEvictionDays: 30,
    /** Custom CSS over this size is rejected. */
    customCssMaxBytes: 50 * KB,
    /** The largest data: image custom CSS may keep (decoded); every other url() is removed. */
    customCssDataImageMaxBytes: 8 * KB,
    /** A settings file over this size is not read (choices and custom CSS, as JSON). */
    settingsFileMaxBytes: 256 * KB,
    /** A user's own font file: up to 2 MB. */
    ownFontMaxBytes: 2 * KB * KB,
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
