import { defineConfig } from 'vite';

// E2E config — real Chromium, requires `npm run dev` running on port 5177
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/e2e/**/*.e2e.test.js'],
    testTimeout: 30_000,       // browser tests are slower
    hookTimeout: 30_000,
  },
});
