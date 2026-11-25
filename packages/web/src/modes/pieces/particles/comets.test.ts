import { describe, expect, it } from 'vitest';
import { builtInRecipe } from '@stopwatch/core';
import type { ParticlesLayer } from '@stopwatch/core';
import RECIPE from '../../../../../../packages/core/src/recipes/shipped/interstellar.json' with { type: 'json' };
import { scheduleComets, tailAngle } from './comets.ts';

const recipe = builtInRecipe(RECIPE);
const layer = recipe.layers.find((item): item is ParticlesLayer => item.type === 'particles');
if (layer === undefined) throw new Error('no comets');

/** A small seeded random, so each case is the same every run. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

const SUN = [70, 392] as const;

describe('comets', () => {
  it('point their tails away from the Sun, from the middle of their paths', () => {
    // The paused frame's own four: (120, 70) by (380, 120) has its tail at −48°, and so on.
    expect(tailAngle(120, 70, 380, 120, SUN)).toBeCloseTo(-47.5, 0);
    expect(tailAngle(640, 300, -300, -170, SUN)).toBeCloseTo(-22.9, 0);
    expect(tailAngle(300, 30, 260, 260, SUN)).toBeCloseTo(-32.8, 0);
    expect(tailAngle(560, 40, -340, 150, SUN)).toBeCloseTo(-40.9, 0);
    for (let seed = 1; seed <= 20; seed += 1)
      for (const comet of scheduleComets(layer, 720, 450, SUN, seeded(seed))) {
        const middle = [comet.x + comet.dx / 2 - SUN[0], comet.y + comet.dy / 2 - SUN[1]];
        const tail = [Math.cos((comet.angle * Math.PI) / 180), Math.sin((comet.angle * Math.PI) / 180)];
        // The tail points along the line from the Sun through the comet: away from it.
        const [mx = 0, my = 0] = middle;
        const [ux = 0, uy = 0] = tail;
        expect(mx * ux + my * uy).toBeCloseTo(Math.hypot(mx, my), 6);
      }
  });

  it('come about every 5 seconds, never more than two at once, each within its limits', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const comets = scheduleComets(layer, 720, 450, SUN, seeded(seed));
      expect(comets.length).toBeGreaterThan(20);
      const gaps = comets.slice(1).map((comet, index) => comet.start - (comets[index]?.start ?? 0));
      expect(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length).toBeGreaterThan(4);
      expect(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length).toBeLessThan(7);
      for (const comet of comets) {
        const atOnce = comets.filter((other) => other.start <= comet.start && other.start + other.life > comet.start).length;
        expect(atOnce).toBeLessThanOrEqual(2);
        expect(comet.head).toBeGreaterThanOrEqual(4);
        expect(comet.head).toBeLessThanOrEqual(8);
        expect(comet.length).toBeGreaterThanOrEqual(50);
        expect(comet.length).toBeLessThanOrEqual(110);
        expect(Math.hypot(comet.dx, comet.dy)).toBeGreaterThanOrEqual(280);
        expect(Math.hypot(comet.dx, comet.dy)).toBeLessThanOrEqual(400);
        expect(['#BEE2FF', '#FFE2AA', '#D2F0FF']).toContain(comet.colour);
      }
    }
  });
});
