import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/{src,build,scripts}/**/*.test.ts', 'tooling/**/*.test.ts'],
    environment: 'node',
  },
});
