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
    minContrast: { text: 4.5, accentGraphic: 2.5 },
  },

  /** Display modes (Design system > Display modes; Decisions already made). */
  modes: {
    // Each mode's results replay (its length and curve) is its recipe's (docs/recipes/recipes), from the two
    // curves above (motion.replayEasing).
    ring: {
      revolution: 1 * HOUR,
      trackPx: 8,
      /** The tail: up to 55° long, one smooth conic gradient fading from the accent at the head to nothing. */
      tailDegrees: 55,
      /** The gradient's stops, from the far end: the accent at these shares of full strength, at these shares of the tail's length. */
      tailStops: [
        { at: 0.45, strength: 0.15 },
        { at: 0.75, strength: 0.55 },
      ],
      /** Geometry at reference, from the ring frame: a 280 px box, the ring's centre line at 112 px, an 8 px round head. */
      boxPx: 280,
      radiusPx: 112,
      headPx: 8,
      /** The ring sits 20 px above the buttons. */
      gapPx: 20,
    },
    analog: {
      revolution: 1 * HOUR,
      labelEveryMinutes: 5,
      /** The hours hand turns once in this long. */
      hoursRevolution: 12 * HOUR,
      /**
       * Geometry from the redesigned "analog" frame (canvas version 1794927010-cb9d): a 340 × 336 drawing, 14 px
       * above the buttons, in its own units (one a reference pixel at a radius of 150). Everything below is in
       * those units.
       */
      widthPx: 340,
      heightPx: 336,
      gapPx: 14,
      centre: { x: 170, y: 178 },
      /** The polished case, its hairline rim, and the face. */
      caseRadius: 150,
      rimRadius: 146,
      rimOpacity: 0.08,
      faceRadius: 138,
      /** The ridged crown at 12: its stem, its cap and the ridges across the cap; it dips this far, this fast, when end is pressed. */
      crown: {
        stem: { x: 165, y: 23, width: 10, height: 8 },
        cap: { x: 155, y: 11, width: 30, height: 13, radius: 4 },
        ridges: { firstX: 160, step: 4, count: 6, top: 14, bottom: 21 },
        dip: 4,
        dipMs: 180,
      },
      /** The outer track: sixty ticks from the edge inward, longer and heavier every five. */
      ticks: { outer: 134, major: 127, minor: 130, majorWidth: 1.2, minorWidth: 0.8 },
      /** The numbers 5 to 60, each turned to follow the edge. */
      numbers: { radius: 116, letterSpacingEm: 0.04 },
      /** Slim baton indices, stopping this far short of a small dial in their way. */
      batons: { outer: 100, inner: 83, width: 2.6, opacity: 0.85, clearance: 5 },
      minuteHand: { length: 114, tail: 18, width: 2.5 },
      /** The pin over the hands: a disc in the hands' colour with a hole in the face's. */
      pin: { radius: 5, hole: 1.6 },
      /**
       * A small dial, in shares of its radius (the seconds dial's 42): its face (the background over the dial at
       * this opacity) and rim, ticks from the rim inward (long at each number), its numbers, and its hub.
       */
      subdialFill: 0.35,
      // The long ticks' inner end and the numbers' radius are the frame's own (35.505 and 28.48 of 42 reproduce
      // every coordinate it writes; 35.5 and 28.5 would put four of them 0.1 px off).
      subdial: { rimWidth: 1, tickOuter: 40 / 42, longTick: 35.505 / 42, shortTick: 38 / 42, tickWidth: 0.6, numbers: 28.48 / 42, names: 0.6, hub: 2.4 },
      labelPx: 11,
      subdialLabelPx: 9.5,
      /** A small dial's marks' names (the perpetual calendar's dates, days and months). */
      subLabelPx: 6.5,
    },
    timeline: {
      minutesPer100Px: 10,
      tickEveryMinutes: 5,
      labelEveryMinutes: 10,
      /**
       * Geometry from the revised timeline frame, in CSS pixels: never scaled,
       * so lines and ticks stay on whole pixels. The track never grows past
       * its frame width; on narrow windows less of it shows.
       */
      widthPx: 480,
      heightPx: 64,
      lineYPx: 20,
      lineHeightPx: 2,
      tickWidthPx: 1,
      minorTickPx: 5,
      majorTickPx: 8,
      labelYPx: 46,
      labelPx: 11,
      /** Both ends fade out over this share of the track. */
      fadeShare: 0.14,
      /** On windows narrower than the track, it keeps this far from each edge. */
      edgePx: 16,
      /** The time sits 18 px above the track; the track 30 px above the buttons. */
      innerGapPx: 18,
      gapPx: 30,
    },
    ocean: {
      metresPerFocusedMinute: 15,
      maxDepthMetres: 10_935,
      surfaceLinearRgb: [0.0232, 0.212, 0.392] as readonly [number, number, number],
      attenuationPerMetre: [0.3, 0.06, 0.023] as readonly [number, number, number],
      gradientHalfSpanMetres: 6,
      landmarksPerBand: 2,
      landmarkBandMetres: 1000,
      /**
       * Ocean life while paused (particles.ts): arrivals at random as its recipe sets out, at three distances as the
       * "ocean depth, paused" frame draws them (rows 150, 300 and 390 px of a 720 × 450 screen; fish at 0.3, 0.55
       * and 1.25 of 54 × 22 px; drifting 7, 13 and 26 px/s), fish wiggling 4 px across and bobbing 3 px; bubbles
       * rising from 470 px and swaying 6 px.
       */
      life: {
        frameWidthPx: 720,
        frameHeightPx: 450,
        wigglePx: 4,
        wiggleRate: 1.1,
        bobPx: 3,
        bobRate: 0.9,
        bubbleFromPx: 470,
        bubbleSwayPx: 6,
        bubbleSwayRate: 1.4,
        bubbleStrokePx: 1.2,
        colours: { far: '#0B2A63', mid: '#1B4C82', near: '#3D7EA6', bubble: '#7FB3CC', bubbleOpacity: 0.5 },
      },
      /** The ocean depth tile's preview (the Release 2 display frame): water from top to bottom, and its wave. */
      tile: { top: '#2E7FA8', bottom: '#05122A', wave: '#BFE3F2' },
      /** The ocean frames' own colours for the time, the icons and the buttons over the water. */
      palette: { text: '#DCE8EE', icon: '#9EC3D6', accent: '#35764E', end: '#A8403D', pause: '#1E3E57' },
      /** The time is 104 px at reference, 22 px above the buttons. */
      timePx: 104,
      gapPx: 22,
      /** Where each zone ends (metres); the hadal zone runs to the bottom. */
      zones: { sunlight: 200, twilight: 1000, midnight: 4000, abyssal: 6000 },
      /** The landmarks a replay may show, by depth (names in the brand module). */
      landmarks: [
        [40, 'scuba'],
        [332, 'scubaRecord'],
        [564, 'emperorPenguin'],
        [828, 'burjKhalifa'],
        [1280, 'leatherback'],
        [1642, 'baikal'],
        [1857, 'grandCanyon'],
        [2250, 'spermWhale'],
        [2388, 'elephantSeal'],
        [2992, 'beakedWhale'],
        [3688, 'averageOcean'],
        [3800, 'titanic'],
        [4791, 'bismarck'],
        [5000, 'maunaLoa'],
        [6000, 'hadal'],
        [6865, 'deepestWreck'],
        [8336, 'deepestFish'],
        [8376, 'puertoRico'],
        [8849, 'everest'],
        [10_935, 'challengerDeep'],
      ] as const,
      /** The dive profile on the results (the "results: ocean depth (build this one)" frame). */
      results: {
        widthPx: 600,
        heightPx: 190,
        /** The depth scale is at least this deep, and 15 % deeper than the dive so far (it zooms out as the dive goes down). */
        minScaleMetres: 200,
        scaleHeadroom: 1.15,
        /** Dashed lines where the twilight, midnight and abyssal zones begin, named 5 px above, 6 px from the left. */
        zoneLines: { depths: [200, 1000, 4000] as const, opacity: 0.35, dash: '2 5', labelAbovePx: 5, labelLeftPx: 6, minYPx: 16, scaleShare: 0.98 },
        /** The depth reached (22 px, light) and its zone (11 px, 80 %) at the top right, 4 px in. */
        depthPx: 22,
        zonePx: 11,
        zoneOpacity: 0.8,
        textInsetPx: 4,
        depthBaselinePx: 22,
        zoneBaselinePx: 40,
        lineWidthPx: 2,
        headRadiusPx: 4,
        /** The start and end clock times, 11 px, 6 px below the chart. */
        timesPx: 11,
        timesGapPx: 6,
        colours: { line: '#FFFFFF', text: '#F4F8FB', muted: 'rgba(232,242,250,0.74)' },
        /**
         * At most six landmarks a session, spread along the path. Each is a 7 px dot on the path where the dive
         * reached it, and a label 9 px beside it (to the left once the dot is past 330 px), kept 12 px inside the
         * chart. The label pops in (from 60 % with an overshoot over 90 m) and fades in over 120 m as the dive
         * passes; 1.1 s after the replay it fades out over 0.5 s, leaving the dots.
         */
        landmark: {
          max: 6,
          dotPx: 7,
          ringPx: 1.5,
          gapPx: 9,
          flipAfterPx: 330,
          insetPx: 12,
          textPx: 11,
          paddingYPx: 2,
          paddingXPx: 8,
          radiusPx: 10,
          borderPx: 1,
          popMetres: 90,
          popFrom: 0.6,
          fadeMetres: 120,
          restDelayMs: 1100,
          restFadeMs: 500,
          colours: { dot: '#F2C46B', dotRing: 'rgba(0,0,0,0.5)', text: '#FFF4DC', fill: 'rgba(6,14,26,0.72)', border: 'rgba(255,255,255,0.18)' },
        },
        /** Two soft sonar pings from the deepest point as the replay ends: 5 to 75 px over 1.4 s, 0.55 s apart. */
        pings: { count: 2, lagMs: 550, durationMs: 1400, fromRadiusPx: 5, toRadiusPx: 75, opacity: 0.8, strokePx: 1.5, colour: '#BFE9FF' },
        /**
         * The card takes the light at the depth the replay has reached: the light model dimmed to 80 %, from
         * 20 m above to 60 m below; past about 340 m every colour is black. It opens in the colour the session
         * ended in and crosses to the surface's over 0.35 s as the replay begins.
         */
        lit: { dim: 0.8, aboveMetres: 20, belowMetres: 60, blackFromMetres: 340, crossfadeMs: 350 },
        /**
         * Things passing as the replay crosses their zone, rising past you (placeholder silhouettes through the
         * asset registry): each rises from 560 px to −100 px of a 520 px card while the dive goes from `from` to
         * `from + span` metres, at most `peak` opaque, `leftPx` from the card's left at its reference width.
         */
        passing: {
          cardHeightPx: 520,
          cardWidthPx: 720,
          fromPx: 560,
          travelPx: 660,
          things: [
            { key: 'passing/fish-school', from: 0, span: 260, peak: 0.55, leftPx: 470 },
            { key: 'passing/sea-turtle', from: 40, span: 380, peak: 0.5, leftPx: 90 },
            { key: 'passing/whale', from: 220, span: 1030, peak: 0.45, leftPx: 380 },
            { key: 'passing/jellyfish', from: 320, span: 830, peak: 0.9, leftPx: 150 },
            { key: 'passing/squid-lights', from: 900, span: 1750, peak: 1, leftPx: 520 },
          ],
          colours: { silhouette: '#0B2235', deep: '#06182A', jelly: 'rgba(170,210,255,0.55)', jellyLine: 'rgba(170,210,255,0.45)', glow: '#8FE6FF' },
        },
      },
    },
    height: {
      metresPerFocusedMinute: 140,
      maxHeightMetres: 100_000,
      /** The sky: linear RGB × e^(−K·h / 8,500 m), across ±1,500 m of the screen (plan, Display modes). */
      groundLinearRgb: [0.078, 0.275, 0.597] as readonly [number, number, number],
      attenuation: [1.25, 1.1, 0.95] as readonly [number, number, number],
      scaleHeightMetres: 8500,
      gradientHalfSpanMetres: 1500,
      /** The running sky is drawn with a stop every this many metres (the light model's curve, not a straight line). */
      gradientStepMetres: 100,
      /** Stars fade in (smoothstep) from 18 km to 42 km. */
      starsFadeMetres: { start: 18_000, end: 42_000 },
      landmarksPerBand: 2,
      landmarkBandMetres: 10_000,
      /** Where each layer of the atmosphere ends (metres); the thermosphere runs to the top. */
      layers: { troposphere: 12_000, stratosphere: 50_000, mesosphere: 85_000 },
      /**
       * The landmarks a replay may show, by height (the "results: height (build this one)" frame to 25 km, then to the
       * Kármán line; names in the brand module).
       */
      landmarks: [
        [828, 'burjKhalifa'],
        [5100, 'highestTown'],
        [8849, 'everest'],
        [11_000, 'airliner'],
        [11_300, 'highestBird'],
        [18_300, 'concorde'],
        [19_000, 'armstrongLimit'],
        [25_000, 'ozoneLayer'],
        // To the Kármán line (owner, changes 3): the meteors' band (about 80 to 100 km) at its middle.
        [38_969, 'baumgartner'],
        [41_422, 'eustace'],
        [50_000, 'stratopause'],
        [53_000, 'highestBalloon'],
        [80_000, 'astronautWings'],
        [83_000, 'noctilucent'],
        [90_000, 'meteors'],
        [100_000, 'karman'],
      ] as const,
      /** The height tile's preview (the Release 2 display frame): a mountain, its summit, and a star. */
      tile: { mountain: 'muted', summit: 'text', star: 'accent' } as const,
      /** The height frames' own colours for the time, the icons (dimmer while paused) and the buttons over the sky. */
      palette: { text: '#EEF4FA', icon: '#C9DCEE', iconPaused: '#9AA6C8', accent: '#35764E', end: '#A8403D', pause: '#2A4A6A', label: '#B9C6DE' },
      timePx: 104,
      gapPx: 22,
      /** The stars: the frames' own field, tinted (the "height, full climb" frame). */
      stars: { faint: '#DCE4FF', white: '#EAF0FF', warm: '#FFD2A6' },
      /**
       * While paused, once stars are visible: shooting stars, a few at a time, each about a second, at random
       * intervals of 7 to 15 s; each 60 to 130 px long, 1 to 2 px thick, white, pale gold, pale green or pale
       * blue, streaking 110 to 220 px down a 15° to 40° slope; each shows for the frame's first 7 % of its period
       * (bright from 1.5 %). Rarely, once every 3 minutes of pause and first at a random moment of them, a shower:
       * 8 to 15 from one point within 3 s, each showing for 1.17 s (bright from 0.27 s) and radiating at 95° to
       * 170°. Each is drawn once, at random, when the pause starts, and moved by CSS alone (the "height, paused"
       * frame's own keyframes).
       */
      meteors: {
        count: 7,
        periodSeconds: { min: 7, max: 15 },
        peakShare: 0.015,
        endShare: 0.07,
        lengthPx: { min: 60, max: 130 },
        thicknessPx: { min: 1, max: 2 },
        radiusPx: 1,
        travelPx: { min: 110, max: 220 },
        angleDegrees: { min: 15, max: 40 },
        startArea: { leftPx: 100, rightPx: 520, topPx: 40, bottomPx: 150 },
        colours: ['rgba(255,255,255,0.95)', 'rgba(255,236,190,0.95)', 'rgba(200,255,220,0.95)', 'rgba(220,232,255,0.95)'] as const,
        shower: {
          count: { min: 8, max: 15 },
          periodSeconds: 180,
          withinSeconds: 3,
          peakSeconds: 0.27,
          endSeconds: 1.17,
          spreadPx: 25,
          angleDegrees: { min: 95, max: 170 },
          travelPx: { min: 60, max: 230 },
          radiantArea: { leftPx: 440, rightPx: 620, topPx: 40, bottomPx: 90 },
        },
        frameWidthPx: 720,
        frameHeightPx: 450,
      },
      /** The climb profile on the results (the "results: height (build this one)" frame). */
      results: {
        widthPx: 600,
        heightPx: 190,
        /** The height scale is at least 2,000 m, and 15 % above the climb so far (it zooms out as the climb goes up). */
        minScaleMetres: 2000,
        scaleHeadroom: 1.15,
        /** Dashed lines where the stratosphere, mesosphere and thermosphere begin, named 5 px above, 6 px from the left. */
        zoneLines: { heights: [12_000, 50_000, 85_000] as const, opacity: 0.35, dash: '2 5', labelAbovePx: 5, labelLeftPx: 6, minYPx: 16, scaleShare: 0.98 },
        /** The height reached (22 px, light) and its layer (11 px, 80 %) at the bottom right, 4 px in. */
        valuePx: 22,
        zonePx: 11,
        zoneOpacity: 0.8,
        textInsetPx: 4,
        valueBaselinePx: 160,
        zoneBaselinePx: 178,
        lineWidthPx: 2,
        headRadiusPx: 4,
        timesPx: 11,
        timesGapPx: 6,
        colours: { line: '#FFFFFF', text: '#F4F8FB', muted: 'rgba(232,242,250,0.74)' },
        /** As ocean depth's (its frame's own numbers): popping over 1,400 m, fading in over 1,500 m. */
        landmark: { max: 6, popMetres: 1400, fadeMetres: 1500 },
        /**
         * The card takes the sky at the height the replay has reached: the light model dimmed to 65 %, from
         * 1,500 m above to 1,500 m below, never below the ground; past about 72 km every colour is black. It
         * opens in the colour the session ended in and crosses to the ground's over 0.35 s as the replay begins.
         */
        lit: { dim: 0.65, aboveMetres: 1500, belowMetres: 1500, blackFromMetres: 72_000, crossfadeMs: 350, stepMetres: 100 },
        /**
         * Things passing as the replay climbs past their heights, falling past you (placeholder silhouettes through
         * the asset registry): each falls from −90 px to 550 px of a 520 px card while the climb goes from `from`
         * to `from + span` metres, at most `peak` opaque, `leftPx` from the card's left at its reference width,
         * drawn at its art's own size or `sizePx` (the clouds, whose art is drawn larger).
         */
        passing: {
          cardHeightPx: 520,
          cardWidthPx: 720,
          fromPx: -90,
          travelPx: -640,
          things: [
            { key: 'passing/birds', from: 0, span: 2600, peak: 0.8, leftPx: 500 },
            { key: 'passing/cloud', from: 600, span: 5400, peak: 0.9, leftPx: 80, sizePx: [170, 76] as const },
            { key: 'passing/cloud-faint', from: 2500, span: 9000, peak: 0.85, leftPx: 430, sizePx: [220, 99] as const },
            { key: 'passing/airliner', from: 8800, span: 4000, peak: 0.95, leftPx: 250 },
            { key: 'passing/weather-balloon', from: 15_000, span: 19_000, peak: 0.95, leftPx: 560 },
          ],
          colours: { silhouette: '#0E2440', cloud: '#FFFFFF', contrail: 'rgba(255,255,255,0.6)', balloon: '#EDEFF3', rigging: '#C9D3E0' },
        },
      },
    },
    tree: {
      yearPerFocused: 1 * HOUR,
      season: 15 * MINUTE,
      /** Each leaf cluster is offset by up to a quarter season (the frames' offsets, 0 to 0.5, scaled as they scale them). */
      clusterOffsetSeasons: 0.25,
      /**
       * The leaves' colours through the year, in order (the frames' season()): spring from #C2DE8E to #86C060,
       * summer to #3E8B47, autumn through #D9822F to #A9502A. Each cluster is drawn in these five colours,
       * stacked, and the year crossfades them (only opacity animates), which mixes them exactly as the frames do.
       * Each colour's shade is mixed 28 % toward black and its highlight 20 % toward white; an isometric cube's
       * top 22 % toward white and its right side 30 % toward black.
       */
      leaves: ['#C2DE8E', '#86C060', '#3E8B47', '#D9822F', '#A9502A'] as const,
      shade: { side: { dark: 0.28, light: 0.2 }, iso: { top: 0.22, right: 0.3 } },
      /** The isometric field's grass through the year (spring #8DBF5E to #5FA84A, summer, autumn to #A39A4E, winter). */
      grass: ['#8DBF5E', '#5FA84A', '#4E9A45', '#A39A4E', '#8E9A78'] as const,
      grassDark: 0.22,
      /** Snow, falling leaves and leaves on the ground, as the frames colour them; the isometric trunk. */
      colours: { trunk: '#6E4636', snow: '#F4F7FA', fall: '#C8682C', groundLeaf: '#B95A2A', isoTrunk: '#8A3F35', isoFieldLight: '#FFFFFF' },
      /** The tree's views (a mode option): side as default, as the plan's settings catalog says. */
      views: ['side', 'isometric'] as const,
      /** The side view: a 360 × 236 drawing, the time 30 px below it, 12 px apart; the isometric 380 × 320, 8 px apart. */
      side: { widthPx: 360, heightPx: 236, gapPx: 12 },
      iso: { widthPx: 380, heightPx: 320, gapPx: 8 },
      timePx: 30,
      /** The tree's year is drawn as keyframes a minute apart, each minute's change shown in 60 steps of a second. */
      keyframeMinutes: 1,
      stepsPerMinute: 60,
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
