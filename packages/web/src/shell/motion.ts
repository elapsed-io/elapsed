/**
 * Interface motion helpers. Durations and easing are read from CSS custom
 * properties, so custom CSS and the animation speed setting (Release 2, which
 * changes --motion-scale) retune script-started motion too. Only transform
 * and opacity move.
 */

export interface Motion {
  readonly reduced: boolean;
  readonly duration: number;
  readonly easing: string;
}

export function readMotion(doc: Document): Motion {
  const view = doc.defaultView;
  const style = view === null ? null : view.getComputedStyle(doc.documentElement);
  const raw = style?.getPropertyValue('--motion-morph').trim() ?? '';
  const parsed = raw.endsWith('ms') ? Number.parseFloat(raw) : raw.endsWith('s') ? Number.parseFloat(raw) * 1000 : Number.NaN;
  return {
    reduced: view?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false,
    duration: Number.isFinite(parsed) && parsed >= 0 ? parsed : 200,
    easing: style?.getPropertyValue('--ease-standard').trim() || 'ease-out',
  };
}

/**
 * Slides elements from where they were to where a layout change put them
 * (first, last, invert, play). Skipped with reduced motion.
 */
export function slideFrom(elements: readonly HTMLElement[], before: readonly DOMRect[], motion: Motion): void {
  if (motion.reduced || motion.duration === 0) return;
  elements.forEach((element, index) => {
    const from = before[index];
    // An element that was not laid out before (hidden) has nowhere to slide from; it only fades in.
    if (from === undefined || element.hidden || (from.width === 0 && from.height === 0)) return;
    const dx = from.left - element.getBoundingClientRect().left;
    if (Math.abs(dx) < 0.5) return;
    element.animate([{ transform: `translateX(${String(dx)}px)` }, { transform: 'translateX(0)' }], {
      duration: motion.duration,
      easing: motion.easing,
    });
  });
}

export function fade(element: HTMLElement, from: number, to: number, motion: Motion): Animation | null {
  if (motion.duration === 0) return null;
  return element.animate([{ opacity: from }, { opacity: to }], { duration: motion.duration, easing: motion.easing });
}

export function cancelAnimations(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.cancel();
}

/**
 * The multiplier for every interface animation's duration (--motion-scale): 1,
 * the "normal" timing, in Release 1. The CSS duration tokens are already
 * scaled by it; motion started from script with the config's durations
 * multiplies by it.
 */
export function motionScale(doc: Document): number {
  const value = Number.parseFloat(doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue('--motion-scale') ?? '');
  return Number.isFinite(value) && value > 0 ? value : 1;
}
