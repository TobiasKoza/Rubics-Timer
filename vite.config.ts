import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Rubics-Timer/',
  plugins: [react()],
  // cubing.js používá top-level await a vlastní web workery
  build: { target: 'es2022' },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['cubing'] },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
