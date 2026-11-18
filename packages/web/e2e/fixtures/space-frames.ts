/**
 * The interstellar frames (canvas version 1794971102-90c3): "interstellar, running", "interstellar, paused" and
 * the revised "results: interstellar" (its journey map filling the card), each the frame's own markup and its own
 * arithmetic (its renderVals), at a given focused time. Without the frames' hand-entered stars: the site draws the
 * HYG sky in their place (owner, round 2.11), so the tests compare the frames with the sky hidden on both sides. The paused frame's comets are random; the tests draw it without them unless asked (`comets`). The results
 * frame is drawn as its replay lands, with the session's own numbers in place of the frame's sample ones.
 *
 * Generated from the canvas files; regenerate rather than edit by hand.
 */

import { frameDocument } from './frames.ts';

const PAUSED_COMETS = '<div aria-hidden="true" style="position: absolute; left: 120px; top: 70px; width: 0; height: 0; opacity: 0; --dx: 380px; --dy: 120px; animation: comet 20s linear 0.5s infinite"><div style="position: absolute; left: 0; top: -1.9px; width: 95px; height: 3.9px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-48deg); background: linear-gradient(90deg, rgba(210,240,255,0.85), rgba(210,240,255,0))"></div><div style="position: absolute; left: -3.2px; top: -3.2px; width: 6.5px; height: 6.5px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 6px 2px rgba(210,240,255,0.6)"></div></div>\n<div aria-hidden="true" style="position: absolute; left: 640px; top: 300px; width: 0; height: 0; opacity: 0; --dx: -300px; --dy: -170px; animation: comet 21s linear 5.5s infinite"><div style="position: absolute; left: 0; top: -2.3px; width: 94px; height: 4.7px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-23deg); background: linear-gradient(90deg, rgba(210,240,255,0.85), rgba(210,240,255,0))"></div><div style="position: absolute; left: -3.9px; top: -3.9px; width: 7.8px; height: 7.8px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 8px 3px rgba(210,240,255,0.6)"></div></div>\n<div aria-hidden="true" style="position: absolute; left: 300px; top: 30px; width: 0; height: 0; opacity: 0; --dx: 260px; --dy: 260px; animation: comet 19s linear 10.5s infinite"><div style="position: absolute; left: 0; top: -1.2px; width: 78px; height: 2.5px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-33deg); background: linear-gradient(90deg, rgba(190,226,255,0.85), rgba(190,226,255,0))"></div><div style="position: absolute; left: -2.1px; top: -2.1px; width: 4.1px; height: 4.1px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 4px 1px rgba(190,226,255,0.6)"></div></div>\n<div aria-hidden="true" style="position: absolute; left: 560px; top: 40px; width: 0; height: 0; opacity: 0; --dx: -340px; --dy: 150px; animation: comet 22s linear 15.5s infinite"><div style="position: absolute; left: 0; top: -2.0px; width: 104px; height: 4.0px; border-radius: 3px; transform-origin: 0 50%; transform: rotate(-41deg); background: linear-gradient(90deg, rgba(190,226,255,0.85), rgba(190,226,255,0))"></div><div style="position: absolute; left: -3.3px; top: -3.3px; width: 6.6px; height: 6.6px; border-radius: 50%; background: #F4FBFF; box-shadow: 0 0 7px 2px rgba(190,226,255,0.6)"></div></div>\n';

const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const BODIES = [1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120];
const RINGS = [0.39, 0.72, 1.0, 1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120];

