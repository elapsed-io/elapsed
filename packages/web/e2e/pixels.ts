import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

export interface PixelDiff {
  readonly total: number;
  readonly differing: number;
  /** Pixels that differ by more than 8 levels in some channel: past anti-aliasing noise. */
  readonly visible: number;
  readonly maxChannelDelta: number;
  /** Where the differing pixels are: [left, top, right, bottom], or null. */
  readonly box: readonly [number, number, number, number] | null;
  /** Up to 12 differing pixels as "x,y:delta", for reading a failure in a log. */
  readonly sample: readonly string[];
  /**
   * The largest channel difference once every pixel is averaged with its eight neighbours in both
   * images: what is left when glyph edges placed a fraction of a pixel apart are set aside.
   */
  readonly smoothedMaxDelta: number;
}

/**
 * Outside the reference environment, the most a smoothed channel may differ. Matching frames measured at
 * most 24 in Firefox and WebKit; a frame of the wrong moment differs by over 200 (decision 226).
 */
export const SMOOTHED_LIMIT = 32;

/**
 * The reference environment for exact pixel checks: Chromium inside Playwright's official image, which
 * CI and tooling/e2e-docker.sh both use (it sets PIXEL_REFERENCE). The frames were matched there.
 */
export const PIXEL_REFERENCE = process.env['PIXEL_REFERENCE'] === '1';

/**
 * Applies a frame test's own rule (exact, or its few pixels of edge noise) in the reference environment.
 * Anywhere else (Firefox and WebKit, whose glyphs land a fraction of a pixel from the frame's; Chromium
 * run directly on macOS or another Linux, which draws text differently) the images must agree once each
 * pixel is averaged with its neighbours, and the test notes where the exact check runs. A control test in
 * frames.spec.ts shows that a wrong frame still fails by far under that rule.
 */
export function expectLikeFrame(diff: PixelDiff, browserName: string, rule: (diff: PixelDiff) => void): void {
  if (browserName === 'chromium' && PIXEL_REFERENCE) {
    rule(diff);
    return;
  }
  const info = test.info();
  if (!info.annotations.some((annotation) => annotation.type === 'pixels')) {
    info.annotations.push({ type: 'pixels', description: 'compared after smoothing; the exact check runs in Chromium through tooling/e2e-docker.sh (and in CI)' });
  }
  expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(SMOOTHED_LIMIT);
}

const VISIBLE_DELTA = 8;

/** How many image pairs each test has kept, so a test that compares several keeps them all. */
const kept = new Map<string, number>();

/**
 * Keeps both images in the test's output folder, which CI uploads when a test fails, so a pixel
 * difference in any browser can be looked at, not only counted.
 */
async function keepScreenshots(site: Buffer, reference: Buffer): Promise<void> {
  const info = test.info();
  const index = (kept.get(info.testId) ?? 0) + 1;
  kept.set(info.testId, index);
  const sitePath = info.outputPath(`${String(index)}-site.png`);
  await mkdir(dirname(sitePath), { recursive: true });
  await writeFile(sitePath, site);
  await writeFile(info.outputPath(`${String(index)}-reference.png`), reference);
}

/** Compares two PNG screenshots pixel by pixel in a blank page, with no image library. */
export async function diffPngs(page: Page, a: Buffer, b: Buffer): Promise<PixelDiff> {
  await keepScreenshots(a, b);
  await page.goto('about:blank');
  return page.evaluate(
    async ([first, second, threshold]) => {
      const decode = async (base64: string): Promise<ImageData> => {
        // Decoded from bytes, not fetched from a data: URL, which WebKit refuses past a size.
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext('2d');
        if (context === null) throw new Error('no 2d context');
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height);
      };
      const [x, y] = await Promise.all([decode(first), decode(second)]);
      if (x.width !== y.width || x.height !== y.height) throw new Error('screenshot sizes differ');
      let differing = 0;
      let visible = 0;
      let maxChannelDelta = 0;
      let box: [number, number, number, number] | null = null;
      const sample: string[] = [];
      for (let i = 0; i < x.data.length; i += 4) {
        let pixelDelta = 0;
        for (let c = 0; c < 4; c += 1) pixelDelta = Math.max(pixelDelta, Math.abs((x.data[i + c] ?? 0) - (y.data[i + c] ?? 0)));
        if (pixelDelta > 0) {
          differing += 1;
          const px = (i / 4) % x.width;
          const py = Math.floor(i / 4 / x.width);
          box = box === null ? [px, py, px, py] : [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)];
          if (sample.length < 12) sample.push(`${String(px)},${String(py)}:${String(pixelDelta)}`);
        }
        if (pixelDelta > threshold) visible += 1;
        maxChannelDelta = Math.max(maxChannelDelta, pixelDelta);
      }
      // A 3 × 3 average of each image (edges clamped), done as two passes of three.
      const smooth = (image: ImageData): Float32Array => {
        const { width, height, data } = image;
        const across = new Float32Array(data.length);
        const out = new Float32Array(data.length);
        const at = (px: number, py: number): number => (Math.min(height - 1, Math.max(0, py)) * width + Math.min(width - 1, Math.max(0, px))) * 4;
        for (let py = 0; py < height; py += 1) {
          for (let px = 0; px < width; px += 1) {
            for (let c = 0; c < 4; c += 1) across[at(px, py) + c] = ((data[at(px - 1, py) + c] ?? 0) + (data[at(px, py) + c] ?? 0) + (data[at(px + 1, py) + c] ?? 0)) / 3;
          }
        }
        for (let py = 0; py < height; py += 1) {
          for (let px = 0; px < width; px += 1) {
            for (let c = 0; c < 4; c += 1) out[at(px, py) + c] = ((across[at(px, py - 1) + c] ?? 0) + (across[at(px, py) + c] ?? 0) + (across[at(px, py + 1) + c] ?? 0)) / 3;
          }
        }
        return out;
      };
      let smoothedMaxDelta = 0;
      if (differing > 0) {
        const [sx, sy] = [smooth(x), smooth(y)];
        for (let i = 0; i < sx.length; i += 1) smoothedMaxDelta = Math.max(smoothedMaxDelta, Math.abs((sx[i] ?? 0) - (sy[i] ?? 0)));
      }
      return { total: x.width * x.height, differing, visible, maxChannelDelta, box, sample, smoothedMaxDelta: Math.round(smoothedMaxDelta * 10) / 10 };
    },
    [a.toString('base64'), b.toString('base64'), VISIBLE_DELTA] as const,
  );
}
