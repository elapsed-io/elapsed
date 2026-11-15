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

  it('gives each mode its own sizes and motion', () => {
    expect(renderModeTokensCss('ring')).toContain('--ring-revolution: 3600000ms');
    expect(renderModeTokensCss('ring')).toContain('--mode-gap: 20');
    expect(renderModeTokensCss('timeline')).toContain('--mode-gap: 18');
    // 16 hours at 10 px a minute, starting with now at the centre.
    expect(renderModeTokensCss('timeline')).toContain('to { transform: translateX(-9280px); }');
  });
});