/** The frames' map at `focus` minutes: the Sun at `sun`, `usable` px of path, heading `cos`, `sin`. */
function mapValues(focus: number, sun: readonly [number, number], usable: number, cos: number, sin: number): Record<string, string> {
  const r = 1 + focus * 0.12024;
  const k = usable / Math.max(r, 1.6);
  const P = (au: number): [number, number] => [sun[0] + au * k * cos, sun[1] + au * k * sin];
  const out: Record<string, string> = {};
  RINGS.forEach((au, i) => {
    const rad = au * k;
    out[`r${String(i)}`] = rad.toFixed(1);
    out[`o${String(i)}`] = (0.55 * sm((rad - 3) / 6)).toFixed(2);
  });
  const [tx, ty] = P(r);
  const [ex, ey] = P(1);
  Object.assign(out, { tx: tx.toFixed(1), ty: ty.toFixed(1), ex: ex.toFixed(1), ey: ey.toFixed(1), eo: sm((k - 9) / 8).toFixed(2) });
  BODIES.forEach((au, j) => {
    const [x, y] = P(au);
    const rad = au * k;
    out[`cx${String(j)}`] = x.toFixed(1);
    out[`cy${String(j)}`] = y.toFixed(1);
    out[`lx${String(j)}`] = (x + 9).toFixed(1);
    out[`ly${String(j)}`] = (y + 19).toFixed(1);
    out[`co${String(j)}`] = r >= au ? sm((rad - 24) / 14).toFixed(2) : '0';
  });
  let lastX = 1e9;
  [...BODIES.keys()].reverse().forEach((j) => {
    const x = Number(out[`cx${String(j)}`]);
    const keep = Number(out[`co${String(j)}`]) > 0.3 && lastX - x > 70;
    out[`lo${String(j)}`] = keep ? '1' : '0';
    if (keep) lastX = x;
  });
  return out;
}

const TIMER = (focus: number): Record<string, string> => mapValues(focus, [70, 392], 606.5, 0.8829, -0.4695);

