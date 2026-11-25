/**
 * What the map pieces share (circles.ts, shape.ts, path.ts, landmarks.ts; docs/recipes/mode-recipes.md): the scale
 * on the camera's map at a value, the frames' rounding, and placing a group on the anchor. Each map piece is its own
 * download (recipe/library.ts); this is the small part they have in common.
 */

import './map.css';
import { headingDirection } from '@stopwatch/core';
import type { CameraLayout, CameraStage } from '../../recipe/camera.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Piece } from '../../recipe/piece.ts';

export const NOTHING: Piece = { render() {} };

/** Pixels per unit of the measure on the map at `value`. */
export function mapScale(layout: CameraLayout, value: number): number {
  return layout.usable / Math.max(value, layout.minValue);
}

/** The heading's direction, to the frames' four decimals. */
export function headingOf(layout: CameraLayout): readonly [number, number] {
  return headingDirection(layout.heading);
}

export const number = (value: number): string => String(Math.round(value * 10_000) / 10_000);
/** The frames place everything to a tenth of a pixel; so does the map, so a still map is the frame's. */
export const tenth = (value: number): number => Math.round(value * 10) / 10;
export const translate = (x: number, y: number): string => `translate(${number(tenth(x))}px, ${number(tenth(y))}px)`;

/** Where a value falls on the map: the anchor plus `at` × the scale along the heading. */
export function pointAt(layout: CameraLayout, at: number, value: number): readonly [number, number] {
  const scale = mapScale(layout, value);
  const [cos, sin] = headingOf(layout);
  return [layout.sun[0] + at * scale * cos, layout.sun[1] + at * scale * sin];
}

/** A colour and its opacity from a recipe colour, #rrggbbaa included (an SVG fill takes no alpha in every browser). */
export function paint(colour: string | undefined, fallback: string): { readonly colour: string; readonly opacity: number } {
  if (colour !== undefined && /^#[0-9A-Fa-f]{8}$/.test(colour)) return { colour: colour.slice(0, 7), opacity: Math.round((parseInt(colour.slice(7), 16) / 255) * 100) / 100 };
  return { colour: colourCss(colour, fallback), opacity: 1 };
}

/** Keeps a group on the anchor (the Sun), turned to the heading if asked, as the map's size changes. */
export function anchored(stage: CameraStage, group: SVGGElement, turned: boolean): void {
  const place = (): void => {
    const { sun, heading } = stage.layout;
    group.setAttribute('transform', `translate(${number(sun[0])} ${number(sun[1])})${turned ? ` rotate(${number(heading)})` : ''}`);
  };
  place();
  stage.onLayout(place);
}
