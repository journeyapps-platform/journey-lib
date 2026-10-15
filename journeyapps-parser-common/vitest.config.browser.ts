import { defineConfig } from 'vitest/config';

export default defineConfig({
  optimizeDeps: {
    include: ['@ja-platform/core-xml']
  },
  build: {
    commonjsOptions: {
      include: [/@journeyapps\/core-xml/]
    }
  },
  test: {
    alias: {
      stream: 'stream-browserify'
    },
    globals: true,
    include: ['./tests/**/*.test.ts'],
    reporters: 'verbose',
    browser: {
      name: 'chrome',
      enabled: true,
      headless: true
    }
  }
});