/** "interstellar, running" at `focus` minutes, the time `hhmm`. */
export function spaceFrame(focus: number, hhmm: string): string {
  const [hh = '', mm = ''] = hhmm.split(':');
  const v: Record<string, string> = { ...TIMER(focus), hh, mm };
  const g = (key: string): string => v[key] ?? '';
  const c = { text: '#E8ECF6', end: '#A8403D', gray: '#23263A' };
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: #03040A; color: #E8ECF6; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0">
<g opacity="0.55">
</g>
<circle cx="70" cy="392" r="${g('r0')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o0')}"></circle>
<circle cx="70" cy="392" r="${g('r1')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o1')}"></circle>
<circle cx="70" cy="392" r="${g('r2')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o2')}"></circle>
<circle cx="70" cy="392" r="${g('r3')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o3')}"></circle>
<circle cx="70" cy="392" r="${g('r4')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o4')}"></circle>
<circle cx="70" cy="392" r="${g('r5')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o5')}"></circle>
<circle cx="70" cy="392" r="${g('r6')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o6')}"></circle>
<circle cx="70" cy="392" r="${g('r7')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o7')}"></circle>
<circle cx="70" cy="392" r="${g('r8')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o8')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r9')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o9')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r10')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o10')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r11')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o11')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="10" fill="#FFE7B0" opacity="0.16"></circle><circle cx="70" cy="392" r="4" fill="#FFF1CF"></circle>
<line x1="${g('ex')}" y1="${g('ey')}" x2="${g('tx')}" y2="${g('ty')}" stroke="#C9D3F0" stroke-width="1.3" opacity="0.7"></line>
<g opacity="${g('co0')}"><g transform="translate(${g('cx0')} ${g('cy0')})"><circle r="3" fill="#C8573A"></circle><ellipse cy="-2.3" rx="1.3" ry="0.6" fill="#F4EDE6"></ellipse></g><text x="${g('lx0')}" y="${g('ly0')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo0')}">mars</text></g>
<g opacity="${g('co1')}"><g transform="translate(${g('cx1')} ${g('cy1')})"><defs><clipPath id="jcl"><circle r="7"></circle></clipPath></defs><circle r="7" fill="#D9B58C"></circle><g clip-path="url(#jcl)"><rect x="-7" y="-3.4" width="14" height="1.3" fill="#B6855E"></rect><rect x="-7" y="-0.6" width="14" height="1.8" fill="#B6855E"></rect><rect x="-7" y="2.6" width="14" height="1" fill="#B6855E"></rect></g><ellipse cx="2.4" cy="2.2" rx="1.4" ry="0.8" fill="#C4573B"></ellipse></g><text x="${g('lx1')}" y="${g('ly1')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo1')}">jupiter</text></g>
<g opacity="${g('co2')}"><g transform="translate(${g('cx2')} ${g('cy2')})"><ellipse rx="14" ry="3.6" fill="none" stroke="#D9C38E" stroke-width="1.8" opacity="0.85" transform="rotate(-16)"></ellipse><circle r="6" fill="#E4CC93"></circle><path d="M-14 0 A14 3.6 0 0 0 14 0" fill="none" stroke="#D9C38E" stroke-width="1.8" transform="rotate(-16)"></path></g><text x="${g('lx2')}" y="${g('ly2')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo2')}">saturn</text></g>
<g opacity="${g('co3')}"><g transform="translate(${g('cx3')} ${g('cy3')})"><ellipse rx="1.6" ry="9" fill="none" stroke="#BFE8EC" stroke-width="0.8" opacity="0.7" transform="rotate(8)"></ellipse><circle r="5" fill="#9ED8DE"></circle></g><text x="${g('lx3')}" y="${g('ly3')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo3')}">uranus</text></g>
<g opacity="${g('co4')}"><g transform="translate(${g('cx4')} ${g('cy4')})"><circle r="5" fill="#4D72D6"></circle><ellipse cx="-1.4" cy="1" rx="1.4" ry="0.8" fill="#2A3E8C"></ellipse><path d="M0.6 -2.6 q1.4 -0.4 2.6 0.2" stroke="#E6F0FF" stroke-width="0.6" fill="none"></path></g><text x="${g('lx4')}" y="${g('ly4')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo4')}">neptune</text></g>
<g opacity="${g('co5')}"><g transform="translate(${g('cx5')} ${g('cy5')})"><circle r="2.6" fill="#CDAE8C"></circle><path d="M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z" fill="#F4E7D6"></path></g><text x="${g('lx5')}" y="${g('ly5')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo5')}">pluto</text></g>
<g opacity="${g('co6')}"><g transform="translate(${g('cx6')} ${g('cy6')})"><circle cx="-2.6" cy="0.8" r="1.1" fill="#B9C9DD"></circle><circle cx="0.4" cy="-1.4" r="1.3" fill="#A7B9D0"></circle><circle cx="2.4" cy="1.2" r="0.9" fill="#C8D6E6"></circle></g><text x="${g('lx6')}" y="${g('ly6')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo6')}">kuiper belt edge</text></g>
<g opacity="${g('co7')}"><g transform="translate(${g('cx7')} ${g('cy7')})"><circle r="4" fill="none" stroke="#C3AEF0" stroke-width="1.2"></circle><circle r="1.4" fill="#C3AEF0"></circle></g><text x="${g('lx7')}" y="${g('ly7')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo7')}">termination shock</text></g>
<g opacity="${g('co8')}"><g transform="translate(${g('cx8')} ${g('cy8')})"><circle r="5.5" fill="#8FB4FF" opacity="0.15"></circle><circle r="5.5" fill="none" stroke="#8FB4FF" stroke-width="1.2"></circle></g><text x="${g('lx8')}" y="${g('ly8')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo8')}">heliopause</text></g>
<g opacity="${g('eo')}" transform="translate(${g('ex')} ${g('ey')})"><circle r="3.6" fill="#3F78D8"></circle><path d="M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z" fill="#6FBF73"></path><circle r="3.6" fill="none" stroke="#9CC9FF" stroke-width="0.6" opacity="0.6"></circle></g>
<circle cx="${g('tx')}" cy="${g('ty')}" r="3.5" fill="#FFFFFF"></circle>
</svg>
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px">${g('hh')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('mm')}</div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.gray}">pause</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>
</div>`);
}

/** "interstellar, paused" at `focus` minutes: the time `hhmm` held, paused for `pausedFor`, the distance line. */
export function spacePausedFrame(focus: number, hhmm: string, pausedFor: string, line: string, comets = false): string {
  const [hh = '', mm = ''] = hhmm.split(':');
  const [ph = '', pm = '', ps = ''] = pausedFor.split(':');
  const v: Record<string, string> = { ...TIMER(focus), hh, mm, ph, pm, ps, line };
  const g = (key: string): string => v[key] ?? '';
  const c = { text: '#E8ECF6', end: '#A8403D', accent: '#35764E', gray: '#23263A' };
  return frameDocument(`<div style="width: 720px; height: 450px; box-sizing: border-box; background: #03040A; color: #E8ECF6; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px">
<svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0"><g opacity="0.55">
</g>
</svg>
<div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 450px; filter: blur(10px); opacity: 0.4"><svg aria-hidden="true" width="720" height="450" viewBox="0 0 720 450" style="position: absolute; top: 0; left: 0">
<circle cx="70" cy="392" r="${g('r0')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o0')}"></circle>
<circle cx="70" cy="392" r="${g('r1')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o1')}"></circle>
<circle cx="70" cy="392" r="${g('r2')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o2')}"></circle>
<circle cx="70" cy="392" r="${g('r3')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o3')}"></circle>
<circle cx="70" cy="392" r="${g('r4')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o4')}"></circle>
<circle cx="70" cy="392" r="${g('r5')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o5')}"></circle>
<circle cx="70" cy="392" r="${g('r6')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o6')}"></circle>
<circle cx="70" cy="392" r="${g('r7')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o7')}"></circle>
<circle cx="70" cy="392" r="${g('r8')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o8')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r9')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o9')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r10')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o10')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="${g('r11')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o11')}" stroke-dasharray="3 4"></circle>
<circle cx="70" cy="392" r="10" fill="#FFE7B0" opacity="0.16"></circle><circle cx="70" cy="392" r="4" fill="#FFF1CF"></circle>
<line x1="${g('ex')}" y1="${g('ey')}" x2="${g('tx')}" y2="${g('ty')}" stroke="#C9D3F0" stroke-width="1.3" opacity="0.7"></line>
<g opacity="${g('co0')}"><g transform="translate(${g('cx0')} ${g('cy0')})"><circle r="3" fill="#C8573A"></circle><ellipse cy="-2.3" rx="1.3" ry="0.6" fill="#F4EDE6"></ellipse></g><text x="${g('lx0')}" y="${g('ly0')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo0')}">mars</text></g>
<g opacity="${g('co1')}"><g transform="translate(${g('cx1')} ${g('cy1')})"><defs><clipPath id="jcl"><circle r="7"></circle></clipPath></defs><circle r="7" fill="#D9B58C"></circle><g clip-path="url(#jcl)"><rect x="-7" y="-3.4" width="14" height="1.3" fill="#B6855E"></rect><rect x="-7" y="-0.6" width="14" height="1.8" fill="#B6855E"></rect><rect x="-7" y="2.6" width="14" height="1" fill="#B6855E"></rect></g><ellipse cx="2.4" cy="2.2" rx="1.4" ry="0.8" fill="#C4573B"></ellipse></g><text x="${g('lx1')}" y="${g('ly1')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo1')}">jupiter</text></g>
<g opacity="${g('co2')}"><g transform="translate(${g('cx2')} ${g('cy2')})"><ellipse rx="14" ry="3.6" fill="none" stroke="#D9C38E" stroke-width="1.8" opacity="0.85" transform="rotate(-16)"></ellipse><circle r="6" fill="#E4CC93"></circle><path d="M-14 0 A14 3.6 0 0 0 14 0" fill="none" stroke="#D9C38E" stroke-width="1.8" transform="rotate(-16)"></path></g><text x="${g('lx2')}" y="${g('ly2')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo2')}">saturn</text></g>
<g opacity="${g('co3')}"><g transform="translate(${g('cx3')} ${g('cy3')})"><ellipse rx="1.6" ry="9" fill="none" stroke="#BFE8EC" stroke-width="0.8" opacity="0.7" transform="rotate(8)"></ellipse><circle r="5" fill="#9ED8DE"></circle></g><text x="${g('lx3')}" y="${g('ly3')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo3')}">uranus</text></g>
<g opacity="${g('co4')}"><g transform="translate(${g('cx4')} ${g('cy4')})"><circle r="5" fill="#4D72D6"></circle><ellipse cx="-1.4" cy="1" rx="1.4" ry="0.8" fill="#2A3E8C"></ellipse><path d="M0.6 -2.6 q1.4 -0.4 2.6 0.2" stroke="#E6F0FF" stroke-width="0.6" fill="none"></path></g><text x="${g('lx4')}" y="${g('ly4')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo4')}">neptune</text></g>
<g opacity="${g('co5')}"><g transform="translate(${g('cx5')} ${g('cy5')})"><circle r="2.6" fill="#CDAE8C"></circle><path d="M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z" fill="#F4E7D6"></path></g><text x="${g('lx5')}" y="${g('ly5')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo5')}">pluto</text></g>
<g opacity="${g('co6')}"><g transform="translate(${g('cx6')} ${g('cy6')})"><circle cx="-2.6" cy="0.8" r="1.1" fill="#B9C9DD"></circle><circle cx="0.4" cy="-1.4" r="1.3" fill="#A7B9D0"></circle><circle cx="2.4" cy="1.2" r="0.9" fill="#C8D6E6"></circle></g><text x="${g('lx6')}" y="${g('ly6')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo6')}">kuiper belt edge</text></g>
<g opacity="${g('co7')}"><g transform="translate(${g('cx7')} ${g('cy7')})"><circle r="4" fill="none" stroke="#C3AEF0" stroke-width="1.2"></circle><circle r="1.4" fill="#C3AEF0"></circle></g><text x="${g('lx7')}" y="${g('ly7')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo7')}">termination shock</text></g>
<g opacity="${g('co8')}"><g transform="translate(${g('cx8')} ${g('cy8')})"><circle r="5.5" fill="#8FB4FF" opacity="0.15"></circle><circle r="5.5" fill="none" stroke="#8FB4FF" stroke-width="1.2"></circle></g><text x="${g('lx8')}" y="${g('ly8')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo8')}">heliopause</text></g>
<g opacity="${g('eo')}" transform="translate(${g('ex')} ${g('ey')})"><circle r="3.6" fill="#3F78D8"></circle><path d="M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z" fill="#6FBF73"></path><circle r="3.6" fill="none" stroke="#9CC9FF" stroke-width="0.6" opacity="0.6"></circle></g>
<circle cx="${g('tx')}" cy="${g('ty')}" r="3.5" fill="#FFFFFF"></circle>
</svg>
</div>
${comets ? PAUSED_COMETS : ''}<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: #8A90A6; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="position: relative; display: flex; align-items: center; justify-content: center"><div aria-hidden="true" style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 104px; color: #E8ECF6; filter: blur(10px); opacity: 0.4">${g('hh')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('mm')}</div><div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center"><div style="position: relative; font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 44px; color: #E8ECF6">${g('ph')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('pm')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('ps')}<div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px; font-size: 12px; font-weight: 400; color: #9AA6C8; letter-spacing: 0.14em; white-space: nowrap">paused for</div></div></div></div>
<div style="position: relative"><div style="display: flex; gap: 14px"><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.accent}">resume</button><button style="height: 24px; padding: 0 13px; border-radius: 6px; border: 0; font-family: Archivo, system-ui, sans-serif; font-size: 12px; font-weight: 500; color: ${c.text}; background: ${c.end}">end</button></div>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; font-size: 11px; color: #B9C6DE">${g('line')}</div>
</div>`);
}

/** The session's numbers on the results card: the focused time, and the six stats. */
export interface SpaceResults {
  readonly focused: string;
  readonly stats: readonly [string, string, string, string, string, string];
}

/** "results: interstellar" as the replay lands, after `focus` minutes of focus. */
export function resultsSpaceFrame(focus: number, results: SpaceResults): string {
  const r = 1 + focus * 0.12024;
  const passed = (
    [
      [1.52, 'mars'],
      [5.2, 'jupiter'],
      [9.54, 'saturn'],
      [19.2, 'uranus'],
      [30.1, 'neptune'],
      [39.5, 'pluto'],
      [50, 'kuiper belt edge'],
      [94, 'termination shock'],
      [120, 'heliopause'],
    ] as const
  )
    .filter(([au]) => r >= au)
    .map(([, name]) => name);
  const dist = `${(r - 1).toFixed(1)} au travelled${passed.length > 0 ? ` · past ${passed[passed.length - 1] ?? ''}` : ' · leaving earth'}`;
  const [fh = '', fm = '', fs = ''] = results.focused.split(':');
  const [s0, s1, s2, s3, s4, s5] = results.stats;
  const v: Record<string, string> = { ...mapValues(focus, [46, 336], 575.5, 0.9659, -0.2588), dist, fh, fm, fs, s0, s1, s2, s3, s4, s5, ov: '0.000', co: '1.000', cy: '0.0' };
  const g = (key: string): string => v[key] ?? '';
  const c = { bg: '#03040A', text: '#E8ECF6', muted: '#9AA4C0', icon: '#9AA4C0' };
  return frameDocument(`<div style="width: 720px; height: 520px; box-sizing: border-box; background: ${c.bg}; color: ${c.text}; font-family: Archivo, system-ui, sans-serif; position: relative; overflow: hidden">
<div aria-hidden="true" style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; opacity: 0.45"><svg width="720" height="520" viewBox="0 0 720 520"><g>
</g>
</svg></div>
<div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; opacity: ${g('co')}">
<svg width="720" height="520" viewBox="0 0 720 520" role="img" aria-label="journey outward from the sun at light speed" style="position: absolute; top: 0; left: 0">
<circle cx="46" cy="336" r="${g('r0')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o0')}"></circle>
<circle cx="46" cy="336" r="${g('r1')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o1')}"></circle>
<circle cx="46" cy="336" r="${g('r2')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o2')}"></circle>
<circle cx="46" cy="336" r="${g('r3')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o3')}"></circle>
<circle cx="46" cy="336" r="${g('r4')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o4')}"></circle>
<circle cx="46" cy="336" r="${g('r5')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o5')}"></circle>
<circle cx="46" cy="336" r="${g('r6')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o6')}"></circle>
<circle cx="46" cy="336" r="${g('r7')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o7')}"></circle>
<circle cx="46" cy="336" r="${g('r8')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o8')}" stroke-dasharray="3 4"></circle>
<circle cx="46" cy="336" r="${g('r9')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o9')}" stroke-dasharray="3 4"></circle>
<circle cx="46" cy="336" r="${g('r10')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o10')}" stroke-dasharray="3 4"></circle>
<circle cx="46" cy="336" r="${g('r11')}" fill="none" stroke="#7A86B0" stroke-width="0.9" opacity="${g('o11')}" stroke-dasharray="3 4"></circle>
<circle cx="46" cy="336" r="10" fill="#FFE7B0" opacity="0.16"></circle><circle cx="46" cy="336" r="4" fill="#FFF1CF"></circle>
<line x1="${g('ex')}" y1="${g('ey')}" x2="${g('tx')}" y2="${g('ty')}" stroke="#C9D3F0" stroke-width="1.3" opacity="0.7"></line>
<g opacity="${g('co0')}"><g transform="translate(${g('cx0')} ${g('cy0')})"><circle r="3" fill="#C8573A"></circle><ellipse cy="-2.3" rx="1.3" ry="0.6" fill="#F4EDE6"></ellipse></g><text x="${g('lx0')}" y="${g('ly0')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo0')}">mars</text></g>
<g opacity="${g('co1')}"><g transform="translate(${g('cx1')} ${g('cy1')})"><defs><clipPath id="jcl"><circle r="7"></circle></clipPath></defs><circle r="7" fill="#D9B58C"></circle><g clip-path="url(#jcl)"><rect x="-7" y="-3.4" width="14" height="1.3" fill="#B6855E"></rect><rect x="-7" y="-0.6" width="14" height="1.8" fill="#B6855E"></rect><rect x="-7" y="2.6" width="14" height="1" fill="#B6855E"></rect></g><ellipse cx="2.4" cy="2.2" rx="1.4" ry="0.8" fill="#C4573B"></ellipse></g><text x="${g('lx1')}" y="${g('ly1')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo1')}">jupiter</text></g>
<g opacity="${g('co2')}"><g transform="translate(${g('cx2')} ${g('cy2')})"><ellipse rx="14" ry="3.6" fill="none" stroke="#D9C38E" stroke-width="1.8" opacity="0.85" transform="rotate(-16)"></ellipse><circle r="6" fill="#E4CC93"></circle><path d="M-14 0 A14 3.6 0 0 0 14 0" fill="none" stroke="#D9C38E" stroke-width="1.8" transform="rotate(-16)"></path></g><text x="${g('lx2')}" y="${g('ly2')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo2')}">saturn</text></g>
<g opacity="${g('co3')}"><g transform="translate(${g('cx3')} ${g('cy3')})"><ellipse rx="1.6" ry="9" fill="none" stroke="#BFE8EC" stroke-width="0.8" opacity="0.7" transform="rotate(8)"></ellipse><circle r="5" fill="#9ED8DE"></circle></g><text x="${g('lx3')}" y="${g('ly3')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo3')}">uranus</text></g>
<g opacity="${g('co4')}"><g transform="translate(${g('cx4')} ${g('cy4')})"><circle r="5" fill="#4D72D6"></circle><ellipse cx="-1.4" cy="1" rx="1.4" ry="0.8" fill="#2A3E8C"></ellipse><path d="M0.6 -2.6 q1.4 -0.4 2.6 0.2" stroke="#E6F0FF" stroke-width="0.6" fill="none"></path></g><text x="${g('lx4')}" y="${g('ly4')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo4')}">neptune</text></g>
<g opacity="${g('co5')}"><g transform="translate(${g('cx5')} ${g('cy5')})"><circle r="2.6" fill="#CDAE8C"></circle><path d="M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z" fill="#F4E7D6"></path></g><text x="${g('lx5')}" y="${g('ly5')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo5')}">pluto</text></g>
<g opacity="${g('co6')}"><g transform="translate(${g('cx6')} ${g('cy6')})"><circle cx="-2.6" cy="0.8" r="1.1" fill="#B9C9DD"></circle><circle cx="0.4" cy="-1.4" r="1.3" fill="#A7B9D0"></circle><circle cx="2.4" cy="1.2" r="0.9" fill="#C8D6E6"></circle></g><text x="${g('lx6')}" y="${g('ly6')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo6')}">kuiper belt edge</text></g>
<g opacity="${g('co7')}"><g transform="translate(${g('cx7')} ${g('cy7')})"><circle r="4" fill="none" stroke="#C3AEF0" stroke-width="1.2"></circle><circle r="1.4" fill="#C3AEF0"></circle></g><text x="${g('lx7')}" y="${g('ly7')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo7')}">termination shock</text></g>
<g opacity="${g('co8')}"><g transform="translate(${g('cx8')} ${g('cy8')})"><circle r="5.5" fill="#8FB4FF" opacity="0.15"></circle><circle r="5.5" fill="none" stroke="#8FB4FF" stroke-width="1.2"></circle></g><text x="${g('lx8')}" y="${g('ly8')}" font-family="Archivo, system-ui, sans-serif" font-size="11" fill="#C9D3F0" opacity="${g('lo8')}">heliopause</text></g>
<g opacity="${g('eo')}" transform="translate(${g('ex')} ${g('ey')})"><circle r="3.6" fill="#3F78D8"></circle><path d="M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z" fill="#6FBF73"></path><circle r="3.6" fill="none" stroke="#9CC9FF" stroke-width="0.6" opacity="0.6"></circle></g>
<circle cx="${g('tx')}" cy="${g('ty')}" r="3.5" fill="#FFFFFF"></circle>
</svg>
<div style="position: absolute; left: 18px; top: 16px; font-size: 11px; color: #C9D3F0; font-variant-numeric: tabular-nums">${g('dist')}</div>
</div>
<div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; opacity: ${g('ov')}">
<div style="font-size: 13px; color: ${c.muted}; letter-spacing: 0.06em">tabulating results</div>
<div style="width: 380px; height: 3px; border-radius: 2px; background: ${c.text}"></div>
<div style="height: 52px"></div>
</div>
<div style="position: absolute; top: 0; left: 0; width: 720px; height: 520px; box-sizing: border-box; padding: 24px 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; opacity: ${g('co')}; transform: translateY(${g('cy')}px)">
<div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 4px"><button aria-label="settings" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button aria-label="account" style="width: 28px; height: 28px; padding: 0; background: transparent; border: 0; color: ${c.icon}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path></svg></button></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">
<div style="font-size: 11px; color: ${c.muted}; letter-spacing: 0.16em">focused</div>
<div style="font-family: Archivo, system-ui, sans-serif; font-weight: 300; font-stretch: 92%; font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.01em; white-space: nowrap; text-align: center; font-size: 60px">${g('fh')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('fm')}<span style="margin: 0 -0.05em; position: relative; top: -0.06em">:</span>${g('fs')}</div>
</div>
<div style="height: 236px"></div>
<div style="width: 100%; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">elapsed</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s0')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">paused</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s1')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">pauses</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s2')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">longest stretch</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s3')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">started</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s4')}</div></div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 3px"><div style="font-size: 11px; color: ${c.muted}">ended</div><div style="font-size: 14px; font-variant-numeric: tabular-nums">${g('s5')}</div></div>
</div>
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">
<div style="display: flex; gap: 14px"><button aria-label="retry" style="width: 32px; height: 32px; padding: 0; background: transparent; border: 0; color: ${c.text}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"></path><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path></svg></button><button aria-label="share" style="width: 32px; height: 32px; padding: 0; background: transparent; border: 0; color: ${c.text}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"></path><path d="M7 9l5 -5l5 5"></path><path d="M12 4l0 12"></path></svg></button></div>
</div>
</div>
</div>`);
}
