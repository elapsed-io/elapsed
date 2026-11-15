/**
 * Icons used by the interface: Tabler Icons outline set (MIT, see
 * LICENSE-tabler-icons.txt), drawn as in the design canvas. Each icon is data
 * (SVG element names and attributes), so the build can write it into HTML and
 * later rounds can create it with createElementNS without parsing markup.
 *
 * Geometry matches tabler/tabler-icons v3.51.0 icons/outline/settings.svg and
 * icons/outline/user.svg; the canvas draws the inner circles with <circle>
 * and closes the gear outline, as earlier Tabler releases did.
 */

export interface IconElement {
  readonly tag: 'path' | 'circle';
  readonly attributes: Readonly<Record<string, string>>;
}

export type IconName = 'settings' | 'account' | 'maximum' | 'retry' | 'share' | 'check';

export const ICONS: Readonly<Record<IconName, readonly IconElement[]>> = {
  settings: [
    {
      tag: 'path',
      attributes: {
        d: 'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z',
      },
    },
    { tag: 'circle', attributes: { cx: '12', cy: '12', r: '3' } },
  ],
  account: [
    { tag: 'circle', attributes: { cx: '12', cy: '7', r: '4' } },
    { tag: 'path', attributes: { d: 'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2' } },
  ],
  /** Results: Tabler "refresh", "upload" and "check", as drawn in the results frames. */
  retry: [
    { tag: 'path', attributes: { d: 'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4' } },
    { tag: 'path', attributes: { d: 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4' } },
  ],
  share: [
    { tag: 'path', attributes: { d: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2' } },
    { tag: 'path', attributes: { d: 'M7 9l5 -5l5 5' } },
    { tag: 'path', attributes: { d: 'M12 4l0 12' } },
  ],
  check: [{ tag: 'path', attributes: { d: 'M5 12l5 5l10 -10' } }],
  /** The session maximum notice: a clock face with a button on top, as drawn in the canvas's session maximum frame (not a Tabler icon). */
  maximum: [
    { tag: 'circle', attributes: { cx: '12', cy: '13', r: '8' } },
    { tag: 'path', attributes: { d: 'M12 9v4l2 2' } },
    { tag: 'path', attributes: { d: 'M10 2h4' } },
  ],
};

/** Attributes shared by every outline icon; size and stroke width come from CSS. */
export const ICON_SVG_ATTRIBUTES: Readonly<Record<string, string>> = {
  class: 'icon',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};
