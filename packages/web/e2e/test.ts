/**
 * The suite's `test`: Playwright's, with every page kept "touched" (a pointer move every second of page time), so
 * the focus view (shell/focus-view.ts) never hides the controls while a test runs the clock for minutes or hours
 * and then presses them, or compares a running screen with its frame. The focus view's own tests turn this off
 * with `test.use({ awake: false })`.
 */

import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export const test = base.extend<{ awake: boolean }>({
  awake: [true, { option: true }],
  context: async ({ context, awake }, use) => {
    if (awake)
      await context.addInitScript(() => {
        // Started once the document has loaded, after any test clock's own script has replaced the timers, so
        // the moves follow the test's time.
        document.addEventListener('DOMContentLoaded', () => {
          window.setInterval(() => {
            window.dispatchEvent(new PointerEvent('pointermove'));
          }, 1000);
        });
      });
    await use(context);
  },
});
