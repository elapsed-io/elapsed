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
}

const VISIBLE_DELTA = 8;

/** Compares two PNG screenshots pixel by pixel in a blank page, with no image library. */
export async function diffPngs(page: Page, a: Buffer, b: Buffer): Promise<PixelDiff> {
  await page.goto('about:blank');
  return page.evaluate(
    async ([first, second, threshold]) => {
      const decode = async (base64: string): Promise<ImageData> => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
        const bitmap = await createImageBitmap(blob);
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
      return { total: x.width * x.height, differing, visible, maxChannelDelta, box, sample };
    },
    [a.toString('base64'), b.toString('base64'), VISIBLE_DELTA] as const,
  );
}
