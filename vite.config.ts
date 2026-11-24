import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = '/Rubics-Timer/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // PWA: manifest + service worker, který předem uloží všechny soubory → appka jede offline
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Rubics Timer',
        short_name: 'Rubics Timer',
        description: 'Časovač na Rubikovu kostku se scramblery pro všechny WCA eventy a statistikami.',
        lang: 'cs',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // včetně všech chunků cubing.js (scramblery, worker, náhledy) – jsou velké, proto vyšší limit
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,webmanifest}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // cubing.js používá top-level await a vlastní web workery
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
  // uplot se načítá líně – bez include by ho dev server objevil pozdě a přenačetl stránku
  optimizeDeps: { exclude: ['cubing'], include: ['uplot'] },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
