import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { corePaths } from './helpers.ts';
import { diffPngs, expectLikeFrame } from './pixels.ts';

const FIXTURE = readFileSync(fileURLToPath(new URL('fixtures/idle-frame.html', import.meta.url)));
const FONT = readFileSync(fileURLToPath(new URL('../src/assets/fonts/timer-sans.woff2', import.meta.url)));

/** Records CSP violations from the first moment the document exists. */
async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, '__violations', { value: seen });
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations.slice());
}

async function openIdle(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
}

test('serves the security headers on the page', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toBe(
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types service-worker",
  );
  expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains; preload');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
});

test('loads under the CSP with no violations, errors or third-party requests', async ({ page, baseURL, browserName }) => {
  const violations = await watchViolations(page);
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('console', (message) => {
    // Playwright's own notice that it blocks service workers in this test (playwright.config.ts).
    if (message.text() === 'Service Worker registration blocked by Playwright') return;
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const fontRequests: Promise<number>[] = [];
  page.on('request', (request) => {
    requests.push(request.url());
    if (request.url().endsWith('.woff2')) fontRequests.push(request.response().then(async () => (await request.sizes()).responseBodySize));
  });

  const controlRead = page.waitForRequest('**/sw-control.json');
  await openIdle(page);
  await controlRead;

  expect(await violations()).toEqual([]);
  expect(errors).toEqual([]);
  const origin = new URL(baseURL ?? '').origin;
  expect(requests.filter((url) => !url.startsWith('data:') && new URL(url).origin !== origin)).toEqual([]);
  // The page, its script, its stylesheet and the preloaded font; the visit count and the offline kill
  // switch. The browser fetches icons and the manifest for its own use when it chooses (Firefox takes the
  // touch icon, WebKit the manifest), so they may or may not appear. No display mode chunk loads for digits.
  const paths = [
    ...new Set(
      requests
        .filter((url) => !url.startsWith('data:'))
        .map((url) => new URL(url).pathname)
        .filter((path) => !path.startsWith('/icons/') && path !== '/manifest.webmanifest'),
    ),
  ].sort();
  expect(paths).toEqual([...corePaths(), '/api/count', '/sw-control.json'].sort());
  // The preloaded font is fetched once. WebKit reports two requests for it (the preload, then the face
  // taking it), each with the whole body; whether Safari's second is answered from memory is checked by
  // hand in Web Inspector (docs/device-checks.md).
  const fontBodies = await Promise.all(fontRequests);
  expect(fontBodies).toEqual(browserName === 'webkit' && fontBodies.length === 2 ? [FONT.byteLength, FONT.byteLength] : [FONT.byteLength]);
  // The core is the page, its scripts, one stylesheet and the default font: no display mode, panel or other font.
  expect(corePaths().filter((path) => /\.woff2$/.test(path)).map((path) => path.replace(/-[\w-]{8}\.woff2$/, ''))).toEqual(['/assets/timer-sans']);
  expect(corePaths().some((path) => /\/(ring|timeline|panel|results)-/.test(path))).toBe(false);
});

test('the browser enforces Trusted Types and blocks inline styles', async ({ page }) => {
  const violations = await watchViolations(page);
  await openIdle(page);

  const outcome = await page.evaluate(() => {
    let sink = 'allowed';
    const probe = document.createElement('div');
    document.body.append(probe);
    try {
      // eslint-disable-next-line no-restricted-syntax -- deliberately probes that the browser blocks this sink
      probe.innerHTML = '<b>x</b>';
    } catch (error) {
      sink = (error as Error).name;
    }
    const style = document.createElement('style');
    style.textContent = 'body { background: rgb(255, 0, 0) !important; }';
    document.head.append(style);
    return { sink, background: getComputedStyle(document.body).backgroundColor };
  });

  expect(outcome.sink).toBe('TypeError');
  expect(outcome.background).toBe('rgb(14, 15, 17)');
  const reported = await violations();
  expect(reported.some((v) => v.startsWith('require-trusted-types-for'))).toBe(true);
  expect(reported.some((v) => v.startsWith('style-src'))).toBe(true);
});

test('uses the self-hosted trimmed font for the time and the buttons', async ({ page }) => {
  await openIdle(page);
  const fonts = await page.evaluate(() =>
    [...document.fonts].map((face) => ({ family: face.family, status: face.status, weight: face.weight, stretch: face.stretch })),
  );
  expect(fonts).toEqual([{ family: 'Timer Sans', status: 'loaded', weight: '300 500', stretch: '92%' }]);
  // Chromium quotes the family name; Firefox and WebKit do not.
  const family = await page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontFamily.replaceAll('"', ''));
  expect(family).toBe('Timer Sans, system-ui, sans-serif');
  await expect(page.locator('.time--main')).toHaveCSS('font-weight', '300');
  await expect(page.locator('.button--primary')).toHaveCSS('font-weight', '500');
  await expect(page.locator('.button--primary')).toHaveCSS('font-stretch', '92%');
});

/** Screenshots are taken at the device's pixel ratio (2 in the Desktop Safari profile). */
const pixelsAt = (width: number, height: number): number => width * height * (test.info().project.use.deviceScaleFactor ?? 1) ** 2;

test('matches the idle frame pixel for pixel at 720 × 450', async ({ page, browser, browserName }) => {
  await page.setViewportSize({ width: 720, height: 450 });
  await openIdle(page);
  const site = await page.screenshot();

  const reference = await browser.newPage({ viewport: { width: 720, height: 450 } });
  await reference.route('http://frame.test/**', (route) => {
    const isFont = route.request().url().endsWith('/font.woff2');
    return route.fulfill({
      body: isFont ? FONT : FIXTURE,
      contentType: isFont ? 'font/woff2' : 'text/html',
    });
  });
  await reference.goto('http://frame.test/');
  await reference.evaluate(() => document.fonts.ready);
  const frame = await reference.screenshot();

  const diff = await diffPngs(reference, site, frame);
  await reference.close();
  expect(diff.total).toBe(pixelsAt(720, 450));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0, visible: 0, maxChannelDelta: 0 });
  });
});

