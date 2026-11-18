/**
 * A recipe binding as CSS (results replays): its stops, linear or smoothstepped between neighbours, as a calc() of
 * a value CSS already has (the replay's depth, height or focused minutes, all derived from the one replay progress
 * value). Stops are numbers the schema checked, so the expression holds nothing a recipe wrote but numbers.
 */

import type { Binding } from '@stopwatch/core';

const number = (value: number): string => String(Math.round(value * 1e9) / 1e9);

export function bindingCss(binding: Binding, input: string): string {
  if (typeof binding === 'number') return number(binding);
  const [first, ...rest] = binding.stops;
  if (first === undefined) return '0';
  const terms = rest.map(([x1, y1], i) => {
    const [x0, y0] = binding.stops[i] ?? first;
    const t = `clamp(0, (${input} - ${number(x0)}) / ${number(x1 - x0)}, 1)`;
    return binding.ease === 'smooth' ? `${number(y1 - y0)} * ${t} * ${t} * (3 - 2 * ${t})` : `${number(y1 - y0)} * ${t}`;
  });
  return `calc(${[number(first[1]), ...terms].join(' + ')})`;
}
