/**
 * The revised ring and timeline frames (canvas version 1794802296-7853):
 * "ring", "ring at 00:01", "ring, paused", "timeline", "timeline at 00:04"
 * and "timeline, paused". Each is the frame's own markup with its palette
 * filled in. One owner rule makes the site differ from them and is applied
 * here: the personal record marker arrives with records in Release 3.
 *
 * Release 2 adds the "analog stopwatch" frame (canvas version 1794819772-c22a), with the plan's rule
 * applied to it: the hours hand glides (plan v5, "anything that moves with time glides"), so at 1 h 24 min
 * it points at 42°, where the frame draws the whole hour, 30° (a question for the owner, decision 278).
 *
 * Generated from the canvas files; regenerate rather than edit by hand.
 */

import type { FramePalette } from './frames.ts';
import { frameDocument } from './frames.ts';
import { PAUSED_STARS, RUNNING_STARS } from './height-stars.ts';

type Frame = (c: FramePalette) => string;

const FRAMES: Readonly<Record<string, Frame>> = {
  ring: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; width: 280px; height: 280px; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="position: absolute; left: 24px; top: 24px; width: 232px; height: 232px; border-radius: 50%; background: ${c.faint}; -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px))"></div><div aria-hidden="true" style="position: absolute; left: 24px; top: 24px; width: 232px; height: 232px; border-radius: 50%; background: conic-gradient(from 89.00deg, transparent 0deg, color-mix(in srgb, ${c.accent} 15%, transparent) 24.75deg, color-mix(in srgb, ${c.accent} 55%, transparent) 41.25deg, ${c.accent} 55.00deg, transparent 55.01deg); -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px))"></div><div style="position: absolute; left: 201.8px; top: 226.6px; width: 8px; height: 8px; border-radius: 4px; background: ${c.accent}"></div><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 52px">01<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>24</div></div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
  ringStart: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; width: 280px; height: 280px; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="position: absolute; left: 24px; top: 24px; width: 232px; height: 232px; border-radius: 50%; background: ${c.faint}; -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px))"></div><div aria-hidden="true" style="position: absolute; left: 24px; top: 24px; width: 232px; height: 232px; border-radius: 50%; background: conic-gradient(from 0.00deg, transparent 0deg, color-mix(in srgb, ${c.accent} 15%, transparent) 2.70deg, color-mix(in srgb, ${c.accent} 55%, transparent) 4.50deg, ${c.accent} 6.00deg, transparent 6.01deg); -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px))"></div><div style="position: absolute; left: 147.7px; top: 24.6px; width: 8px; height: 8px; border-radius: 4px; background: ${c.accent}"></div><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 52px">00<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>01</div></div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
  ringPaused: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="filter: blur(10px); opacity: 0.4"><div style="position: relative; width: 280px; height: 280px; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="position: absolute; left: 24px; top: 24px; width: 232px; height: 232px; border-radius: 50%; background: ${c.faint}; -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px))"></div><div aria-hidden="true" style="position: absolute; left: 24px; top: 24px; width: 232px; height: 232px; border-radius: 50%; background: conic-gradient(from 89.00deg, transparent 0deg, color-mix(in srgb, ${c.accent} 15%, transparent) 24.75deg, color-mix(in srgb, ${c.accent} 55%, transparent) 41.25deg, ${c.accent} 55.00deg, transparent 55.01deg); -webkit-mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px)); mask-image: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 8px))"></div><div style="position: absolute; left: 201.8px; top: 226.6px; width: 8px; height: 8px; border-radius: 4px; background: ${c.accent}"></div><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 52px">01<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>24</div></div>
</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 44px">00<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>04<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>12<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; color: ${c.muted}; letter-spacing: 0.14em; white-space: nowrap">paused for</div></div></div></div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.accent}">resume</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
  timeline: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 18px"><div style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 56px">01<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>24</div><div style="width: 480px; -webkit-mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent); mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)"><svg role="img" aria-label="timeline" width="480" height="64" viewBox="0 0 480 64" shape-rendering="crispEdges">
