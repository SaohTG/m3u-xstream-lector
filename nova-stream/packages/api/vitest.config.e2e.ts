import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e.spec.ts'],
    globals: true,
    alias: {
      '@novastream/shared': new URL('../shared/src', import.meta.url).pathname,
    },
    root: './',
    setupFiles: ['./test/e2e/setup.ts'],
    testTimeout: 30000,
  },
});
