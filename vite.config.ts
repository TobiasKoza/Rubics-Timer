import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Rubics-Timer/',
  plugins: [react()],
  // cubing.js používá top-level await a vlastní web workery
  build: {
    target: 'es2022',
    // Polyfill/seznamy pro modulepreload sahají na `document`, což ve workeru cubing.js spadne.
    modulePreload: false,
    rolldownOptions: {
      output: {
        // Preload helper Vite musí být ve vlastním chunku. Jinak ho worker cubing.js
        // importuje z hlavního chunku a spustí v sobě celou aplikaci (a spadne).
        codeSplitting: { groups: [{ name: 'vite-preload', test: /preload-helper|vite\/modulepreload/ }] },
      },
    },
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['cubing'] },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