<rect x="0" y="20" width="240" height="2" fill="${c.muted}"></rect>
<rect x="240" y="20" width="240" height="2" fill="${c.faint}"></rect>
<rect x="0" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="0" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:00</text>
<rect x="50" y="22" width="1" height="5" fill="${c.muted}"></rect>
<rect x="100" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="100" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:10</text>
<rect x="150" y="22" width="1" height="5" fill="${c.muted}"></rect>
<rect x="200" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="200" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:20</text>
<rect x="250" y="22" width="1" height="5" fill="${c.faint}"></rect>
<rect x="300" y="22" width="1" height="8" fill="${c.faint}"></rect>
<text x="300" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:30</text>
<rect x="350" y="22" width="1" height="5" fill="${c.faint}"></rect>
<rect x="400" y="22" width="1" height="8" fill="${c.faint}"></rect>
<text x="400" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:40</text>
<rect x="450" y="22" width="1" height="5" fill="${c.faint}"></rect>
</svg></div>
</div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
  timelineStart: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 18px"><div style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 56px">00<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>04</div><div style="width: 480px; -webkit-mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent); mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)"><svg role="img" aria-label="timeline" width="480" height="64" viewBox="0 0 480 64" shape-rendering="crispEdges">
<rect x="200" y="20" width="40" height="2" fill="${c.muted}"></rect>
<rect x="240" y="20" width="240" height="2" fill="${c.faint}"></rect>
<rect x="200" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="200" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">00:00</text>
<rect x="250" y="22" width="1" height="5" fill="${c.faint}"></rect>
<rect x="300" y="22" width="1" height="8" fill="${c.faint}"></rect>
<text x="300" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">00:10</text>
<rect x="350" y="22" width="1" height="5" fill="${c.faint}"></rect>
<rect x="400" y="22" width="1" height="8" fill="${c.faint}"></rect>
<text x="400" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">00:20</text>
<rect x="450" y="22" width="1" height="5" fill="${c.faint}"></rect>
</svg></div>
</div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
  timelinePaused: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="filter: blur(10px); opacity: 0.4"><div style="display: flex; flex-direction: column; align-items: center; gap: 18px"><div style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 56px">01<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>24</div><div style="width: 480px; -webkit-mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent); mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)"><svg role="img" aria-label="timeline" width="480" height="64" viewBox="0 0 480 64" shape-rendering="crispEdges">
