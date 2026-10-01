import { fileURLToPath, URL } from 'node:url';
// defineConfig comes from vitest/config so Vite options and the `test` block
// can live in a single file.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The client always talks to /api on its own origin, which keeps the refresh
 * cookie same-site in every environment. In development that is this proxy; in
 * production it is a rewrite in vercel.json pointing at the deployed API.
 */
const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
});