test('paints the same idle frame before the script runs', async ({ browser, browserName }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 720, height: 450 } });
  const page = await context.newPage();
  // No script can be evaluated in this page (Firefox waits for one forever), so wait for the font to arrive.
  const font = page.waitForResponse((response) => response.url().endsWith('.woff2'));
  await page.goto('/');
  await (await font).finished();
  await page.waitForTimeout(300);
  const site = await page.screenshot();
  const reference = await browser.newPage({ viewport: { width: 720, height: 450 } });
  await reference.route('http://frame.test/**', (route) => {
    const isFont = route.request().url().endsWith('/font.woff2');
    return route.fulfill({ body: isFont ? FONT : FIXTURE, contentType: isFont ? 'font/woff2' : 'text/html' });
  });
  await reference.goto('http://frame.test/');
  await reference.evaluate(() => document.fonts.ready);
  const frame = await reference.screenshot();
  const diff = await diffPngs(reference, site, frame);
  await reference.close();
  await context.close();
  expect(diff.total).toBe(pixelsAt(720, 450));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0, visible: 0, maxChannelDelta: 0 });
  });
});

test.describe('window scaling', () => {
  const cases = [
    // [width, height, time px, gap px]
    { width: 720, height: 450, time: 104, gap: 26 },
    { width: 1440, height: 900, time: 208, gap: 52 },
    { width: 1920, height: 1080, time: 249.6, gap: 62.4 },
    // Narrower than the frame: the time shrinks, the gap stays at the frame's 26 px.
    { width: 390, height: 844, time: 56.333, gap: 26 },
  ];

  for (const { width, height, time, gap } of cases) {
    test(`at ${String(width)} × ${String(height)} only the time and its gap scale`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openIdle(page);
      const measured = await page.evaluate(() => {
        const box = (selector: string): DOMRect => {
          const element = document.querySelector(selector);
          if (element === null) throw new Error(`missing ${selector}`);
          return element.getBoundingClientRect();
        };
        const timeBox = box('.time--main');
        const controls = box('.controls');
        const start = box('.button--primary');
        const icon = box('.icon-button');
        const corner = box('.corner');
        return {
          time: Number.parseFloat(getComputedStyle(document.querySelector('.time--main') ?? document.body).fontSize),
          gap: controls.top - timeBox.bottom,
          buttonHeight: start.height,
          buttonFont: getComputedStyle(document.querySelector('.button--primary') ?? document.body).fontSize,
          iconBox: icon.width,
          insetTop: corner.top,
          insetRight: window.innerWidth - corner.right,
          // For reading a failure: what this browser takes the window's width to be.
          widths: [window.innerWidth, document.documentElement.clientWidth, box('.screen').width, window.visualViewport?.width ?? 0],
        };
      });
      expect(measured.time, JSON.stringify(measured)).toBeCloseTo(time, 2);
      expect(measured.gap).toBeCloseTo(gap, 1);
      expect(measured.buttonHeight).toBe(24);
      expect(measured.buttonFont).toBe('12px');
      expect(measured.iconBox).toBe(28);
      expect(measured.insetTop).toBe(14);
      expect(measured.insetRight).toBe(14);
    });
  }
});

test('every button keeps a tap area of at least 44 px', async ({ page }) => {
  await openIdle(page);
  const area = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.button--primary') ?? document.body, '::before');
    return { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) };
  });
  expect(area.width).toBeGreaterThanOrEqual(44);
  expect(area.height).toBeGreaterThanOrEqual(44);
});