<rect x="0" y="20" width="240" height="2" fill="${c.muted}"></rect>
<rect x="240" y="20" width="240" height="2" fill="${c.faint}"></rect>
<rect x="0" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="0" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:00</text>
<rect x="50" y="22" width="1" height="5" fill="${c.muted}"></rect>
<rect x="100" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="100" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:10</text>
<rect x="150" y="22" width="1" height="5" fill="${c.muted}"></rect>
<rect x="200" y="22" width="1" height="8" fill="${c.muted}"></rect>
<text x="200" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:20</text>
<rect x="250" y="22" width="1" height="5" fill="${c.faint}"></rect>
<rect x="300" y="22" width="1" height="8" fill="${c.faint}"></rect>
<text x="300" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:30</text>
<rect x="350" y="22" width="1" height="5" fill="${c.faint}"></rect>
<rect x="400" y="22" width="1" height="8" fill="${c.faint}"></rect>
<text x="400" y="46" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="${c.muted}" style="font-feature-settings: 'tnum' 1">01:40</text>
<rect x="450" y="22" width="1" height="5" fill="${c.faint}"></rect>
</svg></div>
</div>
</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 44px">00<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>04<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>12<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; color: ${c.muted}; letter-spacing: 0.14em; white-space: nowrap">paused for</div></div></div></div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.accent}">resume</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
  analog: (c) => `<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<svg role="img" aria-label="analog stopwatch at 1 hour 24 minutes; one revolution is one hour" width="290" height="300" viewBox="0 -10 300 310">
<rect x="138" y="-8" width="24" height="12" rx="3" fill="${c.faint}"></rect>
<circle cx="150" cy="150" r="138" fill="${c.track}" stroke="${c.faint}" stroke-width="2"></circle>
<circle cx="150" cy="150" r="124" fill="none" stroke="${c.faint}" stroke-width="6" stroke-dasharray="1 11.985" transform="rotate(-90.23 150 150)"></circle>
<circle cx="150" cy="150" r="123" fill="none" stroke="${c.muted}" stroke-width="10" stroke-dasharray="2 62.926" transform="rotate(-90.46 150 150)"></circle>
<text x="150.0" y="48.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">0</text>
<text x="201.0" y="61.7" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">5</text>
<text x="238.3" y="99.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">10</text>
<text x="252.0" y="150.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">15</text>
<text x="238.3" y="201.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">20</text>
<text x="201.0" y="238.3" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">25</text>
<text x="150.0" y="252.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">30</text>
<text x="99.0" y="238.3" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">35</text>
<text x="61.7" y="201.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">40</text>
<text x="48.0" y="150.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">45</text>
<text x="61.7" y="99.0" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">50</text>
<text x="99.0" y="61.7" text-anchor="middle" dominant-baseline="central" font-family="Archivo, system-ui, sans-serif" font-size="12" fill="${c.muted}">55</text>
<circle cx="150" cy="200" r="22" fill="none" stroke="${c.faint}" stroke-width="1.5"></circle>
<line x1="150.0" y1="182.0" x2="150.0" y2="179.0" stroke="${c.muted}" stroke-width="1"></line>
<line x1="159.0" y1="184.4" x2="160.5" y2="181.8" stroke="${c.muted}" stroke-width="1"></line>
<line x1="165.6" y1="191.0" x2="168.2" y2="189.5" stroke="${c.muted}" stroke-width="1"></line>
<line x1="168.0" y1="200.0" x2="171.0" y2="200.0" stroke="${c.muted}" stroke-width="1"></line>
<line x1="165.6" y1="209.0" x2="168.2" y2="210.5" stroke="${c.muted}" stroke-width="1"></line>
<line x1="159.0" y1="215.6" x2="160.5" y2="218.2" stroke="${c.muted}" stroke-width="1"></line>
<line x1="150.0" y1="218.0" x2="150.0" y2="221.0" stroke="${c.muted}" stroke-width="1"></line>
<line x1="141.0" y1="215.6" x2="139.5" y2="218.2" stroke="${c.muted}" stroke-width="1"></line>
<line x1="134.4" y1="209.0" x2="131.8" y2="210.5" stroke="${c.muted}" stroke-width="1"></line>
<line x1="132.0" y1="200.0" x2="129.0" y2="200.0" stroke="${c.muted}" stroke-width="1"></line>
<line x1="134.4" y1="191.0" x2="131.8" y2="189.5" stroke="${c.muted}" stroke-width="1"></line>
<line x1="141.0" y1="184.4" x2="139.5" y2="181.8" stroke="${c.muted}" stroke-width="1"></line>
<line x1="150" y1="200" x2="150" y2="184" stroke="${c.text}" stroke-width="2" stroke-linecap="round" transform="rotate(42 150 200)"></line>
<text x="150" y="232" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="10" fill="${c.muted}">hours</text>
<line x1="150" y1="168" x2="150" y2="36" stroke="${c.accent}" stroke-width="2.5" stroke-linecap="round" transform="rotate(144 150 150)"></line>
<circle cx="150" cy="150" r="5" fill="${c.accent}"></circle>
</svg>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`,
};

export type ModeFrameName = 'ring' | 'ringStart' | 'ringPaused' | 'timeline' | 'timelineStart' | 'timelinePaused' | 'analog';

/** A revised mode frame as a whole page, in `palette`. */
export function modeFrame(name: ModeFrameName, palette: FramePalette): string {
  const frame = FRAMES[name];
  if (frame === undefined) throw new Error(`no frame ${name}`);
  return frameDocument(frame(palette));
}

/** The ocean frames' own light model (the canvas's ocean(d)), independent of the site's code. */
function oceanWater(depth: number): string {
  const surface = [0.0232, 0.212, 0.392];
  const attenuation = [0.3, 0.06, 0.023];
  const colour = (z: number): string =>
    `#${surface
      .map((value, i) => {
        let x = value * Math.exp(-(attenuation[i] ?? 0) * Math.min(z, 10935));
        x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, x)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')}`;
  return `linear-gradient(180deg, ${colour(Math.max(0, depth - 6))} 0%, ${colour(depth + 6)} 100%)`;
}

