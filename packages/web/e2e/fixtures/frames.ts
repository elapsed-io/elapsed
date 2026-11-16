/**
 * Reference reconstructions of design canvas frames (canvas version
 * 1794698982-a44c; the ending and results frames from 1794786803-7dbc), for
 * pixel comparison in the end-to-end tests. Each is the
 * frame's own markup, with its template values computed by the frame's own
 * formulas for the graphite theme, and "Archivo" mapped to the site's trimmed
 * font so differences can only come from layout and CSS.
 *
 * The timeline frame's personal record marker is left out: records arrive in
 * Release 3.
 */

import { CARD_STARS } from './height-stars.ts';


export interface FramePalette {
  readonly bg: string;
  readonly text: string;
  readonly accent: string;
  readonly icon: string;
  readonly muted: string;
  readonly faint: string;
  readonly track: string;
  readonly gray: string;
  readonly end: string;
}

/**
 * The frames' palettes, computed by their own pal() for each theme: muted
 * (and the icons) step back from 45 % until they reach 4.5:1 against both the
 * background and the panel (the canvas's rule since 2026-11-16).
 */
export const GRAPHITE: FramePalette = {
  bg: '#0E0F11',
  text: '#ECEAE4',
  accent: '#35764E',
  icon: '#8a8a87',
  muted: '#8a8a87',
  faint: '#323233',
  track: '#222324',
  gray: '#3a3b3b',
  end: '#A8403D',
};

export const PAPER: FramePalette = {
  bg: '#F6F5F2',
  text: '#1A1B1E',
  accent: '#4A9E6C',
  icon: '#646465',
  muted: '#646465',
  faint: '#d3d2d0',
  track: '#e2e1df',
  gray: '#cac9c8',
  end: '#E28A86',
};

let C: FramePalette = GRAPHITE;

/** Builds frames in another theme (the light frames are the same markup in the paper theme). */
export function inPalette<T>(palette: FramePalette, build: () => T): T {
  const saved = C;
  C = palette;
  try {
    return build();
  } finally {
    C = saved;
  }
}

const HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>frame</title><style>
@font-face{font-family:Archivo;src:url(/font.woff2) format("woff2");font-weight:300 500;font-stretch:92%;font-style:normal;font-display:block}
body{margin:0;font-stretch:92%}
button{font-stretch:inherit}
</style></head><body>`;

const corner = (): string => `<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${C.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${C.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>`;

const COLON = '<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>';
const TIME_STYLE = 'font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center';
const BUTTON = (label: string, background: string): string =>
  `<button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${C.text}; background: ${background}">${label}</button>`;
const runningButtons = (): string => `<div style="display: flex; gap: 14px">${BUTTON('pause', C.gray)}${BUTTON('end', C.end)}</div>`;

/** A frame's root markup as a whole page, with the site's default font standing in for Archivo. */
export function frameDocument(markup: string): string {
  return `${HEAD}${markup}</body></html>`;
}

function root(gap: number, children: string, withCorner = true): string {
  return `${HEAD}<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${C.bg}; color: ${C.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${String(gap)}px">${withCorner ? corner() : ''}${children}</div></body></html>`;
}

const pad = (value: number): string => String(value).padStart(2, '0');
const smoothstep = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** The idle frame (and, in the paper palette, the "idle, paper theme" frame). */
export function idleFrame(): string {
  return root(26, `<div style="${TIME_STYLE}; font-size: 104px">00${COLON}00${COLON}00</div><div style="display: flex; gap: 14px">${BUTTON('start', C.accent)}</div>`);
}

/** The "soon" frame for elapsed.io before launch (graphite; in the paper palette, the light frame). */
export function soonFrame(): string {
  const links = `<div style="position: absolute; bottom: 18px; left: 0; right: 0; display: flex; justify-content: center; gap: 16px; font-size: 11px"><a href="#privacy" style="color: ${C.muted}; text-decoration: none">privacy</a><a href="#terms" style="color: ${C.muted}; text-decoration: none">terms</a></div>`;
  return root(14, `<div style="font-size: 13px; color: ${C.muted}; letter-spacing: 0.16em">elapsed</div><div style="${TIME_STYLE}; font-size: 120px">soon</div>${links}`, false);
}

/** The running frame at `t` seconds of focus, as its renderVals() computes it. */
export function runningFrame(t: number): string {
  const s = Math.floor(t) % 60;
  const a = Math.min(1, t / 10);
  const b = Math.max(0, Math.min(1, (t - 10) / 50));
  const fade = (p: number) => ({
    blur: (14 * smoothstep(p)).toFixed(2),
    op: (1 - smoothstep((p - 0.3) / 0.7)).toFixed(3),
    w: (1 - smoothstep((p - 0.55) / 0.45)).toFixed(4),
  });
  const A = fade(a);
  const B = fade(b);
  const mm = pad(Math.floor(t / 60));
  const time = `<div style="${TIME_STYLE}; font-size: 104px">00${COLON}${mm}<span style="display: inline-grid; grid-template-columns: ${B.w}fr; vertical-align: top"><span style="min-width: 0; white-space: nowrap; filter: blur(${B.blur}px); opacity: ${B.op}">${COLON}${String(Math.floor(s / 10))}</span></span><span style="display: inline-grid; grid-template-columns: ${A.w}fr; vertical-align: top"><span style="min-width: 0; white-space: nowrap; filter: blur(${A.blur}px); opacity: ${A.op}">${String(s % 10)}</span></span></div>`;
  return root(26, time + runningButtons());
}

/** The paused frame: 01:24 held behind the blur, paused for 00:04:12. */
export function pausedFrame(): string {
  const time = `<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="${TIME_STYLE}; font-size: 104px; filter: blur(10px); opacity: 0.4">01${COLON}24</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; ${TIME_STYLE}; font-size: 44px">00${COLON}04${COLON}12<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; font-stretch: 100%; color: ${C.muted}; letter-spacing: 0.14em">paused for</div></div></div></div>`;
  const buttons = `<div style="display: flex; gap: 14px">${BUTTON('resume', C.accent)}${BUTTON('end', C.end)}</div>`;
  return root(26, time + buttons);
}

/** The check-in frame: 02:00 held behind the blur, with the line asking for any key. */
export function checkInFrame(): string {
  const time = `<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="${TIME_STYLE}; font-size: 104px; filter: blur(10px); opacity: 0.4">02${COLON}00</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="font-size: 15px; color: ${C.text}; text-align: center">press any key if you’re still here</div></div></div>`;
  return root(26, time + runningButtons());
}

/** The "paused after a missed check-in" frame: 02:00 held, paused for 01:12:40, the check-in at 2:00 pm. */
export function pausedMissedFrame(): string {
  const time = `<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="${TIME_STYLE}; font-size: 104px; filter: blur(10px); opacity: 0.4">02${COLON}00</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; ${TIME_STYLE}; font-size: 44px">01${COLON}12${COLON}40<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; color: ${C.muted}; letter-spacing: 0.14em; white-space: nowrap">paused for</div><div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 12px; font-size: 13px; font-weight: 400; color: ${C.muted}; white-space: nowrap; font-variant-numeric: normal">a check-in went unanswered at 2:00 pm</div></div></div></div>`;
  const buttons = `<div style="display: flex; gap: 14px">${BUTTON('resume', C.accent)}${BUTTON('end', C.end)}</div>`;
  return root(26, time + buttons);
}

/** The session maximum frame, with the guest copy (owner decision 124: "and been saved" is for accounts). */
export function limitFrame(): string {
  const icon = `<svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${C.muted}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path><path d="M10 2h4"></path></svg>`;
  const children = [
    icon,
    '<div style="font-size: 20px; text-align: center">16-hour session max reached</div>',
    `<div style="${TIME_STYLE}; font-size: 56px">16${COLON}00${COLON}00</div>`,
    `<div style="font-size: 13px; color: ${C.muted}; text-align: center; line-height: 1.6; max-width: 400px">a single session can hold up to 16 hours of focus. this one has ended; start a new one whenever you’re ready.</div>`,
    `<div style="display: flex; gap: 14px">${BUTTON('view results', C.accent)}</div>`,
  ];
  return root(16, children.join(''));
}

/** The ending countdown frame with the bar `width` px full (it fills 380 px over 5 s). No corner icons. */
export function endingFrame(width: number): string {
  const children = [
    `<div style="font-size: 13px; color: ${C.muted}; letter-spacing: 0.06em">tabulating results</div>`,
    `<div aria-hidden="true" style="width: 380px; height: 3px; border-radius: 2px; background: ${C.faint}; display: flex; justify-content: flex-start"><div style="width: ${width.toFixed(1)}px; height: 3px; border-radius: 2px; background: ${C.text}"></div></div>`,
    '<div style="height: 14px"></div>',
    `<div style="display: flex; gap: 14px">${BUTTON('cancel', C.gray)}${BUTTON('end now', C.end)}</div>`,
  ];
  return root(14, children.join(''), false);
}

/** What a results frame shows, computed from a real session by the test. */
export interface ResultsData {
  /** Focused time, hh:mm:ss. */
  readonly focused: string;
  /** elapsed, paused, pauses, longest stretch, started, ended. */
  readonly stats: readonly string[];
  /** Stretches of focus in minutes from the start, and the session's length in minutes. */
  readonly stretches: readonly { readonly from: number; readonly to: number }[];
  readonly total: number;
  readonly start: string;
  readonly end: string;
  readonly hours: readonly { readonly text: string; readonly minute: number }[];
}

const RESULTS_ICON = (label: string, paths: string): string =>
  `<button aria-label="${label}" style="width: 32px; height: 32px; padding: 0; background: transparent; border: 0; color: ${C.text}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></button>`;
/** The retry and share icons; the guest invite below them is hidden until Release 3 (owner decision 123). */
const resultsActions = (): string => `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="display: flex; gap: 14px">${RESULTS_ICON(
  'retry',
  '<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"></path><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path>',
)}${RESULTS_ICON('share', '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"></path><path d="M7 9l5 -5l5 5"></path><path d="M12 4l0 12"></path>')}</div></div>`;

function headline(focused: string): string {
  const [h, m, s] = focused.split(':');
  return `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="font-size: 11px; color: ${C.muted}; letter-spacing: 0.16em">focused</div><div style="${TIME_STYLE}; font-size: 60px">${h ?? ''}${COLON}${m ?? ''}${COLON}${s ?? ''}</div></div>`;
}

function statsGrid(stats: readonly string[], columns: number): string {
  const labels = ['elapsed', 'paused', 'pauses', 'longest stretch', 'started', 'ended'];
  const cells = labels.map(
    (label, i) =>
      `<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${C.muted}">${label}</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${stats[i] ?? ''}</div></div>`,
  );
  return `<div style="width: 100%; display: grid; grid-template-columns: repeat(${String(columns)}, minmax(0, 1fr)); gap: 10px">${cells.join('')}</div>`;
}

function resultsRoot(gap: number, children: string): string {
  return `${HEAD}<div style="width: 720px; height: 520px; box-sizing: border-box; background: ${C.bg}; color: ${C.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden"><div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; box-sizing: border-box; padding: 24px 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${String(gap)}px; opacity: 1; transform: translateY(0px)">${corner()}${children}</div></div></body></html>`;
}

/** The "results: digits and timeline" frame after its replay, for `data`. */
export function resultsStripFrame(data: ResultsData): string {
  const bars = data.stretches
    .map(({ from, to }) => {
      const left = (from / data.total) * 600 + 1;
      const width = Math.max(0, ((to - from) / data.total) * 600 - 2);
      return `<div style="position: absolute; top: 0; left: ${left.toFixed(4)}px; width: ${width.toFixed(4)}px; height: 12px; border-radius: 3px; background: ${C.accent}"></div>`;
    })
    .join('');
  const hours = data.hours
    .map(({ text, minute }) => `<div style="position: absolute; left: ${((minute / data.total) * 600 - 16).toFixed(4)}px; top: 0">${text}</div>`)
    .join('');
  const strip = `<div style="width: 600px; display: flex; flex-direction: column; gap: 6px"><div style="position: relative; width: 600px; height: 12px"><div style="position: absolute; top: 5px; left: 0; width: 600px; height: 2px; background: ${C.track}"></div>${bars}</div><div style="position: relative; width: 600px; height: 14px; font-size: 11px; color: ${C.muted}; font-variant-numeric: tabular-nums"><div style="position: absolute; left: 0; top: 0">${data.start}</div>${hours}<div style="position: absolute; right: 0; top: 0">${data.end}</div></div></div>`;
  return resultsRoot(22, headline(data.focused) + strip + statsGrid(data.stats, 6) + resultsActions());
}

/** The "results: analog and ring" frame after its replay, for `data` (up to six hours). */
export function resultsRingFrame(data: ResultsData): string {
  const pt = (r: number, deg: number): string => {
    const a = (deg * Math.PI) / 180;
    return `${(125 + r * Math.sin(a)).toFixed(2)} ${(125 - r * Math.cos(a)).toFixed(2)}`;
  };
  const arc = (r: number, a: number, b: number): string => {
    if (b - a < 0.05) return '';
    if (b - a > 359.5) return arc(r, a, a + 180) + arc(r, a + 180, a + 359.5);
    return `M${pt(r, a)} A${String(r)} ${String(r)} 0 ${b - a > 180 ? '1' : '0'} 1 ${pt(r, b)} `;
  };
  let green = '';
  for (const { from, to } of data.stretches) {
    for (let h = Math.floor(from / 60); h * 60 < to; h += 1) {
      const s0 = Math.max(from, h * 60);
      const s1 = Math.min(to, h * 60 + 60);
      if (s1 > s0) green += arc(92 - 13 * h, (s0 - h * 60) * 6, (s1 - h * 60) * 6);
    }
  }
  const rings = Math.max(1, Math.ceil(data.total / 60));
  const tracks = Array.from({ length: rings }, (_, h) => `<circle cx="125" cy="125" r="${String(92 - 13 * h)}" fill="none" stroke="${C.track}" stroke-width="8"></circle>`).join('');
  const text = (x: number, y: number, t: string): string =>
    `<text x="${String(x)}" y="${String(y)}" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${C.muted}">${t}</text>`;
  const ha = ((data.total / 720) * 360).toFixed(1);
  const ma = ((data.total % 60) * 6).toFixed(1);
  const svg = `<svg role="img" width="230" height="230" viewBox="0 0 250 250">${tracks}<path d="${green === '' ? 'M0 0' : green}" fill="none" stroke="${C.accent}" stroke-width="8"></path><circle cx="125" cy="125" r="104.5" fill="none" stroke="${C.muted}" stroke-width="5" stroke-dasharray="1.5 53.22" transform="rotate(-90.4 125 125)"></circle>${text(125, 10, '0')}${text(240, 125, '15')}${text(125, 240, '30')}${text(10, 125, '45')}<line x1="125" y1="125" x2="125" y2="84" stroke="${C.text}" stroke-width="4" stroke-linecap="round" transform="rotate(${ha} 125 125)"></line><line x1="125" y1="136" x2="125" y2="26" stroke="${C.text}" stroke-width="2" stroke-linecap="round" transform="rotate(${ma} 125 125)"></line><circle cx="125" cy="125" r="4" fill="${C.text}"></circle></svg>`;
  const legend = `<div style="display: flex; gap: 14px; font-size: 11px; color: ${C.muted}"><div style="display: flex; align-items: center; gap: 6px"><div style="width: 10px; height: 10px; border-radius: 2px; background: ${C.accent}"></div>focus</div><div style="display: flex; align-items: center; gap: 6px"><div style="width: 8px; height: 8px; border-radius: 2px; border: 1px solid ${C.faint}"></div>pause</div></div>`;
  const row = `<div style="display: flex; align-items: center; gap: 44px"><div style="display: flex; flex-direction: column; align-items: center; gap: 8px">${svg}${legend}</div><div style="width: 250px">${statsGrid(data.stats, 2)}</div></div>`;
  return resultsRoot(16, headline(data.focused) + row + resultsActions());
}

/** A landmark as the ocean depth results frame lists them: its depth in metres and its name. */
export type FrameLandmark = readonly [number, string];

const FISH = (left: number, top: number, width: number): string =>
  `<div style="position: absolute; left: ${String(left)}px; top: ${String(top)}px"><svg width="${String(width)}" height="${(width / 2).toFixed(1)}" viewBox="0 0 20 10"><ellipse cx="9" cy="5" rx="7" ry="3.2" fill="#0B2235"></ellipse><path d="M15 5 L20 1.5 L20 8.5 Z" fill="#0B2235"></path></svg></div>`;

/** The things that pass, as the frame draws them: [left, peak opacity, from, span, markup]. */
const PASSING: readonly (readonly [number, number, number, number, string])[] = [
  [470, 0.55, 0, 260, `<div style="position: relative; width: 120px; height: 60px">${FISH(0, 10, 18)}${FISH(24, 2, 14)}${FISH(40, 20, 16)}${FISH(64, 8, 18)}${FISH(82, 26, 13)}${FISH(18, 32, 15)}${FISH(52, 40, 14)}${FISH(96, 14, 12)}</div>`],
  [90, 0.5, 40, 380, '<svg width="70" height="44" viewBox="0 0 70 44"><ellipse cx="34" cy="22" rx="20" ry="13" fill="#0B2235"></ellipse><circle cx="58" cy="20" r="6" fill="#0B2235"></circle><path d="M24 12 L10 2 L30 10 Z M24 32 L10 42 L30 34 Z M44 12 L54 4 L46 14 Z M44 32 L54 40 L46 30 Z" fill="#0B2235"></path></svg>'],
  [380, 0.45, 220, 1030, '<svg width="230" height="80" viewBox="0 0 230 80"><path d="M10 40 C30 12 120 8 170 30 C185 36 200 30 214 18 L222 22 C212 34 210 42 222 58 L214 62 C200 50 186 46 170 50 C120 72 40 68 10 40 Z" fill="#06182A"></path><path d="M90 56 L76 74 L104 60 Z" fill="#06182A"></path></svg>'],
  [150, 0.9, 320, 830, '<svg width="48" height="80" viewBox="0 0 48 80"><path d="M4 26 C4 4 44 4 44 26 Z" fill="rgba(170,210,255,0.55)"></path><path d="M10 26 C6 42 14 56 10 76" stroke="rgba(170,210,255,0.45)" stroke-width="1.4" fill="none"></path><path d="M18 26 C14 42 22 56 18 76" stroke="rgba(170,210,255,0.45)" stroke-width="1.4" fill="none"></path><path d="M26 26 C22 42 30 56 26 76" stroke="rgba(170,210,255,0.45)" stroke-width="1.4" fill="none"></path><path d="M34 26 C30 42 38 56 34 76" stroke="rgba(170,210,255,0.45)" stroke-width="1.4" fill="none"></path><path d="M40 26 C36 42 44 56 40 76" stroke="rgba(170,210,255,0.45)" stroke-width="1.4" fill="none"></path></svg>'],
  [520, 1, 900, 1750, '<svg width="60" height="90" viewBox="0 0 60 90"><circle cx="30" cy="10" r="2.6" fill="#8FE6FF" opacity="0.9"></circle><circle cx="22" cy="24" r="1.8" fill="#8FE6FF" opacity="0.7"></circle><circle cx="38" cy="24" r="1.8" fill="#8FE6FF" opacity="0.7"></circle><circle cx="30" cy="36" r="2" fill="#8FE6FF" opacity="0.8"></circle><circle cx="18" cy="50" r="1.4" fill="#8FE6FF" opacity="0.6"></circle><circle cx="42" cy="50" r="1.4" fill="#8FE6FF" opacity="0.6"></circle><circle cx="26" cy="64" r="1.2" fill="#8FE6FF" opacity="0.5"></circle><circle cx="34" cy="70" r="1.2" fill="#8FE6FF" opacity="0.5"></circle><circle cx="30" cy="84" r="1" fill="#8FE6FF" opacity="0.4"></circle></svg>'],
];

/**
 * The "results: ocean depth (build this one)" frame once its replay has landed and the labels have faded
 * (canvas version 1794830661-c660), for `data` and the landmarks the site drew (picked at random each time,
 * so the test reads them from the page), computed as the frame computes them: 15 m a focused minute, the
 * card lit by the light model dimmed to 80 % from 20 m above to 60 m below, the chart 15 % deeper than the
 * dive and at least 200 m.
 */
export function resultsDepthLitFrame(data: ResultsData, landmarks: readonly FrameLandmark[]): string {
  const total = data.total;
  let d = 0;
  const raw: [number, number][] = [[0, 0]];
  let at = 0;
  for (const { from, to } of data.stretches) {
    if (from > at) raw.push([from, d]);
    d += (to - from) * 15;
    raw.push([to, d]);
    at = to;
  }
  if (total > at) raw.push([total, d]);
  const col = (z: number): string =>
    `#${[0.0232, 0.212, 0.392]
      .map((v, i) => {
        let x = 0.8 * v * Math.exp(-([0.3, 0.06, 0.023][i] ?? 0) * Math.min(z, 10935));
        x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, x)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')}`;
  const bg = `linear-gradient(180deg, ${col(Math.max(0, d - 20))} 0%, ${col(d + 60)} 100%)`;
  const yMax = Math.max(200, d * 1.15);
  const Y = (z: number): number => Math.min(190, (z / yMax) * 190);
  const pts = raw.map(([t, z]) => `${((t / total) * 600).toFixed(1)},${Y(z).toFixed(1)}`).join(' ');
  const last = raw[raw.length - 1] ?? [0, 0];
  const zones = (
    [
      [200, 'twilight zone'],
      [1000, 'midnight zone'],
      [4000, 'abyssal zone'],
    ] as const
  )
    .map(([z, name]) => {
      const y = Y(z);
      const o = (z < yMax * 0.98 && y > 16 ? 0.35 : 0).toFixed(2);
      return `<line x1="0" y1="${y.toFixed(1)}" x2="600" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 5" opacity="${o}"></line><text x="6" y="${(y - 5).toFixed(1)}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#FFFFFF" opacity="${o}">${name}</text>`;
    })
    .join('\n');
  const zone = d < 200 ? 'sunlight zone' : d < 1000 ? 'twilight zone' : d < 4000 ? 'midnight zone' : d < 6000 ? 'abyssal zone' : 'hadal zone';
  const timeAt = (z: number): number => {
    let acc = 0;
    for (const { from, to } of data.stretches) {
      const span = (to - from) * 15;
      if (acc + span >= z) return from + (z - acc) / 15;
      acc += span;
    }
    return total;
  };
  const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  // Once the labels have faded, only the dots are left.
  const dots = landmarks
    .filter(([z]) => z <= d)
    .map(([z]) => `<div style="position: absolute; left: 0; top: 0"><div style="position: absolute; left: ${((timeAt(z) / total) * 600).toFixed(1)}px; opacity: ${sm((d - z) / 120).toFixed(2)}; top: ${Y(z).toFixed(1)}px; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: #F2C46B; box-shadow: 0 0 0 1.5px rgba(0,0,0,0.5)"></div></div>`)
    .join('');
  const things = PASSING.map(([left, peak, from, span, markup]) => {
    const p = (d - from) / span;
    const on = p > 0 && p < 1;
    return `<div style="position: absolute; left: ${String(left)}px; top: 0; transform: translateY(${(560 - p * 660).toFixed(1)}px); opacity: ${on ? (peak * Math.sin(Math.PI * p)).toFixed(2) : '0'}">${markup}</div>`;
  }).join('');
  const text = '#F4F8FB';
  const muted = 'rgba(232,242,250,0.74)';
  const chart = `<div style="width: 600px; display: flex; flex-direction: column; gap: 6px">
<div style="position: relative; width: 600px; height: 190px">
<svg role="img" aria-label="dive profile" width="600" height="190" viewBox="0 0 600 190" style="position: absolute; top: 0; left: 0; overflow: visible">
${zones}
<polyline points="${pts}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
<circle cx="${((last[0] / total) * 600).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="4" fill="#FFFFFF"></circle>
<text x="596" y="22" text-anchor="end" font-family="Archivo, system-ui, sans-serif" font-size="22" font-weight="300" fill="#FFFFFF">${Math.round(d).toLocaleString('en-US')} m</text>
<text x="596" y="40" text-anchor="end" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#FFFFFF" opacity="0.8">${zone}</text>
</svg>
${dots}
</div>
<div style="display: flex; justify-content: space-between; font-size: 11px; color: ${muted}; font-variant-numeric: tabular-nums"><div>${data.start}</div><div>${data.end}</div></div>
</div>`;
  const lit = { ...C, text, muted };
  const saved = C;
  C = lit;
  try {
    const page = resultsRoot(16, headline(data.focused) + chart + statsGrid(data.stats, 6) + resultsActions());
    // The card's light and the things that pass, behind the content; the corner icons keep the theme's colour.
    return page
      .replace(`background: ${lit.bg}; color: ${text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden">`, `background: ${bg}; color: ${text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden"><div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; overflow: hidden; pointer-events: none">${things}</div>`)
      .replaceAll(`color: ${lit.icon}; display: flex`, `color: ${saved.icon}; display: flex`);
  } finally {
    C = saved;
  }
}

/** The things that pass on the height results, as its frame draws them: [left, peak opacity, from, span, markup]. */
const FALLING: readonly (readonly [number, number, number, number, string])[] = [
  [500, 0.8, 0, 2600, '<svg width="80" height="40" viewBox="0 0 80 40" fill="none" stroke="#0E2440" stroke-width="2" stroke-linecap="round"><path d="M4 14 q5 -5 10 0 q5 -5 10 0"></path><path d="M30 6 q5 -5 10 0 q5 -5 10 0"></path><path d="M52 20 q5 -5 10 0 q5 -5 10 0"></path><path d="M40 30 q5 -5 10 0 q5 -5 10 0"></path></svg>'],
  [80, 0.9, 600, 5400, '<svg width="170" height="76" viewBox="0 0 100 45"><g fill="#FFFFFF" opacity="0.75"><ellipse cx="30" cy="30" rx="26" ry="13"></ellipse><ellipse cx="55" cy="22" rx="24" ry="17"></ellipse><ellipse cx="76" cy="31" rx="22" ry="12"></ellipse></g></svg>'],
  [430, 0.85, 2500, 9000, '<svg width="220" height="99" viewBox="0 0 100 45"><g fill="#FFFFFF" opacity="0.6"><ellipse cx="30" cy="30" rx="26" ry="13"></ellipse><ellipse cx="55" cy="22" rx="24" ry="17"></ellipse><ellipse cx="76" cy="31" rx="22" ry="12"></ellipse></g></svg>'],
  [250, 0.95, 8800, 4000, '<svg width="170" height="40" viewBox="0 0 170 40"><path d="M2 22 L80 20" stroke="rgba(255,255,255,0.6)" stroke-width="2.5"></path><path d="M80 18 L150 16 C160 16 166 19 166 20 C166 21 160 24 150 24 L80 23 Z M112 18 L96 4 L104 4 L126 18 Z M112 23 L96 37 L104 37 L126 23 Z M84 19 L78 10 L84 10 L92 19 Z" fill="#0E2440"></path></svg>'],
  [560, 0.95, 15000, 19000, '<svg width="44" height="90" viewBox="0 0 44 90"><ellipse cx="22" cy="22" rx="18" ry="21" fill="#EDEFF3"></ellipse><path d="M22 43 L22 74" stroke="#C9D3E0" stroke-width="1"></path><rect x="17" y="74" width="10" height="8" fill="#C9D3E0"></rect></svg>'],
];

/**
 * The "results: height (build this one)" frame once its replay has landed and the labels have faded (canvas
 * version 1794830661-c660), for `data` and the landmarks the site drew, computed as the frame computes them:
 * 140 m a focused minute, the card lit by the sky's light model dimmed to 65 % from 1,500 m above to 1,500 m
 * below (never below the ground), the chart 15 % higher than the climb and at least 2,000 m, its stars and its
 * horizon where the climb ended.
 */
export function resultsHeightLitFrame(data: ResultsData, landmarks: readonly FrameLandmark[]): string {
  const total = data.total;
  let d = 0;
  const raw: [number, number][] = [[0, 0]];
  let at = 0;
  for (const { from, to } of data.stretches) {
    if (from > at) raw.push([from, d]);
    d += (to - from) * 140;
    raw.push([to, d]);
    at = to;
  }
  if (total > at) raw.push([total, d]);
  const col = (z: number): string =>
    `#${[0.078, 0.275, 0.597]
      .map((v, i) => {
        let x = 0.65 * v * Math.exp((-([1.25, 1.1, 0.95][i] ?? 0) * Math.max(0, Math.min(z, 100000))) / 8500);
        x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, x)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')}`;
  const bg = `linear-gradient(180deg, ${col(d + 1500)} 0%, ${col(Math.max(0, d - 1500))} 100%)`;
  const yMax = Math.max(2000, d * 1.15);
  const Y = (z: number): number => Math.max(0, 190 - (z / yMax) * 190);
  const pts = raw.map(([t, z]) => `${((t / total) * 600).toFixed(1)},${Y(z).toFixed(1)}`).join(' ');
  const last = raw[raw.length - 1] ?? [0, 0];
  const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const zones = (
    [
      [12000, 'stratosphere'],
      [50000, 'mesosphere'],
      [85000, 'thermosphere'],
    ] as const
  )
    .map(([z, name]) => {
      const y = Y(z);
      const o = (z < yMax * 0.98 && y > 16 ? 0.35 : 0).toFixed(2);
      return `<line x1="0" y1="${y.toFixed(1)}" x2="600" y2="${y.toFixed(1)}" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 5" opacity="${o}"></line><text x="6" y="${(y - 5).toFixed(1)}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#FFFFFF" opacity="${o}">${name}</text>`;
    })
    .join('\n');
  const zone = d < 12000 ? 'troposphere' : d < 50000 ? 'stratosphere' : d < 85000 ? 'mesosphere' : 'thermosphere';
  const timeAt = (z: number): number => {
    let acc = 0;
    for (const { from, to } of data.stretches) {
      const span = (to - from) * 140;
      if (acc + span >= z) return from + (z - acc) / 140;
      acc += span;
    }
    return total;
  };
  const dots = landmarks
    .filter(([z]) => z <= d)
    .map(([z]) => `<div style="position: absolute; left: 0; top: 0"><div style="position: absolute; left: ${((timeAt(z) / total) * 600).toFixed(1)}px; opacity: ${sm((d - z) / 1500).toFixed(2)}; top: ${Y(z).toFixed(1)}px; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: #F2C46B; box-shadow: 0 0 0 1.5px rgba(0,0,0,0.5)"></div></div>`)
    .join('');
  const things = FALLING.map(([left, peak, from, span, markup]) => {
    const p = (d - from) / span;
    const on = p > 0 && p < 1;
    return `<div style="position: absolute; left: ${String(left)}px; top: 0; transform: translateY(${(-90 + p * 640).toFixed(1)}px); opacity: ${on ? (peak * Math.sin(Math.PI * p)).toFixed(2) : '0'}">${markup}</div>`;
  }).join('');
  const hp = sm((d - 15000) / 8000);
  const hp2 = sm((d - 23000) / 77000);
  const stars = `<div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; opacity: ${sm((d - 18000) / 24000).toFixed(2)}"><svg width="720" height="520" viewBox="0 0 720 520"><g>${CARD_STARS.join('')}</g></svg></div>`;
  const horizon = `<div aria-hidden="true" style="position: absolute; left: 50%; top: 0; width: 3200px; height: 3200px; margin-left: -1600px; border-radius: 50%; transform: translateY(${(530 - 70 * hp - 50 * hp2).toFixed(1)}px); opacity: ${hp.toFixed(2)}; background: radial-gradient(circle at 50% 50%, #0B2A4E 0%, #0B2A4E 92%, #2B6FB0 98.8%, rgba(120,190,255,0.0) 100%); box-shadow: 0 0 40px 10px rgba(110,180,255,0.45)"></div>`;
  const text = '#F4F8FB';
  const muted = 'rgba(232,242,250,0.74)';
  const chart = `<div style="width: 600px; display: flex; flex-direction: column; gap: 6px">
<div style="position: relative; width: 600px; height: 190px">
<svg role="img" aria-label="climb profile" width="600" height="190" viewBox="0 0 600 190" style="position: absolute; top: 0; left: 0; overflow: visible">
${zones}
<polyline points="${pts}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
<circle cx="${((last[0] / total) * 600).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="4" fill="#FFFFFF"></circle>
<text x="596" y="160" text-anchor="end" font-family="Archivo, system-ui, sans-serif" font-size="22" font-weight="300" fill="#FFFFFF">${Math.round(d).toLocaleString('en-US')} m</text>
<text x="596" y="178" text-anchor="end" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#FFFFFF" opacity="0.8">${zone}</text>
</svg>
${dots}
</div>
<div style="display: flex; justify-content: space-between; font-size: 11px; color: ${muted}; font-variant-numeric: tabular-nums"><div>${data.start}</div><div>${data.end}</div></div>
</div>`;
  const lit = { ...C, text, muted };
  const saved = C;
  C = lit;
  try {
    const page = resultsRoot(16, headline(data.focused) + chart + statsGrid(data.stats, 6) + resultsActions());
    // The card's sky, its stars, its horizon and the things that pass, behind the content; the corner icons keep
    // the theme's colour.
    return page
      .replace(`background: ${lit.bg}; color: ${text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden">`, `background: ${bg}; color: ${text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden">${stars}${horizon}<div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; overflow: hidden; pointer-events: none">${things}</div>`)
      .replaceAll(`color: ${lit.icon}; display: flex`, `color: ${saved.icon}; display: flex`);
  } finally {
    C = saved;
  }
}
