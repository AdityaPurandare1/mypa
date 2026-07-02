/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Base path for GitHub Pages. On build we serve from the repo-name path
// (https://<user>.github.io/mypa/); in dev from root. Override with VITE_BASE.
export default defineConfig(({ command }) => {
  const base = process.env.VITE_BASE ?? (command === 'build' ? '/mypa/' : '/');

  return {
    base,
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: { port: 5173, strictPort: false },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // We ship our own service worker so we can add push + notificationclick
        // handlers (P2). injectManifest lets vite-plugin-pwa inject the precache
        // manifest into src/sw.js.
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
        includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
        manifest: {
          name: 'myPA',
          short_name: 'myPA',
          description: 'Voice-first personal task assistant.',
          theme_color: '#191612',
          background_color: '#191612',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          ],
        },
      }),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // Deno edge-function tests use https:// imports and run under `deno test`,
      // not vitest. Keep the node test runner scoped to the client.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'supabase/**'],
    },
  };
});
