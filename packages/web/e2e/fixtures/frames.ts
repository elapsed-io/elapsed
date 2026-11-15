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

import { timelineStripMinutes } from '../../src/modes/timeline/strip.ts';

const C = {
  bg: '#0E0F11',
  text: '#ECEAE4',
  accent: '#35764E',
  icon: '#888785',
  muted: '#888785',
  faint: '#323233',
  track: '#202123',
  gray: '#3a3b3b',
  end: '#A8403D',
};

const HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>frame</title><style>
@font-face{font-family:Archivo;src:url(/font.woff2) format("woff2");font-weight:300 500;font-stretch:92%;font-style:normal;font-display:block}
body{margin:0;font-stretch:92%}
button{font-stretch:inherit}
</style></head><body>`;

const CORNER = `<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${C.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${C.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>`;

const COLON = '<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>';
const TIME_STYLE = 'font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center';
const BUTTON = (label: string, background: string): string =>
  `<button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${C.text}; background: ${background}">${label}</button>`;
const RUNNING_BUTTONS = `<div style="display: flex; gap: 14px">${BUTTON('pause', C.gray)}${BUTTON('end', C.end)}</div>`;

function root(gap: number, children: string, corner = true): string {
  return `${HEAD}<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${C.bg}; color: ${C.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${String(gap)}px">${corner ? CORNER : ''}${children}</div></body></html>`;
}

const pad = (value: number): string => String(value).padStart(2, '0');
const smoothstep = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

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
  return root(26, time + RUNNING_BUTTONS);
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
  return root(26, time + RUNNING_BUTTONS);
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

/**
 * The ring frame: 01:24, the head 24 minutes into the hour.
 *
 * The site turns the head and tail as one group by a CSS animation, which
 * browsers rasterise as a separate layer, and how a layer is rasterised
 * differs between browser versions. So the reference draws the frame's
 * geometry the same way: the frame's segments at rotate(54° − 2.5°·(i + 1))
 * become segments at rotate(−90° − 2.5°·(i + 1)) inside a group turned by
 * 144° (24 minutes), and the head (205.8, 230.6) becomes (140, 28) turned by
 * the same 144°. The frame's own markup was compared too during round 3: within
 * anti-aliasing on this rendering path, it differs only by layer raster noise.
 */
export function ringFrame(): string {
  const opacities = ['1.000', '0.920', '0.842', '0.768', '0.697', '0.629', '0.564', '0.502', '0.443', '0.388', '0.336', '0.287', '0.242', '0.200', '0.162', '0.127', '0.096', '0.069', '0.046', '0.028', '0.013', '0.004'];
  const turned = 'will-change: transform; transform-box: view-box; transform-origin: 50% 50%; transform: rotate(144deg)';
  const tail = opacities
    .map(
      (opacity, i) =>
        `<circle cx="140" cy="140" r="112" fill="none" stroke="${C.accent}" stroke-width="8" stroke-dasharray="5.49 703.7" opacity="${opacity}" transform="rotate(${String(-90 - 2.5 * (i + 1))} 140 140)"></circle>`,
    )
    .join('');
  const ring = `<div style="position: relative; width: 280px; height: 280px; display: flex; align-items: center; justify-content: center"><svg role="img" width="280" height="280" viewBox="0 0 280 280" style="position: absolute; top: 0; left: 0"><circle cx="140" cy="140" r="112" fill="none" stroke="${C.faint}" stroke-width="8"></circle><g><g style="${turned}">${tail}</g></g><g style="${turned}"><circle cx="140" cy="28" r="4" fill="${C.accent}"></circle></g></svg><div style="position: relative; ${TIME_STYLE}; font-size: 52px">01${COLON}24</div></div>`;
  return root(20, ring + RUNNING_BUTTONS);
}

/**
 * The timeline frame at 01:24, without the personal record marker.
 *
 * As with the ring, the site slides the ticks and labels as layers, so the
 * reference draws the frame's ticks (x = 30, 80, … 630) and labels the same
 * way: at x = minute × 10 inside groups translated by −520 px (84 minutes),
 * with the past ticks clipped to the left half and the future ticks to the
 * right half. The strip covers the same minutes as the site's, so the browser
 * lays out the layer identically. */
export function timelineFrame(options: { readonly labels?: boolean } = {}): string {
  // The same paused CSS animation the site uses, held at 84 minutes of a 16-hour slide from 320 px to −9,280 px.
  const slid = 'animation: strip 57600000ms linear -5040000ms both paused';
  // The whole strip, as the site draws it, so the layer has the same extent and raster origin.
  const ticks = (stroke: string): string => {
    const lines: string[] = [];
    for (let minute = 0; minute <= timelineStripMinutes(); minute += 5) {
      const x = minute * 10;
      lines.push(`<line x1="${String(x)}" y1="60" x2="${String(x)}" y2="${minute % 10 === 0 ? '72' : '66'}" stroke="${stroke}" stroke-width="1.5"></line>`);
    }
    return lines.join('');
  };
  const labels: string[] = [];
  for (let minute = 0; options.labels !== false && minute <= timelineStripMinutes(); minute += 10) {
    const text = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
    labels.push(`<text x="${String(minute * 10)}" y="90" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${C.muted}">${text}</text>`);
  }
  const keyframes = '<style>@keyframes strip { from { transform: translateX(320px); } to { transform: translateX(-9280px); } }</style>';
  const svg = `${keyframes}<svg role="img" width="640" height="110" viewBox="0 0 640 110"><defs><clipPath id="past"><rect x="0" y="0" width="320" height="110"></rect></clipPath><clipPath id="future"><rect x="320" y="0" width="320" height="110"></rect></clipPath></defs><line x1="0" y1="60" x2="320" y2="60" stroke="${C.muted}" stroke-width="2"></line><line x1="320" y1="60" x2="640" y2="60" stroke="${C.faint}" stroke-width="2"></line><g clip-path="url(#past)"><g style="${slid}">${ticks(C.muted)}</g></g><g clip-path="url(#future)"><g style="${slid}">${ticks(C.faint)}</g></g><g style="${slid}">${labels.join('')}</g></svg>`;
  const time = `<div style="${TIME_STYLE}; font-size: 56px">01${COLON}24</div>`;
  return root(18, time + svg + RUNNING_BUTTONS);
}

/** Where the timeline frame draws its labels at 01:24: text and centre x within the 640 px drawing. */
export const TIMELINE_FRAME_LABELS: readonly (readonly [string, number])[] = [
  ['01:00', 80],
  ['01:10', 180],
  ['01:20', 280],
  ['01:30', 380],
  ['01:40', 480],
  ['01:50', 580],
];


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
const RESULTS_ACTIONS = `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="display: flex; gap: 14px">${RESULTS_ICON(
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
  return `${HEAD}<div style="width: 720px; height: 520px; box-sizing: border-box; background: ${C.bg}; color: ${C.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden"><div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; box-sizing: border-box; padding: 24px 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${String(gap)}px; opacity: 1; transform: translateY(0px)">${CORNER}${children}</div></div></body></html>`;
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
  return resultsRoot(22, headline(data.focused) + strip + statsGrid(data.stats, 6) + RESULTS_ACTIONS);
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
  return resultsRoot(16, headline(data.focused) + row + RESULTS_ACTIONS);
}
