import { mixColour, TREE_CONFIG } from '@stopwatch/core';
import type { TreeLayer } from '@stopwatch/core';
import { colourCss } from '../../recipe/colour.ts';

const TREE = TREE_CONFIG;

/**
 * The tree's colours from its layer, as its stylesheet reads them: the five leaf colours in the year's order
 * (spring's two, summer's, autumn's two), each with its shades as the frames mix them, and the trunk.
 */
export function treeColours(layer: TreeLayer): Record<string, string> {
  const [s0 = TREE.leaves[0], s1 = s0] = layer.leaves?.spring ?? [];
  const [m0 = TREE.leaves[2]] = layer.leaves?.summer ?? [];
  const [a0 = TREE.leaves[3], a1 = a0] = layer.leaves?.autumn ?? [];
  const { side, iso } = TREE.shade;
  const colours: Record<string, string> = { '--tree-trunk': colourCss(layer.trunk, TREE.colours.trunk) };
  [s0, s1, m0, a0, a1].forEach((colour, stage) => {
    const k = String(stage);
    colours[`--tree-leaf-${k}`] = colour;
    colours[`--tree-leaf-${k}-dark`] = mixColour(colour, '#000000', side.dark);
    colours[`--tree-leaf-${k}-light`] = mixColour(colour, '#FFFFFF', side.light);
    colours[`--tree-leaf-${k}-top`] = mixColour(colour, '#FFFFFF', iso.top);
    colours[`--tree-leaf-${k}-right`] = mixColour(colour, '#000000', iso.right);
  });
  return colours;
}