/**
 * The "ocean depth, running" frame (90 m, 00:06) and the "ocean depth, 0 to 20 m" frame at any moment: the
 * frames' own markup at `depth` metres, showing `minutes` focused minutes (canvas version 1794829025-58a4).
 */
export function oceanFrame(depth: number, minutes: number): string {
  const c = { icon: '#9EC3D6', text: '#DCE8EE', end: '#A8403D', gray: '#1E3E57' };
  const mm = String(minutes).padStart(2, '0');
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${oceanWater(depth)}; color: #DCE8EE; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px">00<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${mm}</div>
<div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>`);
}

/**
 * The "ocean depth, paused" frame at `t` seconds into the pause (canvas version 1794830661-c660): the water at
 * 90 m, the frame's placeholder fish and bubbles where its own formulas put them at that moment, and the time
 * held behind the blur with "paused for" `pausedFor` (hh:mm:ss).
 */
export function oceanPausedFrame(t: number, pausedFor: string): string {
  const c = { icon: '#9EC3D6', text: '#DCE8EE', accent: '#35764E', end: '#A8403D' };
  const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const bx = [120, 190, 560, 610, 330, 420, 250];
  const sp = [26, 34, 22, 30, 28, 38, 24];
  const ph = [0, 180, 90, 300, 400, 260, 140];
  const radii = [5, 3.5, 6, 3, 4.5, 2.5, 4];
  const bubbles = bx
    .map((x, k) => `<circle cx="${(x + 6 * Math.sin(t * 1.4 + k)).toFixed(1)}" cy="${(470 - ((t * (sp[k] ?? 0) + (ph[k] ?? 0)) % 520)).toFixed(1)}" r="${String(radii[k])}" fill="none" stroke="#7FB3CC" stroke-width="1.2" opacity="0.5"></circle>`)
    .join('');
  const fish = [
    [17.2, 13.5, 150, 7, 1, 0.3, 4.77], [61.9, 13.4, 150, 7, 1, 0.3, 5.53], [-65.9, -1.9, 150, 7, 1, 0.3, 5.66], [20.9, 22.5, 150, 7, 1, 0.3, 0.68], [-4.3, -14.2, 150, 7, 1, 0.3, 3.26], [10.4, -27.3, 150, 7, 1, 0.3, 1.3], [-30.9, 23.3, 150, 7, 1, 0.3, 4.59], [-47.7, 16.6, 150, 7, 1, 0.3, 0.83], [16.4, -20.9, 150, 7, 1, 0.3, 0.01], [52.0, -16.3, 150, 7, 1, 0.3, 1.29], [67.5, 20.9, 150, 7, 1, 0.3, 1.74],
    [64.6, 2.2, 300, 13, -1, 0.55, 4.07], [-41.3, 24.7, 300, 13, -1, 0.55, 4.14], [65.3, 22.0, 300, 13, -1, 0.55, 1.79], [-19.4, -18.7, 300, 13, -1, 0.55, 0.87], [-60.9, -11.1, 300, 13, -1, 0.55, 3.62], [-69.5, 10.0, 300, 13, -1, 0.55, 2.03], [-26.6, 17.8, 300, 13, -1, 0.55, 2.88],
    [0, 0, 390, 26, 1, 1.25, 1.89], [150, 18, 390, 26, 1, 1.25, 2.89],
  ] as const;
  const colour = (y: number): string => (y === 150 ? '#0B2A63' : y === 300 ? '#1B4C82' : '#3D7EA6');
  const fishes = fish
    .map(([ox, oy, y, speed, direction, scale, phase]) => {
      let cx = (t * speed + phase * 40) % 1000;
      cx = direction > 0 ? cx - 140 : 860 - cx;
      const x = cx + ox + 4 * Math.sin(t * 1.1 + phase);
      const yy = y + oy + 3 * Math.sin(t * 0.9 + phase * 2);
      return `<g transform="translate(${x.toFixed(1)} ${yy.toFixed(1)}) scale(${String(direction > 0 ? -scale : scale)} ${String(scale)})"><path d="M0 0 C10 -11 30 -11 42 0 C30 11 10 11 0 0 Z M40 0 L54 -9 L52 0 L54 9 Z" fill="${colour(y)}"></path></g>`;
    })
    .join('');
  const [h, m, s] = pausedFor.split(':');
  const colon = '<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>';
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${oceanWaterAt(90)}; color: #DCE8EE; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0"><g opacity="${sm(t / 6).toFixed(2)}">${bubbles}${fishes}</g></svg>
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; display: flex; align-items: center; justify-content: center">
<div aria-hidden="true" style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px; filter: blur(10px); opacity: 0.4">00${colon}06</div>
<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 44px">${h ?? ''}${colon}${m ?? ''}${colon}${s ?? ''}<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; font-stretch: 100%; color: #9EC3D6; letter-spacing: 0.14em">paused for</div></div></div>
</div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.accent}">resume</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>
</div>`);
}

