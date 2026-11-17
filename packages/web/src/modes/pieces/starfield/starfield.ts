/**
 * The starfield piece (docs/recipes/mode-recipes.md): a star catalog slot drawn over the environment, its opacity
 * the layer's binding (height's stars fade in from 18 to 42 km). The catalog may be a ready-drawn field (height's
 * own, from its frames) or, from round 2.9, star positions to project. While a session runs, the opacity glides
 * over each minute in step with the environment, through a linear CSS animation set once a minute; standing still
 * it is set in place; with low power it steps once a minute.
 */

import './starfield.css';
import { bindingAt, measureAt } from '@stopwatch/core';
import type { StarfieldLayer } from '@stopwatch/core';
import { ART } from '../../../art/registry.ts';
import { html } from '../../../dom.ts';
import type { Activity, Piece, PieceSetup } from '../../recipe/piece.ts';

const MINUTE_MS = 60_000;
const DRIFT_MS = 250;

/** The field as an element: the slot's art, covering the screen. */
export function drawField(doc: Document, key: string, className: string): SVGSVGElement {
  const art = ART.draw(doc, key, `art ${className}`);
  art.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  return art;
}

export function starfieldPiece({ doc, layer, recipe, context, slots }: PieceSetup<StarfieldLayer>): Piece {
  const element = html(doc, 'div', { class: 'starfield' });
  const opacity = (value: number): number => bindingAt(layer.opacity ?? 1, { measure: value });
  let glide: Animation | null = null;
  let glidingMinute: number | null = null;
  let gone = false;

  void slots.images([layer.slot]).then(() => {
    if (!gone) element.replaceChildren(drawField(doc, slots.key(layer.slot), 'starfield__art'));
  });

  const place = (focusedMs: number, state: Activity): void => {
    const stepped = context.lowPower;
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    if (state !== 'running' || stepped) {
      glide?.cancel();
      glide = null;
      glidingMinute = null;
      element.style.setProperty('opacity', String(opacity(measureAt(recipe.measure, stepped || state === 'idle' ? minute * MINUTE_MS : focusedMs))));
      return;
    }
    const from = measureAt(recipe.measure, minute * MINUTE_MS);
    const to = measureAt(recipe.measure, (minute + 1) * MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glide === null || glidingMinute !== minute;
    if (fresh) {
      glide?.cancel();
      glide = null;
      glidingMinute = minute;
      if (to <= from) {
        element.style.setProperty('opacity', String(opacity(from)));
        return;
      }
      glide = element.animate([{ opacity: opacity(from) }, { opacity: opacity(to) }], { duration: MINUTE_MS, easing: 'linear', fill: 'forwards' });
    }
    if (glide === null) return;
    if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
    if (glide.playState !== 'running') glide.play();
  };

  return {
    backdrop: [element],
    render({ view, activity }) {
      place(view.focusedMs, activity);
    },
    unmount() {
      gone = true;
      glide?.cancel();
      glide = null;
    },
  };
}
