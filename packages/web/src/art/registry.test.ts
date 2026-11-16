import { describe, expect, it } from 'vitest';
import { MODE_MANIFESTS } from '../modes/manifests.ts';
import { ArtRegistry, artProblems, isArtKey, placeholderArt } from './registry.ts';
import type { ArtCatalog, ArtEntry } from './registry.ts';

const FISH: ArtEntry = {
  key: 'sunlight/sardine',
  viewBox: [0, 0, 40, 16],
  shapes: [
    {
      tag: 'g',
      attrs: { transform: 'rotate(-4 20 8)' },
      children: [
        { tag: 'ellipse', attrs: { cx: 18, cy: 8, rx: 14, ry: 5 }, tone: 'body' },
        { tag: 'path', attrs: { d: 'M30 8 L39 3 L39 13 Z' }, tone: 'fin' },
      ],
    },
  ],
};

const catalog = (...entries: ArtEntry[]): ArtCatalog => ({ mode: 'ocean', entries });

describe('the asset registry', () => {
  it('draws a placeholder for every key until its art is registered, then the art', () => {
    const registry = new ArtRegistry();
    expect(registry.has(FISH.key)).toBe(false);
    expect(registry.resolve(FISH.key)).toEqual(placeholderArt(FISH.key));
    registry.register(catalog(FISH));
    expect(registry.has(FISH.key)).toBe(true);
    expect(registry.resolve(FISH.key)).toBe(FISH);
    expect(registry.resolve('sunlight/tuna')).toEqual(placeholderArt('sunlight/tuna'));
  });

  it('takes art keys as lowercase "zone/name" paths only', () => {
    for (const key of ['fish', 'sunlight/sardine-school', 'tree/leaf-cluster-2']) expect(isArtKey(key), key).toBe(true);
    for (const key of ['', 'Fish', 'fish/', '/fish', 'fish//tail', '../fish', 'fish.svg', 'a b', 'fish_tail']) expect(isArtKey(key), key).toBe(false);
    expect(() => new ArtRegistry().resolve('../secrets')).toThrow(RangeError);
  });

  it('accepts plain geometry with tones, never colour, style, links or script', () => {
    expect(artProblems(FISH)).toEqual([]);
    const bad: [string, ArtEntry][] = [
      ['a script element', { ...FISH, shapes: [{ tag: 'script' as never }] }],
      ['an image', { ...FISH, shapes: [{ tag: 'image' as never, attrs: { href: 'https://example.com/x.png' } }] }],
      ['a fill colour', { ...FISH, shapes: [{ tag: 'rect', attrs: { width: 4, height: 4, fill: '#ff0000' } }] }],
      ['a style', { ...FISH, shapes: [{ tag: 'rect', attrs: { style: 'fill:red' } }] }],
      ['an event handler', { ...FISH, shapes: [{ tag: 'rect', attrs: { onload: 'alert(1)' } }] }],
      ['a link in a value', { ...FISH, shapes: [{ tag: 'path', attrs: { d: 'url(#x)' } }] }],
      ['a script URL', { ...FISH, shapes: [{ tag: 'path', attrs: { transform: ['java', 'script:alert(1)'].join('') } }] }],
      ['markup in a value', { ...FISH, shapes: [{ tag: 'path', attrs: { d: '"><script>' } }] }],
      ['a custom property', { ...FISH, shapes: [{ tag: 'rect', attrs: { width: 'var(--x)' } }] }],
      ['an odd tone', { ...FISH, shapes: [{ tag: 'rect', attrs: { width: 4 }, tone: 'Body; fill: red' }] }],
      ['children outside a group', { ...FISH, shapes: [{ tag: 'rect', children: [{ tag: 'rect' }] }] }],
      ['no box', { ...FISH, viewBox: [0, 0, 0, 10] }],
      ['nothing', { ...FISH, shapes: [] }],
      ['a bad key', { ...FISH, key: 'Sunlight/Sardine' }],
      ['an endless number', { ...FISH, shapes: [{ tag: 'circle', attrs: { r: Number.POSITIVE_INFINITY } }] }],
    ];
    for (const [what, entry] of bad) expect(artProblems(entry), what).not.toEqual([]);
  });

  it('refuses a whole catalog with one bad entry, or a key twice', () => {
    const registry = new ArtRegistry();
    expect(() => {
      registry.register(catalog(FISH, { ...FISH, key: 'sunlight/eel', shapes: [{ tag: 'rect', attrs: { fill: 'red' } }] }));
    }).toThrow(/refused/);
    expect(registry.has(FISH.key)).toBe(false);
    expect(() => {
      registry.register(catalog(FISH, FISH));
    }).toThrow(/twice/);
  });

  it('is what every mode declares its art through', () => {
    for (const manifest of MODE_MANIFESTS) {
      expect(new Set(manifest.art).size, manifest.id).toBe(manifest.art.length);
      for (const key of manifest.art) expect(isArtKey(key), `${manifest.id}: ${key}`).toBe(true);
    }
  });
});
