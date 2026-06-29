import { defineConfig } from 'vite';
import { resolve } from 'path';

// Production app build — output goes to dist-app/ (picked up by Capacitor)
export default defineConfig({
  root: 'demo',
  base: './',           // relative paths for Capacitor WebView
  publicDir: '../public',
  build: {
    outDir: '../dist-app',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'demo/index.html'),
      output: {
        manualChunks: undefined,
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
