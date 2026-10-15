import { defineConfig } from 'vitest/config';

export default defineConfig({
  optimizeDeps: {
    include: ['@ja-platform/evaluator', '@ja-platform/parser-common', '@ja-platform/core-xml']
  },
  build: {
    commonjsOptions: {
      include: [/@journeyapps\/evaluator/, /@journeyapps\/parser-common/, /@journeyapps\/core-xml/]
    }
  },
  define: {
    'process.env': process.env
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
