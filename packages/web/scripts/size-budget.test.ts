import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compressedSize, coreFiles, packageSize, verdict } from './size-budget.ts';

describe('verdict', () => {
  it('passes at or under the budget', () => {
    expect(verdict(100, 100, 2)).toBe('ok');
  });
  it('warns above the budget', () => {
    expect(verdict(101, 100, 2)).toBe('warn');
    expect(verdict(200, 100, 2)).toBe('warn');
  });
  it('fails only above twice the budget', () => {
    expect(verdict(201, 100, 2)).toBe('fail');
  });
});

describe('compressedSize', () => {
  it('gzips text and counts binary files as they are', () => {
    const text = Buffer.from('a'.repeat(10_000));
    expect(compressedSize('x.js', text)).toBeLessThan(200);
    expect(compressedSize('x.woff2', text)).toBe(10_000);
  });
});

describe('coreFiles', () => {
  it('follows the page, its scripts, their static imports and the CSS, but not lazy chunks', () => {
    const dist = mkdtempSync(join(tmpdir(), 'size-'));
    mkdirSync(join(dist, '.vite'));
    mkdirSync(join(dist, 'assets'));
    writeFileSync(
      join(dist, 'index.html'),
      '<link rel="icon" href="data:,"><link rel="stylesheet" href="/assets/a.css"><script type="module" src="/assets/main.js"></script>',
    );
    writeFileSync(join(dist, 'assets', 'a.css'), '@font-face{src:url(/assets/f.woff2)}');
    writeFileSync(join(dist, 'assets', 'f.woff2'), Buffer.alloc(1000));
    writeFileSync(join(dist, 'assets', 'main.js'), 'import "./shared.js"');
    writeFileSync(join(dist, 'assets', 'shared.js'), 'export {}');
    writeFileSync(join(dist, 'assets', 'lazy.js'), 'export {}');
    writeFileSync(
      join(dist, '.vite', 'manifest.json'),
      JSON.stringify({
        'index.html': { file: 'assets/main.js', imports: ['_shared.js'], dynamicImports: ['src/lazy.ts'] },
        '_shared.js': { file: 'assets/shared.js' },
        'src/lazy.ts': { file: 'assets/lazy.js' },
      }),
    );
    const paths = coreFiles(dist).map((f) => f.path);
    expect(paths).toEqual(['assets/a.css', 'assets/f.woff2', 'assets/main.js', 'assets/shared.js', 'index.html']);
  });
});

describe('packageSize', () => {
  it('counts a lazy package and what it adds beyond the core', () => {
    const dist = mkdtempSync(join(tmpdir(), 'size-'));
    mkdirSync(join(dist, '.vite'));
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'index.html'), '<script type="module" src="/assets/main.js"></script>');
    writeFileSync(join(dist, 'assets', 'main.js'), 'export {}');
    writeFileSync(join(dist, 'assets', 'ring.js'), 'x'.repeat(2000));
    writeFileSync(join(dist, 'assets', 'ring.css'), '.ring{}');
    writeFileSync(join(dist, 'assets', 'fish.svg'), '<svg/>');
    writeFileSync(
      join(dist, '.vite', 'manifest.json'),
      JSON.stringify({
        'index.html': { file: 'assets/main.js', src: 'index.html', dynamicImports: ['src/modes/ring/ring.ts'] },
        'src/modes/ring/ring.ts': { file: 'assets/ring.js', src: 'src/modes/ring/ring.ts', imports: ['index.html'], css: ['assets/ring.css'], assets: ['assets/fish.svg'] },
      }),
    );
    const size = packageSize(dist, 'src/modes/ring/ring.ts');
    expect(size.files).toEqual(['assets/fish.svg', 'assets/ring.css', 'assets/ring.js']);
    expect(size.artBytes).toBeGreaterThan(0);
    expect(size.codeBytes).toBeGreaterThan(0);
    expect(() => packageSize(dist, 'src/modes/ocean/ocean.ts')).toThrow();
  });
});