/** The ocean frames' water at `depth`: their own light model, as oceanWater() draws it. */
function oceanWaterAt(depth: number): string {
  return oceanWater(depth);
}

/** The height frames' own light model (ModeHeight.dc.html's sky()), independent of the site's code. */
export function heightSkyColour(z: number, dim = 1): string {
  return `#${[0.078, 0.275, 0.597]
    .map((v, i) => {
      let x = dim * v * Math.exp((-([1.25, 1.1, 0.95][i] ?? 0) * Math.max(0, Math.min(z, 100000))) / 8500);
      x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(1, x)) * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

const heightSky = (h: number): string => `linear-gradient(180deg, ${heightSkyColour(h + 1500)} 0%, ${heightSkyColour(h - 1500)} 100%)`;
const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const HEIGHT_ICONS = (colour: string): string =>
  `<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${colour}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${colour}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>`;
const COLON = '<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>';

/**
 * The "height, full climb" frame at `h` metres (canvas version 1794830661-c660): its own sky at that height,
 * its stars at the opacity the frame gives them there, and the time `hhmm` ("01:24").
 */
export function heightFrame(h: number, hhmm: string): string {
  const [hh = '', mm = ''] = hhmm.split(':');
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${heightSky(h)}; color: #EEF4FA; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0"><g opacity="${smooth((h - 18000) / 24000).toFixed(3)}">${RUNNING_STARS.join('')}</g></svg>
${HEIGHT_ICONS('#C9DCEE')}
<div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px">${hh}${COLON}${mm}</div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: #EEF4FA; background: #2A4A6A">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: #EEF4FA; background: #A8403D">end</button></div>
</div>
</div>`);
}

/**
 * The "height, paused" frame without its shooting stars (canvas version 1794830661-c660), at `h` metres: the
 * time `hhmm` held behind the blur, "paused for" `pausedFor` (hh:mm:ss), and the altitude line. Where the frame
 * is a still picture, its sky and stars are the light model's at that height and the running frame's star field
 * (`ownSky` draws the frame's own instead, for the record): decision 304.
 */
export function heightPausedFrame(h: number, hhmm: string, pausedFor: string, line: string, ownSky = false): string {
  const [hh = '', mm = ''] = hhmm.split(':');
  const [ph = '', pm = '', ps = ''] = pausedFor.split(':');
  const background = ownSky ? 'linear-gradient(180deg, #020A1C 0%, #041330 100%)' : heightSky(h);
  const stars = ownSky ? `<g>${PAUSED_STARS.join('')}</g>` : `<g opacity="${smooth((h - 18000) / 24000).toFixed(3)}">${RUNNING_STARS.join('')}</g>`;
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: ${background}; color: #EEF4FA; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0">${stars}</svg>
${HEIGHT_ICONS('#9AA6C8')}
<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px; color: #EEF4FA; filter: blur(10px); opacity: 0.4">${hh}${COLON}${mm}</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 44px; color: #EEF4FA">${ph}${COLON}${pm}${COLON}${ps}<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; color: #B9C6DE; letter-spacing: 0.14em; white-space: nowrap">paused for</div></div></div></div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: #EEF4FA; background: #35764E">resume</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: #EEF4FA; background: #A8403D">end</button></div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; font-size: 11px; color: #B9C6DE">${line}</div>
</div>`);
}
