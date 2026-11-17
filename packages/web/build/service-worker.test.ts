import type { Rollup } from 'vite';
import { describe, expect, it } from 'vitest';
import { modeFiles } from './service-worker.ts';

function chunk(fileName: string, options: { entry?: boolean; facade?: string; imports?: string[]; dynamicImports?: string[]; css?: string[]; assets?: string[] } = {}): Rollup.OutputChunk {
  return {
    type: 'chunk',
    fileName,
    isEntry: options.entry ?? false,
    facadeModuleId: options.facade ?? null,
    imports: options.imports ?? [],
    dynamicImports: options.dynamicImports ?? [],
    viteMetadata: { importedCss: new Set(options.css ?? []), importedAssets: new Set(options.assets ?? []) },
  } as unknown as Rollup.OutputChunk;
}

function bundle(...chunks: Rollup.OutputChunk[]): Rollup.OutputBundle {
  const result: Record<string, Rollup.OutputChunk | Rollup.OutputAsset> = {};
  for (const item of chunks) result[item.fileName] = item;
  for (const asset of ['assets/ring.css', 'assets/timeline.css', 'assets/font.woff2', 'assets/art.svg']) result[asset] = { type: 'asset', fileName: asset } as Rollup.OutputAsset;
  return result;
}

describe('downloaded modes in the build', () => {
  it('give each mode its own files, leaving whatever the rest of the site loads to the version cache', () => {
    const files = modeFiles(
      bundle(
        chunk('assets/index.js', { entry: true, imports: ['assets/dom.js'], dynamicImports: ['assets/ring.js', 'assets/timeline.js', 'assets/results.js'] }),
        chunk('sw.js', { entry: true }),
        chunk('assets/dom.js', { assets: ['assets/font.woff2'] }),
        chunk('assets/results.js', { dynamicImports: ['assets/strip.js'] }),
        chunk('assets/strip.js'),
        chunk('assets/ring.js', { facade: '/src/ring.ts', imports: ['assets/dom.js', 'assets/ring-art.js'], css: ['assets/ring.css'] }),
        chunk('assets/ring-art.js', { assets: ['assets/art.svg'] }),
        chunk('assets/timeline.js', { facade: '/src/timeline.ts', imports: ['assets/dom.js'], dynamicImports: ['assets/strip.js'], css: ['assets/timeline.css'] }),
      ),
      { ring: ['/src/ring.ts'], timeline: ['/src/timeline.ts'] },
    );
    expect(files).toEqual({
      ring: ['/assets/art.svg', '/assets/ring-art.js', '/assets/ring.css', '/assets/ring.js'],
      timeline: ['/assets/timeline.css', '/assets/timeline.js'],
    });
  });

  it('send the pieces a mode’s recipe fetches with the mode, each with every mode that draws it, but none the core holds', () => {
    const files = modeFiles(
      bundle(
        chunk('assets/index.js', { entry: true, imports: ['assets/dom.js'], dynamicImports: ['assets/ocean.js', 'assets/space.js', 'assets/particles.js', 'assets/strip.js'] }),
        chunk('assets/dom.js'),
        chunk('assets/ocean.js', { facade: '/src/ocean.ts' }),
        chunk('assets/space.js', { facade: '/src/space.ts' }),
        chunk('assets/particles.js', { facade: '/src/particles.ts', imports: ['assets/dom.js'], css: ['assets/ring.css'] }),
        chunk('assets/strip.js', { facade: '/src/strip.ts' }),
      ),
      { ocean: ['/src/ocean.ts', '/src/particles.ts', '/src/ring-piece.ts'], interstellar: ['/src/space.ts', '/src/particles.ts', '/src/strip.ts'] },
      new Set(['/src/ring-piece.ts', '/src/strip.ts']),
    );
    expect(files).toEqual({
      ocean: ['/assets/ocean.js', '/assets/particles.js', '/assets/ring.css'],
      interstellar: ['/assets/particles.js', '/assets/ring.css', '/assets/space.js'],
    });
  });

  it('refuses a build without a mode the manifests name', () => {
    expect(() => modeFiles(bundle(chunk('assets/index.js', { entry: true })), { ring: ['/src/ring.ts'] })).toThrow(/ring/);
  });
});
