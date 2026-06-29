import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  publicDir: '../public',
  // Dev/preview server — the E2E suite and CI both expect the app on port 5177.
  server: {
    port: 5177,
    strictPort: true,
  },
  preview: {
    port: 5177,
    strictPort: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'JsPlayer',
      formats: ['es', 'umd'],
      fileName: (format) => `js-player.${format}.js`,
    },
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    // Unit + integration + UI component tests (jsdom, no real browser)
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.test.js',
      'src/integration/**/*.test.js',
    ],
    exclude: [
      'src/e2e/**',           // e2e needs a real browser — run via vitest.e2e.config.js
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js', 'src/e2e/**', '**/*.test.js'],
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   75,
        statements: 80,
      },
    },
  },
});
