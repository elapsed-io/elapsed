import { defineConfig } from 'vitest/config';
import { skyArt } from './packages/web/build/sky.ts';

export default defineConfig({
  plugins: [
    // The interstellar skies, drawn as the site's build draws them (as data: URLs, as while developing).
    skyArt(),
    {
      // The site's tokens are generated stylesheets the Vite build serves (packages/web/build); a unit test that
      // loads a piece needs none of them, so each loads as an empty module here.
      name: 'empty-tokens',
      resolveId: (id) => (id.startsWith('virtual:tokens') ? `\0${id}` : null),
      load: (id) => (id.startsWith('\0virtual:tokens') ? '' : null),
    },
  ],
  test: {
    include: ['packages/*/{src,build,scripts}/**/*.test.ts', 'tooling/**/*.test.ts'],
    environment: 'node',
  },
});
