/**
 * Reference reconstructions of design canvas frames (canvas version
 * 1794698982-a44c), for pixel comparison in the end-to-end tests. Each is the
 * frame's own markup, with its template values computed by the frame's own
 * formulas for the graphite theme, and "Archivo" mapped to the site's trimmed
 * font so differences can only come from layout and CSS.
 *
 * The timeline frame's personal record marker is left out: records arrive in
 * Release 3.
 */

const C = {
  bg: '#0E0F11',
  text: '#ECEAE4',
  accent: '#35764E',
  icon: '#888785',
  muted: '#888785',
  faint: '#323233',
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

function root(gap: number, children: string): string {
  return `${HEAD}<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${C.bg}; color: ${C.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${String(gap)}px">${CORNER}${children}</div></body></html>`;
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

/** The ring frame: 01:24, the head 24 minutes into the hour. */
export function ringFrame(): string {
  const rotations = [51.5, 49.0, 46.5, 44.0, 41.5, 39.0, 36.5, 34.0, 31.5, 29.0, 26.5, 24.0, 21.5, 19.0, 16.5, 14.0, 11.5, 9.0, 6.5, 4.0, 1.5, -1.0];
  const opacities = ['1.000', '0.920', '0.842', '0.768', '0.697', '0.629', '0.564', '0.502', '0.443', '0.388', '0.336', '0.287', '0.242', '0.200', '0.162', '0.127', '0.096', '0.069', '0.046', '0.028', '0.013', '0.004'];
  const tail = rotations
    .map(
      (r, i) =>
        `<circle cx="140" cy="140" r="112" fill="none" stroke="${C.accent}" stroke-width="8" stroke-dasharray="5.49 703.7" opacity="${opacities[i] ?? '0'}" transform="rotate(${r.toFixed(1)} 140 140)"></circle>`,
    )
    .join('');
  const ring = `<div style="position: relative; width: 280px; height: 280px; display: flex; align-items: center; justify-content: center"><svg role="img" width="280" height="280" viewBox="0 0 280 280" style="position: absolute; top: 0; left: 0"><circle cx="140" cy="140" r="112" fill="none" stroke="${C.faint}" stroke-width="8"></circle>${tail}<circle cx="205.8" cy="230.6" r="4" fill="${C.accent}"></circle></svg><div style="position: relative; ${TIME_STYLE}; font-size: 52px">01${COLON}24</div></div>`;
  return root(20, ring + RUNNING_BUTTONS);
}

/** The timeline frame at 01:24, without the personal record marker. */
export function timelineFrame(): string {
  const tick = (x: number, long: boolean, past: boolean): string =>
    `<line x1="${String(x)}" y1="60" x2="${String(x)}" y2="${long ? '72' : '66'}" stroke="${past ? C.muted : C.faint}" stroke-width="1.5"></line>`;
  const label = (x: number, text: string): string =>
    `<text x="${String(x)}" y="90" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${C.muted}">${text}</text>`;
  const marks = [
    tick(30, false, true),
    tick(80, true, true) + label(80, '01:00'),
    tick(130, false, true),
    tick(180, true, true) + label(180, '01:10'),
    tick(230, false, true),
    tick(280, true, true) + label(280, '01:20'),
    tick(330, false, false),
    tick(380, true, false) + label(380, '01:30'),
    tick(430, false, false),
    tick(480, true, false) + label(480, '01:40'),
    tick(530, false, false),
    tick(580, true, false) + label(580, '01:50'),
    tick(630, false, false),
  ].join('');
  const svg = `<svg role="img" width="640" height="110" viewBox="0 0 640 110"><line x1="0" y1="60" x2="320" y2="60" stroke="${C.muted}" stroke-width="2"></line><line x1="320" y1="60" x2="640" y2="60" stroke="${C.faint}" stroke-width="2"></line>${marks}</svg>`;
  const time = `<div style="${TIME_STYLE}; font-size: 56px">01${COLON}24</div>`;
  return root(18, time + svg + RUNNING_BUTTONS);
}
