import { describe, expect, it } from 'vitest';
import { renderModeTokensCss, renderTokensCss } from './tokens.ts';

describe('generated tokens', () => {
  const css = renderTokensCss();

  it('draws the blur-away curves from the plan with smoothstep as a cubic Bézier', () => {
    expect(css).toContain('--blur-ones-window: 10000ms');
    expect(css).toContain('--blur-tens-start: 10000ms');
    expect(css).toContain('--blur-tens-window: 50000ms');
    expect(css).toContain('--blur-away-max: 14px');
    // Opacity holds until 30 %, the width (as a translation) until 55 %.
    expect(css).toMatch(/@keyframes time-blur-away-fade \{[^}]*\}\s*30% \{ opacity: 1; animation-timing-function: cubic-bezier\(0\.333333, 0, 0\.666667, 1\); \}/);
    expect(css).toMatch(/@keyframes time-blur-away-shift-ones \{[^}]*\}\s*55% \{ transform: translateX\(0\);/);
  });

  it('cuts with a short crossfade under reduced motion', () => {
    // 200 ms before the end of a 10 s and a 50 s window.
    expect(css).toMatch(/@keyframes time-cut-ones \{[^}]*\}\s*98% \{ opacity: 1; \}/);
    expect(css).toMatch(/@keyframes time-cut-tens \{[^}]*\}\s*99\.6% \{ opacity: 1; \}/);
  });

  it('animates only transform, opacity and filter', () => {
    const all = [css, renderModeTokensCss('ring'), renderModeTokensCss('timeline')].join('\n');
    const keyframes = all.match(/@keyframes[\s\S]*?\n {2}\}/g) ?? [];
    expect(keyframes.length).toBeGreaterThan(0);
    for (const block of keyframes) {
      const properties = [...block.matchAll(/([a-z-]+):/g)].map((match) => match[1]);
      for (const property of properties) expect(['transform', 'opacity', 'filter', 'animation-timing-function']).toContain(property);
    }
  });

  it('gives each mode its own sizes, as the revised frames draw them', () => {
    const ring = renderModeTokensCss('ring');
    expect(ring).toContain('--mode-gap: 20');
    // A 232 px ring (112 px to the middle of its 8 px track) in a 280 px box, the head's top-left at 136, 24.
    expect(ring).toContain('--ring-diameter: 232');
    expect(ring).toContain('--ring-inset: 24');
    expect(ring).toContain('--ring-head-left: 136');
    expect(ring).toContain('--ring-head-top: 24');
    expect(ring).toContain('--ring-tail-far-strength: 15%');
    const timeline = renderModeTokensCss('timeline');
    expect(timeline).toContain('--mode-gap: 30');
    expect(timeline).toContain('--timeline-inner-gap: 18');
    expect(timeline).toContain('--timeline-width: 480px');
    expect(timeline).toContain('--timeline-fade: 14%');
    // Modes move by transforms set once a minute, not by keyframes.
    expect(ring + timeline).not.toContain('@keyframes');
  });

  it('scales every interface duration by one multiplier, and registers them as times', () => {
    const css = renderTokensCss();
    expect(css).toContain('--motion-scale: 1;');
    expect(css).toContain('--replay-duration: calc(2400ms * var(--motion-scale));');
    expect(css).toContain('--motion-morph: calc(200ms * var(--motion-scale));');
    expect(css).toContain('@property --replay-duration {');
    expect(css).toContain('--ease-replay: cubic-bezier(0.25, 1, 0.5, 1);');
  });
});
