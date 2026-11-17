import { describe, expect, it } from 'vitest';
import { bodyOpacity, keptLabels, mapState, ringOpacity, spaceScale, startOpacity, usablePath } from './space.ts';
import { SPACE_CONFIG } from './space-config.ts';

const SPACE = SPACE_CONFIG;
const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** The "interstellar, running" frame's own arithmetic (its renderVals), as the strings it draws. */
function frameValues(minutes: number, sun: readonly [number, number], heading: number, usable: number): Record<string, string> {
  const r = 1 + minutes * 0.12024;
  const k = usable / Math.max(r, 1.6);
  // The frames' own four-decimal direction.
  const cos = Number(Math.cos((heading * Math.PI) / 180).toFixed(4));
  const sin = Number(Math.sin((heading * Math.PI) / 180).toFixed(4));
  const P = (au: number): [number, number] => [sun[0] + au * k * cos, sun[1] + au * k * sin];
  const out: Record<string, string> = {};
  const rings = [0.39, 0.72, 1.0, 1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120];
  rings.forEach((au, i) => {
    const rad = au * k;
    out[`r${String(i)}`] = rad.toFixed(1);
    out[`o${String(i)}`] = (0.55 * sm((rad - 3) / 6)).toFixed(2);
  });
  const [tx, ty] = P(r);
  const [ex, ey] = P(1);
  Object.assign(out, { tx: tx.toFixed(1), ty: ty.toFixed(1), ex: ex.toFixed(1), ey: ey.toFixed(1), eo: sm((k - 9) / 8).toFixed(2) });
  const bodies = [1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120];
  bodies.forEach((au, j) => {
    const [x, y] = P(au);
    out[`cx${String(j)}`] = x.toFixed(1);
    out[`cy${String(j)}`] = y.toFixed(1);
    out[`co${String(j)}`] = r >= au ? sm((au * k - 24) / 14).toFixed(2) : '0';
  });
  let lastX = 1e9;
  [...bodies.keys()].reverse().forEach((j) => {
    const x = Number(out[`cx${String(j)}`]);
    const keep = Number(out[`co${String(j)}`]) > 0.3 && lastX - x > 70;
    out[`lo${String(j)}`] = keep ? '1' : '0';
    if (keep) lastX = x;
  });
  return out;
}

function drawn(minutes: number, sun: readonly [number, number], heading: number, usable: number): Record<string, string> {
  const distance = 1 + minutes * SPACE.auPerMinute;
  const state = mapState(distance, sun, heading, usable);
  const out: Record<string, string> = {};
  state.rings.forEach((ring, i) => {
    out[`r${String(i)}`] = ring.radius.toFixed(1);
    out[`o${String(i)}`] = ring.opacity.toFixed(2);
  });
  Object.assign(out, {
    tx: state.traveller.x.toFixed(1),
    ty: state.traveller.y.toFixed(1),
    ex: state.start.x.toFixed(1),
    ey: state.start.y.toFixed(1),
    eo: state.start.opacity.toFixed(2),
  });
  state.bodies.forEach((body, j) => {
    out[`cx${String(j)}`] = body.x.toFixed(1);
    out[`cy${String(j)}`] = body.y.toFixed(1);
    out[`co${String(j)}`] = distance >= body.au ? body.opacity.toFixed(2) : '0';
    out[`lo${String(j)}`] = body.named ? '1' : '0';
  });
  return out;
}

describe('interstellar map', () => {
  it('travels at light speed from Earth’s orbit: 0.12024 AU a focused minute', () => {
    expect(SPACE.auPerMinute).toBeCloseTo((299_792_458 * 60) / 149_597_870_700, 5);
    expect(SPACE.startAu).toBe(1);
  });

  it('keeps 606.5 px of usable path on the 720 × 450 timer, 85 % of the way along −28° to 20 px short of the edge', () => {
    expect(usablePath(720, SPACE.camera.sunX)).toBeCloseTo(606.5, 1);
  });

  it('scales pixels per AU as the usable path over max(distance, 1.6 AU)', () => {
    expect(spaceScale(1, 606.5)).toBeCloseTo(606.5 / 1.6, 9);
    expect(spaceScale(1.6, 606.5)).toBeCloseTo(379.0625, 9);
    expect(spaceScale(11.1, 606.5)).toBeCloseTo(606.5 / 11.1, 9);
    expect(spaceScale(120, 606.5)).toBeLessThan(spaceScale(30, 606.5));
  });

  it('fades a ring between 9 and 3 px, at most 55 %', () => {
    expect(ringOpacity(2.9)).toBe(0);
    expect(ringOpacity(6)).toBeCloseTo(0.275, 9);
    expect(ringOpacity(9)).toBe(0.55);
    expect(ringOpacity(400)).toBe(0.55);
  });

  it('shows a landmark only once reached, fading its body as its orbit shrinks from 38 to 24 px', () => {
    expect(bodyOpacity(5.2, 5.19, 100)).toBe(0);
    expect(bodyOpacity(5.2, 5.2, 100)).toBe(1);
    expect(bodyOpacity(1.52, 40, 24 / 1.52)).toBe(0);
    expect(bodyOpacity(1.52, 40, 31 / 1.52)).toBeCloseTo(0.5, 9);
  });

  it('folds Earth into the Sun’s glow below 17 px per AU, gone at 9', () => {
    expect(startOpacity(17)).toBe(1);
    expect(startOpacity(13)).toBeCloseTo(0.5, 9);
    expect(startOpacity(9)).toBe(0);
  });

  it('names the newest landmark, and an older one only 70 px clear of the next name kept further out', () => {
    expect(keptLabels([{ x: 100, opacity: 1 }, { x: 250, opacity: 1 }, { x: 300, opacity: 1 }])).toEqual([true, false, true]);
    expect(keptLabels([{ x: 100, opacity: 0.29 }, { x: 300, opacity: 1 }])).toEqual([false, true]);
  });

  for (const minutes of [0, 3, 5, 12, 40, 84, 200, 330, 800, 1000]) {
    it(`draws the running frame’s map at ${String(minutes)} focused minutes`, () => {
      const sun = [SPACE.camera.sunX, SPACE.camera.sunY] as const;
      expect(drawn(minutes, sun, -28, 606.5)).toEqual(frameValues(minutes, sun, -28, 606.5));
    });
    it(`draws the results frame’s map at ${String(minutes)} focused minutes`, () => {
      const { results } = SPACE;
      const sun = [results.sunX, results.sunY] as const;
      expect(drawn(minutes, sun, -17, results.usablePx)).toEqual(frameValues(minutes, sun, -17, results.usablePx));
    });
  }
});
