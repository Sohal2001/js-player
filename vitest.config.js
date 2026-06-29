import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    root: '.',
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.test.js',
      'src/integration/**/*.test.js',
    ],
    exclude: ['src/e2e/**'],
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
