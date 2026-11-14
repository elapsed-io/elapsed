import type { Page } from '@playwright/test';

export interface PixelDiff {
  readonly total: number;
  readonly differing: number;
  readonly maxChannelDelta: number;
}

/** Compares two PNG screenshots pixel by pixel in a blank page, with no image library. */
export async function diffPngs(page: Page, a: Buffer, b: Buffer): Promise<PixelDiff> {
  await page.goto('about:blank');
  return page.evaluate(
    async ([first, second]) => {
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
      let maxChannelDelta = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        let pixelDelta = 0;
        for (let c = 0; c < 4; c += 1) pixelDelta = Math.max(pixelDelta, Math.abs((x.data[i + c] ?? 0) - (y.data[i + c] ?? 0)));
        if (pixelDelta > 0) differing += 1;
        maxChannelDelta = Math.max(maxChannelDelta, pixelDelta);
      }
      return { total: x.width * x.height, differing, maxChannelDelta };
    },
    [a.toString('base64'), b.toString('base64')] as const,
  );
}
